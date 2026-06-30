(function () {
  const client = POS.getClient();
  const todayKey = POS.todayKey();
  const lowStockThreshold = POS.lowStockThreshold || 10;
  let activeRange = "today";
  let activeProductFilter = "all";
  let products = [];
  let orders = [];
  let closeouts = [];
  let inventoryMovements = [];

  const el = {
    rangeText: document.querySelector("#rangeText"),
    salesTotal: document.querySelector("#salesTotal"),
    orderCount: document.querySelector("#orderCount"),
    itemCount: document.querySelector("#itemCount"),
    avgOrder: document.querySelector("#avgOrder"),
    productRanking: document.querySelector("#productRanking"),
    paymentSummary: document.querySelector("#paymentSummary"),
    categorySummary: document.querySelector("#categorySummary"),
    stockOverview: document.querySelector("#stockOverview"),
    stockSummary: document.querySelector("#stockSummary"),
    inventoryMovements: document.querySelector("#inventoryMovements"),
    ordersBody: document.querySelector("#ordersBody"),
    exportCsv: document.querySelector("#exportCsv"),
    expectedCash: document.querySelector("#expectedCash"),
    actualCash: document.querySelector("#actualCash"),
    cashDiff: document.querySelector("#cashDiff"),
    saveCloseout: document.querySelector("#saveCloseout"),
    closeHistory: document.querySelector("#closeHistory"),
    menuEditor: document.querySelector("#menuEditor"),
    testConnection: document.querySelector("#testConnection"),
    productFilters: document.querySelector("#productFilters")
  };

  if (el.menuEditor) {
    el.menuEditor.innerHTML = `<div class="empty">正在加载菜单...</div>`;
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

  function imageFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("图片格式无法识别"));
        image.onload = () => {
          const maxSide = 1200;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.86));
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
      products = productsResult.data && productsResult.data.length ? productsResult.data : POS.productCatalog;
    } catch (error) {
      products = POS.productCatalog;
      issues.push("菜单");
    }

    try {
      const ordersResult = await client
        .from("orders")
        .select("id, day, time_text, payment_method, total, status, created_at, order_items(product_id, name, qty, price)")
        .order("created_at", { ascending: false });
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
      inventoryMovements = (movementsResult.data || []).slice(0, 60);
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

  function filteredProducts() {
    if (activeProductFilter === "active") {
      return products.filter(product => product.is_active !== false);
    }
    if (activeProductFilter === "inactive") {
      return products.filter(product => product.is_active === false);
    }
    if (activeProductFilter === "low") {
      return products.filter(product => product.stock <= lowStockThreshold || product.sold_out);
    }
    return products;
  }

  function renderStockOverview(visibleProducts) {
    if (!el.stockOverview) return;
    const activeProducts = products.filter(product => product.is_active !== false);
    const totalStock = activeProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const lowCount = activeProducts.filter(product => product.stock <= lowStockThreshold || product.sold_out).length;
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

  function filteredOrders(includeVoid) {
    const base = includeVoid ? orders : orders.filter(order => order.status !== "void");
    if (activeRange === "all") return base;
    if (activeRange === "today") {
      return base.filter(order => order.day === todayKey);
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffKey = POS.dateKey ? POS.dateKey(cutoff) : cutoff.toISOString().slice(0, 10);
    return base.filter(order => order.day >= cutoffKey);
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

  function activeOrdersForDay(day) {
    return orders.filter(order => order.day === day && order.status !== "void");
  }

  function todayCashExpected() {
    return activeOrdersForDay(todayKey)
      .filter(order => order.payment_method === "现金")
      .reduce((sum, order) => sum + order.total, 0);
  }

  function todayCloseout() {
    return closeouts.find(closeout => closeout.day === todayKey);
  }

  function renderCloseout() {
    const expected = todayCashExpected();
    const closeout = todayCloseout();
    if (!el.actualCash.value && closeout) {
      el.actualCash.value = closeout.actual_cash;
    }
    const actual = Number(el.actualCash.value || (closeout ? closeout.actual_cash : 0));
    const diff = actual - expected;

    el.expectedCash.textContent = POS.money(expected);
    el.cashDiff.textContent = POS.money(diff);
    el.closeHistory.textContent = closeout
      ? `已保存：系统现金 ${POS.money(closeout.expected_cash)}，实际现金 ${POS.money(closeout.actual_cash)}，差额 ${POS.money(closeout.diff)}，时间 ${closeout.time_text}`
      : "今天还没有日结记录。";
  }

  function renderMenuEditor() {
    const visibleProducts = filteredProducts();
    if (!visibleProducts.length) {
      el.menuEditor.innerHTML = `<div class="empty">当前筛选下没有产品。</div>`;
      return;
    }

    el.menuEditor.innerHTML = visibleProducts.map(product => `
      <form class="menu-row" data-product-form="${escapeAttr(product.id)}">
        <img class="menu-thumb" src="${escapeAttr(product.image_path)}" alt="${escapeAttr(product.name)}">
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
          <input class="field-input" name="category" value="${escapeAttr(product.category)}" required>
        </label>
        <label>
          形状
          <input class="field-input" name="shape" value="${escapeAttr(product.shape || "")}">
        </label>
        <label>
          口味
          <input class="field-input" name="flavor" value="${escapeAttr(product.flavor || "")}">
        </label>
        <label>
          价格 KIP
          <input class="field-input" name="price" type="number" min="0" step="1000" value="${product.price}" required>
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
      </form>
    `).join("");
  }

  function reasonText(reason) {
    const labels = {
      sale: "销售扣减",
      restock: "补货",
      correction: "盘点修正",
      waste: "损耗",
      void: "作废加回"
    };
    return labels[reason] || reason || "其他";
  }

  function renderInventoryMovements() {
    if (!el.inventoryMovements) return;
    if (!inventoryMovements.length) {
      el.inventoryMovements.innerHTML = `<div class="empty">还没有库存记录。补货、盘点修正、销售扣减后会显示在这里。</div>`;
      return;
    }

    el.inventoryMovements.innerHTML = inventoryMovements.map(item => {
      const change = Number(item.change_qty || 0);
      const sign = change > 0 ? "+" : "";
      const tone = change > 0 ? "plus" : "minus";
      return `
        <div class="movement-item">
          <div>
            <strong>${escapeHtml(item.product_name)}</strong>
            <small>${escapeHtml(item.day)} ${escapeHtml(item.time_text)} · ${reasonText(item.reason)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small>
          </div>
          <div class="movement-numbers">
            <strong class="${tone}">${sign}${change}</strong>
            <small>${item.before_stock} → ${item.after_stock}</small>
          </div>
        </div>
      `;
    }).join("");
  }

  function render() {
    const activeOrders = filteredOrders(false);
    const sales = activeOrders.reduce((sum, order) => sum + order.total, 0);
    const itemCount = activeOrders.reduce((sum, order) => {
      return sum + order.order_items.reduce((part, item) => part + item.qty, 0);
    }, 0);

    const productMap = new Map();
    const paymentMap = new Map();
    const categoryMap = new Map();

    activeOrders.forEach(order => {
      addToMap(paymentMap, order.payment_method, 1, order.total);
      order.order_items.forEach(item => {
        const product = productById(item.product_id);
        const amount = item.price * item.qty;
        addToMap(productMap, item.name, item.qty, amount);
        addToMap(categoryMap, product ? product.category : "其他", item.qty, amount);
      });
    });

    const productRows = [...productMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
    const paymentRows = [...paymentMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
    const categoryRows = [...categoryMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const labels = {
      today: "今天",
      "7days": "近 7 天",
      all: "全部订单"
    };
    el.rangeText.textContent = `${labels[activeRange]} · ${POS.todayLabel ? POS.todayLabel() : new Date().toLocaleDateString("zh-CN")}`;
    el.salesTotal.textContent = POS.money(sales);
    el.orderCount.textContent = activeOrders.length;
    el.itemCount.textContent = itemCount;
    el.avgOrder.textContent = POS.money(activeOrders.length ? Math.round(sales / activeOrders.length) : 0);

    renderBars(el.productRanking, productRows, "当前范围内还没有销售。");
    renderBars(el.paymentSummary, paymentRows, "当前范围内还没有付款记录。");
    renderBars(el.categorySummary, categoryRows, "当前范围内还没有类别数据。");

    const visibleProducts = filteredProducts();
    renderStockOverview(visibleProducts);
    el.stockSummary.innerHTML = visibleProducts.length ? visibleProducts.map(product => {
      const low = product.stock <= lowStockThreshold || product.sold_out;
      const soldOut = product.sold_out || product.stock <= 0;
      const stockTone = soldOut ? "danger" : low ? "warning" : "";
      return `
      <article class="stock-card ${low ? "low" : ""}" data-stock-row="${escapeAttr(product.id)}">
        <div class="stock-card-main">
          <div>
            <strong>${escapeHtml(productDisplayName(product))}</strong>
            <small>${escapeHtml(product.note || product.name)}${product.category ? ` · ${escapeHtml(product.category)}` : ""}</small>
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
            <option value="correction">盘点修正</option>
            <option value="waste">损耗</option>
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
      const items = order.order_items.map(item => `${item.name} x${item.qty}`).join("、");
      const isVoid = order.status === "void";
      return `
        <tr>
          <td>${order.day}</td>
          <td>${order.time_text}</td>
          <td>${items}</td>
          <td>${order.payment_method}</td>
          <td><strong>${POS.money(order.total)}</strong></td>
          <td>${isVoid ? "已作废" : "有效"}</td>
          <td>${isVoid ? "" : `<button class="mini-button" data-void="${order.id}">作废</button>`}</td>
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
    input.value = nextStock;
    row.classList.toggle("low", nextStock <= lowStockThreshold);
    if (count) {
      count.textContent = nextStock;
      const countBox = count.closest(".stock-count");
      if (countBox) {
        countBox.classList.toggle("danger", nextStock === 0);
        countBox.classList.toggle("warning", nextStock > 0 && nextStock <= lowStockThreshold);
      }
    }
    if (state) {
      state.textContent = nextStock === 0 ? "售空" : nextStock <= lowStockThreshold ? "低库存" : "可售";
      state.classList.toggle("danger", nextStock === 0);
      state.classList.toggle("warning", nextStock > 0 && nextStock <= lowStockThreshold);
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
      reason: delta > 0 ? "restock" : "correction"
    });
  }

  function zeroStockDraft(productId) {
    updateStockDraft(productId, 0, {
      soldOut: true,
      reason: "correction",
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
      result = await client.rpc("adjust_stock", {
        p_product_id: productId,
        p_new_stock: Math.floor(stock),
        p_sold_out: Boolean(soldOut && soldOut.checked),
        p_reason: reason ? reason.value : "correction",
        p_note: note ? note.value.trim() : "",
        p_time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        p_day: todayKey
      });
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
      const dataUrl = await imageFileToDataUrl(file);
      if (imagePathInput) {
        imagePathInput.value = dataUrl;
      }

      const updateResult = await client
        .from("products")
        .update({ image_path: dataUrl, updated_at: new Date().toISOString() })
        .eq("id", productId);

      if (updateResult.error) {
        POS.showToast(updateResult.error.message);
        return;
      }

      POS.showToast("图片已更新");
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
      category: String(formData.get("category") || "").trim(),
      shape: String(formData.get("shape") || "").trim(),
      flavor: String(formData.get("flavor") || "").trim(),
      price: Number(formData.get("price") || 0),
      stock: Number(formData.get("stock") || 0),
      sort_order: Number(formData.get("sort_order") || 0),
      shape_order: Number(formData.get("shape_order") || 0),
      flavor_order: Number(formData.get("flavor_order") || 0),
      image_path: String(formData.get("image_path") || "").trim(),
      sold_out: formData.has("sold_out"),
      is_active: formData.has("is_active"),
      updated_at: new Date().toISOString()
    };

    if (!payload.name || !payload.category || !payload.image_path) {
      POS.showToast("产品名、分类和图片路径不能为空");
      return;
    }

    if (!Number.isFinite(payload.price) || !Number.isFinite(payload.stock) || !Number.isFinite(payload.sort_order) || !Number.isFinite(payload.shape_order) || !Number.isFinite(payload.flavor_order)) {
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

  async function voidOrder(orderId) {
    const confirmed = window.confirm("确认作废这笔订单？库存会自动加回。");
    if (!confirmed) return;
    const result = await client.rpc("void_order", { p_order_id: orderId });
    if (result.error) {
      POS.showToast(result.error.message);
      return;
    }
    POS.showToast("订单已作废");
    await refresh();
  }

  async function saveCloseout() {
    const expected = todayCashExpected();
    const actual = Number(el.actualCash.value || 0);
    const payload = {
      day: todayKey,
      time_text: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      expected_cash: expected,
      actual_cash: actual,
      diff: actual - expected,
      updated_at: new Date().toISOString()
    };
    const result = await client.from("closeouts").upsert(payload);
    if (result.error) {
      POS.showToast(result.error.message);
      return;
    }
    POS.showToast("日结已保存");
    await refresh();
  }

  function exportCsv() {
    const rows = [["日期", "时间", "产品", "数量", "付款方式", "状态", "金额KIP"]];
    filteredOrders(true).forEach(order => {
      order.order_items.forEach(item => {
        rows.push([
          order.day,
          order.time_text,
          item.name,
          item.qty,
          order.payment_method,
          order.status === "void" ? "已作废" : "有效",
          item.price * item.qty
        ]);
      });
    });
    const csv = rows.map(row => row.map(POS.csvEscape).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `patuxai-pops-sales-${activeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  document.querySelector(".range").addEventListener("click", event => {
    const button = event.target.closest("[data-range]");
    if (!button) return;
    activeRange = button.dataset.range;
    document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("active", item === button));
    render();
  });

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

  el.actualCash.addEventListener("input", renderCloseout);
  el.saveCloseout.addEventListener("click", saveCloseout);
  el.exportCsv.addEventListener("click", exportCsv);
  if (el.testConnection) el.testConnection.addEventListener("click", testConnection);
  el.menuEditor.addEventListener("submit", event => {
    event.preventDefault();
    saveProduct(event.target);
  });
  el.menuEditor.addEventListener("change", event => {
    const input = event.target.closest("[data-image-upload]");
    if (!input) return;
    uploadProductImage(input);
  });

  POS.initAuth(client, refresh).catch(error => POS.showToast(error.message));
})();
