(function () {
  const appVersion = "20260713-p1-business-flow-r2";
  const productCatalog = [
    { id: "patuxai-mango-passion", name: "Patuxai - Mango & Passion Fruit", category: "Patuxai Pops", shape: "Patuxai", flavor: "Mango & Passion Fruit", shape_order: 1, flavor_order: 1, price: 55000, stock: 0, sold_out: true, is_active: true, image_path: "assets/shapes/shape-patuxai.png", note: "芒果百香果", sort_order: 1 },
    { id: "patuxai-strawberry-milk", name: "Patuxai - Strawberry Milk", category: "Patuxai Pops", shape: "Patuxai", flavor: "Strawberry Milk", shape_order: 1, flavor_order: 2, price: 55000, stock: 0, sold_out: true, is_active: true, image_path: "assets/shapes/shape-patuxai.png", note: "草莓牛奶", sort_order: 2 },
    { id: "patuxai-japanese-melon", name: "Patuxai - Japanese Melon", category: "Patuxai Pops", shape: "Patuxai", flavor: "Japanese Melon", shape_order: 1, flavor_order: 3, price: 55000, stock: 0, sold_out: true, is_active: true, image_path: "assets/shapes/shape-patuxai.png", note: "日本蜜瓜", sort_order: 3 },
    { id: "patuxai-coconut-butterfly-pea", name: "Patuxai - Coconut + Butterfly Pea", category: "Patuxai Pops", shape: "Patuxai", flavor: "Coconut + Butterfly Pea", shape_order: 1, flavor_order: 4, price: 55000, stock: 0, sold_out: true, is_active: true, image_path: "assets/shapes/shape-patuxai.png", note: "椰子蝶豆花", sort_order: 4 },
    { id: "i-love-laos-mango-passion", name: "I Love Laos - Mango & Passion Fruit", category: "Patuxai Pops", shape: "I Love Laos", flavor: "Mango & Passion Fruit", shape_order: 2, flavor_order: 1, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-i-love-laos.png", note: "芒果百香果", sort_order: 5 },
    { id: "i-love-laos-strawberry-milk", name: "I Love Laos - Strawberry Milk", category: "Patuxai Pops", shape: "I Love Laos", flavor: "Strawberry Milk", shape_order: 2, flavor_order: 2, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-i-love-laos.png", note: "草莓牛奶", sort_order: 6 },
    { id: "i-love-laos-japanese-melon", name: "I Love Laos - Japanese Melon", category: "Patuxai Pops", shape: "I Love Laos", flavor: "Japanese Melon", shape_order: 2, flavor_order: 3, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-i-love-laos.png", note: "日本蜜瓜", sort_order: 7 },
    { id: "i-love-laos-coconut-butterfly-pea", name: "I Love Laos - Coconut + Butterfly Pea", category: "Patuxai Pops", shape: "I Love Laos", flavor: "Coconut + Butterfly Pea", shape_order: 2, flavor_order: 4, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-i-love-laos.png", note: "椰子蝶豆花", sort_order: 8 },
    { id: "elephant-mango-passion", name: "Elephant - Mango & Passion Fruit", category: "Patuxai Pops", shape: "Elephant", flavor: "Mango & Passion Fruit", shape_order: 3, flavor_order: 1, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-elephant.png", note: "芒果百香果", sort_order: 9 },
    { id: "elephant-strawberry-milk", name: "Elephant - Strawberry Milk", category: "Patuxai Pops", shape: "Elephant", flavor: "Strawberry Milk", shape_order: 3, flavor_order: 2, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-elephant.png", note: "草莓牛奶", sort_order: 10 },
    { id: "elephant-japanese-melon", name: "Elephant - Japanese Melon", category: "Patuxai Pops", shape: "Elephant", flavor: "Japanese Melon", shape_order: 3, flavor_order: 3, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-elephant.png", note: "日本蜜瓜", sort_order: 11 },
    { id: "elephant-coconut-butterfly-pea", name: "Elephant - Coconut + Butterfly Pea", category: "Patuxai Pops", shape: "Elephant", flavor: "Coconut + Butterfly Pea", shape_order: 3, flavor_order: 4, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-elephant.png", note: "椰子蝶豆花", sort_order: 12 },
    { id: "frangipani-mango-passion", name: "Frangipani Flower - Mango & Passion Fruit", category: "Patuxai Pops", shape: "Frangipani Flower", flavor: "Mango & Passion Fruit", shape_order: 4, flavor_order: 1, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-frangipani.png", note: "芒果百香果", sort_order: 13 },
    { id: "frangipani-strawberry-milk", name: "Frangipani Flower - Strawberry Milk", category: "Patuxai Pops", shape: "Frangipani Flower", flavor: "Strawberry Milk", shape_order: 4, flavor_order: 2, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-frangipani.png", note: "草莓牛奶", sort_order: 14 },
    { id: "frangipani-japanese-melon", name: "Frangipani Flower - Japanese Melon", category: "Patuxai Pops", shape: "Frangipani Flower", flavor: "Japanese Melon", shape_order: 4, flavor_order: 3, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-frangipani.png", note: "日本蜜瓜", sort_order: 15 },
    { id: "frangipani-coconut-butterfly-pea", name: "Frangipani Flower - Coconut + Butterfly Pea", category: "Patuxai Pops", shape: "Frangipani Flower", flavor: "Coconut + Butterfly Pea", shape_order: 4, flavor_order: 4, price: 55000, stock: 0, sold_out: true, is_active: false, image_path: "assets/shapes/shape-frangipani.png", note: "椰子蝶豆花", sort_order: 16 }
  ];

  function createRestClient(config) {
    const sessionKey = "patuxai-pops-session";
    const requestTimeoutMs = 30000;

    async function fetchWithTimeout(url, options) {
      const supportsAbort = typeof AbortController !== "undefined";
      const controller = supportsAbort ? new AbortController() : null;
      const timer = controller ? window.setTimeout(() => controller.abort(), requestTimeoutMs) : null;
      try {
        return await window.fetch(url, {
          ...(options || {}),
          ...(controller ? { signal: controller.signal } : {})
        });
      } catch (error) {
        if (error && error.name === "AbortError") {
          throw new Error("数据库响应超时，请稍后重试");
        }
        throw error;
      } finally {
        if (timer) window.clearTimeout(timer);
      }
    }

    function friendlyNetworkError(error) {
      const message = String((error && error.message) || error || "");
      if (/failed to fetch|load failed|networkerror/i.test(message)) {
        return "无法连接数据库，请检查 iPad 网络后重试";
      }
      return message || "网络请求失败";
    }

    function clearSession() {
      window.localStorage.removeItem(sessionKey);
    }

    function sessionNeedsRefresh(session) {
      return session && session.expires_at && session.expires_at - 90 < Math.floor(Date.now() / 1000);
    }

    async function activeSessionForRequest() {
      const session = readSession();
      if (!sessionNeedsRefresh(session)) return session;

      const refreshed = await refreshSession(session);
      if (refreshed) return refreshed;

      clearSession();
      throw new Error("登录已过期，请重新登录");
    }

    async function apiHeaders(extra) {
      const session = await activeSessionForRequest();
      const headers = {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${(session && session.access_token) || config.SUPABASE_ANON_KEY}`
      };
      Object.keys(extra || {}).forEach(key => {
        headers[key] = extra[key];
      });
      return headers;
    }

    function readSession() {
      try {
        return JSON.parse(window.localStorage.getItem(sessionKey) || "null");
      } catch (error) {
        return null;
      }
    }

    function saveSession(data) {
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
        user: data.user || {}
      };
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      return session;
    }

    async function refreshSession(session) {
      if (!session || !session.refresh_token) return null;
      try {
        const response = await fetchWithTimeout(`${config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: {
            apikey: config.SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        if (!response.ok) return window.navigator.onLine ? null : session;
        return saveSession(await response.json());
      } catch (error) {
        return window.navigator.onLine ? null : session;
      }
    }

    function normalizeApiError(text) {
      let message = text || "请求失败";
      try {
        const data = JSON.parse(text);
        message = data.message || data.error_description || data.error || message;
        if (data.code === "PGRST303" || /jwt expired/i.test(message)) {
          clearSession();
          return "登录已过期，请重新登录";
        }
      } catch (error) {
        if (/jwt expired/i.test(message)) {
          clearSession();
          return "登录已过期，请重新登录";
        }
      }
      return message;
    }

    async function retryExpiredRequest(url, options, response) {
      if (!response || response.status !== 401) return response;
      const text = await response.clone().text();
      if (!/PGRST303|jwt expired|token.*expired/i.test(text)) return response;
      const refreshed = await refreshSession(readSession());
      if (!refreshed || !refreshed.access_token) return response;
      return fetchWithTimeout(url, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: `Bearer ${refreshed.access_token}` }
      });
    }

    function builder(table) {
      const state = {
        table,
        select: "*",
        filters: [],
        order: null,
        limit: null,
        payload: null,
        mode: "select",
        returning: null
      };

      async function execute() {
        const params = new URLSearchParams();
        if (state.mode === "select" && state.select) params.set("select", state.select);
        state.filters.forEach(filter => params.set(filter.column, `eq.${filter.value}`));
        if (state.order) {
          params.set("order", `${state.order.column}.${state.order.ascending ? "asc" : "desc"}`);
        }
        if (state.limit != null) params.set("limit", String(state.limit));

        const url = `${config.SUPABASE_URL}/rest/v1/${state.table}?${params.toString()}`;
        const options = {
          method: "GET",
          headers: await apiHeaders()
        };

        if (state.mode === "update") {
          options.method = "PATCH";
          options.headers = await apiHeaders({
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          });
          options.body = JSON.stringify(state.payload);
        }

        if (state.mode === "upsert") {
          options.method = "POST";
          options.headers = await apiHeaders({
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal"
          });
          options.body = JSON.stringify(state.payload);
        }

        if (state.mode === "insert") {
          options.method = "POST";
          options.headers = await apiHeaders({
            "Content-Type": "application/json",
            Prefer: state.returning ? "return=representation" : "return=minimal"
          });
          options.body = JSON.stringify(state.payload);
        }

        let response;
        try {
          response = await fetchWithTimeout(url, options);
          response = await retryExpiredRequest(url, options, response);
        } catch (error) {
          return { data: null, error: { message: friendlyNetworkError(error) } };
        }

        if (!response.ok) {
          const text = await response.text();
          return { data: null, error: { message: normalizeApiError(text) } };
        }
        if (options.method === "GET" || state.returning) {
          return { data: await response.json(), error: null };
        }
        return { data: null, error: null };
      }

      return {
        select(columns) {
          state.select = columns || "*";
          if (state.mode === "select") state.mode = "select";
          else state.returning = state.select;
          return this;
        },
        order(column, options) {
          state.order = {
            column,
            ascending: !options || options.ascending !== false
          };
          return this;
        },
        limit(value) {
          state.limit = Math.max(0, Number(value || 0));
          return this;
        },
        eq(column, value) {
          state.filters.push({ column, value });
          return this;
        },
        update(payload) {
          state.payload = payload;
          state.mode = "update";
          return this;
        },
        insert(payload) {
          state.payload = payload;
          state.mode = "insert";
          return this;
        },
        upsert(payload) {
          state.payload = payload;
          state.mode = "upsert";
          return execute();
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
        },
        catch(reject) {
          return execute().catch(reject);
        }
      };
    }

    return {
      auth: {
        async getSession() {
          const session = readSession();
          if (!session) return { data: { session: null }, error: null };
          if (sessionNeedsRefresh(session)) {
            const refreshed = await refreshSession(session);
            if (!refreshed && window.navigator.onLine) clearSession();
            return { data: { session: refreshed }, error: null };
          }
          return { data: { session }, error: null };
        },
        async signInWithPassword(credentials) {
          let response;
          try {
            response = await fetchWithTimeout(`${config.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
              method: "POST",
              headers: {
                apikey: config.SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(credentials)
            });
          } catch (error) {
            return { data: null, error: { message: friendlyNetworkError(error) } };
          }
          const data = await response.json();
          if (!response.ok) return { data: null, error: { message: data.error_description || data.message || "登录失败" } };
          return { data: { session: saveSession(data), user: data.user }, error: null };
        },
        async signOut() {
          window.localStorage.removeItem(sessionKey);
          return { error: null };
        }
      },
      from(table) {
        return builder(table);
      },
        async rpc(name, payload) {
          const url = `${config.SUPABASE_URL}/rest/v1/rpc/${name}`;
          const options = {
            method: "POST",
            headers: await apiHeaders({
              "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload || {})
          };
          let response;
          try {
            response = await fetchWithTimeout(url, options);
            response = await retryExpiredRequest(url, options, response);
        } catch (error) {
          return { data: null, error: { message: friendlyNetworkError(error) } };
        }
        if (!response.ok) {
          return { data: null, error: { message: normalizeApiError(await response.text()) } };
        }
        const text = await response.text();
        return { data: text ? JSON.parse(text) : null, error: null };
      }
    };
  }

  function getClient() {
    const config = window.POS_CONFIG || {};
    if (!config.SUPABASE_URL || config.SUPABASE_URL.indexOf("YOUR-PROJECT") !== -1) {
      throw new Error("请先在 cloud/config.js 填入 Supabase URL 和 anon key。");
    }
    if (window.supabase && window.supabase.createClient) {
      return window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
    return createRestClient(config);
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString("en-US")} KIP`;
  }

  const standardCategories = ["icecream", "merchandise", "beverage", "service", "deposit", "other"];

  function normalizeCategory(value) {
    const text = String(value || "").trim().toLowerCase();
    if (["icecream", "ice cream", "patuxai pops"].includes(text)) return "icecream";
    if (["custom", "custom service", "service", "定制服务"].includes(text)) return "service";
    if (["merch", "souvenir", "merchandise", "周边产品", "文创纪念品"].includes(text)) return "merchandise";
    if (["drink", "beverage", "饮品"].includes(text)) return "beverage";
    if (["deposit", "订金"].includes(text)) return "deposit";
    if (["bundle", "combo", "套餐"].includes(text)) return "other";
    return "other";
  }

  function categoryLabel(category) {
    const labels = {
      icecream: "冰淇淋",
      merchandise: "文创商品",
      beverage: "饮料",
      service: "定制服务",
      deposit: "订金",
      other: "其他产品"
    };
    return labels[normalizeCategory(category)] || "其他产品";
  }

  function normalizePaymentMethod(value) {
    const text = String(value || "").trim().toLowerCase();
    if (["现金", "cash"].includes(text)) return "cash";
    if (["扫码", "qr", "qr transfer", "scan", "支付宝", "微信", "wechat", "alipay"].includes(text)) return "qr";
    if (["bank_transfer", "bank transfer", "transfer", "转账", "银行卡"].includes(text)) return "bank_transfer";
    if (["mixed", "mixed payment", "混合支付"].includes(text)) return "mixed";
    if (["complimentary", "comp", "赠送", "免单"].includes(text)) return "complimentary";
    return "other";
  }

  function paymentLabel(method) {
    const labels = {
      cash: "现金",
      qr: "扫码",
      bank_transfer: "银行转账",
      mixed: "混合支付",
      complimentary: "赠送",
      other: "其他"
    };
    return labels[normalizePaymentMethod(method)] || "其他";
  }

  function isRevenueOrder(order) {
    return ["paid", "completed"].includes(String(order && order.status || "paid"));
  }

  function roleLabel(role) {
    return ({ owner: "Owner", manager: "Manager", cashier: "Cashier", viewer: "Viewer" })[role] || "Viewer";
  }

  function canManage(role) {
    return ["owner", "manager"].includes(String(role || ""));
  }

  function normalizeProduct(product) {
    const category = normalizeCategory(product && (product.product_type || product.category));
    const price = Number(product && (product.sale_price ?? product.selling_price ?? product.price) || 0);
    return {
      ...(product || {}),
      category,
      product_type: category,
      category_label: categoryLabel(category),
      subcategory: product && product.subcategory ? product.subcategory : product && product.shape ? product.shape : "",
      selling_price: price,
      sale_price: price,
      price,
      product_id: product && product.product_id ? product.product_id : product && product.id,
      has_stable_product_id: Boolean(product && product.product_id),
      sku: product && product.sku ? product.sku : product && product.id,
      short_name: product && product.short_name ? product.short_name : product && (product.note || product.name),
      series: product && product.series ? product.series : "",
      size: product && product.size ? product.size : "",
      unit: product && product.unit ? product.unit : "件",
      display_order: Number(product && (product.display_order ?? product.sort_order) || 0),
      image_url: product && (product.image_url || product.image_path),
      is_available: product && product.is_available !== undefined ? product.is_available : !(product && product.sold_out),
      track_inventory: product && product.track_inventory !== undefined ? product.track_inventory : true,
      low_stock_threshold: Number(product && product.low_stock_threshold || lowStockThreshold)
    };
  }

  const businessTimeZone = "Asia/Vientiane";
  const lowStockThreshold = 10;

  function dateParts(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: businessTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date || new Date());
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
  }

  function dateKey(date) {
    const parts = dateParts(date || new Date());
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function todayLabel() {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: businessTimeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(new Date());
  }

  function csvEscape(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function setSyncStatus(message, state) {
    const badge = document.querySelector("#syncBadge");
    if (!badge) return;
    badge.textContent = message;
    badge.classList.remove("online", "offline", "pending");
    badge.classList.add(state || (window.navigator.onLine ? "online" : "offline"));
  }

  function initPwa() {
    const isStandalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const hint = document.querySelector("#installHint");
    const close = document.querySelector("#installHintClose");

    if (hint && isIOS && !isStandalone && window.localStorage.getItem("patuxai-install-hint-closed") !== "1") {
      hint.hidden = false;
    }

    if (close) {
      close.addEventListener("click", () => {
        window.localStorage.setItem("patuxai-install-hint-closed", "1");
        if (hint) hint.hidden = true;
      });
    }

    if ("serviceWorker" in window.navigator && window.location.protocol.indexOf("http") === 0) {
      window.addEventListener("load", () => {
        let refreshing = false;
        window.navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        window.navigator.serviceWorker.register(`sw.js?v=${appVersion}`)
          .then(registration => registration.update())
          .catch(() => {});
      });
    }

    const updateNetworkStatus = () => {
      setSyncStatus(window.navigator.onLine ? "在线" : "离线", window.navigator.onLine ? "online" : "offline");
    };
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    updateNetworkStatus();
  }

  function setBusy(button, busy, text) {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = text || "处理中";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  async function initAuth(client, onReady) {
    const screen = document.querySelector("#authScreen");
    const form = document.querySelector("#loginForm");
    const email = document.querySelector("#emailInput");
    const password = document.querySelector("#passwordInput");
    const error = document.querySelector("#authError");
    const signedIn = document.querySelector("#signedInAs");
    const logout = document.querySelector("#logoutBtn");
    let ready = false;
    let checkingSession = false;
    let lastSessionCheck = 0;

    function showAuth(show) {
      document.body.classList.toggle("locked", show);
      if (screen) screen.hidden = !show;
    }

    async function checkSession(options) {
      if (checkingSession) return true;
      const now = Date.now();
      const force = options && options.force;
      if (!force && now - lastSessionCheck < 120000) return true;
      checkingSession = true;
      lastSessionCheck = now;

      try {
        const result = await client.auth.getSession();
        const session = result.data && result.data.session;
        if (!session) {
          ready = false;
          showAuth(true);
          POS.showToast("登录已过期，请重新登录");
          return false;
        }
        showAuth(false);
        if (signedIn) signedIn.textContent = session.user.email || "";
        setSyncStatus(window.navigator.onLine ? "在线 · 已就绪" : "离线", window.navigator.onLine ? "online" : "offline");
        if (!ready || force) {
          ready = true;
          await onReady(session);
        }
        return true;
      } catch (error) {
        if (window.navigator.onLine) POS.showToast(error.message || "登录检查失败");
        return false;
      } finally {
        checkingSession = false;
      }
    }

    async function boot() {
      await checkSession({ force: true });
    }

    if (form) {
      form.addEventListener("submit", async event => {
        event.preventDefault();
        error.textContent = "";
        const submit = form.querySelector("button[type='submit']");
        setBusy(submit, true, "登录中");
        const result = await client.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });
        setBusy(submit, false);
        if (result.error) {
          error.textContent = result.error.message;
          return;
        }
        await boot();
      });
    }

    if (logout) {
      logout.addEventListener("click", async () => {
        await client.auth.signOut();
        window.location.reload();
      });
    }

    window.addEventListener("pageshow", () => {
      if (!document.body.classList.contains("locked")) checkSession({ force: true });
    });

    window.addEventListener("focus", () => {
      if (!document.body.classList.contains("locked")) checkSession();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !document.body.classList.contains("locked")) {
        checkSession({ force: true });
      }
    });

    window.addEventListener("online", () => {
      if (!document.body.classList.contains("locked")) checkSession({ force: true });
    });

    window.setInterval(() => {
      if (!document.hidden && !document.body.classList.contains("locked")) {
        checkSession();
      }
    }, 600000);

    await boot();
  }

  window.POS = {
    appVersion,
    productCatalog,
    getClient,
    money,
    dateKey,
    todayKey,
    todayLabel,
    businessTimeZone,
    lowStockThreshold,
    standardCategories,
    normalizeCategory,
    categoryLabel,
    normalizePaymentMethod,
    paymentLabel,
    roleLabel,
    canManage,
    isRevenueOrder,
    normalizeProduct,
    csvEscape,
    showToast,
    setSyncStatus,
    setBusy,
    initAuth,
    initPwa
  };

  initPwa();
})();
