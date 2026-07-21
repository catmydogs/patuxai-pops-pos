(function () {
  const client = POS.getClient();
  const todayKey = POS.todayKey();
  const lowStockThreshold = POS.lowStockThreshold || 10;
  const filterStorageKey = "patuxai-pops-admin-filters";
  let savedFilters = {};
  try { savedFilters = JSON.parse(window.localStorage.getItem(filterStorageKey) || "{}") || {}; } catch (error) { savedFilters = {}; }
  const currentProductIds = new Set(POS.productCatalog.map(product => product.id));
  const legacyProductIds = new Set([
    "mango-passion",
    "strawberry-milk",
    "pistachio",
    "coconut-butterfly-pea",
    "japanese-melon",
    ...(POS.retiredProductIds || [])
  ]);
  let activeRange = savedFilters.activeRange || "today";
  let selectedDate = savedFilters.selectedDate || todayKey;
  let selectedMonth = savedFilters.selectedMonth || todayKey.slice(0, 7);
  let rangeStartDate = savedFilters.rangeStartDate || todayKey;
  let rangeEndDate = savedFilters.rangeEndDate || todayKey;
  let activeProductFilter = savedFilters.activeProductFilter || "active";
  let products = [];
  let orders = [];
  let closeouts = [];
  let inventoryMovements = [];
  let businessDays = [];
  let shifts = [];
  let payments = [];
  let promotions = [];
  let promotionUsage = [];
  let dailyOperations = [];
  let reconciliations = [];
  let upsellEvents = [];
  let dataQualityIssues = [];
  let userProfiles = [];
  let auditLogs = [];
  let currentSession = null;
  let currentRole = "viewer";
  let p1Enabled = false;
  let activeHourMetric = "amount";

  function persistFilters() {
    window.localStorage.setItem(filterStorageKey, JSON.stringify({ activeRange, selectedDate, selectedMonth, rangeStartDate, rangeEndDate, activeProductFilter }));
  }

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
    salesTotalCompare: document.querySelector("#salesTotalCompare"),
    orderCountCompare: document.querySelector("#orderCountCompare"),
    itemCountCompare: document.querySelector("#itemCountCompare"),
    avgOrderCompare: document.querySelector("#avgOrderCompare"),
    avgItemsPerOrder: document.querySelector("#avgItemsPerOrder"),
    avgItemsCompare: document.querySelector("#avgItemsCompare"),
    singleItemOrderRate: document.querySelector("#singleItemOrderRate"),
    singleItemCompare: document.querySelector("#singleItemCompare"),
    mixedOrderRate: document.querySelector("#mixedOrderRate"),
    cancelRefundSummary: document.querySelector("#cancelRefundSummary"),
    discountGiftSummary: document.querySelector("#discountGiftSummary"),
    paymentDetail: document.querySelector("#paymentDetail"),
    productRanking: document.querySelector("#productRanking"),
    monthlySalesChart: document.querySelector("#monthlySalesChart"),
    dailyPeakChart: document.querySelector("#dailyPeakChart"),
    operationsHourChart: document.querySelector("#operationsHourChart"),
    hourMetricSwitch: document.querySelector("#hourMetricSwitch"),
    productPerformance: document.querySelector("#productPerformance"),
    operationsAlerts: document.querySelector("#operationsAlerts"),
    categoryBreakdown: document.querySelector("#categoryBreakdown"),
    paymentSummary: document.querySelector("#paymentSummary"),
    categorySummary: document.querySelector("#categorySummary"),
    stockOverview: document.querySelector("#stockOverview"),
    stockSummary: document.querySelector("#stockSummary"),
    inventoryMovements: document.querySelector("#inventoryMovements"),
    ordersBody: document.querySelector("#ordersBody"),
    orderProductFilter: document.querySelector("#orderProductFilter"),
    orderPaymentFilter: document.querySelector("#orderPaymentFilter"),
    orderCashierFilter: document.querySelector("#orderCashierFilter"),
    exportOrdersCsv: document.querySelector("#exportOrdersCsv"),
    exportItemsCsv: document.querySelector("#exportItemsCsv"),
    exportInventoryCsv: document.querySelector("#exportInventoryCsv"),
    exportXlsx: document.querySelector("#exportXlsx"),
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
    adminTopbar: document.querySelector(".page > .topbar"),
    backTop: document.querySelector("#backTop"),
    businessDayForm: document.querySelector("#businessDayForm"),
    businessDayHistory: document.querySelector("#businessDayHistory"),
    basketAnalysis: document.querySelector("#basketAnalysis"),
    shiftsList: document.querySelector("#shiftsList"),
    shiftCashierFilter: document.querySelector("#shiftCashierFilter"),
    shiftStatusFilter: document.querySelector("#shiftStatusFilter"),
    promotionForm: document.querySelector("#promotionForm"),
    promotionGiftProduct: document.querySelector("#promotionGiftProduct"),
    promotionEligibleProduct: document.querySelector("#promotionEligibleProduct"),
    promotionsList: document.querySelector("#promotionsList"),
    refreshReconciliation: document.querySelector("#refreshReconciliation"),
    reconciliationList: document.querySelector("#reconciliationList"),
    currentRoleText: document.querySelector("#currentRoleText"),
    dataQualityList: document.querySelector("#dataQualityList"),
    rolesList: document.querySelector("#rolesList"),
    auditList: document.querySelector("#auditList"),
    exportShiftsCsv: document.querySelector("#exportShiftsCsv"),
    exportPaymentsCsv: document.querySelector("#exportPaymentsCsv"),
    exportPromotionsCsv: document.querySelector("#exportPromotionsCsv"),
    exportPromotionUsageCsv: document.querySelector("#exportPromotionUsageCsv"),
    exportUpsellCsv: document.querySelector("#exportUpsellCsv"),
    exportOperationsCsv: document.querySelector("#exportOperationsCsv")
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
    ordersPanel: "orders",
    businessDayPanel: "business",
    shiftsPanel: "shifts",
    promotionsPanel: "promotions",
    reconciliationPanel: "reconciliation",
    systemPanel: "system"
  };

  function currentAdminView() {
    const key = (window.location.hash || "#home").replace("#", "");
    return adminViewByHash[key] || key || "home";
  }

  function updateAdminStickyOffset() {
    if (!el.adminTopbar) return;
    const height = Math.ceil(el.adminTopbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--admin-topbar-height", `${height}px`);
  }

  function scrollAdminViewIntoPlace(activeView, behavior = "smooth") {
    const section = document.querySelector(`[data-admin-view="${activeView}"]`);
    if (!section) return;
    const topbarHeight = el.adminTopbar ? el.adminTopbar.getBoundingClientRect().height : 0;
    const navHeight = el.adminShortcuts ? el.adminShortcuts.getBoundingClientRect().height : 0;
    const top = section.getBoundingClientRect().top + window.scrollY - topbarHeight - navHeight - 14;
    window.scrollTo({ top: Math.max(0, top), behavior });
  }

  function keepActiveAdminNavVisible(activeView) {
    if (!el.adminShortcuts) return;
    const activeLink = el.adminShortcuts.querySelector(`[data-admin-nav="${activeView}"]`);
    if (!activeLink) return;
    const left = activeLink.offsetLeft - (el.adminShortcuts.clientWidth - activeLink.offsetWidth) / 2;
    el.adminShortcuts.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }

  function setAdminView(view, options = {}) {
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
      keepActiveAdminNavVisible(activeView);
    }
    if (options.scroll) {
      window.requestAnimationFrame(() => scrollAdminViewIntoPlace(activeView, options.behavior || "smooth"));
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

  function isHeicFile(file) {
    const type = String(file && file.type || "").toLowerCase();
    const name = String(file && file.name || "").toLowerCase();
    return ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"].includes(type)
      || /\.(heic|heif)$/.test(name);
  }

  async function imageFileToDataUrl(file) {
    if (isHeicFile(file)) {
      throw new Error("请先把 HEIC 转换成 JPG，再上传产品图片");
    }
    const originalSize = file.size;
    const renderableFile = file;

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
            originalSize,
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
                originalSize,
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
      reader.readAsDataURL(renderableFile);
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
        .select("id, shift_id, day, time_text, payment_method, total, total_amount, discount_amount, final_amount, status, cashier, note, created_at, is_test, promotion_id, promotion_code, promotion_note, promotion_name_snapshot, complimentary_reason, cancel_reason, cancelled_at, refund_amount, order_items(product_id, product_uid, name, product_name, category, product_type, subcategory, qty, quantity, price, unit_price, subtotal, item_type, promotion_code, gift_reason), payments(payment_id, payment_method, amount, payment_status, reference_number)")
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

    try {
      const businessDaysResult = await client
        .from("business_days")
        .select("*")
        .order("day", { ascending: false });
      if (businessDaysResult.error) throw businessDaysResult.error;
      businessDays = businessDaysResult.data || [];
    } catch (error) {
      businessDays = [];
    }

    try {
      const profileResult = await client.from("user_profiles").select("user_id, email, display_name, role, is_active");
      if (profileResult.error) throw profileResult.error;
      userProfiles = profileResult.data || [];
      const ownProfile = userProfiles.find(profile => currentSession && profile.user_id === currentSession.user.id);
      currentRole = ownProfile && ownProfile.is_active !== false ? ownProfile.role : "viewer";
      const results = await Promise.all([
        client.from("shifts").select("*").order("opened_at", { ascending: false }),
        client.from("payments").select("*").order("created_at", { ascending: false }),
        client.from("promotions").select("*").order("created_at", { ascending: false }),
        client.from("promotion_usage").select("*").order("used_at", { ascending: false }),
        client.from("daily_operations").select("*").order("business_date", { ascending: false }),
        client.from("daily_reconciliations").select("*").order("business_date", { ascending: false }),
        client.from("upsell_events").select("*").order("shown_at", { ascending: false }),
        client.from("pos_data_quality_issues").select("*"),
        client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(80)
      ]);
      [shifts, payments, promotions, promotionUsage, dailyOperations, reconciliations, upsellEvents, dataQualityIssues, auditLogs] = results.map(result => result.error ? [] : (result.data || []));
      p1Enabled = !results[0].error && !results[1].error && !results[2].error;
    } catch (error) {
      shifts = [];
      payments = [];
      promotions = [];
      promotionUsage = [];
      dailyOperations = [];
      reconciliations = [];
      upsellEvents = [];
      dataQualityIssues = [];
      auditLogs = [];
      p1Enabled = false;
    }

    if (issues.length) {
      POS.showToast(`${issues.join("、")}数据暂时未完全加载`);
    }
  }

  async function refresh(session) {
    currentSession = session || currentSession;
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

  function parseDayParts(day) {
    const parts = String(day || "").split("-").map(Number);
    return {
      year: parts[0] || new Date().getFullYear(),
      month: parts[1] || 1,
      date: parts[2] || 1
    };
  }

  function weekdayLabel(day) {
    const parts = parseDayParts(day);
    const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return labels[new Date(parts.year, parts.month - 1, parts.date).getDay()];
  }

  function monthDays(monthKey) {
    const [year, month] = String(monthKey || todayKey.slice(0, 7)).split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
  }

  function rangeDays(startDay, endDay) {
    const startParts = parseDayParts(startDay);
    const endParts = parseDayParts(endDay);
    const start = new Date(startParts.year, startParts.month - 1, startParts.date);
    const end = new Date(endParts.year, endParts.month - 1, endParts.date);
    const days = [];
    for (let date = start; date <= end && days.length < 370; date.setDate(date.getDate() + 1)) {
      days.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
    }
    return days;
  }

  function orderHour(order) {
    const time = String(order.time_text || "");
    const match = time.match(/(\d{1,2})/);
    if (match) {
      const hour = Number(match[1]);
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return hour;
    }
    if (order.created_at) {
      const hour = new Date(order.created_at).getHours();
      if (Number.isFinite(hour)) return hour;
    }
    return 0;
  }

  function chartMonthKey() {
    if (activeRange === "month") return selectedMonth;
    if (activeRange === "date") return selectedDate.slice(0, 7);
    if (activeRange === "custom") return normalizedRangeDates().start.slice(0, 7);
    return todayKey.slice(0, 7);
  }

  function chartDayKey() {
    if (activeRange === "date") return selectedDate;
    return selectedDate || todayKey;
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
    return POS.normalizeCategory(item.product_type || item.category || (product && (product.product_type || product.category)));
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
    const prefix = normalized === "service" ? "service" : normalized === "merchandise" ? "merch" : normalized;
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
      return currentProducts.filter(product => product.track_inventory !== false && (product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out));
    }
    return currentProducts;
  }

  function renderStockOverview(visibleProducts) {
    if (!el.stockOverview) return;
    const activeProducts = products.filter(product => isCurrentMenuProduct(product) && product.is_active !== false);
    const totalStock = activeProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const lowCount = activeProducts.filter(product => product.track_inventory !== false && (product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out)).length;
    const soldOutCount = activeProducts.filter(product => product.is_available === false || (product.track_inventory !== false && (product.sold_out || product.stock <= 0))).length;

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
    const officialOrders = orders.filter(order => order.is_test !== true);
    const base = includeVoid ? officialOrders : officialOrders.filter(POS.isRevenueOrder);
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

  function pointList(points) {
    return points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  }

  function renderMonthlySalesChart(activeOrders) {
    if (!el.monthlySalesChart) return;
    const monthKey = chartMonthKey();
    const customRange = activeRange === "custom" ? normalizedRangeDates() : null;
    const days = customRange ? rangeDays(customRange.start, customRange.end) : monthDays(monthKey);
    const chartLabel = customRange ? `${customRange.start} 至 ${customRange.end}` : monthKey;
    const byDay = Object.fromEntries(days.map(day => [day, { amount: 0, qty: 0, orders: 0 }]));

    orders.filter(order => order.is_test !== true && POS.isRevenueOrder(order) && byDay[order.day]).forEach(order => {
      if (!byDay[order.day]) return;
      byDay[order.day].amount += orderAmount(order);
      byDay[order.day].orders += 1;
      byDay[order.day].qty += (order.order_items || []).reduce((sum, item) => sum + itemQty(item), 0);
    });

    const rows = days.map(day => ({ day, weekday: weekdayLabel(day), ...byDay[day] }));
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
    const activeDayCount = rows.filter(row => row.orders > 0).length;
    const calendarAverage = rows.length ? total / rows.length : 0;
    const activeDayAverage = activeDayCount ? total / activeDayCount : 0;
    const max = Math.max(...rows.map(row => row.amount), 1);
    const chartWidth = 920;
    const chartHeight = 260;
    const pad = { top: 18, right: 18, bottom: 48, left: 66 };
    const innerWidth = chartWidth - pad.left - pad.right;
    const innerHeight = chartHeight - pad.top - pad.bottom;
    const points = rows.map((row, index) => {
      const x = pad.left + (rows.length === 1 ? innerWidth / 2 : index * innerWidth / (rows.length - 1));
      const y = pad.top + innerHeight - (row.amount / max) * innerHeight;
      return { ...row, x, y };
    });
    const peak = rows.reduce((best, row) => row.amount > best.amount ? row : best, rows[0] || { amount: 0, day: monthKey, weekday: "" });
    const yTicks = [1, 0.5, 0].map(ratio => ({
      y: pad.top + innerHeight * (1 - ratio),
      label: POS.money(Math.round(max * ratio))
    }));
    const labelEvery = rows.length > 18 ? 5 : rows.length > 12 ? 3 : 1;

    el.monthlySalesChart.innerHTML = `
      <div class="chart-summary">
        <div><span>${customRange ? "日期范围" : "月份"}</span><strong>${escapeHtml(chartLabel)}</strong></div>
        <div><span>销售额</span><strong>${POS.money(total)}</strong></div>
        <div><span>售出数量</span><strong>${totalQty}</strong></div>
        <div><span>日历日均</span><strong>${POS.money(Math.round(calendarAverage))}</strong></div>
        <div><span>营业日均</span><strong>${POS.money(Math.round(activeDayAverage))}</strong></div>
        <div><span>峰值日期</span><strong>${peak.day.slice(5)} ${peak.weekday} · ${POS.money(peak.amount)}</strong></div>
      </div>
      <div class="line-chart-scroll">
        <svg class="line-chart" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="${escapeHtml(chartLabel)} 销售折线图">
          ${yTicks.map(tick => `<g><line x1="${pad.left}" x2="${chartWidth - pad.right}" y1="${tick.y}" y2="${tick.y}" class="chart-grid-line"></line><text x="8" y="${tick.y + 4}" class="chart-axis-text">${tick.label}</text></g>`).join("")}
          <polyline class="sales-line-fill" points="${pointList([{ x: pad.left, y: pad.top + innerHeight }, ...points, { x: chartWidth - pad.right, y: pad.top + innerHeight }])}"></polyline>
          <polyline class="sales-line" points="${pointList(points)}"></polyline>
          ${points.map((point, index) => `
            <g>
              <circle class="sales-dot ${point.amount === peak.amount && point.amount > 0 ? "peak" : ""}" cx="${point.x}" cy="${point.y}" r="${point.amount === peak.amount && point.amount > 0 ? 5 : 3.5}">
                <title>${point.day} ${point.weekday}: ${POS.money(point.amount)} · ${point.qty} 件 · ${point.orders} 单</title>
              </circle>
              ${index % labelEvery === 0 || index === points.length - 1 ? `<text x="${point.x}" y="${chartHeight - 24}" text-anchor="middle" class="chart-axis-text">${point.day.slice(5)}</text><text x="${point.x}" y="${chartHeight - 9}" text-anchor="middle" class="chart-weekday-text">${point.weekday}</text>` : ""}
            </g>
          `).join("")}
        </svg>
      </div>
      <div class="day-chip-grid">
        ${rows.map(row => `<div class="day-chip ${row.amount ? "active" : ""}"><strong>${row.day.slice(5)} ${row.weekday}</strong><span>${POS.money(row.amount)} · ${row.qty} 件</span></div>`).join("")}
      </div>
    `;
  }

  function renderDailyPeakChart() {
    if (!el.dailyPeakChart) return;
    const day = chartDayKey();
    const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: 0, qty: 0, orders: 0 }));
    orders.filter(order => order.is_test !== true && POS.isRevenueOrder(order) && order.day === day).forEach(order => {
      const row = rows[orderHour(order)] || rows[0];
      row.amount += orderAmount(order);
      row.orders += 1;
      row.qty += (order.order_items || []).reduce((sum, item) => sum + itemQty(item), 0);
    });

    const max = Math.max(...rows.map(row => row.amount), 1);
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
    const peak = rows.reduce((best, row) => row.amount > best.amount ? row : best, rows[0]);
    const peakLabel = peak.amount ? `${String(peak.hour).padStart(2, "0")}:00-${String(peak.hour + 1).padStart(2, "0")}:00` : "暂无";

    el.dailyPeakChart.innerHTML = `
      <div class="chart-summary">
        <div><span>日期</span><strong>${escapeHtml(day)} ${weekdayLabel(day)}</strong></div>
        <div><span>销售额</span><strong>${POS.money(total)}</strong></div>
        <div><span>售出数量</span><strong>${totalQty}</strong></div>
        <div><span>高峰时段</span><strong>${peakLabel}${peak.amount ? ` · ${POS.money(peak.amount)}` : ""}</strong></div>
      </div>
      <div class="hour-chart" aria-label="${escapeHtml(day)} 每小时销售高峰图">
        ${rows.map(row => {
          const height = Math.max(row.amount ? 8 : 2, (row.amount / max) * 150);
          const label = `${String(row.hour).padStart(2, "0")}:00`;
          return `
            <div class="hour-bar ${row.hour === peak.hour && row.amount ? "peak" : ""}">
              <div class="hour-bar-track">
                <span style="height:${height}px" title="${label}: ${POS.money(row.amount)} · ${row.qty} 件 · ${row.orders} 单"></span>
              </div>
              <strong>${row.hour % 3 === 0 ? row.hour : ""}</strong>
            </div>
          `;
        }).join("")}
      </div>
      <div class="hour-detail-grid">
        ${rows.filter(row => row.amount || row.orders).map(row => `<div><strong>${String(row.hour).padStart(2, "0")}:00-${String(row.hour + 1).padStart(2, "0")}:00</strong><span>${POS.money(row.amount)} · ${row.qty} 件 · ${row.orders} 单</span></div>`).join("") || `<div class="empty">这一天还没有销售记录。</div>`}
      </div>
    `;
  }

  function activeOrdersForDay(day) {
    return orders.filter(order => order.day === day && order.is_test !== true && POS.isRevenueOrder(order));
  }

  function shiftDay(day, offset) {
    const parts = parseDayParts(day);
    const date = new Date(parts.year, parts.month - 1, parts.date);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function metricsForOrders(sourceOrders) {
    const paid = (sourceOrders || []).filter(order => order.is_test !== true && POS.isRevenueOrder(order));
    const sales = paid.reduce((sum, order) => sum + orderAmount(order), 0);
    const quantities = paid.map(order => (order.order_items || []).reduce((sum, item) => sum + itemQty(item), 0));
    const items = quantities.reduce((sum, qty) => sum + qty, 0);
    const singleOrders = quantities.filter(qty => qty === 1).length;
    return {
      sales,
      orders: paid.length,
      items,
      avgOrder: paid.length ? sales / paid.length : 0,
      avgItems: paid.length ? items / paid.length : 0,
      singleRate: paid.length ? singleOrders / paid.length : 0
    };
  }

  function operatingDayMetrics(beforeDay, limit) {
    const days = [...new Set(orders
      .filter(order => order.day < beforeDay && order.is_test !== true && POS.isRevenueOrder(order))
      .map(order => order.day))]
      .sort()
      .reverse()
      .slice(0, limit);
    if (!days.length) return null;
    const daily = days.map(day => metricsForOrders(orders.filter(order => order.day === day)));
    const average = key => daily.reduce((sum, row) => sum + row[key], 0) / daily.length;
    return {
      sales: average("sales"),
      orders: average("orders"),
      items: average("items"),
      avgOrder: average("avgOrder"),
      avgItems: average("avgItems"),
      singleRate: average("singleRate")
    };
  }

  function deltaLabel(current, comparison, label, percentMetric) {
    if (!comparison && comparison !== 0) return `${label}暂无数据`;
    if (comparison === 0) return current === 0 ? `${label}持平` : `${label}新增`;
    const delta = ((current - comparison) / Math.abs(comparison)) * 100;
    const sign = delta > 0 ? "+" : "";
    return `${label}${sign}${delta.toFixed(1)}%${percentMetric ? "" : ""}`;
  }

  function renderMetricComparisons(summaryDay, currentMetrics) {
    const yesterday = metricsForOrders(orders.filter(order => order.day === shiftDay(summaryDay, -1)));
    const previousWeek = metricsForOrders(orders.filter(order => order.day === shiftDay(summaryDay, -7)));
    const average7 = operatingDayMetrics(summaryDay, 7);
    const average30 = operatingDayMetrics(summaryDay, 30);
    const comparisonText = key => [
      deltaLabel(currentMetrics[key], yesterday[key], "较昨日 "),
      deltaLabel(currentMetrics[key], previousWeek[key], "较上周同日 "),
      average7 ? deltaLabel(currentMetrics[key], average7[key], "较7营业日均值 ") : "7日均值暂无",
      average30 ? deltaLabel(currentMetrics[key], average30[key], "较30营业日均值 ") : "30日均值暂无"
    ].map(text => `<span>${escapeHtml(text)}</span>`).join("");
    if (el.salesTotalCompare) el.salesTotalCompare.innerHTML = comparisonText("sales");
    if (el.orderCountCompare) el.orderCountCompare.innerHTML = comparisonText("orders");
    if (el.itemCountCompare) el.itemCountCompare.innerHTML = comparisonText("items");
    if (el.avgOrderCompare) el.avgOrderCompare.innerHTML = comparisonText("avgOrder");
    if (el.avgItemsCompare) el.avgItemsCompare.innerHTML = comparisonText("avgItems");
    if (el.singleItemCompare) el.singleItemCompare.innerHTML = comparisonText("singleRate");
  }

  function renderOperationsHourChart(activeOrders) {
    if (!el.operationsHourChart) return;
    const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: 0, orders: 0, qty: 0, avg: 0, avgItems: 0, iceOrders: 0, mixedOrders: 0, addon: 0 }));
    activeOrders.forEach(order => {
      const row = rows[orderHour(order)];
      row.amount += orderAmount(order);
      row.orders += 1;
      row.qty += (order.order_items || []).reduce((sum, item) => sum + itemQty(item), 0);
      const categories = new Set((order.order_items || []).map(item => itemCategory(item, productById(item.product_id))));
      if (categories.has("icecream")) row.iceOrders += 1;
      if (categories.has("icecream") && categories.has("merchandise")) row.mixedOrders += 1;
    });
    rows.forEach(row => {
      row.avg = row.orders ? row.amount / row.orders : 0;
      row.avgItems = row.orders ? row.qty / row.orders : 0;
      row.addon = row.iceOrders ? row.mixedOrders / row.iceOrders * 100 : 0;
    });
    const max = Math.max(...rows.map(row => row[activeHourMetric]), 1);
    const labels = { amount: "销售额", orders: "订单数", qty: "商品件数", avg: "客单价", avgItems: "每单件数", addon: "文创附加率" };
    const format = value => ["amount", "avg"].includes(activeHourMetric) ? POS.money(Math.round(value)) : activeHourMetric === "addon" ? `${value.toFixed(0)}%` : activeHourMetric === "avgItems" ? value.toFixed(2) : `${Math.round(value)}`;
    const periodClass = hour => hour >= 11 && hour < 15 ? "lunch" : hour >= 15 && hour < 17 ? "afternoon" : hour >= 17 && hour < 22 ? "evening" : "off-hours";
    const peak = rows.reduce((best, row) => row[activeHourMetric] > best[activeHourMetric] ? row : best, rows[0]);
    el.operationsHourChart.innerHTML = `
      <div class="chart-summary compact-summary">
        <div><span>当前指标</span><strong>${labels[activeHourMetric]}</strong></div>
        <div><span>峰值时段</span><strong>${String(peak.hour).padStart(2, "0")}:00 · ${format(peak[activeHourMetric])}</strong></div>
        <div><span>重点时段</span><strong>11:00–21:59</strong></div>
      </div>
      <div class="hour-chart operations-hour-chart">
        ${rows.map(row => {
          const height = Math.max(row[activeHourMetric] ? 8 : 2, row[activeHourMetric] / max * 150);
          return `<div class="hour-bar ${periodClass(row.hour)} ${row.hour === peak.hour && row[activeHourMetric] ? "peak" : ""}">
            <div class="hour-bar-track"><span style="height:${height}px" title="${String(row.hour).padStart(2, "0")}:00 ${format(row[activeHourMetric])}"></span></div>
            <strong>${row.hour % 2 === 0 ? row.hour : ""}</strong>
          </div>`;
        }).join("")}
      </div>
      <div class="period-legend"><span class="lunch">11–14 午间</span><span class="afternoon">15–16 下午</span><span class="evening">17–21 晚间</span></div>
    `;
  }

  function renderProductPerformance(activeOrders) {
    if (!el.productPerformance) return;
    const sold = new Map();
    activeOrders.forEach(order => (order.order_items || []).forEach(item => {
      const product = productById(item.product_id);
      const key = item.product_id || item.product_uid || item.product_name || item.name;
      const current = sold.get(key) || { name: item.product_name || item.name || "商品", qty: 0, giftQty: 0, amount: 0, orders: new Set(), days: new Set(), flavor: (product && product.flavor) || "" };
      if (["gift", "complimentary"].includes(item.item_type)) current.giftQty += itemQty(item);
      else current.qty += itemQty(item);
      current.amount += itemNetSubtotal(order, item);
      current.orders.add(order.id);
      current.days.add(order.day);
      sold.set(key, current);
    }));
    const refunded = new Map();
    orders.filter(order => order.status === "refunded" && inActiveDateRange(order.day)).forEach(order => (order.order_items || []).forEach(item => refunded.set(item.product_id, (refunded.get(item.product_id) || 0) + itemQty(item))));
    const wasted = new Map();
    filteredInventoryMovements().filter(row => ["waste", "sample"].includes(row.change_type || row.reason) || row.movement_type === "waste").forEach(row => wasted.set(row.product_id, (wasted.get(row.product_id) || 0) + Math.abs(Number(row.quantity_change ?? row.change_qty ?? row.quantity ?? 0))));
    const ranking = [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
    const flavors = new Map();
    products.filter(product => product.product_type === "icecream" || product.category === "icecream").forEach(product => {
      const key = product.flavor || product.note || "未填写口味";
      const current = flavors.get(key) || { qty: 0, stock: 0 };
      current.stock += Number(product.stock || 0);
      flavors.set(key, current);
    });
    sold.forEach(row => {
      if (!row.flavor) return;
      const current = flavors.get(row.flavor) || { qty: 0, stock: 0 };
      current.qty += row.qty;
      flavors.set(row.flavor, current);
    });
    const soldOut = products.filter(product => product.is_active !== false && (product.is_available === false || (product.track_inventory !== false && (product.sold_out || product.stock <= 0))));
    const lastSale = new Map();
    orders.filter(order => order.is_test !== true && POS.isRevenueOrder(order)).forEach(order => (order.order_items || []).forEach(item => {
      const previous = lastSale.get(item.product_id);
      if (!previous || order.day > previous) lastSale.set(item.product_id, order.day);
    }));
    const todayDate = new Date(`${todayKey}T00:00:00`);
    const noSales = products.filter(product => product.is_active !== false).map(product => {
      const lastDay = lastSale.get(product.id);
      const days = lastDay ? Math.floor((todayDate - new Date(`${lastDay}T00:00:00`)) / 86400000) : null;
      return { product, lastDay, days };
    }).filter(row => row.days === null || row.days >= 3).sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));
    const newProducts = products.filter(product => {
      if (!product.created_at) return false;
      return (Date.now() - new Date(product.created_at).getTime()) / 86400000 <= 30;
    });
    el.productPerformance.innerHTML = `
      <section><h3>销量排名</h3>${ranking.length ? ranking.map((row, index) => { const key = [...sold.entries()].find(([, value]) => value === row)?.[0]; return `<div class="performance-row"><span>${index + 1}. ${escapeHtml(row.name)}<small>${row.orders.size} 单 · ${row.days.size} 个有销售营业日 · 赠品 ${row.giftQty} · 报损 ${wasted.get(key) || 0} · 退款 ${refunded.get(key) || 0}</small></span><strong>${row.qty} 件 · ${POS.money(row.amount)}</strong></div>`; }).join("") : `<div class="empty">当前范围暂无销售。</div>`}</section>
      <section><h3>口味销量 / 当前库存</h3>${[...flavors.entries()].map(([name, row]) => `<div class="performance-row"><span>${escapeHtml(name)}</span><strong>${row.qty} / ${row.stock}</strong></div>`).join("") || `<div class="empty">暂无口味数据。</div>`}</section>
      <section><h3>当前售罄</h3>${soldOut.length ? soldOut.slice(0, 10).map(product => `<div class="performance-row danger"><span>${escapeHtml(productDisplayName(product))}</span><strong>${product.sold_out_at ? new Date(product.sold_out_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "时间待记录"}</strong></div>`).join("") : `<div class="empty">当前没有售罄商品。</div>`}</section>
      <section><h3>连续无销售</h3>${noSales.length ? noSales.slice(0, 10).map(row => `<div class="performance-row"><span>${escapeHtml(productDisplayName(row.product))}</span><strong>${row.days === null ? "从未销售" : `${row.days} 天`}</strong></div>`).join("") : `<div class="empty">没有连续 3 天无销售商品。</div>`}</section>
      <section><h3>近 30 天新品</h3>${newProducts.length ? newProducts.slice(0, 10).map(product => { const row = sold.get(product.id) || { qty: 0, amount: 0 }; return `<div class="performance-row"><span>${escapeHtml(productDisplayName(product))}</span><strong>${row.qty} 件 · ${POS.money(row.amount)}</strong></div>`; }).join("") : `<div class="empty">近 30 天没有新品。</div>`}</section>
    `;
  }

  function renderOperationsAlerts(summaryDay, activeOrders) {
    if (!el.operationsAlerts) return;
    const alerts = [];
    const activeProducts = products.filter(product => product.is_deleted !== true && product.is_active !== false);
    const low = activeProducts.filter(product => product.track_inventory !== false && (product.sold_out || product.stock <= (product.low_stock_threshold || lowStockThreshold)));
    if (low.length) alerts.push({ tone: "warning", title: `${low.length} 个商品库存不足或售罄`, detail: low.slice(0, 4).map(productDisplayName).join("、") });
    const incomplete = activeProducts.filter(product => !product.has_stable_product_id || !product.sku || !product.product_type || !product.name);
    if (incomplete.length) alerts.push({ tone: "danger", title: `${incomplete.length} 个商品资料不完整`, detail: "请先执行经营管理升级 SQL，再补齐 SKU 和分类。" });
    const testOrders = orders.filter(order => order.day === summaryDay && order.is_test === true);
    if (testOrders.length) alerts.push({ tone: "info", title: `${testOrders.length} 笔测试订单已隔离`, detail: "这些订单没有进入正式销售统计。" });
    const missingCancelReason = orders.filter(order => order.day === summaryDay && ["cancelled", "void"].includes(order.status) && !order.cancel_reason);
    if (missingCancelReason.length) alerts.push({ tone: "warning", title: `${missingCancelReason.length} 笔取消订单缺少原因`, detail: "旧版取消记录需要补充说明。" });
    const closeout = closeouts.find(row => row.day === summaryDay);
    if (summaryDay <= todayKey && !closeout) alerts.push({ tone: "info", title: "当天尚未完成日结", detail: "营业结束后请核对现金、扫码和其他支付。" });
    if (closeout && Number(closeout.cash_difference ?? closeout.diff ?? 0) !== 0) alerts.push({ tone: "danger", title: "现金收款存在差额", detail: `当前差额 ${POS.money(closeout.cash_difference ?? closeout.diff)}` });
    const record = businessDays.find(row => row.day === summaryDay);
    if (record && record.exception_note) alerts.push({ tone: "warning", title: "营业记录有异常说明", detail: record.exception_note });
    const current = metricsForOrders(activeOrders);
    const average7 = operatingDayMetrics(summaryDay, 7);
    if (average7 && average7.sales > 0 && current.sales < average7.sales * 0.65) alerts.push({ tone: "warning", title: "销售额明显低于近期水平", detail: `比过去 7 个营业日均值低 ${Math.round((1 - current.sales / average7.sales) * 100)}%` });
    el.operationsAlerts.innerHTML = alerts.length ? alerts.map(alert => `<div class="operation-alert ${alert.tone}"><strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(alert.detail)}</span></div>`).join("") : `<div class="empty success-empty">当前没有需要处理的经营异常。</div>`;
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
      const isOriginalIcecream = currentProductIds.has(product.id);
      return `
      <form class="menu-row" data-product-form="${escapeAttr(product.id)}">
        <img class="menu-thumb" src="${escapeAttr(product.image_path)}" alt="${escapeAttr(product.name)}">
        <div class="menu-row-title">
          <strong>${escapeHtml(product.category === "icecream" ? "冰淇淋产品" : "普通产品")}</strong>
          <small>永久 ID：${escapeHtml(product.has_stable_product_id ? product.product_id : "执行升级 SQL 后生成")}</small>
          <small>旧编号：${escapeHtml(product.id)}</small>
        </div>
        <label>
          SKU
          <input class="field-input" name="sku" value="${escapeAttr(product.sku || "")}" placeholder="PP-ICE-PAT-STRAW">
        </label>
        <label>
          产品名
          <input class="field-input" name="name" value="${escapeAttr(product.name)}" required>
        </label>
        <label>
          短名称
          <input class="field-input" name="short_name" value="${escapeAttr(product.short_name || product.note || product.name)}">
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
          系列
          <input class="field-input" name="series" value="${escapeAttr(product.series || "")}" placeholder="例如：Patuxai Classics">
        </label>
        <label>
          尺寸
          <input class="field-input" name="size" value="${escapeAttr(product.size || "")}" placeholder="小 / 中 / 大">
        </label>
        <label>
          单位
          <input class="field-input" name="unit" value="${escapeAttr(product.unit || "件")}" placeholder="件 / 支 / 杯">
        </label>
        <label>
          系列 / 造型（可选）
          <input class="field-input" name="shape" value="${escapeAttr(product.shape || "")}">
        </label>
        <label>
          口味（可选）
          <input class="field-input" name="flavor" value="${escapeAttr(product.flavor || "")}">
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
          <input class="field-input" name="shape_order" type="number" step="1" value="${product.shape_order || 0}">
        </label>
        <label>
          口味排序
          <input class="field-input" name="flavor_order" type="number" step="1" value="${product.flavor_order || 0}">
        </label>
        <label>
          图片路径
          <input class="field-input" name="image_path" value="${escapeAttr(product.image_path)}" required>
        </label>
        <label class="image-upload">
          上传图片
          <input type="file" accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp" data-image-upload="${escapeAttr(product.id)}">
          <span class="upload-hint">支持 JPG、PNG、WebP；上传后自动压缩</span>
        </label>
        <label class="soldout-check">
          <input name="sold_out" type="checkbox" ${product.sold_out ? "checked" : ""}>
          售罄
        </label>
        <label class="soldout-check">
          <input name="is_active" type="checkbox" ${product.is_active !== false ? "checked" : ""}>
          前台显示
        </label>
        <label class="soldout-check">
          <input name="is_available" type="checkbox" ${product.is_available !== false ? "checked" : ""}>
          当前可售
        </label>
        <label class="soldout-check">
          <input name="track_inventory" type="checkbox" ${product.track_inventory !== false ? "checked" : ""}>
          跟踪库存
        </label>
        <label class="soldout-check">
          <input name="is_favorite" type="checkbox" ${product.is_favorite ? "checked" : ""}>
          收银常用
        </label>
        <label class="soldout-check">
          <input name="is_upsell_product" type="checkbox" ${product.is_upsell_product ? "checked" : ""}>
          推荐商品
        </label>
        <label>
          推荐优先级
          <input class="field-input" name="upsell_priority" type="number" step="1" value="${Number(product.upsell_priority || 0)}">
        </label>
        <button class="button primary" type="submit">保存</button>
        ${isOriginalIcecream ? "" : `<button class="button danger" type="button" data-delete-product="${escapeAttr(product.id)}">删除</button>`}
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
            <small>${escapeHtml(item.business_date || item.day)} ${escapeHtml(item.time_text)} · ${reasonText(reason)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small>
            ${p1Enabled && POS.canManage(currentRole) && item.movement_type === "waste" && !item.approved_by ? `<button class="mini-button" type="button" data-approve-waste="${item.movement_id}">审核报损</button>` : ""}
            ${item.movement_type === "waste" && item.approved_by ? `<small>已审核</small>` : ""}
            ${p1Enabled && currentRole === "owner" && item.movement_id && !item.reversed_movement_id && !["sale", "gift", "return"].includes(item.movement_type) ? `<button class="mini-button" type="button" data-reverse-movement="${item.movement_id}">撤销这次调整</button>` : ""}
          </div>
          <div class="movement-numbers">
            <strong class="${tone}">${sign}${change}</strong>
            <small>${item.stock_before ?? item.before_stock} → ${item.stock_after ?? item.after_stock}</small>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderBasketAnalysis(activeOrders) {
    if (!el.basketAnalysis) return;
    const baskets = activeOrders.map(order => {
      const qty = (order.order_items || []).reduce((sum, item) => sum + itemQty(item), 0);
      const categories = new Set((order.order_items || []).map(item => itemCategory(item, productById(item.product_id))));
      const flavors = (order.order_items || []).filter(item => itemCategory(item, productById(item.product_id)) === "icecream").map(item => item.subcategory || item.product_name || item.name);
      return { qty, categories, flavors };
    });
    const total = baskets.length || 1;
    const one = baskets.filter(row => row.qty === 1).length;
    const two = baskets.filter(row => row.qty === 2).length;
    const three = baskets.filter(row => row.qty >= 3).length;
    const mixed = baskets.filter(row => row.categories.has("icecream") && row.categories.has("merchandise")).length;
    const iceOnly = baskets.filter(row => row.categories.size === 1 && row.categories.has("icecream")).length;
    const merchOnly = baskets.filter(row => row.categories.size === 1 && row.categories.has("merchandise")).length;
    const shown = upsellEvents.filter(row => !row.shown_at || inActiveDateRange(String(row.shown_at).slice(0, 10))).length;
    const added = upsellEvents.filter(row => row.added_to_cart && (!row.shown_at || inActiveDateRange(String(row.shown_at).slice(0, 10)))).length;
    const productCombos = new Map();
    const flavorCombos = new Map();
    activeOrders.forEach(order => {
      const names = [...new Set((order.order_items || []).filter(item => item.item_type !== "gift").map(item => item.product_name || item.name).filter(Boolean))].sort();
      if (names.length > 1) productCombos.set(names.join(" + "), (productCombos.get(names.join(" + ")) || 0) + 1);
      const flavors = [...new Set((order.order_items || []).filter(item => itemCategory(item, productById(item.product_id)) === "icecream").map(item => item.subcategory || item.product_name || item.name).filter(Boolean))].sort();
      if (flavors.length > 1) flavorCombos.set(flavors.join(" + "), (flavorCombos.get(flavors.join(" + ")) || 0) + 1);
    });
    const topCombo = [...productCombos.entries()].sort((a, b) => b[1] - a[1])[0];
    const topFlavorCombo = [...flavorCombos.entries()].sort((a, b) => b[1] - a[1])[0];
    const cards = [
      ["1 件订单", one, `${Math.round(one / total * 100)}%`],
      ["2 件订单", two, `${Math.round(two / total * 100)}%`],
      ["3 件以上", three, `${Math.round(three / total * 100)}%`],
      ["冰淇淋＋文创", mixed, `${Math.round(mixed / total * 100)}%`],
      ["仅冰淇淋", iceOnly, `${Math.round(iceOnly / total * 100)}%`],
      ["仅文创", merchOnly, `${Math.round(merchOnly / total * 100)}%`],
      ["推荐转化", added, shown ? `${Math.round(added / shown * 100)}%` : "暂无展示"]
    ];
    el.basketAnalysis.innerHTML = `${cards.map(([label, value, note]) => `<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("")}
      <div class="basket-combo"><span>高频商品组合</span><strong>${escapeHtml(topCombo ? topCombo[0] : "暂无")}</strong><small>${topCombo ? `${topCombo[1]} 单` : "需要两件以上订单"}</small></div>
      <div class="basket-combo"><span>高频口味组合</span><strong>${escapeHtml(topFlavorCombo ? topFlavorCombo[0] : "暂无")}</strong><small>${topFlavorCombo ? `${topFlavorCombo[1]} 单` : "需要多口味订单"}</small></div>`;
  }

  function renderP1Management() {
    const manager = POS.canManage(currentRole);
    if (el.currentRoleText) el.currentRoleText.textContent = p1Enabled ? `当前权限：${POS.roleLabel(currentRole)}` : "尚未执行 P1 数据库升级";

    const shiftCashierQuery = String(el.shiftCashierFilter && el.shiftCashierFilter.value || "").trim().toLowerCase();
    const shiftStatusQuery = String(el.shiftStatusFilter && el.shiftStatusFilter.value || "");
    const visibleShifts = shifts
      .filter(row => inActiveDateRange(row.business_date))
      .filter(row => !shiftCashierQuery || String(row.cashier_name || "").toLowerCase().includes(shiftCashierQuery))
      .filter(row => !shiftStatusQuery || row.status === shiftStatusQuery)
      .slice(0, 60);
    if (el.shiftsList) el.shiftsList.innerHTML = visibleShifts.length ? visibleShifts.map(row => `
      <div class="business-row">
        <div><strong>${escapeHtml(row.business_date)} · ${escapeHtml(row.cashier_name || "收银员")}</strong><span>${row.status === "open" ? "未交班" : `${String(row.opened_at || "").slice(11, 16)}–${String(row.closed_at || "").slice(11, 16)}`} · ${row.order_count || 0} 单 / ${row.item_count || 0} 件</span><span>退款 ${POS.money(row.refund_total || 0)} · 取消 ${row.cancelled_order_count || 0} · ${escapeHtml(row.closing_note || "无交班备注")}</span></div>
        <div><strong>现金 ${POS.money(row.expected_cash || 0)}</strong><span>实际 ${POS.money(row.actual_cash || 0)} · 差额 ${POS.money(row.cash_difference || 0)}</span><span>QR 差额 ${POS.money(row.qr_difference || 0)} · 转账差额 ${POS.money(row.transfer_difference || 0)}</span></div>
      </div>`).join("") : `<div class="empty">当前范围还没有班次记录。</div>`;

    if (el.promotionGiftProduct) {
      const currentValue = el.promotionGiftProduct.value;
      el.promotionGiftProduct.innerHTML = `<option value="">不送赠品</option>${products.filter(product => product.is_active !== false && product.product_id).map(product => `<option value="${escapeAttr(product.product_id)}">${escapeHtml(productDisplayName(product))}</option>`).join("")}`;
      el.promotionGiftProduct.value = currentValue;
    }
    if (el.promotionEligibleProduct) {
      const currentValue = el.promotionEligibleProduct.value;
      el.promotionEligibleProduct.innerHTML = `<option value="">任意商品</option>${products.filter(product => product.is_active !== false && product.product_id).map(product => `<option value="${escapeAttr(product.product_id)}">${escapeHtml(productDisplayName(product))}</option>`).join("")}`;
      el.promotionEligibleProduct.value = currentValue;
    }
    if (el.promotionForm) Array.from(el.promotionForm.elements).forEach(field => { field.disabled = !manager; });
    const activeSalesOrders = orders.filter(order => order.is_test !== true && POS.isRevenueOrder(order));
    const baselineOrders = activeSalesOrders.filter(order => !order.promotion_id);
    const baselineAverage = baselineOrders.length ? baselineOrders.reduce((sum, order) => sum + orderAmount(order), 0) / baselineOrders.length : 0;
    const baselineItems = baselineOrders.length ? baselineOrders.reduce((sum, order) => sum + (order.order_items || []).reduce((part, item) => part + itemQty(item), 0), 0) / baselineOrders.length : 0;
    if (el.promotionsList) el.promotionsList.innerHTML = promotions.length ? promotions.map(row => {
      const uses = promotionUsage.filter(usage => usage.promotion_id === row.promotion_id);
      const useOrderIds = new Set(uses.map(usage => usage.order_id));
      const promoOrders = activeSalesOrders.filter(order => useOrderIds.has(order.id));
      const promoSales = promoOrders.reduce((sum, order) => sum + orderAmount(order), 0);
      const promoAverage = promoOrders.length ? promoSales / promoOrders.length : 0;
      const promoItems = promoOrders.length ? promoOrders.reduce((sum, order) => sum + (order.order_items || []).reduce((part, item) => part + itemQty(item), 0), 0) / promoOrders.length : 0;
      const discounts = uses.reduce((sum, usage) => sum + Number(usage.discount_amount || 0), 0);
      const gifts = uses.reduce((sum, usage) => sum + Number(usage.gift_quantity || 0), 0);
      const hourMap = new Map();
      promoOrders.forEach(order => hourMap.set(orderHour(order), (hourMap.get(orderHour(order)) || 0) + 1));
      const peakHour = [...hourMap.entries()].sort((a, b) => b[1] - a[1])[0];
      return `
      <div class="business-row">
        <div><strong>${escapeHtml(row.promotion_name)}</strong><span>${escapeHtml(row.promotion_code)} · ${escapeHtml(row.promotion_type)} · ${uses.length} 单 · 销售 ${POS.money(promoSales)} · 折扣 ${POS.money(discounts)} · 赠品 ${gifts}</span><span>促销客单 ${POS.money(Math.round(promoAverage))} · 非促销客单 ${POS.money(Math.round(baselineAverage))} · 每单件数 ${promoItems.toFixed(2)} / ${baselineItems.toFixed(2)}${peakHour ? ` · 高峰 ${String(peakHour[0]).padStart(2, "0")}:00` : ""}</span></div>
        <div><strong>${row.is_active ? "生效中" : "已停用"}</strong>${manager ? `<button class="mini-button" type="button" data-toggle-promotion="${row.promotion_id}">${row.is_active ? "停用" : "启用"}</button>` : ""}</div>
      </div>`;
    }).join("") : `<div class="empty">还没有促销规则。</div>`;

    const visibleRecs = reconciliations.filter(row => inActiveDateRange(row.business_date)).slice(0, 60);
    if (el.reconciliationList) el.reconciliationList.innerHTML = visibleRecs.length ? visibleRecs.map(row => `
      <div class="business-row">
        <div><strong>${escapeHtml(row.business_date)} · ${escapeHtml(row.status)}</strong><span>${row.shift_count} 个班次 · ${row.open_shifts} 个未关闭 · 销售 ${POS.money(row.total_sales || 0)}</span><span>退款 ${POS.money(row.refund_total || 0)} · 折扣 ${POS.money(row.discount_total || 0)} · 赠品 ${row.gift_quantity || 0} · 取消 ${row.cancelled_orders || 0}</span></div>
        <div><strong>现金差额 ${POS.money(row.cash_difference || 0)}</strong><span>QR ${POS.money(row.qr_expected || 0)} / ${POS.money(row.qr_actual || 0)} · 差额 ${POS.money(row.qr_difference || 0)}</span><span>转账 ${POS.money(row.transfer_expected || 0)} / ${POS.money(row.transfer_actual || 0)} · 混合 ${POS.money(row.mixed_total || 0)} · 其他 ${POS.money(row.other_total || 0)}</span>${manager && row.status !== "reviewed" ? `<button class="mini-button" data-review-reconciliation="${row.business_date}">确认审核</button>` : ""}</div>
      </div>`).join("") : `<div class="empty">点击“刷新所选日期”生成对账结果。</div>`;

    if (el.dataQualityList) el.dataQualityList.innerHTML = dataQualityIssues.length ? dataQualityIssues.map(row => `<div class="alert-item ${escapeAttr(row.severity)}"><strong>${escapeHtml(row.issue_type)}</strong><span>${escapeHtml(row.detail || row.record_id)}</span></div>`).join("") : `<div class="empty">当前未发现结构性数据问题。</div>`;
    if (el.rolesList) el.rolesList.innerHTML = userProfiles.length ? userProfiles.map(row => `<div class="business-row"><div><strong>${escapeHtml(row.display_name || row.email || row.user_id)}</strong><span>${row.is_active === false ? "已停用" : "可用"}</span></div>${currentRole === "owner" ? `<select class="field-input role-select" data-role-user="${row.user_id}">${["owner", "manager", "cashier", "viewer"].map(role => `<option value="${role}" ${row.role === role ? "selected" : ""}>${POS.roleLabel(role)}</option>`).join("")}</select>` : `<strong>${POS.roleLabel(row.role)}</strong>`}</div>`).join("") : `<div class="empty">当前账号只能查看自己的权限。</div>`;
    if (el.auditList) el.auditList.innerHTML = auditLogs.length ? auditLogs.slice(0, 40).map(row => `<div class="business-row"><div><strong>${escapeHtml(row.action || row.action_type || "操作")}</strong><span>${escapeHtml(row.entity_type || "")} · ${escapeHtml(String(row.created_at || "").replace("T", " ").slice(0, 16))}</span></div><span>${escapeHtml(row.reason || row.note || "")}</span></div>`).join("") : `<div class="empty">无可查看的操作日志。</div>`;
    if (p1Enabled) {
      const allowedViews = currentRole === "cashier"
        ? new Set(["stock"])
        : currentRole === "viewer"
          ? new Set(["home", "analytics", "inventory", "orders", "business", "shifts"])
          : new Set(Object.values(adminViewByHash).filter(view => view !== "closeout"));
      document.querySelectorAll("[data-admin-nav]").forEach(link => {
        link.hidden = !allowedViews.has(link.dataset.adminNav);
      });
      [el.exportOrdersCsv, el.exportItemsCsv, el.exportInventoryCsv, el.exportShiftsCsv,
        el.exportPaymentsCsv, el.exportPromotionsCsv, el.exportPromotionUsageCsv,
        el.exportUpsellCsv, el.exportOperationsCsv, el.exportXlsx].filter(Boolean).forEach(button => {
        button.hidden = currentRole !== "owner";
      });
      if (el.businessDayForm) Array.from(el.businessDayForm.elements).forEach(field => { field.disabled = !manager; });
      if (!allowedViews.has(currentAdminView())) {
        window.location.hash = currentRole === "cashier" ? "#stockManagement" : "#home";
      }
    }
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
      const amount = orderAmount(order);
      const paymentRows = Array.isArray(order.payments) && order.payments.length
        ? order.payments.filter(row => row.payment_status !== "refunded")
        : [{ payment_method: order.payment_method, amount }];
      paymentRows.forEach(row => {
        const method = POS.normalizePaymentMethod(row.payment_method);
        const paid = Number(row.amount || 0);
        if (method === "cash") cashSales += paid;
        else if (method === "qr") qrSales += paid;
        else otherPaymentSales += paid;
        addToMap(paymentMap, POS.paymentLabel(method), 1, paid);
      });
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
          if (category === "service") customItemCount += qty;
          else if (category === "merchandise") merchItemCount += qty;
          else if (category === "beverage") drinkItemCount += qty;
          else if (category === "deposit") bundleItemCount += qty;
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
        product.track_inventory !== false && (product.sold_out || product.stock <= (product.low_stock_threshold || lowStockThreshold))
      ).length;
    }
    el.avgOrder.textContent = POS.money(activeOrders.length ? Math.round(sales / activeOrders.length) : 0);
    const summaryMetrics = metricsForOrders(activeOrders);
    const singleOrders = activeOrders.filter(order => (order.order_items || []).reduce((sum, item) => sum + itemQty(item), 0) === 1).length;
    const mixedOrders = activeOrders.filter(order => {
      const categories = new Set((order.order_items || []).map(item => itemCategory(item, productById(item.product_id))));
      return categories.has("icecream") && categories.has("merchandise");
    }).length;
    const cancelledOrders = filteredOrders(true).filter(order => ["cancelled", "void"].includes(order.status));
    const refundAmount = filteredOrders(true).filter(order => order.status === "refunded").reduce((sum, order) => sum + Number(order.refund_amount || orderAmount(order)), 0);
    const discountAmount = activeOrders.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0);
    const giftQuantity = activeOrders.reduce((sum, order) => sum + (order.order_items || [])
      .filter(item => ["gift", "complimentary"].includes(item.item_type))
      .reduce((part, item) => part + itemQty(item), 0), 0);
    if (el.avgItemsPerOrder) el.avgItemsPerOrder.textContent = summaryMetrics.avgItems.toFixed(2);
    if (el.singleItemOrderRate) el.singleItemOrderRate.textContent = `${activeOrders.length ? Math.round(singleOrders / activeOrders.length * 100) : 0}%`;
    if (el.mixedOrderRate) el.mixedOrderRate.textContent = `${activeOrders.length ? Math.round(mixedOrders / activeOrders.length * 100) : 0}%`;
    if (el.cancelRefundSummary) el.cancelRefundSummary.textContent = `${cancelledOrders.length} 单 / ${POS.money(refundAmount)}`;
    if (el.discountGiftSummary) el.discountGiftSummary.textContent = `折扣 ${POS.money(discountAmount)} · 赠品 ${giftQuantity}`;
    if (el.cashSales) el.cashSales.textContent = `现金 ${POS.money(cashSales)}`;
    if (el.paymentDetail) el.paymentDetail.textContent = `扫码 ${POS.money(qrSales)} · 其他 ${POS.money(otherPaymentSales)}`;
    const summaryDay = activeRange === "date" ? selectedDate : todayKey;
    if (["today", "date"].includes(activeRange)) {
      renderMetricComparisons(summaryDay, summaryMetrics);
    } else {
      [el.salesTotalCompare, el.orderCountCompare, el.itemCountCompare, el.avgOrderCompare, el.avgItemsCompare, el.singleItemCompare].forEach(node => { if (node) node.textContent = "当前所选范围"; });
    }

    renderBars(el.productRanking, iceCreamRows, "当前范围内还没有冰淇淋销售。");
    renderMonthlySalesChart(activeOrders);
    renderDailyPeakChart();
    renderOperationsHourChart(activeOrders);
    renderCategoryBreakdown(el.categoryBreakdown, categoryStats, categoryProductMaps);
    renderBars(el.paymentSummary, paymentRows, "当前范围内还没有付款记录。");
    renderBars(el.categorySummary, categoryRows, "当前范围内还没有类别数据。");
    renderProductPerformance(activeOrders);
    renderOperationsAlerts(summaryDay, activeOrders);

    const manager = !p1Enabled || POS.canManage(currentRole);
    const canRecordWaste = !p1Enabled || currentRole !== "viewer";
    const visibleProducts = filteredProducts();
    renderStockOverview(visibleProducts);
    el.stockSummary.innerHTML = visibleProducts.length ? visibleProducts.map(product => {
      const threshold = product.low_stock_threshold || lowStockThreshold;
      const low = product.track_inventory !== false && (product.stock <= threshold || product.sold_out);
      const soldOut = product.is_available === false || (product.track_inventory !== false && (product.sold_out || product.stock <= 0));
      const stockTone = soldOut ? "danger" : low ? "warning" : "";
      return `
      <article class="stock-card ${low ? "low" : ""} ${product.track_inventory === false ? "non-inventory" : ""}" data-stock-row="${escapeAttr(product.id)}">
        <div class="stock-card-main">
          <div>
            <strong>${escapeHtml(productDisplayName(product))}</strong>
            <small>${escapeHtml(product.note || product.name)}${product.category ? ` · ${escapeHtml(POS.categoryLabel(product.category))}` : ""}</small>
          </div>
          <div class="stock-count ${stockTone}">
            <span>库存</span>
            <strong data-stock-count="${escapeAttr(product.id)}">${product.track_inventory === false ? "—" : product.stock}</strong>
          </div>
        </div>
        <div class="stock-status-row">
          <span class="stock-pill ${product.is_active === false ? "danger" : ""}">${product.is_active === false ? "已下架" : "上架中"}</span>
          <span class="stock-pill ${soldOut ? "danger" : low ? "warning" : ""}" data-stock-state="${escapeAttr(product.id)}">${product.track_inventory === false ? "无需库存" : soldOut ? "售空" : low ? "低库存" : "可售"}</span>
        </div>
        <div class="stock-adjust" aria-label="${escapeAttr(product.name)}快捷调库存">
          ${canRecordWaste ? `<button class="mini-button stock-step danger" data-stock-step="${escapeAttr(product.id)}" data-step="-1">-1</button>` : ""}
          ${manager ? `<button class="mini-button stock-step" data-stock-step="${escapeAttr(product.id)}" data-step="1">+1</button><button class="mini-button stock-step" data-stock-step="${escapeAttr(product.id)}" data-step="5">+5</button><button class="mini-button stock-step" data-stock-step="${escapeAttr(product.id)}" data-step="10">+10</button><button class="mini-button stock-step" data-stock-zero="${escapeAttr(product.id)}">归零</button>` : ""}
        </div>
        <div class="stock-controls">
          <input class="field-input stock-input" data-stock-input="${escapeAttr(product.id)}" type="number" min="0" ${manager ? "" : `max="${product.stock}"`} step="1" value="${product.stock}" aria-label="${escapeAttr(product.name)}库存" ${canRecordWaste ? "" : "disabled"}>
          <select class="field-input stock-reason" data-stock-reason="${escapeAttr(product.id)}" aria-label="${escapeAttr(product.name)}库存原因">
            ${manager ? `<option value="restock">补货</option><option value="adjustment">盘点调整</option>` : ""}
            ${p1Enabled ? `<option value="waste:melted">融化</option><option value="waste:damaged_packaging">包装损坏</option><option value="waste:production_issue">制作失败</option><option value="waste:expired">过期</option><option value="waste:customer_return">顾客退换</option><option value="waste:staff_error">员工操作失误</option><option value="waste:sampling">试吃</option><option value="waste:photo_shoot">拍摄使用</option><option value="waste:quality_issue">品质问题</option><option value="waste:other">其他</option>` : `<option value="waste">损耗</option><option value="sample">试吃</option>`}
          </select>
          <input class="field-input stock-note" data-stock-note="${escapeAttr(product.id)}" placeholder="备注">
          ${manager ? `<label class="compact-check">
            <input data-stock-soldout="${escapeAttr(product.id)}" type="checkbox" ${product.sold_out ? "checked" : ""}>
            售罄
          </label><button class="mini-button ${product.is_active === false ? "active" : ""}" data-toggle-active="${escapeAttr(product.id)}">
            ${product.is_active === false ? "重新上架" : "下架"}
          </button>` : ""}
          ${canRecordWaste ? `<button class="mini-button primary" data-save-stock="${escapeAttr(product.id)}">保存库存</button>` : ""}
        </div>
      </article>
    `;
    }).join("") : `<div class="empty">当前筛选下没有产品。</div>`;

    const productQuery = String(el.orderProductFilter && el.orderProductFilter.value || "").trim().toLowerCase();
    const paymentQuery = String(el.orderPaymentFilter && el.orderPaymentFilter.value || "");
    const cashierQuery = String(el.orderCashierFilter && el.orderCashierFilter.value || "").trim().toLowerCase();
    const tableOrders = orders.filter(order => inActiveDateRange(order.day))
      .filter(order => !productQuery || (order.order_items || []).some(item => String(item.product_name || item.name || "").toLowerCase().includes(productQuery)))
      .filter(order => !paymentQuery || POS.normalizePaymentMethod(order.payment_method) === paymentQuery)
      .filter(order => !cashierQuery || String(order.cashier || "").toLowerCase().includes(cashierQuery));
    el.ordersBody.innerHTML = tableOrders.length ? tableOrders.map(order => {
      const items = order.order_items.map(item => `${item.product_name || item.name} x${itemQty(item)}`).join("、");
      const canCancel = !p1Enabled && POS.isRevenueOrder(order);
      const canRefund = p1Enabled && POS.canManage(currentRole) && POS.isRevenueOrder(order) && order.shift_id;
      return `
        <tr>
          <td>${order.day}</td>
          <td>${order.time_text}</td>
          <td>${items}</td>
          <td>${POS.paymentLabel(order.payment_method)}</td>
          <td><strong>${POS.money(orderAmount(order))}</strong></td>
          <td>${order.is_test ? '<span class="status-tag test">测试</span> ' : ""}${statusLabel(order.status)}${order.cancel_reason ? `<small class="order-reason">${escapeHtml(order.cancel_reason)}</small>` : ""}</td>
          <td>${canCancel ? `<button class="mini-button" data-void="${order.id}">取消</button>` : ""}${canRefund ? ` <button class="mini-button danger" data-refund="${order.id}">整单退款</button>` : ""}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="7">当前范围内还没有订单。</td></tr>`;

    renderMenuEditor();
    renderInventoryMovements();
    renderCloseout();
    renderBusinessDays();
    renderBasketAnalysis(activeOrders);
    renderP1Management();
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
      const product = products.find(item => item.id === productId);
      const delta = product ? Math.floor(stock) - Number(product.stock || 0) : 0;
      if (p1Enabled && product) {
        if (delta !== 0) {
          const selectedReason = reason ? reason.value : "adjustment";
          const [reasonGroup, reasonDetail] = selectedReason.split(":");
          const movementType = reasonGroup === "restock" ? "received"
            : reasonGroup === "waste" || reasonGroup === "sample" ? "waste"
              : delta > 0 ? "adjustment_in" : "adjustment_out";
          const reasonCode = reasonGroup === "restock" ? "received"
            : reasonGroup === "sample" ? "sampling"
              : reasonGroup === "waste" ? (reasonDetail || "quality_issue") : "count_adjustment";
          result = await client.rpc("record_inventory_p1", {
            p_product_id: productId,
            p_movement_type: movementType,
            p_quantity: Math.abs(delta),
            p_reason_code: reasonCode,
            p_note: note ? note.value.trim() : ""
          });
          if (result.error) throw result.error;
        }
        // The inventory RPC already updates stock and availability atomically.
        // A zero-quantity save is the only case that needs a direct availability toggle.
        if (delta === 0) {
          result = await client.from("products").update({
            sold_out: Boolean(soldOut && soldOut.checked),
            is_available: !(soldOut && soldOut.checked) && stock > 0,
            updated_at: new Date().toISOString()
          }).eq("id", productId);
        }
      } else {
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

    if (isHeicFile(file)) {
      POS.showToast("请先把 HEIC 转换成 JPG，再上传产品图片");
      input.value = "";
      return;
    }

    if (!String(file.type || "").startsWith("image/")) {
      POS.showToast("请选择图片文件");
      input.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      POS.showToast("图片不能超过 20MB");
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

      let updateResult = await client
        .from("products")
        .update({ image_path: compressed.dataUrl, image_url: compressed.dataUrl, updated_at: new Date().toISOString() })
        .eq("id", productId);

      if (updateResult.error && /column|schema cache/i.test(updateResult.error.message || "")) {
        updateResult = await client
          .from("products")
          .update({ image_path: compressed.dataUrl, updated_at: new Date().toISOString() })
          .eq("id", productId);
      }

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
      sku: String(formData.get("sku") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      short_name: String(formData.get("short_name") || "").trim(),
      note: String(formData.get("note") || "").trim(),
      category: POS.normalizeCategory(formData.get("category")),
      product_type: POS.normalizeCategory(formData.get("category")),
      subcategory: String(formData.get("subcategory") || "").trim(),
      series: String(formData.get("series") || "").trim(),
      size: String(formData.get("size") || "").trim(),
      unit: String(formData.get("unit") || "件").trim(),
      shape: String(formData.get("shape") || "").trim(),
      flavor: String(formData.get("flavor") || "").trim(),
      price: Number(formData.get("price") || 0),
      selling_price: Number(formData.get("price") || 0),
      sale_price: Number(formData.get("price") || 0),
      stock: Number(formData.get("stock") || 0),
      sort_order: Number(formData.get("sort_order") || 0),
      display_order: Number(formData.get("sort_order") || 0),
      shape_order: Number(formData.get("shape_order") || 0),
      flavor_order: Number(formData.get("flavor_order") || 0),
      low_stock_threshold: Number(formData.get("low_stock_threshold") || lowStockThreshold),
      image_path: String(formData.get("image_path") || "").trim(),
      image_url: String(formData.get("image_path") || "").trim(),
      sold_out: formData.has("sold_out"),
      is_active: formData.has("is_active"),
      is_available: formData.has("is_available"),
      track_inventory: formData.has("track_inventory"),
      is_favorite: formData.has("is_favorite"),
      is_upsell_product: formData.has("is_upsell_product"),
      upsell_priority: Number(formData.get("upsell_priority") || 0),
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
    const sku = String(formData.get("sku") || "").trim().toUpperCase();
    const series = String(formData.get("series") || "").trim();
    const price = Number(formData.get("price") || 0);
    const stock = Number(formData.get("stock") || 0);
    const lowStock = Number(formData.get("low_stock_threshold") || lowStockThreshold);
    const trackInventory = formData.has("track_inventory");
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
      sku: sku || null,
      name,
      short_name: note || name,
      category,
      product_type: category,
      subcategory: "",
      series,
      size: "",
      unit: "件",
      shape: "",
      flavor: "",
      shape_order: 0,
      flavor_order: 0,
      price: Math.floor(price),
      selling_price: Math.floor(price),
      sale_price: Math.floor(price),
      stock: Math.floor(stock),
      low_stock_threshold: Math.floor(lowStock),
      sold_out: trackInventory && Math.floor(stock) <= 0,
      is_active: true,
      is_available: !trackInventory || Math.floor(stock) > 0,
      track_inventory: trackInventory,
      is_deleted: false,
      image_path: "assets/icons/app-icon-512.png",
      image_url: "assets/icons/app-icon-512.png",
      note,
      sort_order: category === "service" ? 100 + products.length : 200 + products.length,
      display_order: category === "service" ? 100 + products.length : 200 + products.length,
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
      POS.showToast("原始冰淇淋商品需保留历史记录，可关闭“前台显示”进行下架");
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
    const reason = window.prompt("请输入取消原因（必填）。取消后库存会自动加回。", "顾客取消");
    if (reason === null) return;
    if (reason.trim().length < 2) {
      POS.showToast("请填写取消原因");
      return;
    }
    const operator = document.querySelector("#signedInAs") ? document.querySelector("#signedInAs").textContent : "";
    let result = await client.rpc("void_order", { p_order_id: orderId, p_cancel_reason: reason.trim(), p_operator: operator });
    if (result.error && /function|parameter|argument|schema cache/i.test(result.error.message || "")) {
      result = await client.rpc("void_order", { p_order_id: orderId });
    }
    if (result.error) {
      POS.showToast(result.error.message);
      return;
    }
    POS.showToast("订单已取消，库存已加回");
    await refresh();
  }

  async function refundOrder(orderId) {
    if (!POS.canManage(currentRole)) return POS.showToast("需要 Manager / Owner 权限");
    const reason = window.prompt("请输入整单退款原因。退款后会恢复本单库存。", "顾客退款");
    if (reason === null) return;
    if (reason.trim().length < 2) return POS.showToast("请填写退款原因");
    const result = await client.rpc("refund_order_p1", { p_order_id: orderId, p_reason: reason.trim() });
    if (result.error) return POS.showToast(result.error.message || "退款失败");
    POS.showToast("整单退款完成，库存已恢复");
    await refresh(currentSession);
  }

  async function reverseInventoryMovement(movementId) {
    if (currentRole !== "owner") return;
    const reason = window.prompt("请输入撤销原因。原流水不会删除，系统会生成一条反向流水。", "录入错误");
    if (reason === null || reason.trim().length < 2) return;
    const result = await client.rpc("reverse_inventory_movement_p1", { p_movement_id: movementId, p_reason: reason.trim() });
    if (result.error) return POS.showToast(result.error.message || "撤销失败");
    POS.showToast("已生成反向库存流水");
    await refresh(currentSession);
  }

  async function approveWaste(movementId) {
    if (!POS.canManage(currentRole)) return POS.showToast("需要 Manager / Owner 权限");
    const result = await client.rpc("approve_inventory_movement_p1", { p_movement_id: movementId });
    if (result.error) return POS.showToast(result.error.message || "报损审核失败");
    POS.showToast("报损已审核");
    await refresh(currentSession);
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

  function renderBusinessDays() {
    if (!el.businessDayHistory) return;
    const source = p1Enabled ? dailyOperations.map(row => ({
      ...row,
      day: row.business_date,
      status: row.operation_status,
      activity: row.special_event,
      exception_note: [row.stock_issue, row.equipment_issue, row.closed_reason, row.operation_note].filter(Boolean).join(" · ")
    })) : businessDays;
    const rows = source.filter(row => inActiveDateRange(row.day)).slice(0, 31);
    el.businessDayHistory.innerHTML = rows.length ? rows.map(row => `
      <div class="business-day-row">
        <div><strong>${escapeHtml(row.day)} ${weekdayLabel(row.day)}</strong><span>${escapeHtml(row.weather || "天气未填")} · ${escapeHtml(row.activity || "无活动记录")}</span></div>
        <div><strong>${escapeHtml(row.status || "open")}</strong><span>${escapeHtml(row.exception_note || "无异常")}</span></div>
      </div>
    `).join("") : `<div class="empty">当前范围还没有营业记录。</div>`;
  }

  async function saveBusinessDay(form) {
    const formData = new FormData(form);
    const payload = {
      day: String(formData.get("day") || todayKey),
      planned_open_time: formData.get("planned_open_time") || null,
      planned_close_time: formData.get("planned_close_time") || null,
      weather: String(formData.get("weather") || "").trim(),
      activity: String(formData.get("activity") || "").trim(),
      exception_note: String(formData.get("exception_note") || "").trim(),
      status: String(formData.get("status") || "open"),
      operator: document.querySelector("#signedInAs") ? document.querySelector("#signedInAs").textContent : "",
      updated_at: new Date().toISOString()
    };
    const button = form.querySelector("button[type='submit']");
    if (p1Enabled && payload.status === "closed" && payload.exception_note.length < 2) {
      POS.showToast("未营业时请填写休息原因");
      return;
    }
    POS.setBusy(button, true, "保存中");
    const result = p1Enabled
      ? await client.from("daily_operations").upsert({
        business_date: payload.day,
        operation_status: payload.status,
        planned_open_time: payload.planned_open_time,
        planned_close_time: payload.planned_close_time,
        weather: payload.weather || "other",
        special_event: payload.activity,
        closed_reason: payload.status === "closed" ? payload.exception_note : "",
        operation_note: payload.status === "closed" ? "" : payload.exception_note,
        updated_by: currentSession && currentSession.user.id,
        updated_at: payload.updated_at
      })
      : await client.from("business_days").upsert(payload);
    POS.setBusy(button, false);
    if (result.error) {
      POS.showToast(result.error.message && /business_days|schema cache/i.test(result.error.message) ? "请先执行经营管理升级 SQL" : result.error.message);
      return;
    }
    POS.showToast("营业记录已保存");
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

  function xmlEscape(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function columnName(index) {
    let name = "";
    for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
      name = String.fromCharCode(65 + (value - 1) % 26) + name;
    }
    return name;
  }

  function sheetXml(rows) {
    const body = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
      if (typeof value === "boolean") return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join("")}</row>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      table[index] = value >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    bytes.forEach(byte => { crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); });
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipHeader(length) {
    const bytes = new Uint8Array(length);
    const view = new DataView(bytes.buffer);
    return { bytes, view };
  }

  function createZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    Object.entries(files).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(content);
      const crc = crc32(data);
      const local = zipHeader(30);
      local.view.setUint32(0, 0x04034b50, true);
      local.view.setUint16(4, 20, true);
      local.view.setUint16(6, 0x0800, true);
      local.view.setUint16(8, 0, true);
      local.view.setUint16(10, 0, true);
      local.view.setUint16(12, 33, true);
      local.view.setUint32(14, crc, true);
      local.view.setUint32(18, data.length, true);
      local.view.setUint32(22, data.length, true);
      local.view.setUint16(26, nameBytes.length, true);
      localParts.push(local.bytes, nameBytes, data);

      const central = zipHeader(46);
      central.view.setUint32(0, 0x02014b50, true);
      central.view.setUint16(4, 20, true);
      central.view.setUint16(6, 20, true);
      central.view.setUint16(8, 0x0800, true);
      central.view.setUint16(10, 0, true);
      central.view.setUint16(12, 0, true);
      central.view.setUint16(14, 33, true);
      central.view.setUint32(16, crc, true);
      central.view.setUint32(20, data.length, true);
      central.view.setUint32(24, data.length, true);
      central.view.setUint16(28, nameBytes.length, true);
      central.view.setUint32(42, offset, true);
      centralParts.push(central.bytes, nameBytes);
      offset += local.bytes.length + nameBytes.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = zipHeader(22);
    end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(8, Object.keys(files).length, true);
    end.view.setUint16(10, Object.keys(files).length, true);
    end.view.setUint32(12, centralSize, true);
    end.view.setUint32(16, offset, true);
    return new Blob([...localParts, ...centralParts, end.bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function workbookData() {
    const orderRows = [["date", "time", "order_id", "total_amount", "payment_method", "status", "cashier", "items_summary"]];
    const itemRows = [["date", "time", "order_id", "product_id", "product_name", "category", "subcategory", "quantity", "unit_price", "subtotal", "payment_method", "status"]];
    filteredOrders(true).forEach(order => {
      orderRows.push([order.day, exportTime(order.time_text), order.id, orderAmount(order), POS.normalizePaymentMethod(order.payment_method), order.status || "paid", order.cashier || "", (order.order_items || []).map(item => `${item.product_name || item.name} x${itemQty(item)}`).join("、")]);
      (order.order_items || []).forEach(item => {
        const product = productById(item.product_id);
        itemRows.push([order.day, exportTime(order.time_text), order.id, item.product_uid || item.product_id, item.product_name || item.name, itemCategory(item, product), item.subcategory || (product && product.subcategory) || "", itemQty(item), itemUnitPrice(item), itemSubtotal(item), POS.normalizePaymentMethod(order.payment_method), order.status || "paid"]);
      });
    });
    const inventoryRows = [["date", "time", "product_id", "product_name", "category", "change_type", "quantity_change", "stock_before", "stock_after", "operator", "note"]];
    filteredInventoryMovements().forEach(item => inventoryRows.push([item.business_date || item.day, exportTime(item.time_text), item.product_uid || item.product_id, item.product_name, POS.normalizeCategory(item.category), item.change_type || item.reason, item.quantity_change ?? item.change_qty ?? 0, item.stock_before ?? item.before_stock ?? 0, item.stock_after ?? item.after_stock ?? 0, item.operator || "", item.note || ""]));
    const shiftRows = [["business_date", "shift_id", "cashier", "opened_at", "closed_at", "status", "opening_cash", "expected_cash", "actual_cash", "cash_difference", "qr_expected", "qr_actual", "transfer_expected", "transfer_actual", "order_count", "item_count", "difference_note"]];
    shifts.filter(row => inActiveDateRange(row.business_date)).forEach(row => shiftRows.push([row.business_date, row.shift_id, row.cashier_name, row.opened_at, row.closed_at, row.status, row.opening_cash, row.expected_cash, row.actual_cash, row.cash_difference, row.qr_expected, row.qr_actual, row.transfer_expected, row.transfer_actual, row.order_count, row.item_count, row.difference_note]));
    const paymentRows = [["payment_id", "order_id", "shift_id", "payment_method", "amount", "status", "reference_number", "paid_at"]];
    payments.filter(row => { const order = orders.find(item => item.id === row.order_id); return !order || inActiveDateRange(order.day); }).forEach(row => paymentRows.push([row.payment_id, row.order_id, row.shift_id, row.payment_method, row.amount, row.payment_status, row.reference_number, row.paid_at]));
    const promotionRows = [["promotion_id", "name", "code", "type", "minimum_quantity", "minimum_amount", "discount_value", "eligible_product_ids", "gift_product_id", "start_at", "end_at", "usage_count", "is_active"]];
    promotions.forEach(row => promotionRows.push([row.promotion_id, row.promotion_name, row.promotion_code, row.promotion_type, row.minimum_quantity, row.minimum_amount, row.discount_value, JSON.stringify(row.eligible_product_ids || []), row.gift_product_id, row.start_at, row.end_at, row.usage_count, row.is_active]));
    const usageRows = [["usage_id", "promotion_id", "order_id", "shift_id", "discount_amount", "gift_product_id", "gift_quantity", "used_at"]];
    promotionUsage.forEach(row => { const order = orders.find(item => item.id === row.order_id); if (!order || inActiveDateRange(order.day)) usageRows.push([row.usage_id, row.promotion_id, row.order_id, row.shift_id, row.discount_amount, row.gift_product_id, row.gift_quantity, row.used_at]); });
    const operationRows = [["business_date", "operation_status", "planned_open_time", "planned_close_time", "actual_open_time", "actual_close_time", "weather", "special_event", "staff_count", "stock_issue", "equipment_issue", "closed_reason", "operation_note"]];
    dailyOperations.filter(row => inActiveDateRange(row.business_date)).forEach(row => operationRows.push([row.business_date, row.operation_status, row.planned_open_time, row.planned_close_time, row.actual_open_time, row.actual_close_time, row.weather, row.special_event, row.staff_count, row.stock_issue, row.equipment_issue, row.closed_reason, row.operation_note]));
    const upsellRows = [["event_id", "shift_id", "order_id", "event_type", "recommended_product_id", "shown_at", "clicked_at", "added_to_cart", "dismissed"]];
    upsellEvents.filter(row => !row.shown_at || inActiveDateRange(POS.dateKey(new Date(row.shown_at)))).forEach(row => upsellRows.push([row.event_id, row.shift_id, row.order_id, row.event_type, row.recommended_product_id, row.shown_at, row.clicked_at, row.added_to_cart, row.dismissed]));
    return { Orders: orderRows, Order_Items: itemRows, Inventory: inventoryRows, Shifts: shiftRows, Payments: paymentRows, Promotions: promotionRows, Promotion_Usage: usageRows, Daily_Operations: operationRows, Upsell_Events: upsellRows };
  }

  function exportWorkbook() {
    if (p1Enabled && currentRole !== "owner") return POS.showToast("只有 Owner 可以导出完整经营数据");
    const sheets = workbookData();
    const names = Object.keys(sheets);
    const files = {
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((name, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, index) => `<sheet name="${xmlEscape(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((name, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>`
    };
    names.forEach((name, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = sheetXml(sheets[name]); });
    const url = URL.createObjectURL(createZip(files));
    const link = document.createElement("a");
    link.href = url;
    link.download = `patuxai-pops-${rangeFileLabel()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportTime(value) {
    const text = String(value || "").trim();
    if (!text || /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return text;
    return `${text}+07:00`;
  }

  function exportTimestampTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return exportTime(date.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Vientiane",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }));
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
        exportTime(order.time_text),
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
          exportTime(order.time_text),
          order.id,
          item.product_uid || item.product_id,
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
        exportTime(item.time_text),
        item.product_uid || item.product_id,
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

  function exportShiftsCsv() {
    const rows = [["business_date", "shift_id", "cashier", "opened_at", "closed_at", "status", "opening_cash", "expected_cash", "actual_cash", "cash_difference", "qr_expected", "qr_actual", "transfer_expected", "transfer_actual", "order_count", "item_count", "difference_note"]];
    shifts.filter(row => inActiveDateRange(row.business_date)).forEach(row => rows.push([row.business_date, row.shift_id, row.cashier_name, row.opened_at, row.closed_at, row.status, row.opening_cash, row.expected_cash, row.actual_cash, row.cash_difference, row.qr_expected, row.qr_actual, row.transfer_expected, row.transfer_actual, row.order_count, row.item_count, row.difference_note]));
    downloadCsv(rows, `patuxai-pops-shifts-${rangeFileLabel()}.csv`);
  }

  function exportPaymentsCsv() {
    const orderMap = new Map(orders.map(order => [order.id, order]));
    const rows = [["date", "time", "payment_id", "order_id", "shift_id", "payment_method", "amount", "status", "reference_number", "paid_at"]];
    payments.forEach(row => {
      const order = orderMap.get(row.order_id);
      const day = order ? order.day : String(row.created_at || "").slice(0, 10);
      if (!inActiveDateRange(day)) return;
      rows.push([day, order ? exportTime(order.time_text) : "", row.payment_id, row.order_id, row.shift_id, row.payment_method, row.amount, row.payment_status, row.reference_number, row.paid_at]);
    });
    downloadCsv(rows, `patuxai-pops-payments-${rangeFileLabel()}.csv`);
  }

  function exportPromotionsCsv() {
    const rows = [["promotion_id", "name", "code", "type", "minimum_quantity", "minimum_amount", "discount_value", "eligible_product_ids", "gift_product_id", "start_at", "end_at", "usage_count", "is_active"]];
    promotions.forEach(row => rows.push([row.promotion_id, row.promotion_name, row.promotion_code, row.promotion_type, row.minimum_quantity, row.minimum_amount, row.discount_value, JSON.stringify(row.eligible_product_ids || []), row.gift_product_id, row.start_at, row.end_at, row.usage_count, row.is_active]));
    downloadCsv(rows, `patuxai-pops-promotions-${rangeFileLabel()}.csv`);
  }

  function exportPromotionUsageCsv() {
    const orderMap = new Map(orders.map(order => [order.id, order]));
    const rows = [["date", "time", "usage_id", "promotion_id", "order_id", "shift_id", "discount_amount", "gift_product_id", "gift_quantity", "used_at"]];
    promotionUsage.forEach(row => {
      const order = orderMap.get(row.order_id);
      const day = order ? order.day : (row.used_at ? POS.dateKey(new Date(row.used_at)) : "");
      if (!inActiveDateRange(day)) return;
      rows.push([day, order ? exportTime(order.time_text) : "", row.usage_id, row.promotion_id, row.order_id, row.shift_id, row.discount_amount, row.gift_product_id, row.gift_quantity, row.used_at]);
    });
    downloadCsv(rows, `patuxai-pops-promotion-usage-${rangeFileLabel()}.csv`);
  }

  function exportUpsellCsv() {
    const orderMap = new Map(orders.map(order => [order.id, order]));
    const rows = [["date", "time", "event_id", "shift_id", "order_id", "event_type", "recommended_product_id", "shown_at", "clicked_at", "added_to_cart", "dismissed"]];
    upsellEvents.forEach(row => {
      const order = orderMap.get(row.order_id);
      const day = order ? order.day : (row.shown_at ? POS.dateKey(new Date(row.shown_at)) : "");
      if (!inActiveDateRange(day)) return;
      rows.push([day, order ? exportTime(order.time_text) : exportTimestampTime(row.shown_at), row.event_id, row.shift_id, row.order_id, row.event_type, row.recommended_product_id, row.shown_at, row.clicked_at, row.added_to_cart, row.dismissed]);
    });
    downloadCsv(rows, `patuxai-pops-upsell-${rangeFileLabel()}.csv`);
  }

  function exportOperationsCsv() {
    const rows = [["business_date", "operation_status", "planned_open_time", "planned_close_time", "actual_open_time", "actual_close_time", "weather", "special_event", "staff_count", "stock_issue", "equipment_issue", "closed_reason", "operation_note"]];
    dailyOperations.filter(row => inActiveDateRange(row.business_date)).forEach(row => rows.push([row.business_date, row.operation_status, row.planned_open_time, row.planned_close_time, row.actual_open_time, row.actual_close_time, row.weather, row.special_event, row.staff_count, row.stock_issue, row.equipment_issue, row.closed_reason, row.operation_note]));
    downloadCsv(rows, `patuxai-pops-operations-${rangeFileLabel()}.csv`);
  }

  async function savePromotion(form) {
    if (!POS.canManage(currentRole)) return POS.showToast("需要 Manager / Owner 权限");
    const data = new FormData(form);
    const payload = {
      promotion_name: String(data.get("promotion_name") || "").trim(),
      promotion_code: String(data.get("promotion_code") || "").trim().toUpperCase(),
      promotion_type: String(data.get("promotion_type") || "fixed_discount"),
      minimum_quantity: Number(data.get("minimum_quantity") || 0),
      minimum_amount: Number(data.get("minimum_amount") || 0),
      discount_value: Number(data.get("discount_value") || 0),
      eligible_product_ids: data.get("eligible_product_id") ? [data.get("eligible_product_id")] : [],
      gift_product_id: data.get("gift_product_id") || null,
      start_at: data.get("start_at") ? new Date(data.get("start_at")).toISOString() : null,
      end_at: data.get("end_at") ? new Date(data.get("end_at")).toISOString() : null,
      usage_limit: data.get("usage_limit") ? Number(data.get("usage_limit")) : null,
      is_active: true,
      created_by: currentSession && currentSession.user.id
    };
    const button = form.querySelector("button[type='submit']");
    POS.setBusy(button, true, "保存中");
    const result = await client.from("promotions").insert(payload);
    POS.setBusy(button, false);
    if (result.error) return POS.showToast(result.error.message || "促销保存失败");
    form.reset();
    POS.showToast("促销已新增");
    await refresh(currentSession);
  }

  async function togglePromotion(id) {
    const promotion = promotions.find(row => row.promotion_id === id);
    if (!promotion || !POS.canManage(currentRole)) return;
    const result = await client.from("promotions").update({ is_active: !promotion.is_active, updated_at: new Date().toISOString() }).eq("promotion_id", id);
    if (result.error) return POS.showToast(result.error.message);
    await refresh(currentSession);
  }

  function reconciliationDay() {
    if (activeRange === "date") return selectedDate;
    if (activeRange === "custom") return rangeEndDate;
    return todayKey;
  }

  async function refreshReconciliation(review, dayOverride) {
    const day = dayOverride || reconciliationDay();
    const result = review
      ? await client.rpc("review_daily_reconciliation", { p_business_date: day, p_note: "后台确认" })
      : await client.rpc("refresh_daily_reconciliation", { p_business_date: day });
    if (result.error) return POS.showToast(result.error.message || "对账刷新失败");
    POS.showToast(review ? "对账已审核" : "对账已刷新");
    await refresh(currentSession);
  }

  async function updateUserRole(userId, role) {
    if (currentRole !== "owner") return;
    const result = await client.from("user_profiles").update({ role, updated_at: new Date().toISOString() }).eq("user_id", userId);
    if (result.error) return POS.showToast(result.error.message || "权限更新失败");
    POS.showToast("账号权限已更新");
    await refresh(currentSession);
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
    persistFilters();
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
    persistFilters();
    render();
  }

  function applyCustomRange(startValue, endValue) {
    if (!startValue || !endValue) return;
    rangeStartDate = startValue;
    rangeEndDate = endValue;
    activeRange = "custom";
    document.querySelectorAll("[data-range]").forEach(item => item.classList.remove("active"));
    syncDateInputs();
    persistFilters();
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
    persistFilters();
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
      persistFilters();
      render();
    });
  }

  if (el.hourMetricSwitch) {
    el.hourMetricSwitch.addEventListener("click", event => {
      const button = event.target.closest("[data-hour-metric]");
      if (!button) return;
      activeHourMetric = button.dataset.hourMetric;
      el.hourMetricSwitch.querySelectorAll("[data-hour-metric]").forEach(item => item.classList.toggle("active", item === button));
      renderOperationsHourChart(filteredOrders(false));
    });
  }
  [el.orderProductFilter, el.orderCashierFilter, el.shiftCashierFilter].filter(Boolean).forEach(input => input.addEventListener("input", render));
  [el.orderPaymentFilter, el.shiftStatusFilter].filter(Boolean).forEach(input => input.addEventListener("change", render));

  if (el.adminShortcuts) {
    el.adminShortcuts.addEventListener("click", event => {
      const link = event.target.closest("[data-admin-nav]");
      if (!link) return;
      event.preventDefault();
      const nextHash = link.getAttribute("href") || "#home";
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, "", nextHash);
      }
      setAdminView(link.dataset.adminNav, { scroll: true });
    });
  }

  window.addEventListener("hashchange", () => setAdminView(currentAdminView(), { scroll: true }));
  window.addEventListener("popstate", () => setAdminView(currentAdminView(), { scroll: true }));
  window.addEventListener("resize", updateAdminStickyOffset, { passive: true });
  updateAdminStickyOffset();
  if (el.adminTopbar && window.ResizeObserver) {
    new ResizeObserver(updateAdminStickyOffset).observe(el.adminTopbar);
  }

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
      return;
    }
    const refundButton = event.target.closest("[data-refund]");
    if (refundButton) {
      refundOrder(refundButton.dataset.refund);
      return;
    }
    const reverseMovementButton = event.target.closest("[data-reverse-movement]");
    if (reverseMovementButton) {
      reverseInventoryMovement(reverseMovementButton.dataset.reverseMovement);
      return;
    }
    const approveWasteButton = event.target.closest("[data-approve-waste]");
    if (approveWasteButton) {
      approveWaste(approveWasteButton.dataset.approveWaste);
      return;
    }
    const promotionButton = event.target.closest("[data-toggle-promotion]");
    if (promotionButton) {
      togglePromotion(promotionButton.dataset.togglePromotion);
      return;
    }
    const reviewButton = event.target.closest("[data-review-reconciliation]");
    if (reviewButton) {
      refreshReconciliation(true, reviewButton.dataset.reviewReconciliation);
    }
  });

  document.body.addEventListener("change", event => {
    const roleSelect = event.target.closest("[data-role-user]");
    if (roleSelect) updateUserRole(roleSelect.dataset.roleUser, roleSelect.value);
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
  if (el.exportXlsx) el.exportXlsx.addEventListener("click", exportWorkbook);
  if (el.exportShiftsCsv) el.exportShiftsCsv.addEventListener("click", exportShiftsCsv);
  if (el.exportPaymentsCsv) el.exportPaymentsCsv.addEventListener("click", exportPaymentsCsv);
  if (el.exportPromotionsCsv) el.exportPromotionsCsv.addEventListener("click", exportPromotionsCsv);
  if (el.exportPromotionUsageCsv) el.exportPromotionUsageCsv.addEventListener("click", exportPromotionUsageCsv);
  if (el.exportUpsellCsv) el.exportUpsellCsv.addEventListener("click", exportUpsellCsv);
  if (el.exportOperationsCsv) el.exportOperationsCsv.addEventListener("click", exportOperationsCsv);
  if (el.refreshReconciliation) el.refreshReconciliation.addEventListener("click", () => refreshReconciliation(false));
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
  if (el.businessDayForm) {
    const dayInput = el.businessDayForm.querySelector("[name='day']");
    if (dayInput) dayInput.value = todayKey;
    el.businessDayForm.addEventListener("submit", event => {
      event.preventDefault();
      saveBusinessDay(event.target);
    });
  }
  if (el.promotionForm) {
    el.promotionForm.addEventListener("submit", event => {
      event.preventDefault();
      savePromotion(event.target);
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

  document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("active", item.dataset.range === activeRange));
  if (el.productFilters) el.productFilters.querySelectorAll("[data-product-filter]").forEach(item => item.classList.toggle("active", item.dataset.productFilter === activeProductFilter));
  syncDateInputs();
  updateAdminStickyOffset();
  setAdminView(currentAdminView());
  POS.initAuth(client, refresh).catch(error => POS.showToast(error.message));
})();
