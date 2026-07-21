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
  const p1EnabledKey = "patuxai-pops-p1-enabled";
  const currentRoleKey = "patuxai-pops-current-role";
  const currentShiftKey = "patuxai-pops-current-shift";
  const promotionsCacheKey = "patuxai-pops-promotions-cache";
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
  let currentSession = null;
  let currentRole = "viewer";
  let currentShift = null;
  let p1Enabled = false;
  let promotions = [];
  let appliedPromotion = null;
  let activeUpsellEvents = new Map();
  let upsellDismissed = false;
  let menuRetryTimer = null;
  let menuSyncInFlight = null;
  let menuUsingCache = false;
  let menuSyncError = "";

  function isProductUnavailable(product) {
    if (!product || product.is_active === false || product.is_available === false) return true;
    if (product.track_inventory === false) return false;
    return product.sold_out || product.stock <= 0;
  }

  function promotionIsActive(promotion) {
    if (!promotion || promotion.is_active === false) return false;
    const now = Date.now();
    if (promotion.start_at && now < new Date(promotion.start_at).getTime()) return false;
    if (promotion.end_at && now > new Date(promotion.end_at).getTime()) return false;
    if (promotion.usage_limit != null && Number(promotion.usage_count || 0) >= Number(promotion.usage_limit)) return false;
    return true;
  }

  function eligiblePromotion() {
    const saleLines = cart.filter(item => !["gift", "complimentary"].includes(item.item_type));
    const subtotal = saleLines.reduce((sum, item) => sum + item.selling_price * item.qty, 0);
    return promotions.filter(promotion => promotionIsActive(promotion))
      .filter(promotion => {
        const eligibleIds = Array.isArray(promotion.eligible_product_ids) ? promotion.eligible_product_ids : [];
        const quantity = saleLines.filter(item => {
          if (!eligibleIds.length) return true;
          const product = products.find(row => row.id === item.product_id);
          return product && eligibleIds.includes(product.product_id);
        }).reduce((sum, item) => sum + item.qty, 0);
        return quantity >= Number(promotion.minimum_quantity || 0);
      })
      .filter(promotion => subtotal >= Number(promotion.minimum_amount || 0))
      .sort((a, b) => Number(b.discount_value || 0) - Number(a.discount_value || 0))[0] || null;
  }

  function promotionDiscount(promotion, subtotal) {
    if (!promotion) return 0;
    if (promotion.promotion_type === "fixed_discount") return Math.min(subtotal, Number(promotion.discount_value || 0));
    if (promotion.promotion_type === "percentage_discount") return Math.min(subtotal, Math.round(subtotal * Number(promotion.discount_value || 0) / 100));
    if (promotion.promotion_type === "bundle_price") return Math.max(0, subtotal - Number(promotion.discount_value || subtotal));
    return 0;
  }

  const el = {
    todayText: document.querySelector("#todayText"),
    categoryTabs: document.querySelector("#categoryTabs"),
    productGrid: document.querySelector("#productGrid"),
    searchInput: document.querySelector("#searchInput"),
    posTopbar: document.querySelector(".app > main > .topbar"),
    cartList: document.querySelector("#cartList"),
    cartPanel: document.querySelector(".app > aside"),
    upsellHint: document.querySelector("#upsellHint"),
    cartCount: document.querySelector("#cartCount"),
    subtotal: document.querySelector("#subtotal"),
    discountText: document.querySelector("#discountText"),
    discountInput: document.querySelector("#discountInput"),
    grandTotal: document.querySelector("#grandTotal"),
    checkoutBtn: document.querySelector("#checkoutBtn"),
    checkoutMore: document.querySelector("#checkoutMore"),
    clearCart: document.querySelector("#clearCart"),
    cashInput: document.querySelector("#cashInput"),
    cashPresets: document.querySelector("#cashPresets"),
    changeText: document.querySelector("#changeText"),
    payMethods: document.querySelector("#payMethods"),
    salesTotal: document.querySelector("#salesTotal"),
    orderCount: document.querySelector("#orderCount"),
    itemCount: document.querySelector("#itemCount"),
    icecreamItemCount: document.querySelector("#icecreamItemCount"),
    serviceItemCount: document.querySelector("#serviceItemCount"),
    merchandiseItemCount: document.querySelector("#merchandiseItemCount"),
    beverageItemCount: document.querySelector("#beverageItemCount"),
    bundleItemCount: document.querySelector("#bundleItemCount"),
    otherItemCount: document.querySelector("#otherItemCount"),
    topItem: document.querySelector("#topItem"),
    ordersBody: document.querySelector("#ordersBody"),
    syncBadge: document.querySelector("#syncBadge"),
    lowStockAlert: document.querySelector("#lowStockAlert"),
    shiftScreen: document.querySelector("#shiftScreen"),
    openShiftForm: document.querySelector("#openShiftForm"),
    shiftBusinessDate: document.querySelector("#shiftBusinessDate"),
    shiftCashierName: document.querySelector("#shiftCashierName"),
    openingCashInput: document.querySelector("#openingCashInput"),
    openingNoteInput: document.querySelector("#openingNoteInput"),
    shiftStockNote: document.querySelector("#shiftStockNote"),
    shiftStatus: document.querySelector("#shiftStatus"),
    closeShiftBtn: document.querySelector("#closeShiftBtn"),
    closeShiftSheet: document.querySelector("#closeShiftSheet"),
    closeShiftForm: document.querySelector("#closeShiftForm"),
    closeShiftCancel: document.querySelector("#closeShiftCancel"),
    shiftCloseSummary: document.querySelector("#shiftCloseSummary"),
    discountReasonRow: document.querySelector("#discountReasonRow"),
    discountReasonInput: document.querySelector("#discountReasonInput"),
    promotionApplied: document.querySelector("#promotionApplied"),
    qrPaymentDisplay: document.querySelector("#qrPaymentDisplay"),
    qrPaymentImage: document.querySelector("#qrPaymentImage"),
    qrPaymentAmount: document.querySelector("#qrPaymentAmount"),
    paymentReferenceRow: document.querySelector("#paymentReferenceRow"),
    paymentReferenceInput: document.querySelector("#paymentReferenceInput"),
    paymentConfirmedRow: document.querySelector("#paymentConfirmedRow"),
    paymentConfirmedInput: document.querySelector("#paymentConfirmedInput"),
    mixedPaymentGrid: document.querySelector("#mixedPaymentGrid"),
    mixedCashInput: document.querySelector("#mixedCashInput"),
    mixedQrInput: document.querySelector("#mixedQrInput"),
    mixedTransferInput: document.querySelector("#mixedTransferInput"),
    mixedTotalText: document.querySelector("#mixedTotalText"),
    complimentaryReasonRow: document.querySelector("#complimentaryReasonRow"),
    complimentaryReasonInput: document.querySelector("#complimentaryReasonInput"),
    orderNoteInput: document.querySelector("#orderNoteInput")
  };

  function cartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.item_type === "gift" ? 0 : Number(item.selling_price ?? item.price) * item.qty), 0);
    const automaticDiscount = promotionDiscount(appliedPromotion, subtotal);
    // Automatic promotions and manual discounts never stack on the same order.
    const manualDiscount = !appliedPromotion && POS.canManage(currentRole) ? Number(el.discountInput && el.discountInput.value || 0) : 0;
    const discount = payMethod === "complimentary"
      ? subtotal
      : Math.min(Math.max(0, automaticDiscount + manualDiscount), subtotal);
    return { subtotal, automaticDiscount, manualDiscount, discount, total: subtotal - discount };
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
      const value = Math.floor(Math.random() * 16);
      return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
    });
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
      if (isProductUnavailable(product)) return null;
      const qty = product.track_inventory === false ? Number(line.qty || 1) : Math.min(Number(line.qty || 1), product.stock);
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

  function reconcilePromotion() {
    cart = cart.filter(item => !item.promotion_auto);
    appliedPromotion = eligiblePromotion();
    if (!appliedPromotion || !["buy_x_get_y", "gift_with_purchase"].includes(appliedPromotion.promotion_type) || !appliedPromotion.gift_product_id) return;
    const giftProduct = products.find(product => String(product.product_id) === String(appliedPromotion.gift_product_id));
    if (isProductUnavailable(giftProduct)) return;
    cart.push({
      line_id: makeId(),
      product_id: giftProduct.id,
      name: productLabel(giftProduct),
      price: 0,
      selling_price: giftProduct.selling_price,
      category: giftProduct.category,
      subcategory: giftProduct.subcategory || giftProduct.shape || "",
      item_type: "gift",
      gift_reason: appliedPromotion.promotion_name,
      promotion_auto: true,
      qty: 1
    });
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
    const activeDay = currentShift && currentShift.business_date ? currentShift.business_date : POS.todayKey();
    return pendingOrders.filter(order => order.day === activeDay);
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
    if (menuUsingCache) {
      POS.setSyncStatus("菜单待同步 · 点此重试", "pending");
      return;
    }
    const lastSynced = lastSyncedLabel();
    POS.setSyncStatus(lastSynced ? `在线 · ${lastSynced} 已同步` : "在线 · 已同步", "online");
  }

  function normalizeVisibleProducts(items) {
    return (items || [])
      .map(POS.normalizeProduct)
      .filter(product => product.is_deleted !== true)
      .filter(product => !(POS.retiredProductIds || []).includes(product.id))
      .filter(product => product.is_active !== false);
  }

  function scheduleMenuRetry() {
    window.clearTimeout(menuRetryTimer);
    if (!window.navigator.onLine) return;
    menuRetryTimer = window.setTimeout(async () => {
      const synced = await loadProducts({ silent: true, attempts: 1 });
      if (synced) {
        renderAll();
        POS.showToast("菜单和库存已同步");
      }
    }, 12000);
  }

  async function loadProducts(options = {}) {
    if (menuSyncInFlight) return menuSyncInFlight;
    const attempts = Math.max(1, Number(options.attempts || 2));
    const silent = options.silent === true;

    menuSyncInFlight = (async () => {
      let lastError = null;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const result = await client
          .from("products")
          .select("*")
          .order("sort_order", { ascending: true });
        if (!result.error && Array.isArray(result.data) && result.data.length) {
          products = normalizeVisibleProducts(result.data);
          writeJson(productsCacheKey, products);
          menuUsingCache = false;
          menuSyncError = "";
          window.clearTimeout(menuRetryTimer);
          return true;
        }

        lastError = result.error || new Error("数据库没有返回产品数据");
        if (attempt + 1 < attempts) {
          await new Promise(resolve => window.setTimeout(resolve, 800 * (attempt + 1)));
        }
      }

      const cachedProducts = readJson(productsCacheKey, []);
      products = normalizeVisibleProducts(cachedProducts.length ? cachedProducts : POS.productCatalog);
      menuUsingCache = true;
      menuSyncError = String((lastError && lastError.message) || lastError || "网络连接失败");
      scheduleMenuRetry();
      if (!silent) {
        POS.showToast(cachedProducts.length ? "菜单同步失败，暂用最近库存" : "菜单同步失败，请点击顶部重新同步");
      }
      return false;
    })().finally(() => {
      menuSyncInFlight = null;
      updateSyncStatus();
    });

    return menuSyncInFlight;
  }

  async function manualMenuSync() {
    if (!window.navigator.onLine) {
      POS.showToast("当前离线，请检查网络");
      return;
    }
    POS.setSyncStatus("正在同步菜单", "pending");
    const synced = await loadProducts({ silent: true, attempts: 3 });
    if (synced) {
      renderAll();
      POS.showToast("菜单和真实库存已更新");
      return;
    }
    POS.showToast(`同步失败：${menuSyncError || "请检查网络"}`);
  }

  async function loadP1Context(session) {
    currentSession = session || currentSession;
    if (!currentSession || !currentSession.user) return;
    try {
      const [profileResult, shiftResult, promotionResult] = await Promise.all([
        client.from("user_profiles").select("user_id, email, display_name, role, is_active").eq("user_id", currentSession.user.id),
        client.from("shifts").select("*").eq("cashier_id", currentSession.user.id).eq("business_date", POS.todayKey()).eq("status", "open").order("opened_at", { ascending: false }),
        client.from("promotions").select("*").eq("is_active", true).order("created_at", { ascending: false })
      ]);
      if (profileResult.error || shiftResult.error || promotionResult.error) throw new Error("P1 unavailable");
      const profile = profileResult.data && profileResult.data[0];
      currentRole = profile && profile.is_active !== false ? profile.role : "viewer";
      currentShift = shiftResult.data && shiftResult.data[0] || null;
      promotions = (promotionResult.data || []).filter(promotionIsActive);
      writeJson(promotionsCacheKey, promotions);
      p1Enabled = true;
      window.localStorage.setItem(p1EnabledKey, "true");
      window.localStorage.setItem(currentRoleKey, currentRole);
      writeJson(currentShiftKey, currentShift);
    } catch (error) {
      const cachedShift = readJson(currentShiftKey, null);
      currentShift = cachedShift && cachedShift.status === "open" && cachedShift.business_date === POS.todayKey() ? cachedShift : null;
      currentRole = window.localStorage.getItem(currentRoleKey) || "cashier";
      promotions = readJson(promotionsCacheKey, []).filter(promotionIsActive);
      p1Enabled = window.localStorage.getItem(p1EnabledKey) === "true";
    }
    renderShiftState();
  }

  function renderShiftState() {
    if (!el.shiftScreen) return;
    const requiresShift = p1Enabled && !currentShift;
    el.shiftScreen.hidden = !requiresShift;
    document.body.classList.toggle("shift-required", requiresShift);
    if (el.shiftBusinessDate) el.shiftBusinessDate.textContent = `${POS.todayKey()} · ${POS.todayLabel()}`;
    if (el.shiftCashierName) el.shiftCashierName.value = currentSession && currentSession.user ? (currentSession.user.email || "") : "";
    if (el.shiftStatus) {
      el.shiftStatus.textContent = currentShift
        ? `${POS.roleLabel(currentRole)} · ${String(currentShift.opened_at || "").slice(11, 16)} 开班`
        : p1Enabled ? "等待开班" : "兼容模式";
      el.shiftStatus.classList.toggle("open", Boolean(currentShift));
    }
    if (el.closeShiftBtn) el.closeShiftBtn.hidden = !currentShift;
    if (el.shiftStockNote) {
      const low = products.filter(product => product.track_inventory !== false && product.is_active !== false && (product.sold_out || product.stock <= (product.low_stock_threshold || lowStockThreshold)));
      el.shiftStockNote.textContent = low.length ? `开班提醒：${low.length} 个商品低库存或售罄。` : "库存状态正常。";
    }
    const openButton = el.openShiftForm && el.openShiftForm.querySelector("button[type='submit']");
    if (openButton) {
      openButton.disabled = p1Enabled && currentRole === "viewer";
      openButton.textContent = openButton.disabled ? "Viewer 仅可查看后台报表" : "开始营业";
    }
    if (el.discountInput) {
      el.discountInput.disabled = p1Enabled && !POS.canManage(currentRole);
      el.discountInput.placeholder = el.discountInput.disabled ? "仅 Manager / Owner 可用" : "例如 10000";
    }
    if (el.discountReasonRow) el.discountReasonRow.hidden = !POS.canManage(currentRole);
    renderPaymentControls();
  }

  async function openShift(event) {
    event.preventDefault();
    if (!window.navigator.onLine) {
      POS.showToast("开班需要连接数据库");
      return;
    }
    const button = el.openShiftForm.querySelector("button[type='submit']");
    POS.setBusy(button, true, "开班中");
    const result = await client.rpc("open_shift", {
      p_opening_cash: Number(el.openingCashInput.value || 0),
      p_opening_note: String(el.openingNoteInput.value || "").trim(),
      p_cashier_name: currentSession && currentSession.user ? currentSession.user.email : ""
    });
    POS.setBusy(button, false);
    if (result.error) {
      POS.showToast(result.error.message || "开班失败");
      return;
    }
    POS.showToast("开班成功，可以开始收银");
    await refresh(currentSession);
  }

  function shiftPaymentTotals() {
    const active = orders.filter(order => POS.isRevenueOrder(order) && (!currentShift || !order.shift_id || order.shift_id === currentShift.shift_id));
    const totals = { cash: 0, qr: 0, bank_transfer: 0, other: 0 };
    active.forEach(order => {
      const paymentRows = Array.isArray(order.payments) && order.payments.length
        ? order.payments
        : [{ payment_method: order.payment_method, amount: Number(order.final_amount ?? order.total ?? 0), payment_status: "confirmed" }];
      paymentRows.filter(row => row.payment_status !== "refunded").forEach(row => {
        const method = POS.normalizePaymentMethod(row.payment_method);
        const key = Object.prototype.hasOwnProperty.call(totals, method) ? method : "other";
        totals[key] += Number(row.amount || 0);
      });
    });
    return totals;
  }

  function openCloseShiftSheet() {
    if (!currentShift || !el.closeShiftSheet) return;
    if (pendingOrders.length) {
      POS.showToast(`还有 ${pendingOrders.length} 单待同步，不能交班`);
      return;
    }
    const totals = shiftPaymentTotals();
    const expectedCash = Number(currentShift.opening_cash || 0) + totals.cash;
    const shiftOrders = orders.filter(order => !order.shift_id || order.shift_id === currentShift.shift_id);
    const active = shiftOrders.filter(POS.isRevenueOrder);
    const itemCount = active.reduce((sum, order) => sum + (order.order_items || []).reduce((part, item) => part + Number(item.quantity ?? item.qty ?? 0), 0), 0);
    const discounts = active.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0);
    const gifts = active.reduce((sum, order) => sum + (order.order_items || []).filter(item => ["gift", "complimentary"].includes(item.item_type)).reduce((part, item) => part + Number(item.quantity ?? item.qty ?? 0), 0), 0);
    el.shiftCloseSummary.innerHTML = `
      <div><span>系统现金</span><strong>${POS.money(expectedCash)}</strong></div>
      <div><span>QR</span><strong>${POS.money(totals.qr)}</strong></div>
      <div><span>转账</span><strong>${POS.money(totals.bank_transfer)}</strong></div>
      <div><span>其他</span><strong>${POS.money(totals.other)}</strong></div>
      <div><span>本班销售</span><strong>${POS.money(active.reduce((sum, order) => sum + Number(order.final_amount ?? order.total ?? 0), 0))}</strong></div>
      <div><span>订单 / 件数</span><strong>${active.length} / ${itemCount}</strong></div>
      <div><span>折扣 / 赠品</span><strong>${POS.money(discounts)} / ${gifts}</strong></div>
      <div><span>取消 / 退款</span><strong>${shiftOrders.filter(order => order.status === "cancelled").length} / ${shiftOrders.filter(order => order.status === "refunded").length}</strong></div>`;
    const form = el.closeShiftForm.elements;
    form.actual_cash.value = expectedCash;
    form.qr_actual.value = totals.qr;
    form.transfer_actual.value = totals.bank_transfer;
    form.other_actual.value = totals.other;
    el.closeShiftSheet.hidden = false;
  }

  async function closeShift(event) {
    event.preventDefault();
    if (!currentShift) return;
    if (!window.navigator.onLine || pendingOrders.length) {
      POS.showToast("请先联网同步全部订单再交班");
      return;
    }
    const formData = new FormData(el.closeShiftForm);
    const button = el.closeShiftForm.querySelector("button[type='submit']");
    POS.setBusy(button, true, "对账中");
    const result = await client.rpc("close_shift_p1", {
      p_shift_id: currentShift.shift_id,
      p_actual_cash: Number(formData.get("actual_cash") || 0),
      p_qr_actual: Number(formData.get("qr_actual") || 0),
      p_transfer_actual: Number(formData.get("transfer_actual") || 0),
      p_other_actual: Number(formData.get("other_actual") || 0),
      p_difference_note: String(formData.get("difference_note") || "").trim(),
      p_closing_note: String(formData.get("closing_note") || "").trim(),
      p_weather: String(formData.get("weather") || "other"),
      p_stock_issue: String(formData.get("stock_issue") || "").trim(),
      p_equipment_issue: String(formData.get("equipment_issue") || "").trim(),
      p_special_event: String(formData.get("special_event") || "").trim(),
      p_operation_note: String(formData.get("operation_note") || "").trim()
    });
    POS.setBusy(button, false);
    if (result.error) {
      POS.showToast(result.error.message || "交班失败");
      return;
    }
    el.closeShiftSheet.hidden = true;
    currentShift = null;
    writeJson(currentShiftKey, null);
    POS.showToast("交班完成，今日对账已保存");
    await refresh(currentSession);
  }

  async function loadTodayOrders() {
    const activeDay = currentShift && currentShift.business_date ? currentShift.business_date : POS.todayKey();
    try {
      let result = await client
        .from("orders")
        .select("id, shift_id, day, time_text, payment_method, total, total_amount, discount_amount, final_amount, status, cashier, note, promotion_name_snapshot, complimentary_reason, order_items(product_id, name, product_name, category, subcategory, qty, quantity, price, unit_price, subtotal, item_type, gift_reason), payments(payment_method, amount, payment_status)")
        .eq("day", activeDay)
        .order("created_at", { ascending: false });
      if (result.error && /column|schema cache|relationship|select/i.test(result.error.message || "")) {
        result = await client
          .from("orders")
          .select("id, day, time_text, payment_method, total, status, order_items(product_id, name, qty, price)")
          .eq("day", activeDay)
          .order("created_at", { ascending: false });
      }
      if (result.error) throw result.error;
      orders = [...pendingForToday(), ...(result.data || [])];
    } catch (error) {
      orders = pendingForToday();
    }
  }

  function mixedAmounts() {
    return {
      cash: Number(el.mixedCashInput && el.mixedCashInput.value || 0),
      qr: Number(el.mixedQrInput && el.mixedQrInput.value || 0),
      bank_transfer: Number(el.mixedTransferInput && el.mixedTransferInput.value || 0)
    };
  }

  function renderPaymentControls() {
    const needsConfirmation = ["qr", "bank_transfer", "mixed"].includes(payMethod);
    const qrImageUrl = String(window.POS_CONFIG && window.POS_CONFIG.QR_IMAGE_URL || "").trim();
    if (el.qrPaymentDisplay) el.qrPaymentDisplay.hidden = payMethod !== "qr" || !qrImageUrl;
    if (el.qrPaymentImage && qrImageUrl) el.qrPaymentImage.src = qrImageUrl;
    if (el.qrPaymentAmount) el.qrPaymentAmount.textContent = `应收 ${POS.money(cartTotals().total)}`;
    if (el.paymentReferenceRow) el.paymentReferenceRow.hidden = !["qr", "bank_transfer"].includes(payMethod);
    if (el.paymentConfirmedRow) el.paymentConfirmedRow.hidden = !needsConfirmation;
    if (el.mixedPaymentGrid) el.mixedPaymentGrid.hidden = payMethod !== "mixed";
    if (el.complimentaryReasonRow) el.complimentaryReasonRow.hidden = payMethod !== "complimentary";
    if (el.cashInput && el.cashInput.parentElement) el.cashInput.parentElement.hidden = payMethod !== "cash";
    if (el.cashPresets) el.cashPresets.hidden = payMethod !== "cash";
    if (el.paymentConfirmedInput && !needsConfirmation) el.paymentConfirmedInput.checked = false;
    updateMixedTotal();
  }

  function updateMixedTotal() {
    if (!el.mixedTotalText) return;
    const amounts = mixedAmounts();
    const sum = amounts.cash + amounts.qr + amounts.bank_transfer;
    const total = cartTotals().total;
    el.mixedTotalText.textContent = `合计 ${POS.money(sum)} / 应收 ${POS.money(total)}`;
    el.mixedTotalText.classList.toggle("difference", sum !== total);
  }

  function buildPayments(total) {
    const confirmed = !el.paymentConfirmedInput || el.paymentConfirmedInput.checked;
    const reference = String(el.paymentReferenceInput && el.paymentReferenceInput.value || "").trim();
    if (payMethod === "cash") return [{ payment_method: "cash", amount: total, payment_status: "confirmed", reference_number: "" }];
    if (["qr", "bank_transfer"].includes(payMethod)) {
      if (!confirmed) throw new Error("请先确认款项已经到账");
      return [{ payment_method: payMethod, amount: total, payment_status: "confirmed", reference_number: reference }];
    }
    if (payMethod === "mixed") {
      const amounts = mixedAmounts();
      const sum = amounts.cash + amounts.qr + amounts.bank_transfer;
      if (sum !== total) throw new Error("混合支付合计必须等于应收金额");
      if ((amounts.qr > 0 || amounts.bank_transfer > 0) && !confirmed) throw new Error("请先确认 QR 或转账已经到账");
      return Object.entries(amounts).filter(([, amount]) => amount > 0).map(([method, amount]) => ({
        payment_method: method,
        amount,
        payment_status: "confirmed",
        reference_number: ""
      }));
    }
    if (payMethod === "complimentary") {
      const reason = String(el.complimentaryReasonInput && el.complimentaryReasonInput.value || "").trim() || "赠送";
      if (!POS.canManage(currentRole)) throw new Error("Complimentary 需要 Manager 或 Owner 权限");
      return [{ payment_method: "complimentary", amount: 0, payment_status: "confirmed", reference_number: "", note: reason }];
    }
    return [{ payment_method: "other", amount: total, payment_status: "confirmed", reference_number: reference }];
  }

  async function refresh(session) {
    loadPendingOrders();
    if (window.navigator.onLine && pendingOrders.length) {
      await syncPendingOrders(true);
    }
    await loadProducts();
    await loadP1Context(session);
    loadCartOnce();
    reconcilePromotion();
    await loadTodayOrders();
    renderAll();
    updateSyncStatus();
  }

  function makeLocalOrder(totals) {
    const clientOrderId = makeId();
    const complimentaryReason = payMethod === "complimentary"
      ? (String(el.complimentaryReasonInput && el.complimentaryReasonInput.value || "").trim() || "赠送")
      : "";
    const orderNote = String(el.orderNoteInput && el.orderNoteInput.value || "").trim();
    const discountNote = String(el.discountReasonInput && el.discountReasonInput.value || "").trim();
    return {
      id: `local-${clientOrderId}`,
      client_order_id: clientOrderId,
      shift_id: currentShift && currentShift.shift_id,
      day: currentShift && currentShift.business_date ? currentShift.business_date : POS.todayKey(),
      time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      payment_method: payMethod,
      total: totals.total,
      total_amount: totals.subtotal,
      discount_amount: totals.discount,
      final_amount: totals.total,
      status: "pending",
      is_test: false,
      promotion_code: "",
      promotion_id: appliedPromotion && appliedPromotion.promotion_id,
      promotion_name: appliedPromotion && appliedPromotion.promotion_name || "",
      promotion_note: appliedPromotion ? appliedPromotion.promotion_name : totals.discount > 0 ? `手动折扣 ${totals.discount}` : "",
      complimentary_reason: complimentaryReason,
      upsell_event_ids: [...activeUpsellEvents.values()].map(event => event.eventId).filter(Boolean),
      note: [orderNote, discountNote || (totals.manualDiscount > 0 ? "手动折扣" : "")].filter(Boolean).join(" · "),
      payments: buildPayments(totals.total),
      order_items: cart.map(item => ({
        product_id: item.product_id,
        name: item.name,
        product_name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        qty: item.qty,
        quantity: item.qty,
        price: item.item_type === "gift" ? 0 : Number(item.selling_price || item.price || 0),
        unit_price: item.item_type === "gift" ? 0 : Number(item.selling_price || item.price || 0),
        subtotal: item.item_type === "gift" ? 0 : Number(item.selling_price || item.price || 0) * item.qty,
        item_type: payMethod === "complimentary" && item.item_type !== "gift" ? "complimentary" : item.item_type || "sale",
        gift_reason: item.gift_reason || complimentaryReason
      }))
    };
  }

  async function submitOrder(order) {
    if (p1Enabled) {
      if (!order.shift_id) return { data: null, error: { message: "当前没有开启班次" } };
      const p1Result = await client.rpc("create_order_p1", {
        p_client_order_id: order.client_order_id,
        p_shift_id: order.shift_id,
        p_items: order.order_items.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          price: item.price,
          item_type: item.item_type || "sale",
          gift_reason: item.gift_reason || ""
        })),
        p_payments: order.payments,
        p_total: order.total,
        p_discount_amount: order.discount_amount || 0,
        p_time_text: order.time_text,
        p_day: order.day,
        p_cashier: document.querySelector("#signedInAs") ? document.querySelector("#signedInAs").textContent : "",
        p_note: order.note || "",
        p_promotion_id: order.promotion_id || null,
        p_promotion_name: order.promotion_name || "",
        p_complimentary_reason: order.complimentary_reason || ""
      });
      if (p1Result.error) {
        client.from("error_logs").insert({
          error_id: makeId(),
          error_type: "checkout_client",
          message: p1Result.error.message || "订单提交失败",
          context: { client_order_id: order.client_order_id },
          user_id: currentSession && currentSession.user && currentSession.user.id,
          shift_id: order.shift_id,
          created_at: new Date().toISOString()
        }).catch(() => {});
      } else if (p1Result.data && order.upsell_event_ids && order.upsell_event_ids.length) {
        order.upsell_event_ids.forEach(eventId => {
          client.from("upsell_events").update({ order_id: p1Result.data }).eq("event_id", eventId).catch(() => {});
        });
      }
      return p1Result;
    }
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

  const productFlavorColors = {
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

  function productToneStyle(flavorName) {
    const colors = productFlavorColors[flavorName];
    if (!colors) return "";
    return `style="--product-tone: ${colors.tone}; --product-tone-soft: ${colors.soft}; --product-tone-ink: ${colors.ink};"`;
  }

  function formatOrderItemName(item) {
    const product = products.find(productItem => productItem.id === item.product_id);
    if (product) return productLabel(product);
    return item.name || "商品";
  }

  function renderCategories() {
    el.categoryTabs.hidden = false;
    const categories = ["全部", ...new Set(products.map(product => product.category))];
    el.categoryTabs.innerHTML = categories.map(category => {
      const active = category === activeCategory ? "active" : "";
      return `<button class="tab ${active}" data-category="${category}">${category === "全部" ? "全部" : POS.categoryLabel(category)}</button>`;
    }).join("");
  }

  function productCard(product, mode) {
    const isUnavailable = isProductUnavailable(product);
    const disabled = isUnavailable ? "disabled" : "";
    const low = product.track_inventory !== false && (product.stock <= (product.low_stock_threshold || lowStockThreshold) || product.sold_out) ? "low" : "";
    const stockText = product.track_inventory === false ? "无需库存" : isUnavailable ? "售罄" : `库存 ${product.stock}`;
    const image = product.image_path ? `<img class="product-image" src="${assetUrl(product.image_path)}" alt="${product.name}">` : "";
    const compact = mode === "compact";
    if (compact) {
      return `
        <article class="product product-compact ${low}" ${productToneStyle(product.flavor)}>
          ${image || `<div class="product-image product-image-placeholder">${POS.categoryLabel(product.category).slice(0, 2)}</div>`}
          <div class="product-body">
            <h2>${productLabel(product)}</h2>
            <div class="meta"><span>${POS.categoryLabel(product.category)}</span><span>${stockText}</span></div>
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

  function renderProductGroups(items) {
    if (!items.length) return `<div class="empty product-empty">没有符合条件的商品。</div>`;
    const groups = [...new Set(items.map(product => product.category || "other"))];
    return groups.map(category => {
      const categoryProducts = items.filter(product => (product.category || "other") === category);
      return `
        <section class="product-group" aria-label="${category}">
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

  function renderProducts() {
    const query = el.searchInput.value.trim().toLowerCase();
    const visible = products.filter(product => {
      const categoryMatch = activeCategory === "全部" || product.category === activeCategory;
      const queryMatch = !query || `${product.name}${product.short_name || ""}${product.category}${product.subcategory || ""}${product.shape || ""}${product.flavor || ""}${product.note || ""}`.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });

    el.productGrid.innerHTML = renderProductGroups(visible);
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
    if (isProductUnavailable(product)) return null;
    const existing = cart.find(item => item.product_id === productId);
    if (existing) {
      if (product.track_inventory !== false && existing.qty >= product.stock) {
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
    upsellDismissed = false;
    reconcilePromotion();
    saveCart();
    renderCart();
    return product;
  }

  function renderCart() {
    if (cart.length === 0) {
      el.cartList.innerHTML = `<div class="empty">点选左侧商品后，这里会生成当前订单。</div>`;
    } else {
      el.cartList.innerHTML = cart.map(item => {
        const lineTotal = (isNaN(Number(item.price)) ? Number(item.selling_price || 0) : Number(item.price)) * item.qty;
        const isGift = item.item_type === "gift" || item.item_type === "promotion";
        const canEditGift = POS.canManage(currentRole) && !item.promotion_auto;
        return `
          <article class="cart-item">
            <div class="cart-line">
              <div>
                <div class="cart-title">${item.name}${isGift ? " · 赠品" : ""}</div>
                <small>${POS.categoryLabel(item.category)} · ${isGift ? `${item.gift_reason || "赠品"} · 扣库存` : `${POS.money(item.price)} / 份 · 扣库存 ${item.qty}`}</small>
              </div>
              <strong>${POS.money(lineTotal)}</strong>
            </div>
            <div class="cart-line">
              <div class="qty">
                <button data-action="dec" data-line="${item.line_id}">-</button>
                <strong>${item.qty}</strong>
                <button data-action="inc" data-line="${item.line_id}">+</button>
              </div>
              ${canEditGift ? `<button class="remove" data-action="gift" data-line="${item.line_id}">${isGift ? "恢复销售" : "设为赠品"}</button>` : ""}
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
    el.subtotal.textContent = POS.money(totals.subtotal);
    if (el.discountText) el.discountText.textContent = totals.discount ? `-${POS.money(totals.discount)}` : POS.money(0);
    document.querySelectorAll(".summary-detail").forEach(row => { row.hidden = totals.discount <= 0; });
    el.grandTotal.textContent = POS.money(totals.total);
    if (el.promotionApplied) {
      el.promotionApplied.hidden = !appliedPromotion;
      el.promotionApplied.textContent = appliedPromotion
        ? `已应用：${appliedPromotion.promotion_name}${totals.automaticDiscount ? ` · 优惠 ${POS.money(totals.automaticDiscount)}` : ""}`
        : "";
    }
    if (el.discountInput) {
      const lockedByPromotion = Boolean(appliedPromotion);
      el.discountInput.disabled = lockedByPromotion || (p1Enabled && !POS.canManage(currentRole));
      if (lockedByPromotion) el.discountInput.value = "";
      el.discountInput.placeholder = lockedByPromotion
        ? "自动促销生效时不可叠加手动折扣"
        : el.discountInput.disabled ? "仅 Manager / Owner 可用" : "例如 10000";
    }
    if (el.discountReasonRow) el.discountReasonRow.hidden = !(POS.canManage(currentRole) && totals.manualDiscount > 0);
    el.checkoutBtn.disabled = checkoutInFlight || cart.length === 0 || (totals.total <= 0 && payMethod !== "complimentary");
    renderUpsellHint();
    updateCashPresets(totals.total);
    updateChange();
    updateMixedTotal();
  }

  async function recordUpsell(eventType, product, action) {
    if (!p1Enabled || !currentShift || !window.navigator.onLine || !product || !product.product_id) return;
    const eventKey = `${eventType}:${product.id}`;
    const existing = activeUpsellEvents.get(eventKey);
    if (action === "shown" && existing && existing.productId === product.id) return;
    if (action === "shown") {
      const result = await client.from("upsell_events").insert({
        shift_id: currentShift.shift_id,
        event_type: eventType,
        recommended_product_id: product.product_id
      }).select("event_id");
      if (!result.error && result.data && result.data[0]) activeUpsellEvents.set(eventKey, { eventId: result.data[0].event_id, eventType, productId: product.id });
      return;
    }
    if (!existing) return;
    const changes = action === "dismissed"
      ? { dismissed: true }
      : { clicked_at: new Date().toISOString(), added_to_cart: action === "added" };
    await client.from("upsell_events").update(changes).eq("event_id", existing.eventId);
  }

  function renderUpsellHint() {
    if (!el.upsellHint) return;
    if (!cart.length || upsellDismissed) {
      el.upsellHint.hidden = true;
      el.upsellHint.innerHTML = "";
      return;
    }
    const saleLines = cart.filter(item => item.item_type !== "gift");
    const iceQty = saleLines.filter(item => POS.normalizeCategory(item.category) === "icecream").reduce((sum, item) => sum + item.qty, 0);
    const selectedFlavors = new Set(saleLines.map(item => products.find(product => product.id === item.product_id)).filter(Boolean).map(product => product.flavor));
    const hasMerch = saleLines.some(item => POS.normalizeCategory(item.category) === "merchandise");
    const recentSales = new Map();
    orders.filter(POS.isRevenueOrder).forEach(order => (order.order_items || []).forEach(item => {
      recentSales.set(item.product_id, (recentSales.get(item.product_id) || 0) + Number(item.quantity ?? item.qty ?? 0));
    }));
    let eventType = "";
    let message = "";
    let candidates = [];
    if (iceQty === 1) {
      eventType = "second_item";
      message = "要不要再来一支？ / Add one more pop?";
      candidates = products.filter(product => POS.normalizeCategory(product.category) === "icecream");
    } else if (iceQty > 0 && !hasMerch) {
      eventType = "merchandise_addon";
      message = "搭配一个小纪念品？ / Add a souvenir?";
      candidates = products.filter(product => POS.normalizeCategory(product.category) === "merchandise");
    }
    candidates = candidates
      .filter(product => !cart.some(item => item.product_id === product.id))
      .filter(product => !isProductUnavailable(product))
      .filter(product => product.track_inventory === false || product.stock > Number(product.low_stock_threshold || lowStockThreshold))
      .sort((a, b) => Number(selectedFlavors.has(a.flavor)) - Number(selectedFlavors.has(b.flavor))
        || a.selling_price - b.selling_price
        || Number(b.is_upsell_product || 0) - Number(a.is_upsell_product || 0)
        || Number(b.upsell_priority || 0) - Number(a.upsell_priority || 0)
        || Number(recentSales.get(b.id) || 0) - Number(recentSales.get(a.id) || 0))
      .slice(0, 3);
    if (!eventType || !candidates.length) {
      el.upsellHint.hidden = true;
      el.upsellHint.innerHTML = "";
      return;
    }
    el.upsellHint.hidden = false;
    el.upsellHint.innerHTML = `
      <div class="upsell-copy"><span>${message}</span><strong>仅显示有库存商品</strong></div>
      <div class="upsell-actions">${candidates.map(product => `<button type="button" data-upsell="${product.id}" data-upsell-type="${eventType}">${productLabel(product)} · ${POS.money(product.selling_price)}</button>`).join("")}<button class="upsell-dismiss" type="button" data-upsell-dismiss="${eventType}">不需要</button></div>`;
    candidates.forEach(product => recordUpsell(eventType, product, "shown").catch(() => {}));
  }

  function updateCart(lineId, action) {
    const item = cart.find(line => line.line_id === lineId);
    if (!item) return;
    if (action === "inc") item.qty += 1;
    if (action === "dec") item.qty -= 1;
    if (action === "remove") item.qty = 0;
    if (action === "gift") {
      if (!POS.canManage(currentRole) || item.promotion_auto) {
        POS.showToast("只有 Manager / Owner 可以手动设置赠品");
        return;
      }
      const isGift = item.item_type === "gift" || item.item_type === "promotion";
      item.item_type = isGift ? "sale" : "gift";
      item.price = isGift ? Number(item.selling_price || item.price || 0) : 0;
      item.gift_reason = isGift ? "" : "manual_gift";
    }
    const product = products.find(productItem => productItem.id === item.product_id);
    if (product && product.track_inventory !== false && item.qty > product.stock) {
      item.qty = product.stock;
      POS.showToast("已达到当前库存数量");
    }
    cart = cart.filter(line => line.qty > 0);
    reconcilePromotion();
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

  function resetCheckoutFields() {
    cart = [];
    appliedPromotion = null;
    activeUpsellEvents = new Map();
    upsellDismissed = false;
    payMethod = "cash";
    document.querySelectorAll(".pay").forEach(item => item.classList.toggle("active", item.dataset.pay === "cash"));
    if (el.checkoutMore) el.checkoutMore.open = false;
    saveCart();
    el.cashInput.value = "";
    if (el.discountInput) el.discountInput.value = "";
    if (el.discountReasonInput) el.discountReasonInput.value = "";
    if (el.paymentReferenceInput) el.paymentReferenceInput.value = "";
    if (el.paymentConfirmedInput) el.paymentConfirmedInput.checked = false;
    if (el.mixedCashInput) el.mixedCashInput.value = "0";
    if (el.mixedQrInput) el.mixedQrInput.value = "0";
    if (el.mixedTransferInput) el.mixedTransferInput.value = "0";
    if (el.complimentaryReasonInput) el.complimentaryReasonInput.value = "";
    if (el.orderNoteInput) el.orderNoteInput.value = "";
  }

  async function checkout() {
    if (checkoutInFlight) return;
    if (currentShift && currentShift.business_date !== POS.todayKey()) {
      currentShift = null;
      writeJson(currentShiftKey, null);
      renderShiftState();
      POS.showToast("营业日期已更新，请重新开班后下单");
      return;
    }
    if (p1Enabled && !currentShift) {
      POS.showToast("请先开班再收银");
      return;
    }
    const totals = cartTotals();
    if (cart.length === 0) return;
    if (payMethod === "cash" && Number(el.cashInput.value || 0) < totals.total) {
      POS.showToast("现金实收不足");
      return;
    }

    let order;
    try {
      order = makeLocalOrder(totals);
    } catch (error) {
      POS.showToast(error.message || "请检查付款信息");
      return;
    }
    checkoutInFlight = true;
    POS.setBusy(el.checkoutBtn, true, "提交中");
    if (!window.navigator.onLine) {
      if (p1Enabled && !order.shift_id) {
        POS.setBusy(el.checkoutBtn, false);
        checkoutInFlight = false;
        POS.showToast("本机没有有效班次，暂时不能离线收银");
        return;
      }
      saveOrderForLater(order);
      resetCheckoutFields();
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
      resetCheckoutFields();
      POS.setBusy(el.checkoutBtn, false);
      checkoutInFlight = false;
      renderAll();
      POS.showToast("订单已保存在本机");
      return;
    }
    POS.setBusy(el.checkoutBtn, false);
    checkoutInFlight = false;

    resetCheckoutFields();
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
    const categoryCounts = { icecream: 0, service: 0, merchandise: 0, beverage: 0, bundle: 0, other: 0 };
    activeOrders.forEach(order => {
      order.order_items.forEach(item => {
        const name = item.product_name || item.name;
        const quantity = itemQty(item);
        const category = POS.normalizeCategory(item.product_type || item.category);
        const reportingCategory = category === "deposit" ? "service" : category;
        itemMap.set(name, (itemMap.get(name) || 0) + quantity);
        categoryCounts[reportingCategory in categoryCounts ? reportingCategory : "other"] += quantity;
      });
    });
    const top = [...itemMap.entries()].sort((a, b) => b[1] - a[1])[0];

    el.salesTotal.textContent = POS.money(sales);
    el.orderCount.textContent = activeOrders.length;
    el.itemCount.textContent = count;
    el.icecreamItemCount.textContent = categoryCounts.icecream;
    el.serviceItemCount.textContent = categoryCounts.service;
    el.merchandiseItemCount.textContent = categoryCounts.merchandise;
    el.beverageItemCount.textContent = categoryCounts.beverage;
    el.bundleItemCount.textContent = categoryCounts.bundle;
    el.otherItemCount.textContent = categoryCounts.other;
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

  function updatePosTopbarOffset() {
    if (!el.posTopbar) return;
    const height = Math.ceil(el.posTopbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--pos-topbar-height", `${height}px`);
  }

  updatePosTopbarOffset();
  window.addEventListener("resize", updatePosTopbarOffset, { passive: true });
  if (el.posTopbar && window.ResizeObserver) {
    new ResizeObserver(updatePosTopbarOffset).observe(el.posTopbar);
  }

  el.categoryTabs.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    renderAll();
  });

  if (el.upsellHint) {
    el.upsellHint.addEventListener("click", event => {
      const dismiss = event.target.closest("[data-upsell-dismiss]");
      if (dismiss) {
        [...activeUpsellEvents.values()]
          .filter(active => active.eventType === dismiss.dataset.upsellDismiss)
          .forEach(active => {
            const product = products.find(item => item.id === active.productId);
            recordUpsell(dismiss.dataset.upsellDismiss, product, "dismissed").catch(() => {});
          });
        upsellDismissed = true;
        renderUpsellHint();
        return;
      }
      const button = event.target.closest("[data-upsell]");
      if (!button) return;
      const product = addToCart(button.dataset.upsell);
      if (product) {
        recordUpsell(button.dataset.upsellType, product, "added").catch(() => {});
        POS.showToast(`已加入 ${productLabel(product)}`);
      }
    });
  }

  el.productGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const product = addToCart(button.dataset.id);
    if (product) {
      flashAddButton(button, product.name);
      if (el.cartPanel) el.cartPanel.scrollTo({ top: 0, behavior: "smooth" });
      if (el.cartList) el.cartList.scrollTop = el.cartList.scrollHeight;
    }
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
    if (el.checkoutMore && ["cash", "qr", "bank_transfer"].includes(payMethod)) el.checkoutMore.open = false;
    renderPaymentControls();
    renderCart();
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
  [el.mixedCashInput, el.mixedQrInput, el.mixedTransferInput].filter(Boolean).forEach(input => input.addEventListener("input", updateMixedTotal));
  el.cashInput.addEventListener("input", updateChange);
  el.checkoutBtn.addEventListener("click", checkout);
  if (el.openShiftForm) el.openShiftForm.addEventListener("submit", openShift);
  if (el.closeShiftBtn) el.closeShiftBtn.addEventListener("click", openCloseShiftSheet);
  if (el.closeShiftCancel) el.closeShiftCancel.addEventListener("click", () => { el.closeShiftSheet.hidden = true; });
  if (el.closeShiftForm) el.closeShiftForm.addEventListener("submit", closeShift);
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
    resetCheckoutFields();
    renderCart();
  });

  window.addEventListener("online", () => {
    retrySync(false).then(refresh).catch(error => POS.showToast(error.message));
  });
  window.addEventListener("offline", updateSyncStatus);
  if (el.syncBadge) el.syncBadge.addEventListener("click", manualMenuSync);

  POS.initAuth(client, refresh).catch(error => POS.showToast(error.message));
})();
