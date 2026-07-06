(function () {
  const client = POS.getClient();
  const todayKey = POS.todayKey();
  const productsCacheKey = "patuxai-pops-products-cache";
  const pendingOrdersKey = "patuxai-pops-pending_sync_orders";
  const previousPendingOrdersKey = "patuxai-pops-pending-sync-orders";
  const legacyPendingOrdersKey = "patuxai-pops-pending-orders";
  const lastSyncedAtKey = "patuxai-pops-last_synced_at";
  const retrySyncKey = "patuxai-pops-retry_sync_count";
  const cartCacheKey = `patuxai-pops-cart-${todayKey}`;
  const lowStockThreshold = POS.lowStockThreshold || 10;
  let products = [];
  let orders = [];
  let pendingOrders = [];
  let cart = [];
  let activeCategory = "全部";
  let payMethod = "cash";
  let cartLoaded = false;
  let checkoutInFlight = false;
  let clearConfirmTimer = null;

  const el = {
    todayText: document.querySelector("#todayText"),
    categoryTabs: document.querySelector("#categoryTabs"),
    productGrid: document.querySelector("#productGrid"),
    searchInput: document.querySelector("#searchInput"),
    cartList: document.querySelector("#cartList"),
    cartCount: document.querySelector("#cartCount"),
    subtotal: document.querySelector("#subtotal"),
    discountText: document.querySelector("#discountText"),
    discountInput: document.querySelector("#discountInput"),
    grandTotal: document.querySelector("#grandTotal"),
    checkoutBtn: document.querySelector("#checkoutBtn"),
    clearCart: document.querySelector("#clearCart"),
    cashInput: document.querySelector("#cashInput"),
    cashPresets: document.querySelector("#cashPresets"),
    changeText: document.querySelector("#changeText"),
    payMethods: document.querySelector("#payMethods"),
    salesTotal: document.querySelector("#salesTotal"),
    orderCount: document.querySelector("#orderCount"),
    itemCount: document.querySelector("#itemCount"),
    topItem: document.querySelector("#topItem"),
    ordersBody: document.querySelector("#ordersBody"),
    lowStockAlert: document.querySelector("#lowStockAlert")
  };

  function cartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const rawDiscount = Number(el.discountInput && el.discountInput.value || 0);
    const discount = Math.min(Math.max(0, rawDiscount), subtotal);
    return { subtotal, discount, total: subtotal - discount };
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "") || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function saveCart() {
    writeJson(cartCacheKey, cart);
  }

  function productLabel(product) {
    if (product && product.shape && product.flavor) {
      return `${product.shape} · ${product.note || product.flavor}`;
    }
    return product ? product.name : "";
  }

  function normalizeCart(rawCart) {
    return (rawCart || []).map(line => {
      const product = products.find(item => item.id === line.product_id);
      if (!product || product.is_active === false || product.sold_out || product.stock <= 0) return null;
      const qty = Math.min(Number(line.qty || 1), product.stock);
      if (qty <= 0) return null;
      const itemType = line.item_type || "sale";
      return {
        line_id: line.line_id || makeId(),
        product_id: product.id,
        name: productLabel(product),
        price: itemType === "gift" || itemType === "promotion" ? 0 : product.selling_price,
        selling_price: product.selling_price,
        category: product.category,
        subcategory: product.subcategory || product.shape || "",
        item_type: itemType,
        qty
      };
    }).filter(Boolean);
  }

  function loadCartOnce() {
    if (cartLoaded) return;
    cart = normalizeCart(readJson(cartCacheKey, []));
    cartLoaded = true;
  }

  function loadPendingOrders() {
    const current = readJson(pendingOrdersKey, []);
    const previous = readJson(previousPendingOrdersKey, []);
    const legacy = readJson(legacyPendingOrdersKey, []);
    pendingOrders = current.length ? current : previous.length ? previous : legacy;
    if (!current.length && (previous.length || legacy.length)) savePendingOrders();
  }

  function savePendingOrders() {
    writeJson(pendingOrdersKey, pendingOrders);
  }

  function saveLastSyncedAt() {
    window.localStorage.setItem(lastSyncedAtKey, new Date().toISOString());
  }

  function lastSyncedLabel() {
    const value = window.localStorage.getItem(lastSyncedAtKey);
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  function recordRetrySync() {
    const count = Number(window.localStorage.getItem(retrySyncKey) || 0) + 1;
    window.localStorage.setItem(retrySyncKey, String(count));
  }

  function pendingForToday() {
    return pendingOrders.filter(order => order.day === todayKey);
  }

  function updateSyncStatus() {
    if (!window.navigator.onLine) {
      POS.setSyncStatus(pendingOrders.length ? `离线 · ${pendingOrders.length} 单待同步` : "离线", "offline");
      return;
    }
    if (pendingOrders.length) {
      POS.setSyncStatus(`${pendingOrders.length} 单待同步`, "pending");
      return;
    }
    const lastSynced = lastSyncedLabel();
    POS.setSyncStatus(lastSynced ? `在线 · ${lastSynced} 已同步` : "在线 · 已同步", "online");
  }

  async function loadProducts() {
    try {
      const result = await client
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (result.error) throw result.error;
      products = (result.data && result.data.length ? result.data : POS.productCatalog)
        .map(POS.normalizeProduct)
        .filter(product => product.is_deleted !== true)
        .filter(product => product.is_active !== false);
      writeJson(productsCacheKey, products);
    } catch (error) {
      products = readJson(productsCacheKey, POS.productCatalog)
        .map(POS.normalizeProduct)
        .filter(product => product.is_deleted !== true)
        .filter(product => product.is_active !== false);
      POS.showToast("已使用本地菜单");
    }
  }

  async function loadTodayOrders() {
    try {
      let result = await client
        .from("orders")
        .select("id, day, time_text, payment_method, total, total_amount, discount_amount, final_amount, status, cashier, note, order_items(product_id, name, product_name, category, subcategory, qty, quantity, price, unit_price, subtotal, item_type)")
        .eq("day", todayKey)
        .order("created_at", { ascending: false });
      if (result.error && /column|schema cache|relationship|select/i.test(result.error.message || "")) {
        result = await client
          .from("orders")
          .select("id, day, time_text, payment_method, total, status, order_items(product_id, name, qty, price)")
          .eq("day", todayKey)
          .order("created_at", { ascending: false });
      }
      if (result.error) throw result.error;
      orders = [...pendingForToday(), ...(result.data || [])];
    } catch (error) {
      orders = pendingForToday();
    }
  }

  async function refresh() {
    loadPendingOrders();
    if (window.navigator.onLine && pendingOrders.length) {
      await syncPendingOrders(true);
    }
    await loadProducts();
    loadCartOnce();
    await loadTodayOrders();
    renderAll();
    updateSyncStatus();
  }

  function makeLocalOrder(totals) {
    return {
      id: `local-${makeId()}`,
      day: todayKey,
      time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      payment_method: payMethod,
      total: totals.total,
      total_amount: totals.subtotal,
      discount_amount: totals.discount,
      final_amount: totals.total,
      status: "pending",
      order_items: cart.map(item => ({
        product_id: item.product_id,
        name: item.name,
        product_name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        qty: item.qty,
        quantity: item.qty,
        price: item.price,
        unit_price: item.price,
        subtotal: item.price * item.qty,
        item_type: item.item_type || "sale"
      }))
    };
  }

  async function submitOrder(order) {
    const legacyPayment = method => {
      const normalized = POS.normalizePaymentMethod(method);
      if (normalized === "cash") return "现金";
      if (normalized === "qr") return "扫码";
      return "其他";
    };
    const payload = {
      p_items: order.order_items.map(item => ({
        product_id: item.product_id,
        qty: item.qty,
        price: item.price,
        item_type: item.item_type || "sale"
      })),
      p_payment_method: order.payment_method,
      p_total: order.total,
      p_discount_amount: order.discount_amount || 0,
      p_time_text: order.time_text,
      p_day: order.day,
      p_cashier: document.querySelector("#signedInAs") ? document.querySelector("#signedInAs").textContent : "",
      p_note: order.note || ""
    };
    const result = await client.rpc("create_order", payload);
    if (result.error && /function|schema cache|parameter|argument|Invalid payment method/i.test(result.error.message || "")) {
      return client.rpc("create_order", {
        p_items: payload.p_items.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          price: item.price
        })),
        p_payment_method: legacyPayment(order.payment_method),
        p_total: order.total,
        p_time_text: order.time_text,
        p_day: order.day
      });
    }
    return result;
  }

  function saveOrderForLater(order) {
    pendingOrders.unshift(order);
    savePendingOrders();
    orders.unshift(order);
    updateSyncStatus();
  }

  async function syncPendingOrders(silent) {
    if (!window.navigator.onLine || !pendingOrders.length) {
      updateSyncStatus();
      return;
    }

    const remaining = [];
    let synced = 0;
    for (const order of pendingOrders) {
      try {
        const result = await submitOrder(order);
        if (result.error) {
          recordRetrySync();
          remaining.push(order);
        } else {
          synced += 1;
        }
      } catch (error) {
        recordRetrySync();
        remaining.push(order);
      }
    }

    pendingOrders = remaining;
    savePendingOrders();
    if (synced) saveLastSyncedAt();
    updateSyncStatus();
    if (synced && !silent) POS.showToast(`已同步 ${synced} 单`);
  }

  function retrySync(silent) {
    return syncPendingOrders(silent);
  }

  function skuProducts() {
    return products.filter(product => product.shape && product.flavor);
  }

  function extraProducts() {
    return products.filter(product => !product.shape || !product.flavor);
  }

  function orderedUnique(items, key, orderKey) {
    const map = new Map();
    items.forEach(item => {
      const value = item[key];
      if (!value || map.has(value)) return;
      map.set(value, {
        name: value,
        order: Number(item[orderKey] || item.sort_order || 0)
      });
    });
    return [...map.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }

  const skuFlavorAssets = {
    "Mango & Passion Fruit": "assets/flavors/mango-passion-bg.png",
    "Strawberry Milk": "assets/flavors/strawberry-milk-bg.png",
    "Japanese Melon": "assets/flavors/japanese-melon-bg.png",
    "Coconut + Butterfly Pea": "assets/flavors/coconut-butterfly-pea-bg.png"
  };

  const skuShapeAssets = {
    "Patuxai": "assets/shapes/shape-patuxai.png",
    "I Love Laos": "assets/shapes/shape-i-love-laos.png",
    "Elephant": "assets/shapes/shape-elephant.png",
    "Frangipani Flower": "assets/shapes/shape-frangipani.png"
  };

  const skuFlavorColors = {
    "Mango & Passion Fruit": { tone: "#e59718", soft: "#fff1c8", ink: "#7a4a00" },
    "Strawberry Milk": { tone: "#dd6f86", soft: "#ffe1e8", ink: "#7c2637" },
    "Japanese Melon": { tone: "#6d9f4a", soft: "#e7f4d7", ink: "#31551f" },
    "Coconut + Butterfly Pea": { tone: "#4d82b8", soft: "#deefff", ink: "#214b75" }
  };

  function assetUrl(path) {
    if (window.POS_IMAGE_FALLBACKS && window.POS_IMAGE_FALLBACKS[path]) return window.POS_IMAGE_FALLBACKS[path];
    if (!path || path.startsWith("data:") || /^https?:\/\//i.test(path)) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${POS.appVersion || Date.now()}`;
  }

  function imageStyle(path) {
    return path ? `style="--sku-bg: url('${assetUrl(path)}')"` : "";
  }

  function skuCellStyle(flavorName) {
    const colors = skuFlavorColors[flavorName];
    if (!colors) return "";
    return `style="--sku-tone: ${colors.tone}; --sku-tone-soft: ${colors.soft}; --sku-tone-ink: ${colors.ink};"`;
  }

  function formatOrderItemName(item) {
    const product = products.find(productItem => productItem.id === item.product_id);
    if (product) return productLabel(product);
    return item.name || "商品";
  }

  function renderCategories() {
    if (skuProducts().length) {
      el.categoryTabs.hidden = true;
      return;
    }

    el.categoryTabs.hidden = false;
    const categories = ["全部", ...new Set(products.map(product => product.category))];
    el.categoryTabs.innerHTML = categories.map(category => {
      const active = category === activeCategory ? "active" : "";
      return `<button class="tab ${active}" data-category="${category}">${category === "全部" ? "全部" : POS.categoryLabel(category)}</button>`;
    }).join("");
  }

  function productCard(product, mode) {
    const isUnavailable = product.sold_out || product.stock <= 0;
    const disabled = isUnavailable ? "disabled" : "";
    const low = product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out ? "low" : "";
    const stockText = isUnavailable ? "售罄" : `库存 ${product.stock}`;
    const image = product.image_path ? `<img class="product-image" src="${assetUrl(product.image_path)}" alt="${product.name}">` : "";
    const compact = mode === "compact";
    if (compact) {
      return `
        <article class="product product-compact ${low}">
          ${image || `<div class="product-image product-image-placeholder">${POS.categoryLabel(product.category).slice(0, 2)}</div>`}
          <div class="product-body">
            <h2>${product.name}</h2>
            <div class="meta"><span>${product.note || POS.categoryLabel(product.category)}</span><span>${stockText}</span></div>
            <div class="price">${POS.money(product.selling_price)}</div>
          </div>
          <button class="add compact-add" data-id="${product.id}" ${disabled}>${isUnavailable ? "售罄" : "加入"}</button>
        </article>
      `;
    }
    return `
      <article class="product ${low}">
        ${image}
        <div class="product-body">
          <h2>${product.name}</h2>
          <div class="meta"><span>${product.note || POS.categoryLabel(product.category)}</span><span>${stockText}</span></div>
          <div class="price">${POS.money(product.selling_price)}</div>
          <button class="add" data-id="${product.id}" ${disabled}>${isUnavailable ? "已售罄" : "加入订单"}</button>
        </div>
      </article>
    `;
  }

  function renderExtraProducts(items) {
    const query = el.searchInput.value.trim().toLowerCase();
    const visible = items.filter(product => {
      return !query || `${product.name}${product.category}${product.note}`.toLowerCase().includes(query);
    });
    if (!visible.length) return "";

    const groups = [...new Set(visible.map(product => product.category || "other"))];
    return groups.map(category => {
      const categoryProducts = visible.filter(product => (product.category || "other") === category);
      return `
        <section class="extra-products" aria-label="${category}">
          <div class="section-head">
            <h2>${POS.categoryLabel(category)}</h2>
            <span>${categoryProducts.length} 款</span>
          </div>
          <div class="extra-grid">
            ${categoryProducts.map(product => productCard(product, "compact")).join("")}
          </div>
        </section>
      `;
    }).join("");
  }

  function skuMatrixHtml(matrixProducts) {
    const query = el.searchInput.value.trim().toLowerCase();
    const shapes = orderedUnique(matrixProducts, "shape", "shape_order");
    const flavors = orderedUnique(matrixProducts, "flavor", "flavor_order");
    const matches = product => {
      if (!query) return true;
      return `${product.name}${product.shape}${product.flavor}${product.note}`.toLowerCase().includes(query);
    };

    return `
      <section class="sku-matrix" aria-label="形状口味矩阵">
        <div class="sku-matrix-head">
          <div>
            <h2>选择形状 + 口味</h2>
            <span>每格是一个独立库存 SKU</span>
          </div>
          <strong>${POS.money(matrixProducts[0] ? matrixProducts[0].selling_price : 55000)} / 个</strong>
        </div>
        <div class="sku-table" style="--flavor-count: ${flavors.length}">
          <div class="sku-corner">
            <span class="corner-flavor">口味选择</span>
            <span class="corner-shape">形状选择</span>
          </div>
          ${flavors.map(flavor => `
            <div class="sku-flavor" ${imageStyle(skuFlavorAssets[flavor.name])}>
              <span>${flavor.name}</span>
            </div>
          `).join("")}
          ${shapes.map(shape => `
            <div class="sku-shape" ${imageStyle(skuShapeAssets[shape.name])}>
              <span>${shape.name}</span>
            </div>
            ${flavors.map(flavor => {
              const product = matrixProducts.find(item => item.shape === shape.name && item.flavor === flavor.name);
              if (!product || !matches(product)) return `<div class="sku-empty"></div>`;
              const isUnavailable = product.sold_out || product.stock <= 0;
              const disabled = isUnavailable ? "disabled" : "";
              const low = product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out ? "low" : "";
              const stockText = isUnavailable ? "售罄" : `库存 ${product.stock}`;
              return `
                <button class="sku-cell ${low}" data-id="${product.id}" ${skuCellStyle(product.flavor)} ${disabled}>
                  <span>${product.note || product.flavor}</span>
                  <strong>${stockText}</strong>
                </button>
              `;
            }).join("")}
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderProducts() {
    const matrixProducts = skuProducts();
    const addOns = extraProducts();
    if (matrixProducts.length) {
      el.productGrid.innerHTML = `${skuMatrixHtml(matrixProducts)}${renderExtraProducts(addOns)}`;
      return;
    }

    const query = el.searchInput.value.trim().toLowerCase();
    const visible = products.filter(product => {
      const categoryMatch = activeCategory === "全部" || product.category === activeCategory;
      const queryMatch = !query || `${product.name}${product.category}${product.note}`.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });

    el.productGrid.innerHTML = visible.map(productCard).join("");
  }

  function flashAddButton(button, productName) {
    if (!button) return;
    window.clearTimeout(button._feedbackTimer);
    const originalHtml = button.dataset.originalHtml || button.innerHTML;
    button.dataset.originalHtml = originalHtml;
    button.textContent = "已加入";
    button.classList.add("added");
    button.disabled = true;
    POS.showToast(`已加入 ${productName}`);
    button._feedbackTimer = window.setTimeout(() => {
      button.innerHTML = originalHtml;
      button.classList.remove("added");
      button.disabled = false;
    }, 550);
  }

  function addToCart(productId) {
    const product = products.find(item => item.id === productId);
    if (!product || product.sold_out || product.stock <= 0) return null;
    const existing = cart.find(item => item.product_id === productId);
    if (existing) {
      if (existing.qty >= product.stock) {
        POS.showToast("已达到当前库存数量");
        return null;
      }
      existing.qty += 1;
    } else {
      cart.push({
        line_id: makeId(),
        product_id: product.id,
        name: productLabel(product),
        price: product.selling_price,
        selling_price: product.selling_price,
        category: product.category,
        subcategory: product.subcategory || product.shape || "",
        item_type: "sale",
        qty: 1
      });
    }
    saveCart();
    renderCart();
    return product;
  }

  function renderCart() {
    if (cart.length === 0) {
      el.cartList.innerHTML = `<div class="empty">点选左侧商品后，这里会生成当前订单。</div>`;
    } else {
      el.cartList.innerHTML = cart.map(item => {
        const lineTotal = item.price * item.qty;
        const isGift = item.item_type === "gift" || item.item_type === "promotion";
        return `
          <article class="cart-item">
            <div class="cart-line">
              <div>
                <div class="cart-title">${item.name}${isGift ? " · 赠品" : ""}</div>
                <small>${isGift ? "赠品 0 KIP" : `${POS.money(item.price)} / 份`}</small>
              </div>
              <strong>${POS.money(lineTotal)}</strong>
            </div>
            <div class="cart-line">
              <div class="qty">
                <button data-action="dec" data-line="${item.line_id}">-</button>
                <strong>${item.qty}</strong>
                <button data-action="inc" data-line="${item.line_id}">+</button>
              </div>
              <button class="remove" data-action="gift" data-line="${item.line_id}">${isGift ? "恢复销售" : "设为赠品"}</button>
              <button class="remove" data-action="remove" data-line="${item.line_id}">移除</button>
            </div>
          </article>
        `;
      }).join("");
    }

    const totals = cartTotals();
    if (el.cartCount) {
      const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      el.cartCount.textContent = `${count} 件`;
    }
    if (el.discountInput && Number(el.discountInput.value || 0) !== totals.discount) {
      el.discountInput.value = totals.discount || "";
    }
    el.subtotal.textContent = POS.money(totals.subtotal);
    if (el.discountText) el.discountText.textContent = totals.discount ? `-${POS.money(totals.discount)}` : POS.money(0);
    el.grandTotal.textContent = POS.money(totals.total);
    el.checkoutBtn.disabled = checkoutInFlight || cart.length === 0 || totals.total <= 0;
    updateCashPresets(totals.total);
    updateChange();
  }

  function updateCart(lineId, action) {
    const item = cart.find(line => line.line_id === lineId);
    if (!item) return;
    if (action === "inc") item.qty += 1;
    if (action === "dec") item.qty -= 1;
    if (action === "remove") item.qty = 0;
    if (action === "gift") {
      const isGift = item.item_type === "gift" || item.item_type === "promotion";
      item.item_type = isGift ? "sale" : "gift";
      item.price = isGift ? Number(item.selling_price || item.price || 0) : 0;
    }
    const product = products.find(productItem => productItem.id === item.product_id);
    if (product && item.qty > product.stock) {
      item.qty = product.stock;
      POS.showToast("已达到当前库存数量");
    }
    cart = cart.filter(line => line.qty > 0);
    saveCart();
    renderCart();
  }

  function cashLabel(value) {
    return `${Math.round(value / 1000)}k`;
  }

  function updateCashPresets(total) {
    if (!el.cashPresets) return;
    if (total <= 0) {
      el.cashPresets.innerHTML = `
        <button class="cash-preset" data-cash="exact">刚好</button>
        <button class="cash-preset" data-cash="100000">100k</button>
        <button class="cash-preset" data-cash="200000">200k</button>
        <button class="cash-preset" data-cash="500000">500k</button>
      `;
      return;
    }

    const values = [
      Math.ceil(total / 50000) * 50000,
      Math.ceil(total / 100000) * 100000,
      200000,
      500000
    ].filter(value => value > total);
    const unique = [...new Set(values)].slice(0, 3);
    el.cashPresets.innerHTML = [
      `<button class="cash-preset" data-cash="exact">刚好</button>`,
      ...unique.map(value => `<button class="cash-preset" data-cash="${value}">${cashLabel(value)}</button>`)
    ].join("");
  }

  function updateChange() {
    const { total } = cartTotals();
    const received = Number(el.cashInput.value || 0);
    const change = Math.max(0, received - total);
    el.changeText.textContent = payMethod === "cash" ? `找零 ${POS.money(change)}` : "无需找零";
    el.cashInput.disabled = payMethod !== "cash";
    el.cashPresets.style.display = payMethod === "cash" ? "grid" : "none";
    if (payMethod !== "cash") el.cashInput.value = "";
  }

  async function checkout() {
    if (checkoutInFlight) return;
    const totals = cartTotals();
    if (cart.length === 0) return;
    if (payMethod === "cash" && Number(el.cashInput.value || 0) < totals.total) {
      POS.showToast("现金实收不足");
      return;
    }

    checkoutInFlight = true;
    const order = makeLocalOrder(totals);
    POS.setBusy(el.checkoutBtn, true, "提交中");
    if (!window.navigator.onLine) {
      saveOrderForLater(order);
      cart = [];
      saveCart();
      el.cashInput.value = "";
      if (el.discountInput) el.discountInput.value = "";
      POS.setBusy(el.checkoutBtn, false);
      checkoutInFlight = false;
      renderAll();
      POS.showToast("离线订单已保存");
      return;
    }

    try {
      const result = await submitOrder(order);
      if (result.error) {
        POS.setBusy(el.checkoutBtn, false);
        checkoutInFlight = false;
        POS.showToast(result.error.message || "订单提交失败");
        await refresh();
        return;
      }
    } catch (error) {
      saveOrderForLater(order);
      cart = [];
      saveCart();
      el.cashInput.value = "";
      if (el.discountInput) el.discountInput.value = "";
      POS.setBusy(el.checkoutBtn, false);
      checkoutInFlight = false;
      renderAll();
      POS.showToast("订单已保存在本机");
      return;
    }
    POS.setBusy(el.checkoutBtn, false);
    checkoutInFlight = false;

    cart = [];
    saveCart();
    el.cashInput.value = "";
    if (el.discountInput) el.discountInput.value = "";
    POS.showToast("已完成收款");
    await refresh();
  }

  function renderReports() {
    const activeOrders = orders.filter(POS.isRevenueOrder);
    const orderAmount = order => Number(order.final_amount ?? order.total_amount ?? order.total ?? 0);
    const itemQty = item => Number(item.quantity ?? item.qty ?? 0);
    const sales = activeOrders.reduce((sum, order) => sum + orderAmount(order), 0);
    const count = activeOrders.reduce((sum, order) => {
      return sum + order.order_items.reduce((part, item) => part + itemQty(item), 0);
    }, 0);
    const itemMap = new Map();
    activeOrders.forEach(order => {
      order.order_items.forEach(item => {
        const name = item.product_name || item.name;
        itemMap.set(name, (itemMap.get(name) || 0) + itemQty(item));
      });
    });
    const top = [...itemMap.entries()].sort((a, b) => b[1] - a[1])[0];

    el.salesTotal.textContent = POS.money(sales);
    el.orderCount.textContent = activeOrders.length;
    el.itemCount.textContent = count;
    el.topItem.textContent = top ? formatOrderItemName({ name: top[0] }) : "暂无";

    el.ordersBody.innerHTML = activeOrders.length ? activeOrders.map(order => {
      const items = order.order_items.map(item => `${formatOrderItemName(item)} x${itemQty(item)}`).join("、");
      const pending = order.status === "pending" ? " · 待同步" : "";
      return `
        <tr>
          <td>${order.time_text}</td>
          <td>${items}</td>
          <td>${POS.paymentLabel(order.payment_method)}${pending}</td>
          <td><strong>${POS.money(orderAmount(order))}</strong></td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="4">今天还没有订单。</td></tr>`;
  }

  function renderLowStockAlert() {
    if (!el.lowStockAlert) return;
    const lowProducts = products
      .filter(product => product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out)
      .sort((a, b) => a.stock - b.stock || productLabel(a).localeCompare(productLabel(b)));

    if (!lowProducts.length) {
      el.lowStockAlert.hidden = true;
      el.lowStockAlert.innerHTML = "";
      return;
    }

    const visible = lowProducts.slice(0, 5).map(product => {
      const status = product.stock <= 0 || product.sold_out ? "售罄" : `剩 ${product.stock}`;
      return `${productLabel(product)} ${status}`;
    }).join("、");
    const more = lowProducts.length > 5 ? `，另有 ${lowProducts.length - 5} 款` : "";
    el.lowStockAlert.hidden = false;
    el.lowStockAlert.innerHTML = `<strong>库存提醒</strong><span>${visible}${more}</span>`;
  }

  function renderAll() {
    renderCategories();
    renderLowStockAlert();
    renderProducts();
    renderCart();
    renderReports();
  }

  el.todayText.textContent = POS.todayLabel ? POS.todayLabel() : new Date().toLocaleDateString("zh-CN");

  el.categoryTabs.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    renderAll();
  });

  el.productGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const product = addToCart(button.dataset.id);
    if (product) flashAddButton(button, product.name);
  });

  el.cartList.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    updateCart(button.dataset.line, button.dataset.action);
  });

  el.payMethods.addEventListener("click", event => {
    const button = event.target.closest("[data-pay]");
    if (!button) return;
    payMethod = button.dataset.pay;
    document.querySelectorAll(".pay").forEach(item => item.classList.toggle("active", item === button));
    updateChange();
  });

  el.cashPresets.addEventListener("click", event => {
    const button = event.target.closest("[data-cash]");
    if (!button) return;
    const { total } = cartTotals();
    el.cashInput.value = button.dataset.cash === "exact" ? total : button.dataset.cash;
    updateChange();
  });

  el.searchInput.addEventListener("input", renderProducts);
  if (el.discountInput) el.discountInput.addEventListener("input", renderCart);
  el.cashInput.addEventListener("input", updateChange);
  el.checkoutBtn.addEventListener("click", checkout);
  el.clearCart.addEventListener("click", () => {
    if (!cart.length) return;
    if (!el.clearCart.classList.contains("confirm")) {
      el.clearCart.classList.add("confirm");
      el.clearCart.textContent = "再点清空";
      POS.showToast("再点一次清空当前订单");
      window.clearTimeout(clearConfirmTimer);
      clearConfirmTimer = window.setTimeout(() => {
        el.clearCart.classList.remove("confirm");
        el.clearCart.textContent = "清空";
      }, 1800);
      return;
    }
    window.clearTimeout(clearConfirmTimer);
    el.clearCart.classList.remove("confirm");
    el.clearCart.textContent = "清空";
    cart = [];
    if (el.discountInput) el.discountInput.value = "";
    el.cashInput.value = "";
    saveCart();
    renderCart();
  });

  window.addEventListener("online", () => {
    retrySync(false).then(refresh).catch(error => POS.showToast(error.message));
  });
  window.addEventListener("offline", updateSyncStatus);

  POS.initAuth(client, refresh).catch(error => POS.showToast(error.message));
})();
