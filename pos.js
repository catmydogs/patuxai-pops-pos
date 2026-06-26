(function () {
  const client = POS.getClient();
  const todayKey = POS.todayKey();
  const productsCacheKey = "patuxai-pops-products-cache";
  const pendingOrdersKey = "patuxai-pops-pending-orders";
  let products = [];
  let orders = [];
  let pendingOrders = [];
  let cart = [];
  let activeCategory = "全部";
  let payMethod = "现金";

  const el = {
    todayText: document.querySelector("#todayText"),
    categoryTabs: document.querySelector("#categoryTabs"),
    productGrid: document.querySelector("#productGrid"),
    searchInput: document.querySelector("#searchInput"),
    cartList: document.querySelector("#cartList"),
    subtotal: document.querySelector("#subtotal"),
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
    ordersBody: document.querySelector("#ordersBody")
  };

  function cartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { subtotal, total: subtotal };
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

  function loadPendingOrders() {
    pendingOrders = readJson(pendingOrdersKey, []);
  }

  function savePendingOrders() {
    writeJson(pendingOrdersKey, pendingOrders);
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
    POS.setSyncStatus("在线 · 已同步", "online");
  }

  async function loadProducts() {
    try {
      const result = await client
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (result.error) throw result.error;
      products = (result.data && result.data.length ? result.data : POS.productCatalog)
        .filter(product => product.is_active !== false);
      writeJson(productsCacheKey, products);
    } catch (error) {
      products = readJson(productsCacheKey, POS.productCatalog)
        .filter(product => product.is_active !== false);
      POS.showToast("已使用本地菜单");
    }
  }

  async function loadTodayOrders() {
    try {
      const result = await client
        .from("orders")
        .select("id, day, time_text, payment_method, total, status, order_items(product_id, name, qty, price)")
        .eq("day", todayKey)
        .order("created_at", { ascending: false });
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
    await loadTodayOrders();
    renderAll();
    updateSyncStatus();
  }

  function makeLocalOrder(total) {
    return {
      id: `local-${makeId()}`,
      day: todayKey,
      time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      payment_method: payMethod,
      total,
      status: "pending",
      order_items: cart.map(item => ({
        product_id: item.product_id,
        name: item.name,
        qty: item.qty,
        price: item.price
      }))
    };
  }

  async function submitOrder(order) {
    return client.rpc("create_order", {
      p_items: order.order_items.map(item => ({
        product_id: item.product_id,
        qty: item.qty,
        price: item.price
      })),
      p_payment_method: order.payment_method,
      p_total: order.total,
      p_time_text: order.time_text,
      p_day: order.day
    });
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
          remaining.push(order);
        } else {
          synced += 1;
        }
      } catch (error) {
        remaining.push(order);
      }
    }

    pendingOrders = remaining;
    savePendingOrders();
    updateSyncStatus();
    if (synced && !silent) POS.showToast(`已同步 ${synced} 单`);
  }

  function renderCategories() {
    const categories = ["全部", ...new Set(products.map(product => product.category))];
    el.categoryTabs.innerHTML = categories.map(category => {
      const active = category === activeCategory ? "active" : "";
      return `<button class="tab ${active}" data-category="${category}">${category}</button>`;
    }).join("");
  }

  function renderProducts() {
    const query = el.searchInput.value.trim().toLowerCase();
    const visible = products.filter(product => {
      const categoryMatch = activeCategory === "全部" || product.category === activeCategory;
      const queryMatch = !query || `${product.name}${product.category}${product.note}`.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });

    el.productGrid.innerHTML = visible.map(product => {
      const isUnavailable = product.sold_out || product.stock <= 0;
      const disabled = isUnavailable ? "disabled" : "";
      const low = product.stock <= 8 || product.sold_out ? "low" : "";
      const stockText = isUnavailable ? "售罄" : `库存 ${product.stock}`;
      return `
        <article class="product ${low}">
          <img class="product-image" src="${product.image_path}" alt="${product.name}">
          <div class="product-body">
            <h2>${product.name}</h2>
            <div class="meta"><span>${product.note}</span><span>${stockText}</span></div>
            <div class="price">${POS.money(product.price)}</div>
            <button class="add" data-id="${product.id}" ${disabled}>${isUnavailable ? "已售罄" : "加入订单"}</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function flashAddButton(button, productName) {
    if (!button) return;
    window.clearTimeout(button._feedbackTimer);
    const originalText = button.dataset.originalText || button.textContent;
    button.dataset.originalText = originalText;
    button.textContent = "已加入";
    button.classList.add("added");
    button.disabled = true;
    POS.showToast(`已加入 ${productName}`);
    button._feedbackTimer = window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("added");
      button.disabled = false;
    }, 550);
  }

  function addToCart(productId) {
    const product = products.find(item => item.id === productId);
    if (!product || product.sold_out || product.stock <= 0) return null;
    const existing = cart.find(item => item.product_id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        line_id: makeId(),
        product_id: product.id,
        name: product.name,
        price: product.price,
        qty: 1
      });
    }
    renderCart();
    return product;
  }

  function renderCart() {
    if (cart.length === 0) {
      el.cartList.innerHTML = `<div class="empty">点选左侧商品后，这里会生成当前订单。</div>`;
    } else {
      el.cartList.innerHTML = cart.map(item => {
        const lineTotal = item.price * item.qty;
        return `
          <article class="cart-item">
            <div class="cart-line">
              <div>
                <div class="cart-title">${item.name}</div>
                <small>${POS.money(item.price)} / 份</small>
              </div>
              <strong>${POS.money(lineTotal)}</strong>
            </div>
            <div class="cart-line">
              <div class="qty">
                <button data-action="dec" data-line="${item.line_id}">-</button>
                <strong>${item.qty}</strong>
                <button data-action="inc" data-line="${item.line_id}">+</button>
              </div>
              <button class="remove" data-action="remove" data-line="${item.line_id}">移除</button>
            </div>
          </article>
        `;
      }).join("");
    }

    const totals = cartTotals();
    el.subtotal.textContent = POS.money(totals.subtotal);
    el.grandTotal.textContent = POS.money(totals.total);
    el.checkoutBtn.disabled = cart.length === 0 || totals.total <= 0;
    updateChange();
  }

  function updateCart(lineId, action) {
    const item = cart.find(line => line.line_id === lineId);
    if (!item) return;
    if (action === "inc") item.qty += 1;
    if (action === "dec") item.qty -= 1;
    if (action === "remove") item.qty = 0;
    cart = cart.filter(line => line.qty > 0);
    renderCart();
  }

  function updateChange() {
    const { total } = cartTotals();
    const received = Number(el.cashInput.value || 0);
    const change = Math.max(0, received - total);
    el.changeText.textContent = payMethod === "现金" ? `找零 ${POS.money(change)}` : "无需找零";
    el.cashInput.disabled = payMethod !== "现金";
    el.cashPresets.style.display = payMethod === "现金" ? "grid" : "none";
    if (payMethod !== "现金") el.cashInput.value = "";
  }

  async function checkout() {
    const totals = cartTotals();
    if (cart.length === 0) return;
    if (payMethod === "现金" && Number(el.cashInput.value || 0) < totals.total) {
      POS.showToast("现金实收不足");
      return;
    }

    const order = makeLocalOrder(totals.total);
    POS.setBusy(el.checkoutBtn, true, "提交中");
    if (!window.navigator.onLine) {
      saveOrderForLater(order);
      cart = [];
      el.cashInput.value = "";
      POS.setBusy(el.checkoutBtn, false);
      renderAll();
      POS.showToast("离线订单已保存");
      return;
    }

    try {
      const result = await submitOrder(order);
      if (result.error) {
        POS.setBusy(el.checkoutBtn, false);
        POS.showToast(result.error.message || "订单提交失败");
        await refresh();
        return;
      }
    } catch (error) {
      saveOrderForLater(order);
      cart = [];
      el.cashInput.value = "";
      POS.setBusy(el.checkoutBtn, false);
      renderAll();
      POS.showToast("订单已保存在本机");
      return;
    }
    POS.setBusy(el.checkoutBtn, false);

    cart = [];
    el.cashInput.value = "";
    POS.showToast("已完成收款");
    await refresh();
  }

  function renderReports() {
    const activeOrders = orders.filter(order => order.status !== "void");
    const sales = activeOrders.reduce((sum, order) => sum + order.total, 0);
    const count = activeOrders.reduce((sum, order) => {
      return sum + order.order_items.reduce((part, item) => part + item.qty, 0);
    }, 0);
    const itemMap = new Map();
    activeOrders.forEach(order => {
      order.order_items.forEach(item => {
        itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.qty);
      });
    });
    const top = [...itemMap.entries()].sort((a, b) => b[1] - a[1])[0];

    el.salesTotal.textContent = POS.money(sales);
    el.orderCount.textContent = activeOrders.length;
    el.itemCount.textContent = count;
    el.topItem.textContent = top ? top[0] : "暂无";

    el.ordersBody.innerHTML = activeOrders.length ? activeOrders.map(order => {
      const items = order.order_items.map(item => `${item.name} x${item.qty}`).join("、");
      const pending = order.status === "pending" ? " · 待同步" : "";
      return `
        <tr>
          <td>${order.time_text}</td>
          <td>${items}</td>
          <td>${order.payment_method}${pending}</td>
          <td><strong>${POS.money(order.total)}</strong></td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="4">今天还没有订单。</td></tr>`;
  }

  function renderAll() {
    renderCategories();
    renderProducts();
    renderCart();
    renderReports();
  }

  el.todayText.textContent = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

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
  el.cashInput.addEventListener("input", updateChange);
  el.checkoutBtn.addEventListener("click", checkout);
  el.clearCart.addEventListener("click", () => {
    cart = [];
    renderCart();
  });

  window.addEventListener("online", () => {
    syncPendingOrders(false).then(refresh).catch(error => POS.showToast(error.message));
  });
  window.addEventListener("offline", updateSyncStatus);

  POS.initAuth(client, refresh).catch(error => POS.showToast(error.message));
})();
