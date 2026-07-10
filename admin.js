(function () {
  const client = POS.getClient();
  const todayKey = POS.todayKey();
  const lowStockThreshold = POS.lowStockThreshold || 10;
  const currentProductIds = new Set(POS.productCatalog.map(product => product.id));
  const legacyProductIds = new Set([
    "mango-passion",
    "strawberry-milk",
    "pistachio",
    "coconut-butterfly-pea",
    "japanese-melon",
    "lychee-rose-soda",
    "patuxai-sunset-soda",
    "peach-jasmine-sparkle",
    "grapefruit-sparkle"
  ]);
  let activeRange = "today";
  let selectedDate = todayKey;
  let selectedMonth = todayKey.slice(0, 7);
  let rangeStartDate = todayKey;
  let rangeEndDate = todayKey;
  let activeProductFilter = "active";
  let products = [];
  let orders = [];
  let closeouts = [];
  let inventoryMovements = [];

  const el = {
    rangeText: document.querySelector("#rangeText"),
    dateFilter: document.querySelector("#dateFilter"),
    dateSearchInput: document.querySelector("#dateSearchInput"),
    dateSearchBtn: document.querySelector("#dateSearchBtn"),
    monthSearchInput: document.querySelector("#monthSearchInput"),
    monthSearchBtn: document.querySelector("#monthSearchBtn"),
    rangeStartInput: document.querySelector("#rangeStartInput"),
    rangeEndInput: document.querySelector("#rangeEndInput"),
    rangeSearchBtn: document.querySelector("#rangeSearchBtn"),
    salesTotal: document.querySelector("#salesTotal"),
    orderCount: document.querySelector("#orderCount"),
    itemCount: document.querySelector("#itemCount"),
    iceCreamItemCount: document.querySelector("#iceCreamItemCount"),
    customItemCount: document.querySelector("#customItemCount"),
    merchItemCount: document.querySelector("#merchItemCount"),
    drinkItemCount: document.querySelector("#drinkItemCount"),
    bundleItemCount: document.querySelector("#bundleItemCount"),
    otherItemCount: document.querySelector("#otherItemCount"),
    cashSales: document.querySelector("#cashSales"),
    qrSales: document.querySelector("#qrSales"),
    otherPaymentSales: document.querySelector("#otherPaymentSales"),
    cashDifference: document.querySelector("#cashDifference"),
    lowStockSkuCount: document.querySelector("#lowStockSkuCount"),
    avgOrder: document.querySelector("#avgOrder"),
    productRanking: document.querySelector("#productRanking"),
    categoryBreakdown: document.querySelector("#categoryBreakdown"),
    paymentSummary: document.querySelector("#paymentSummary"),
    categorySummary: document.querySelector("#categorySummary"),
    stockOverview: document.querySelector("#stockOverview"),
    stockSummary: document.querySelector("#stockSummary"),
    inventoryMovements: document.querySelector("#inventoryMovements"),
    ordersBody: document.querySelector("#ordersBody"),
    exportOrdersCsv: document.querySelector("#exportOrdersCsv"),
    exportItemsCsv: document.querySelector("#exportItemsCsv"),
    exportInventoryCsv: document.querySelector("#exportInventoryCsv"),
    expectedCash: document.querySelector("#expectedCash"),
    actualCash: document.querySelector("#actualCash"),
    cashDiff: document.querySelector("#cashDiff"),
    saveCloseout: document.querySelector("#saveCloseout"),
    closeHistory: document.querySelector("#closeHistory"),
    menuEditor: document.querySelector("#menuEditor"),
    addProductForm: document.querySelector("#addProductForm"),
    testConnection: document.querySelector("#testConnection"),
    productFilters: document.querySelector("#productFilters"),
    adminShortcuts: document.querySelector("#adminShortcuts"),
    backTop: document.querySelector("#backTop")
  };

  if (el.menuEditor) {
    el.menuEditor.innerHTML = `<div class="empty">正在加载菜单...</div>`;
  }

  function updateBackTop() {
    if (!el.backTop) return;
    el.backTop.classList.toggle("show", window.scrollY > 420);
  }

  const adminViewByHash = {
    home: "home",
    analytics: "analytics",
    analyticsPanel: "analytics",
    menuManagement: "menu",
    stockManagement: "stock",
    inventoryMovementsPanel: "inventory",
    closeoutPanel: "closeout",
    ordersPanel: "orders"
  };

  function currentAdminView() {
    const key = (window.location.hash || "#home").replace("#", "");
    return adminViewByHash[key] || key || "home";
  }

  function setAdminView(view) {
    const activeView = adminViewByHash[view] || view || "home";
    document.querySelectorAll("[data-admin-view]").forEach(section => {
      section.hidden = section.dataset.adminView !== activeView;
    });
    if (el.productFilters) {
      el.productFilters.hidden = !["menu", "stock"].includes(activeView);
    }
    if (el.adminShortcuts) {
      el.adminShortcuts.querySelectorAll("[data-admin-nav]").forEach(link => {
        link.classList.toggle("active", link.dataset.adminNav === activeView);
      });
    }
    if (el.backTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function imageFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("图片格式无法识别"));
        image.onload = () => {
          const maxSide = 900;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const finish = dataUrl => resolve({
            dataUrl,
            originalSize: file.size,
            compressedSize: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75),
            width: canvas.width,
            height: canvas.height
          });

          if (canvas.toBlob) {
            canvas.toBlob(blob => {
              if (!blob) {
                finish(canvas.toDataURL("image/jpeg", 0.8));
                return;
              }
              const compressedReader = new FileReader();
              compressedReader.onerror = () => reject(new Error("图片压缩失败"));
              compressedReader.onload = () => resolve({
                dataUrl: compressedReader.result,
                originalSize: file.size,
                compressedSize: blob.size,
                width: canvas.width,
                height: canvas.height
              });
              compressedReader.readAsDataURL(blob);
            }, "image/jpeg", 0.8);
            return;
          }

          finish(canvas.toDataURL("image/jpeg", 0.8));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function loadAll() {
    const issues = [];

    try {
      const productsResult = await client
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (productsResult.error) throw productsResult.error;
      products = (productsResult.data && productsResult.data.length ? productsResult.data : POS.productCatalog).map(POS.normalizeProduct);
    } catch (error) {
      products = POS.productCatalog.map(POS.normalizeProduct);
      issues.push("菜单");
    }

    try {
      let ordersResult = await client
        .from("orders")
        .select("id, day, time_text, payment_method, total, total_amount, discount_amount, final_amount, status, cashier, note, created_at, order_items(product_id, name, product_name, category, subcategory, qty, quantity, price, unit_price, subtotal, item_type)")
        .order("created_at", { ascending: false });
      if (ordersResult.error && /column|schema cache|relationship|select/i.test(ordersResult.error.message || "")) {
        ordersResult = await client
          .from("orders")
          .select("id, day, time_text, payment_method, total, status, created_at, order_items(product_id, name, qty, price)")
          .order("created_at", { ascending: false });
      }
      if (ordersResult.error) throw ordersResult.error;
      orders = ordersResult.data || [];
    } catch (error) {
      orders = [];
      issues.push("订单");
    }

    try {
      const closeoutsResult = await client
        .from("closeouts")
        .select("*")
        .order("day", { ascending: false });
      if (closeoutsResult.error) throw closeoutsResult.error;
      closeouts = closeoutsResult.data || [];
    } catch (error) {
      closeouts = [];
      issues.push("日结");
    }

    try {
      const movementsResult = await client
        .from("inventory_movements")
        .select("*")
        .order("created_at", { ascending: false });
      if (movementsResult.error) throw movementsResult.error;
      inventoryMovements = movementsResult.data || [];
    } catch (error) {
      inventoryMovements = [];
      issues.push("库存记录");
    }

    if (issues.length) {
      POS.showToast(`${issues.join("、")}数据暂时未完全加载`);
    }
  }

  async function refresh() {
    await loadAll();
    render();
  }

  function productById(id) {
    return products.find(product => product.id === id);
  }

  function productDisplayName(product) {
    if (product && product.shape && product.flavor) {
      return `${product.shape} · ${product.note || product.flavor}`;
    }
    return product ? product.name : "";
  }

  function isCurrentMenuProduct(product) {
    return product && product.is_deleted !== true && (currentProductIds.has(product.id) || !legacyProductIds.has(product.id));
  }

  function isIceCreamItem(item, product) {
    return itemCategory(item, product) === "icecream";
  }

  function itemQty(item) {
    return Number(item.quantity ?? item.qty ?? 0);
  }

  function itemUnitPrice(item) {
    return Number(item.unit_price ?? item.price ?? 0);
  }

  function itemSubtotal(item) {
    return Number(item.subtotal ?? (itemUnitPrice(item) * itemQty(item)) ?? 0);
  }

  function orderAmount(order) {
    return Number(order.final_amount ?? order.total_amount ?? order.total ?? 0);
  }

  function orderItemSubtotal(order) {
    return (order.order_items || []).reduce((sum, item) => sum + itemSubtotal(item), 0);
  }

  function itemNetSubtotal(order, item) {
    const subtotal = itemSubtotal(item);
    const gross = Number(order.total_amount ?? orderItemSubtotal(order) ?? 0);
    const finalAmount = orderAmount(order);
    if (!gross || finalAmount >= gross) return subtotal;
    return Math.round(subtotal * finalAmount / gross);
  }

  function itemCategory(item, product) {
    return POS.normalizeCategory(item.category || (product && product.category));
  }

  function statusLabel(status) {
    const labels = {
      paid: "已付款",
      completed: "已完成",
      cancelled: "已取消",
      refunded: "已退款",
      pending: "待同步",
      void: "已作废"
    };
    return labels[status] || status || "已付款";
  }

  function makeProductId(name, category) {
    const normalized = POS.normalizeCategory(category);
    const prefix = normalized === "custom" ? "custom" : normalized === "merch" ? "merch" : normalized;
    const suffix = String(name || "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    return `${prefix}-${suffix || Date.now().toString(36)}-${Date.now().toString(36)}`;
  }

  function filteredProducts() {
    const currentProducts = products.filter(isCurrentMenuProduct);
    if (activeProductFilter === "active") {
      return currentProducts.filter(product => product.is_active !== false);
    }
    if (activeProductFilter === "inactive") {
      return currentProducts.filter(product => product.is_active === false);
    }
    if (activeProductFilter === "low") {
      return currentProducts.filter(product => product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out);
    }
    return currentProducts;
  }

  function renderStockOverview(visibleProducts) {
    if (!el.stockOverview) return;
    const activeProducts = products.filter(product => isCurrentMenuProduct(product) && product.is_active !== false);
    const totalStock = activeProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const lowCount = activeProducts.filter(product => product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out).length;
    const soldOutCount = activeProducts.filter(product => product.sold_out || product.stock <= 0).length;

    el.stockOverview.innerHTML = `
      <div class="stock-metric">
        <span>当前筛选</span>
        <strong>${visibleProducts.length}</strong>
      </div>
      <div class="stock-metric">
        <span>可售总库存</span>
        <strong>${totalStock}</strong>
      </div>
      <div class="stock-metric ${lowCount ? "warning" : ""}">
        <span>低库存</span>
        <strong>${lowCount}</strong>
      </div>
      <div class="stock-metric ${soldOutCount ? "danger" : ""}">
        <span>售空</span>
        <strong>${soldOutCount}</strong>
      </div>
    `;
  }

  function normalizedRangeDates() {
    const start = rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate;
    const end = rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate;
    return { start, end };
  }

  function inActiveDateRange(day) {
    if (activeRange === "all") return true;
    if (activeRange === "today") return day === todayKey;
    if (activeRange === "date") return day === selectedDate;
    if (activeRange === "month") return String(day || "").startsWith(`${selectedMonth}-`);
    if (activeRange === "custom") {
      const { start, end } = normalizedRangeDates();
      return day >= start && day <= end;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffKey = POS.dateKey ? POS.dateKey(cutoff) : cutoff.toISOString().slice(0, 10);
    return day >= cutoffKey;
  }

  function filteredOrders(includeVoid) {
    const base = includeVoid ? orders : orders.filter(POS.isRevenueOrder);
    return base.filter(order => inActiveDateRange(order.day));
  }

  function filteredInventoryMovements() {
    return inventoryMovements.filter(item => inActiveDateRange(item.day));
  }

  function rangeLabel() {
    if (activeRange === "today") return "今天";
    if (activeRange === "7days") return "近 7 天";
    if (activeRange === "month") return `${selectedMonth} 月`;
    if (activeRange === "custom") {
      const { start, end } = normalizedRangeDates();
      return `${start} 至 ${end}`;
    }
    if (activeRange === "all") return "全部订单";
    return selectedDate;
  }

  function rangeFileLabel() {
    if (activeRange === "date") return selectedDate;
    if (activeRange === "month") return selectedMonth;
    if (activeRange === "custom") {
      const { start, end } = normalizedRangeDates();
      return `${start}_to_${end}`;
    }
    return activeRange;
  }

  function closeoutDay() {
    return activeRange === "date" ? selectedDate : todayKey;
  }

  function addToMap(map, key, qty, amount) {
    const current = map.get(key) || { qty: 0, amount: 0 };
    current.qty += qty;
    current.amount += amount;
    map.set(key, current);
  }

  function renderBars(container, rows, emptyText) {
    if (!rows.length) {
      container.innerHTML = `<div class="empty">${emptyText}</div>`;
      return;
    }
    const max = Math.max(...rows.map(row => row.amount || row.qty), 1);
    container.innerHTML = rows.map(row => {
      const value = row.amount || row.qty;
      const width = Math.max(4, (value / max) * 100);
      const detail = row.amount ? `${POS.money(row.amount)} · ${row.qty} 件` : `${row.qty} 件`;
      return `
        <div class="bar-row">
          <div class="bar-label"><strong>${row.name}</strong><span>${detail}</span></div>
          <div class="bar"><span style="width: ${width}%"></span></div>
        </div>
      `;
    }).join("");
  }

  function renderCategoryBreakdown(container, categoryStats, categoryProductMaps) {
    if (!container) return;
    const categories = POS.standardCategories.filter(category => category !== "icecream");
    container.innerHTML = categories.map(category => {
      const stats = categoryStats[category] || { qty: 0, amount: 0 };
      const rows = [...(categoryProductMaps[category] || new Map()).entries()]
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount);
      const listHtml = rows.length
        ? rows.map(row => {
          const max = Math.max(...rows.map(item => item.amount || item.qty), 1);
          const value = row.amount || row.qty;
          const width = Math.max(4, (value / max) * 100);
          return `
            <div class="bar-row">
              <div class="bar-label"><strong>${escapeHtml(row.name)}</strong><span>${POS.money(row.amount)} · ${row.qty} 件</span></div>
              <div class="bar"><span style="width: ${width}%"></span></div>
            </div>
          `;
        }).join("")
        : `<div class="empty">当前范围内还没有${POS.categoryLabel(category)}销售。</div>`;
      return `
        <section class="category-stat">
          <div class="category-stat-head">
            <strong>${POS.categoryLabel(category)}</strong>
            <span>${stats.qty} 件 · ${POS.money(stats.amount)}</span>
          </div>
          ${listHtml}
        </section>
      `;
    }).join("");
  }

  function activeOrdersForDay(day) {
    return orders.filter(order => order.day === day && POS.isRevenueOrder(order));
  }

  function todayCashExpected() {
    return activeOrdersForDay(closeoutDay())
      .filter(order => POS.normalizePaymentMethod(order.payment_method) === "cash")
      .reduce((sum, order) => sum + orderAmount(order), 0);
  }

  function todayCloseout() {
    return closeouts.find(closeout => closeout.day === closeoutDay());
  }

  function renderCloseout(options = {}) {
    const expected = todayCashExpected();
    const closeout = todayCloseout();
    if (!options.preserveInput) {
      el.actualCash.value = closeout ? (closeout.actual_cash_amount ?? closeout.actual_cash ?? "") : "";
    }
    const actual = Number(el.actualCash.value || (closeout ? (closeout.actual_cash_amount ?? closeout.actual_cash) : 0));
    const diff = actual - expected;

    el.expectedCash.textContent = POS.money(expected);
    el.cashDiff.textContent = POS.money(diff);
    if (el.cashDifference) el.cashDifference.textContent = POS.money(diff);
    el.closeHistory.textContent = closeout
      ? `已保存：系统现金 ${POS.money(closeout.system_cash ?? closeout.expected_cash)}，实际现金 ${POS.money(closeout.actual_cash_amount ?? closeout.actual_cash)}，差额 ${POS.money(closeout.cash_difference ?? closeout.diff)}，时间 ${closeout.time_text}`
      : `${closeoutDay()} 还没有日结记录。`;
  }

  function renderMenuEditor() {
    const visibleProducts = filteredProducts();
    if (!visibleProducts.length) {
      el.menuEditor.innerHTML = `<div class="empty">当前筛选下没有产品。</div>`;
      return;
    }

    el.menuEditor.innerHTML = visibleProducts.map(product => {
      const isMatrixProduct = currentProductIds.has(product.id);
      return `
      <form class="menu-row" data-product-form="${escapeAttr(product.id)}">
        <img class="menu-thumb" src="${escapeAttr(product.image_path)}" alt="${escapeAttr(product.name)}">
        <div class="menu-row-title">
          <strong>${escapeHtml(isMatrixProduct ? "冰淇淋 SKU" : "普通产品")}</strong>
          <small>${escapeHtml(product.id)}</small>
        </div>
        <label>
          产品名
          <input class="field-input" name="name" value="${escapeAttr(product.name)}" required>
        </label>
        <label>
          中文说明
          <input class="field-input" name="note" value="${escapeAttr(product.note)}">
        </label>
        <label>
          分类
          <select class="field-input" name="category" required>
            ${POS.standardCategories.map(category => `<option value="${category}" ${product.category === category ? "selected" : ""}>${POS.categoryLabel(category)}</option>`).join("")}
          </select>
        </label>
        <label>
          子分类
          <input class="field-input" name="subcategory" value="${escapeAttr(product.subcategory || product.shape || "")}" placeholder="例如：钥匙扣 / 激光雕刻">
        </label>
        <label>
          形状
          <input class="field-input" name="shape" value="${escapeAttr(product.shape || "")}" ${isMatrixProduct ? "readonly" : ""}>
        </label>
        <label>
          口味
          <input class="field-input" name="flavor" value="${escapeAttr(product.flavor || "")}" ${isMatrixProduct ? "readonly" : ""}>
        </label>
        <label>
          售价 KIP
          <input class="field-input" name="price" type="number" min="0" step="1000" value="${product.selling_price}" required>
        </label>
        <label>
          库存
          <input class="field-input" name="stock" type="number" min="0" step="1" value="${product.stock}" required>
        </label>
        <label>
          排序
          <input class="field-input" name="sort_order" type="number" step="1" value="${product.sort_order}" required>
        </label>
        <label>
          低库存提醒
          <input class="field-input" name="low_stock_threshold" type="number" min="0" step="1" value="${product.low_stock_threshold || lowStockThreshold}" required>
        </label>
        <label>
          形状排序
          <input class="field-input" name="shape_order" type="number" step="1" value="${product.shape_order || 0}" ${isMatrixProduct ? "readonly" : ""}>
        </label>
        <label>
          口味排序
          <input class="field-input" name="flavor_order" type="number" step="1" value="${product.flavor_order || 0}" ${isMatrixProduct ? "readonly" : ""}>
        </label>
        <label>
          图片路径
          <input class="field-input" name="image_path" value="${escapeAttr(product.image_path)}" required>
        </label>
        <label class="image-upload">
          上传图片
          <input type="file" accept="image/png,image/jpeg,image/webp" data-image-upload="${escapeAttr(product.id)}">
          <span class="upload-hint">选择图片后自动更新</span>
        </label>
        <label class="soldout-check">
          <input name="sold_out" type="checkbox" ${product.sold_out ? "checked" : ""}>
          售罄
        </label>
        <label class="soldout-check">
          <input name="is_active" type="checkbox" ${product.is_active !== false ? "checked" : ""}>
          前台显示
        </label>
        <button class="button primary" type="submit">保存</button>
        ${isMatrixProduct ? "" : `<button class="button danger" type="button" data-delete-product="${escapeAttr(product.id)}">删除</button>`}
      </form>
    `;
    }).join("");
  }

  function reasonText(reason) {
    const labels = {
      sale: "销售扣减",
      gift: "赠品扣减",
      restock: "补货",
      adjustment: "盘点调整",
      correction: "盘点调整",
      waste: "损耗",
      sample: "试吃",
      return: "退货",
      cancel_return: "取消订单恢复库存",
      void: "取消加回",
      promotion: "促销赠品"
    };
    return labels[reason] || reason || "其他";
  }

  function renderInventoryMovements() {
    if (!el.inventoryMovements) return;
    const visibleMovements = filteredInventoryMovements();
    if (!visibleMovements.length) {
      el.inventoryMovements.innerHTML = `<div class="empty">还没有库存记录。补货、盘点修正、销售扣减后会显示在这里。</div>`;
      return;
    }

    el.inventoryMovements.innerHTML = visibleMovements.slice(0, 60).map(item => {
      const change = Number(item.quantity_change ?? item.change_qty ?? 0);
      const sign = change > 0 ? "+" : "";
      const tone = change > 0 ? "plus" : "minus";
      const reason = item.change_type || item.reason;
      return `
        <div class="movement-item">
          <div>
            <strong>${escapeHtml(item.product_name)}</strong>
            <small>${escapeHtml(item.day)} ${escapeHtml(item.time_text)} · ${reasonText(reason)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small>
          </div>
          <div class="movement-numbers">
            <strong class="${tone}">${sign}${change}</strong>
            <small>${item.stock_before ?? item.before_stock} → ${item.stock_after ?? item.after_stock}</small>
          </div>
        </div>
      `;
    }).join("");
  }

  function render() {
    const activeOrders = filteredOrders(false);
    const sales = activeOrders.reduce((sum, order) => sum + orderAmount(order), 0);
    const itemCount = activeOrders.reduce((sum, order) => {
      return sum + order.order_items.reduce((part, item) => part + itemQty(item), 0);
    }, 0);
    let iceCreamSales = 0;
    let otherSales = 0;
    let iceCreamItemCount = 0;
    let customItemCount = 0;
    let merchItemCount = 0;
    let drinkItemCount = 0;
    let bundleItemCount = 0;
    let otherItemCount = 0;
    let cashSales = 0;
    let qrSales = 0;
    let otherPaymentSales = 0;

    const productMap = new Map();
    const iceCreamProductMap = new Map();
    const paymentMap = new Map();
    const categoryMap = new Map();
    const categoryProductMaps = Object.fromEntries(POS.standardCategories.map(category => [category, new Map()]));
    const categoryStats = Object.fromEntries(POS.standardCategories.map(category => [category, { qty: 0, amount: 0 }]));

    activeOrders.forEach(order => {
      const method = POS.normalizePaymentMethod(order.payment_method);
      const amount = orderAmount(order);
      if (method === "cash") cashSales += amount;
      if (method === "qr") qrSales += amount;
      if (!["cash", "qr"].includes(method)) otherPaymentSales += amount;
      addToMap(paymentMap, POS.paymentLabel(method), 1, amount);
      order.order_items.forEach(item => {
        const product = productById(item.product_id);
        const qty = itemQty(item);
        const lineAmount = itemNetSubtotal(order, item);
        const category = itemCategory(item, product);
        const itemName = item.product_name || item.name || (product && product.name) || "商品";
        const stats = categoryStats[category] || categoryStats.other;
        stats.qty += qty;
        stats.amount += lineAmount;
        addToMap(categoryProductMaps[category] || categoryProductMaps.other, itemName, qty, lineAmount);
        if (category === "icecream") {
          iceCreamSales += lineAmount;
          iceCreamItemCount += qty;
          addToMap(iceCreamProductMap, itemName, qty, lineAmount);
        } else {
          otherSales += lineAmount;
          if (category === "custom") customItemCount += qty;
          else if (category === "merch") merchItemCount += qty;
          else if (category === "drink") drinkItemCount += qty;
          else if (category === "bundle") bundleItemCount += qty;
          else otherItemCount += qty;
        }
        addToMap(productMap, itemName, qty, lineAmount);
        addToMap(categoryMap, POS.categoryLabel(category), qty, lineAmount);
      });
    });

    const productRows = [...productMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
    const iceCreamRows = [...iceCreamProductMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
    const paymentRows = [...paymentMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
    const categoryRows = [...categoryMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);

    el.rangeText.textContent = `${rangeLabel()} · ${POS.todayLabel ? POS.todayLabel() : new Date().toLocaleDateString("zh-CN")}`;
    el.salesTotal.textContent = POS.money(sales);
    el.orderCount.textContent = activeOrders.length;
    el.itemCount.textContent = itemCount;
    if (el.iceCreamItemCount) el.iceCreamItemCount.textContent = iceCreamItemCount;
    if (el.customItemCount) el.customItemCount.textContent = customItemCount;
    if (el.merchItemCount) el.merchItemCount.textContent = merchItemCount;
    if (el.drinkItemCount) el.drinkItemCount.textContent = drinkItemCount;
    if (el.bundleItemCount) el.bundleItemCount.textContent = bundleItemCount;
    if (el.otherItemCount) el.otherItemCount.textContent = otherItemCount;
    if (el.cashSales) el.cashSales.textContent = POS.money(cashSales);
    if (el.qrSales) el.qrSales.textContent = POS.money(qrSales);
    if (el.otherPaymentSales) el.otherPaymentSales.textContent = POS.money(otherPaymentSales);
    if (el.lowStockSkuCount) {
      el.lowStockSkuCount.textContent = products.filter(product =>
        isCurrentMenuProduct(product) &&
        product.is_active !== false &&
        (product.sold_out || product.stock <= (product.low_stock_threshold || lowStockThreshold))
      ).length;
    }
    el.avgOrder.textContent = POS.money(activeOrders.length ? Math.round(sales / activeOrders.length) : 0);

    renderBars(el.productRanking, iceCreamRows, "当前范围内还没有冰淇淋销售。");
    renderCategoryBreakdown(el.categoryBreakdown, categoryStats, categoryProductMaps);
    renderBars(el.paymentSummary, paymentRows, "当前范围内还没有付款记录。");
    renderBars(el.categorySummary, categoryRows, "当前范围内还没有类别数据。");

    const visibleProducts = filteredProducts();
    renderStockOverview(visibleProducts);
    el.stockSummary.innerHTML = visibleProducts.length ? visibleProducts.map(product => {
      const threshold = product.low_stock_threshold || lowStockThreshold;
      const low = product.stock <= threshold || product.sold_out;
      const soldOut = product.sold_out || product.stock <= 0;
      const stockTone = soldOut ? "danger" : low ? "warning" : "";
      return `
      <article class="stock-card ${low ? "low" : ""}" data-stock-row="${escapeAttr(product.id)}">
        <div class="stock-card-main">
          <div>
            <strong>${escapeHtml(productDisplayName(product))}</strong>
            <small>${escapeHtml(product.note || product.name)}${product.category ? ` · ${escapeHtml(POS.categoryLabel(product.category))}` : ""}</small>
          </div>
          <div class="stock-count ${stockTone}">
            <span>库存</span>
            <strong data-stock-count="${escapeAttr(product.id)}">${product.stock}</strong>
          </div>
        </div>
        <div class="stock-status-row">
          <span class="stock-pill ${product.is_active === false ? "danger" : ""}">${product.is_active === false ? "已下架" : "上架中"}</span>
          <span class="stock-pill ${soldOut ? "danger" : low ? "warning" : ""}" data-stock-state="${escapeAttr(product.id)}">${soldOut ? "售空" : low ? "低库存" : "可售"}</span>
        </div>
        <div class="stock-adjust" aria-label="${escapeAttr(product.name)}快捷调库存">
          <button class="mini-button stock-step danger" data-stock-step="${escapeAttr(product.id)}" data-step="-1">-1</button>
          <button class="mini-button stock-step" data-stock-step="${escapeAttr(product.id)}" data-step="1">+1</button>
          <button class="mini-button stock-step" data-stock-step="${escapeAttr(product.id)}" data-step="5">+5</button>
          <button class="mini-button stock-step" data-stock-step="${escapeAttr(product.id)}" data-step="10">+10</button>
          <button class="mini-button stock-step" data-stock-zero="${escapeAttr(product.id)}">归零</button>
        </div>
        <div class="stock-controls">
          <input class="field-input stock-input" data-stock-input="${escapeAttr(product.id)}" type="number" min="0" step="1" value="${product.stock}" aria-label="${escapeAttr(product.name)}库存">
          <select class="field-input stock-reason" data-stock-reason="${escapeAttr(product.id)}" aria-label="${escapeAttr(product.name)}库存原因">
            <option value="restock">补货</option>
            <option value="adjustment">盘点调整</option>
            <option value="waste">损耗</option>
            <option value="sample">试吃</option>
          </select>
          <input class="field-input stock-note" data-stock-note="${escapeAttr(product.id)}" placeholder="备注">
          <label class="compact-check">
            <input data-stock-soldout="${escapeAttr(product.id)}" type="checkbox" ${product.sold_out ? "checked" : ""}>
            售罄
          </label>
          <button class="mini-button ${product.is_active === false ? "active" : ""}" data-toggle-active="${escapeAttr(product.id)}">
            ${product.is_active === false ? "重新上架" : "下架"}
          </button>
          <button class="mini-button primary" data-save-stock="${escapeAttr(product.id)}">保存库存</button>
        </div>
      </article>
    `;
    }).join("") : `<div class="empty">当前筛选下没有产品。</div>`;

    const tableOrders = filteredOrders(true);
    el.ordersBody.innerHTML = tableOrders.length ? tableOrders.map(order => {
      const items = order.order_items.map(item => `${item.product_name || item.name} x${itemQty(item)}`).join("、");
      const canCancel = POS.isRevenueOrder(order);
      return `
        <tr>
          <td>${order.day}</td>
          <td>${order.time_text}</td>
          <td>${items}</td>
          <td>${POS.paymentLabel(order.payment_method)}</td>
          <td><strong>${POS.money(orderAmount(order))}</strong></td>
          <td>${statusLabel(order.status)}</td>
          <td>${canCancel ? `<button class="mini-button" data-void="${order.id}">取消</button>` : ""}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="7">当前范围内还没有订单。</td></tr>`;

    renderMenuEditor();
    renderInventoryMovements();
    renderCloseout();
  }

  async function toggleSoldOut(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    const result = await client
      .from("products")
      .update({ sold_out: !product.sold_out })
      .eq("id", productId);
    if (result.error) {
      POS.showToast(result.error.message);
      return;
    }
    await refresh();
  }

  function stockRow(productId) {
    return document.querySelector(`[data-stock-row="${productId}"]`);
  }

  function updateStockDraft(productId, stock, options = {}) {
    const row = stockRow(productId);
    const input = row && row.querySelector(`[data-stock-input="${productId}"]`);
    const soldOut = row && row.querySelector(`[data-stock-soldout="${productId}"]`);
    const reason = row && row.querySelector(`[data-stock-reason="${productId}"]`);
    const note = row && row.querySelector(`[data-stock-note="${productId}"]`);
    const count = row && row.querySelector(`[data-stock-count="${productId}"]`);
    const state = row && row.querySelector(`[data-stock-state="${productId}"]`);
    if (!input) return;

    const nextStock = Math.max(0, Math.floor(stock));
    const product = products.find(item => item.id === productId);
    const threshold = product ? product.low_stock_threshold || lowStockThreshold : lowStockThreshold;
    input.value = nextStock;
    row.classList.toggle("low", nextStock <= threshold);
    if (count) {
      count.textContent = nextStock;
      const countBox = count.closest(".stock-count");
      if (countBox) {
        countBox.classList.toggle("danger", nextStock === 0);
        countBox.classList.toggle("warning", nextStock > 0 && nextStock <= threshold);
      }
    }
    if (state) {
      state.textContent = nextStock === 0 ? "售空" : nextStock <= threshold ? "低库存" : "可售";
      state.classList.toggle("danger", nextStock === 0);
      state.classList.toggle("warning", nextStock > 0 && nextStock <= threshold);
    }
    if (soldOut) {
      soldOut.checked = options.soldOut ?? nextStock === 0;
    }
    if (reason && options.reason) {
      reason.value = options.reason;
    }
    if (note && options.note && !note.value.trim()) {
      note.value = options.note;
    }
  }

  function adjustStockDraft(productId, delta) {
    const row = stockRow(productId);
    const input = row && row.querySelector(`[data-stock-input="${productId}"]`);
    if (!input) return;
    const current = Number(input.value || 0);
    const next = Math.max(0, current + delta);
    updateStockDraft(productId, next, {
      soldOut: next === 0,
      reason: delta > 0 ? "restock" : "adjustment"
    });
  }

  function zeroStockDraft(productId) {
    updateStockDraft(productId, 0, {
      soldOut: true,
      reason: "adjustment",
      note: "售空归零"
    });
  }

  async function saveStock(productId, button) {
    if (!window.navigator.onLine) {
      POS.showToast("当前离线，库存需要联网保存");
      return false;
    }

    const row = document.querySelector(`[data-stock-row="${productId}"]`);
    const input = row && row.querySelector(`[data-stock-input="${productId}"]`);
    const soldOut = row && row.querySelector(`[data-stock-soldout="${productId}"]`);
    const reason = row && row.querySelector(`[data-stock-reason="${productId}"]`);
    const note = row && row.querySelector(`[data-stock-note="${productId}"]`);
    const stock = Number(input ? input.value : NaN);

    if (!Number.isFinite(stock) || stock < 0) {
      POS.showToast("库存必须是 0 或更大的数字");
      return false;
    }

    POS.setBusy(button, true, "保存中");
    let result;
    try {
      const payload = {
        p_product_id: productId,
        p_new_stock: Math.floor(stock),
        p_sold_out: Boolean(soldOut && soldOut.checked),
        p_reason: reason ? reason.value : "adjustment",
        p_note: note ? note.value.trim() : "",
        p_time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        p_day: todayKey,
        p_operator: document.querySelector("#signedInAs") ? document.querySelector("#signedInAs").textContent : ""
      };
      result = await client.rpc("adjust_stock", payload);
      if (result.error && /function|schema cache|parameter|argument|Invalid adjustment reason/i.test(result.error.message || "")) {
        result = await client.rpc("adjust_stock", {
          p_product_id: payload.p_product_id,
          p_new_stock: payload.p_new_stock,
          p_sold_out: payload.p_sold_out,
          p_reason: payload.p_reason === "restock" ? "restock" : payload.p_reason === "waste" ? "waste" : "correction",
          p_note: payload.p_note,
          p_time_text: payload.p_time_text,
          p_day: payload.p_day
        });
      }
    } catch (error) {
      POS.showToast(error.message || "库存保存失败");
      return false;
    } finally {
      POS.setBusy(button, false);
    }

    if (result && result.error) {
      POS.showToast(result.error.message && result.error.message.includes("adjust_stock") ? "需要先执行库存记录数据库升级" : result.error.message || "库存保存失败");
      return false;
    }

    POS.showToast("库存已保存并记录");
    await refresh();
    return true;
  }

  async function uploadProductImage(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const productId = input.dataset.imageUpload;
    const form = input.closest("[data-product-form]");
    const imagePathInput = form && form.querySelector("[name='image_path']");

    if (!file.type.startsWith("image/")) {
      POS.showToast("请选择图片文件");
      input.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      POS.showToast("图片不能超过 10MB");
      input.value = "";
      return;
    }

    const uploadLabel = input.closest(".image-upload");
    uploadLabel.classList.add("uploading");
    try {
      const compressed = await imageFileToDataUrl(file);
      if (imagePathInput) {
        imagePathInput.value = compressed.dataUrl;
      }

      const updateResult = await client
        .from("products")
        .update({ image_path: compressed.dataUrl, updated_at: new Date().toISOString() })
        .eq("id", productId);

      if (updateResult.error) {
        POS.showToast(updateResult.error.message);
        return;
      }

      POS.showToast(`图片已压缩并更新：${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)}`);
      await refresh();
    } catch (error) {
      POS.showToast(error.message);
    } finally {
      uploadLabel.classList.remove("uploading");
      input.value = "";
    }
  }

  async function saveProduct(form) {
    if (!window.navigator.onLine) {
      POS.showToast("当前离线，菜单需要联网保存");
      return;
    }

    const productId = form.dataset.productForm;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      note: String(formData.get("note") || "").trim(),
      category: POS.normalizeCategory(formData.get("category")),
      subcategory: String(formData.get("subcategory") || "").trim(),
      shape: String(formData.get("shape") || "").trim(),
      flavor: String(formData.get("flavor") || "").trim(),
      price: Number(formData.get("price") || 0),
      selling_price: Number(formData.get("price") || 0),
      stock: Number(formData.get("stock") || 0),
      sort_order: Number(formData.get("sort_order") || 0),
      shape_order: Number(formData.get("shape_order") || 0),
      flavor_order: Number(formData.get("flavor_order") || 0),
      low_stock_threshold: Number(formData.get("low_stock_threshold") || lowStockThreshold),
      image_path: String(formData.get("image_path") || "").trim(),
      sold_out: formData.has("sold_out"),
      is_active: formData.has("is_active"),
      is_deleted: false,
      updated_at: new Date().toISOString()
    };

    if (!payload.name || !payload.category || !payload.image_path) {
      POS.showToast("产品名、分类和图片路径不能为空");
      return;
    }

    if (!Number.isFinite(payload.price) || !Number.isFinite(payload.low_stock_threshold) || !Number.isFinite(payload.stock) || !Number.isFinite(payload.sort_order) || !Number.isFinite(payload.shape_order) || !Number.isFinite(payload.flavor_order)) {
      POS.showToast("价格、库存和排序必须是数字");
      return;
    }

    const button = form.querySelector("button[type='submit']");
    POS.setBusy(button, true, "保存中");
    let result;
    try {
      result = await client
        .from("products")
        .update(payload)
        .eq("id", productId);
    } catch (error) {
      POS.showToast(error.message || "保存失败");
      return;
    } finally {
      POS.setBusy(button, false);
    }

    if (result.error) {
      const fallback = await client
        .from("products")
        .update({
          stock: Math.floor(payload.stock),
          sold_out: payload.sold_out,
          updated_at: new Date().toISOString()
        })
        .eq("id", productId);

      if (fallback.error) {
        POS.showToast(fallback.error.message || result.error.message || "保存失败");
        return;
      }

      POS.showToast("库存已保存");
      await refresh();
      return;
    }

    POS.showToast("菜单已更新");
    await refresh();
  }

  async function addProduct(form) {
    if (!window.navigator.onLine) {
      POS.showToast("当前离线，新增产品需要联网保存");
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const category = POS.normalizeCategory(formData.get("category"));
    const price = Number(formData.get("price") || 0);
    const stock = Number(formData.get("stock") || 0);
    const lowStock = Number(formData.get("low_stock_threshold") || lowStockThreshold);
    const note = String(formData.get("note") || "").trim();

    if (!name || !category) {
      POS.showToast("产品名称和分类不能为空");
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0 || !Number.isFinite(lowStock) || lowStock < 0) {
      POS.showToast("价格、库存和低库存提醒必须是 0 或更大的数字");
      return;
    }

    const button = form.querySelector("button[type='submit']");
    const payload = {
      id: makeProductId(name, category),
      name,
      category,
      subcategory: "",
      shape: "",
      flavor: "",
      shape_order: 0,
      flavor_order: 0,
      price: Math.floor(price),
      selling_price: Math.floor(price),
      stock: Math.floor(stock),
      low_stock_threshold: Math.floor(lowStock),
      sold_out: Math.floor(stock) <= 0,
      is_active: true,
      is_deleted: false,
      image_path: "assets/icons/app-icon-512.png",
      note,
      sort_order: category === "custom" ? 100 + products.length : 200 + products.length,
      updated_at: new Date().toISOString()
    };

    POS.setBusy(button, true, "新增中");
    const result = await client.from("products").upsert(payload);
    POS.setBusy(button, false);

    if (result.error) {
      POS.showToast(result.error.message && result.error.message.includes("is_deleted") ? "需要先执行产品管理数据库升级" : result.error.message || "新增失败");
      return;
    }

    form.reset();
    form.querySelector("[name='stock']").value = "0";
    POS.showToast("产品已新增");
    await refresh();
  }

  async function deleteProduct(productId, button) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    if (currentProductIds.has(productId)) {
      POS.showToast("冰淇淋矩阵产品不能删除，只能下架或售罄");
      return;
    }

    const confirmed = window.confirm(`确认删除「${product.name}」？历史销售记录会保留。`);
    if (!confirmed) return;

    POS.setBusy(button, true, "删除中");
    const result = await client
      .from("products")
      .update({
        is_deleted: true,
        is_active: false,
        sold_out: true,
        stock: 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId);
    POS.setBusy(button, false);

    if (result.error) {
      POS.showToast(result.error.message && result.error.message.includes("is_deleted") ? "需要先执行产品管理数据库升级" : result.error.message || "删除失败");
      return;
    }

    POS.showToast("产品已从当前菜单删除");
    await refresh();
  }

  async function voidOrder(orderId) {
    const confirmed = window.confirm("确认取消这笔订单？库存会自动加回，并生成退回库存流水。");
    if (!confirmed) return;
    const result = await client.rpc("void_order", { p_order_id: orderId });
    if (result.error) {
      POS.showToast(result.error.message);
      return;
    }
    POS.showToast("订单已取消，库存已加回");
    await refresh();
  }

  async function saveCloseout() {
    const expected = todayCashExpected();
    const actual = Number(el.actualCash.value || 0);
    const day = closeoutDay();
    const todayOrders = activeOrdersForDay(day);
    const cashSales = todayOrders
      .filter(order => POS.normalizePaymentMethod(order.payment_method) === "cash")
      .reduce((sum, order) => sum + orderAmount(order), 0);
    const qrSales = todayOrders
      .filter(order => POS.normalizePaymentMethod(order.payment_method) === "qr")
      .reduce((sum, order) => sum + orderAmount(order), 0);
    const otherSales = todayOrders
      .filter(order => !["cash", "qr"].includes(POS.normalizePaymentMethod(order.payment_method)))
      .reduce((sum, order) => sum + orderAmount(order), 0);
    const payload = {
      day,
      time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      expected_cash: expected,
      actual_cash: actual,
      diff: actual - expected,
      cashier: document.querySelector("#signedInAs") ? document.querySelector("#signedInAs").textContent : "",
      system_cash: expected,
      actual_cash_amount: actual,
      cash_difference: actual - expected,
      cash_sales: cashSales,
      qr_sales: qrSales,
      other_sales: otherSales,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    let result = await client.from("closeouts").upsert(payload);
    if (result.error && /column|schema cache/i.test(result.error.message || "")) {
      result = await client.from("closeouts").upsert({
        day: payload.day,
        time_text: payload.time_text,
        expected_cash: payload.expected_cash,
        actual_cash: payload.actual_cash,
        diff: payload.diff,
        updated_at: payload.updated_at
      });
    }
    if (result.error) {
      POS.showToast(result.error.message);
      return;
    }
    POS.showToast("日结已保存");
    await refresh();
  }

  function downloadCsv(rows, filename) {
    const csv = rows.map(row => row.map(POS.csvEscape).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportOrdersCsv() {
    const rows = [[
      "date", "time", "order_id", "total_amount", "payment_method", "status", "cashier", "items_summary"
    ]];
    filteredOrders(true).forEach(order => {
      const itemsSummary = order.order_items.map(item => {
        return `${item.product_name || item.name} x${itemQty(item)}`;
      }).join("、");
      rows.push([
        order.day,
        order.time_text,
        order.id,
        orderAmount(order),
        POS.normalizePaymentMethod(order.payment_method),
        order.status || "paid",
        order.cashier || "",
        itemsSummary
      ]);
    });
    downloadCsv(rows, `patuxai-pops-orders-${rangeFileLabel()}.csv`);
  }

  function exportItemsCsv() {
    const rows = [[
      "date", "time", "order_id", "product_id", "product_name", "category", "subcategory",
      "quantity", "unit_price", "subtotal", "payment_method", "status"
    ]];
    filteredOrders(true).forEach(order => {
      order.order_items.forEach(item => {
        const product = productById(item.product_id);
        rows.push([
          order.day,
          order.time_text,
          order.id,
          item.product_id,
          item.product_name || item.name,
          itemCategory(item, product),
          item.subcategory || (product && product.subcategory) || "",
          itemQty(item),
          itemUnitPrice(item),
          itemSubtotal(item),
          POS.normalizePaymentMethod(order.payment_method),
          order.status || "paid"
        ]);
      });
    });
    downloadCsv(rows, `patuxai-pops-order-items-${rangeFileLabel()}.csv`);
  }

  function exportInventoryCsv() {
    const rows = [[
      "date", "time", "product_id", "product_name", "category", "change_type",
      "quantity_change", "stock_before", "stock_after", "operator", "note"
    ]];
    filteredInventoryMovements().forEach(item => {
      rows.push([
        item.day,
        item.time_text,
        item.product_id,
        item.product_name,
        POS.normalizeCategory(item.category),
        item.change_type || item.reason,
        item.quantity_change ?? item.change_qty ?? 0,
        item.stock_before ?? item.before_stock ?? 0,
        item.stock_after ?? item.after_stock ?? 0,
        item.operator || "",
        item.note || ""
      ]);
    });
    downloadCsv(rows, `patuxai-pops-inventory-${rangeFileLabel()}.csv`);
  }

  async function testConnection() {
    POS.setBusy(el.testConnection, true, "测试中");
    const result = await client
      .from("products")
      .select("id")
      .order("sort_order", { ascending: true });
    POS.setBusy(el.testConnection, false);

    if (result.error) {
      POS.showToast(result.error.message || "数据库连接失败");
      return;
    }

    POS.showToast("数据库连接正常");
  }

  async function toggleActive(productId, button) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    POS.setBusy(button, true, product.is_active === false ? "上架中" : "下架中");
    const result = await client
      .from("products")
      .update({
        is_active: product.is_active === false,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId);
    POS.setBusy(button, false);

    if (result.error) {
      POS.showToast(result.error.message && result.error.message.includes("is_active") ? "需要先执行上下架数据库升级" : result.error.message || "上下架失败");
      return;
    }

    POS.showToast(product.is_active === false ? "产品已上架" : "产品已下架，前台不再显示");
    await refresh();
  }

  function syncDateInputs() {
    if (el.dateFilter) el.dateFilter.value = selectedDate;
    if (el.dateSearchInput) el.dateSearchInput.value = selectedDate;
    if (el.monthSearchInput) el.monthSearchInput.value = selectedMonth;
    if (el.rangeStartInput) el.rangeStartInput.value = rangeStartDate;
    if (el.rangeEndInput) el.rangeEndInput.value = rangeEndDate;
  }

  function applyDateFilter(value) {
    if (!value) return;
    selectedDate = value;
    activeRange = "date";
    document.querySelectorAll("[data-range]").forEach(item => item.classList.remove("active"));
    syncDateInputs();
    render();
  }

  function applyMonthFilter(value) {
    if (!value) return;
    selectedMonth = value;
    activeRange = "month";
    document.querySelectorAll("[data-range]").forEach(item => {
      item.classList.toggle("active", item.dataset.range === "month" && value === todayKey.slice(0, 7));
    });
    syncDateInputs();
    render();
  }

  function applyCustomRange(startValue, endValue) {
    if (!startValue || !endValue) return;
    rangeStartDate = startValue;
    rangeEndDate = endValue;
    activeRange = "custom";
    document.querySelectorAll("[data-range]").forEach(item => item.classList.remove("active"));
    syncDateInputs();
    render();
  }

  document.querySelector(".range").addEventListener("click", event => {
    const button = event.target.closest("[data-range]");
    if (!button) return;
    activeRange = button.dataset.range;
    document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("active", item === button));
    if (activeRange === "today") selectedDate = todayKey;
    if (activeRange === "month") selectedMonth = todayKey.slice(0, 7);
    syncDateInputs();
    render();
  });

  if (el.dateFilter) {
    syncDateInputs();
    el.dateFilter.addEventListener("change", () => {
      applyDateFilter(el.dateFilter.value);
    });
  }

  if (el.dateSearchInput) {
    syncDateInputs();
    el.dateSearchInput.addEventListener("change", () => {
      applyDateFilter(el.dateSearchInput.value);
    });
  }

  if (el.dateSearchBtn) {
    el.dateSearchBtn.addEventListener("click", () => {
      applyDateFilter(el.dateSearchInput && el.dateSearchInput.value);
    });
  }

  if (el.monthSearchInput) {
    syncDateInputs();
    el.monthSearchInput.addEventListener("change", () => {
      applyMonthFilter(el.monthSearchInput.value);
    });
  }

  if (el.monthSearchBtn) {
    el.monthSearchBtn.addEventListener("click", () => {
      applyMonthFilter(el.monthSearchInput && el.monthSearchInput.value);
    });
  }

  if (el.rangeStartInput || el.rangeEndInput) {
    syncDateInputs();
  }

  if (el.rangeSearchBtn) {
    el.rangeSearchBtn.addEventListener("click", () => {
      applyCustomRange(
        el.rangeStartInput && el.rangeStartInput.value,
        el.rangeEndInput && el.rangeEndInput.value
      );
    });
  }

  if (el.productFilters) {
    el.productFilters.addEventListener("click", event => {
      const button = event.target.closest("[data-product-filter]");
      if (!button) return;
      activeProductFilter = button.dataset.productFilter;
      el.productFilters.querySelectorAll("[data-product-filter]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      render();
    });
  }

  window.addEventListener("hashchange", () => setAdminView(currentAdminView()));

  document.body.addEventListener("click", event => {
    const soldOutButton = event.target.closest("[data-soldout]");
    if (soldOutButton) {
      toggleSoldOut(soldOutButton.dataset.soldout);
      return;
    }
    const stockStepButton = event.target.closest("[data-stock-step]");
    if (stockStepButton) {
      adjustStockDraft(stockStepButton.dataset.stockStep, Number(stockStepButton.dataset.step || 0));
      return;
    }
    const stockZeroButton = event.target.closest("[data-stock-zero]");
    if (stockZeroButton) {
      zeroStockDraft(stockZeroButton.dataset.stockZero);
      return;
    }
    const saveStockButton = event.target.closest("[data-save-stock]");
    if (saveStockButton) {
      saveStock(saveStockButton.dataset.saveStock, saveStockButton);
      return;
    }
    const activeButton = event.target.closest("[data-toggle-active]");
    if (activeButton) {
      toggleActive(activeButton.dataset.toggleActive, activeButton);
      return;
    }
    const deleteProductButton = event.target.closest("[data-delete-product]");
    if (deleteProductButton) {
      deleteProduct(deleteProductButton.dataset.deleteProduct, deleteProductButton);
      return;
    }
    const voidButton = event.target.closest("[data-void]");
    if (voidButton) {
      voidOrder(voidButton.dataset.void);
    }
  });

  el.stockSummary.addEventListener("input", event => {
    const input = event.target.closest("[data-stock-input]");
    if (!input) return;
    const stock = Number(input.value || 0);
    if (!Number.isFinite(stock)) return;
    updateStockDraft(input.dataset.stockInput, stock, { soldOut: stock <= 0 });
  });

  el.stockSummary.addEventListener("change", event => {
    const soldOut = event.target.closest("[data-stock-soldout]");
    if (!soldOut) return;
    const input = document.querySelector(`[data-stock-input="${soldOut.dataset.stockSoldout}"]`);
    const stock = Number(input ? input.value || 0 : 0);
    updateStockDraft(soldOut.dataset.stockSoldout, stock, { soldOut: soldOut.checked });
  });

  el.actualCash.addEventListener("input", () => renderCloseout({ preserveInput: true }));
  el.saveCloseout.addEventListener("click", saveCloseout);
  if (el.exportOrdersCsv) el.exportOrdersCsv.addEventListener("click", exportOrdersCsv);
  if (el.exportItemsCsv) el.exportItemsCsv.addEventListener("click", exportItemsCsv);
  if (el.exportInventoryCsv) el.exportInventoryCsv.addEventListener("click", exportInventoryCsv);
  if (el.testConnection) el.testConnection.addEventListener("click", testConnection);
  if (el.backTop) {
    el.backTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", updateBackTop, { passive: true });
    updateBackTop();
  }
  if (el.addProductForm) {
    el.addProductForm.addEventListener("submit", event => {
      event.preventDefault();
      addProduct(event.target);
    });
  }
  el.menuEditor.addEventListener("submit", event => {
    event.preventDefault();
    saveProduct(event.target);
  });
  el.menuEditor.addEventListener("change", event => {
    const input = event.target.closest("[data-image-upload]");
    if (!input) return;
    uploadProductImage(input);
  });

  setAdminView(currentAdminView());
  POS.initAuth(client, refresh).catch(error => POS.showToast(error.message));
})();
