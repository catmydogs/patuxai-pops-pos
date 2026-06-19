(function () {
  const productCatalog = [
    { id: "mango-passion", name: "Mango & Passion Fruit", category: "Patuxai Pops", price: 55000, stock: 50, image_path: "assets/products/mango-passion.png", note: "芒果百香果", sort_order: 1 },
    { id: "strawberry-milk", name: "Strawberry Milk", category: "Patuxai Pops", price: 55000, stock: 50, image_path: "assets/products/strawberry-milk.png", note: "草莓牛奶", sort_order: 2 },
    { id: "pistachio", name: "Pistachio", category: "Patuxai Pops", price: 55000, stock: 50, image_path: "assets/products/pistachio.png", note: "开心果", sort_order: 3 },
    { id: "coconut-butterfly-pea", name: "Coconut Butterfly Pea", category: "Patuxai Pops", price: 55000, stock: 50, image_path: "assets/products/coconut-butterfly-pea.png", note: "椰香蝶豆花", sort_order: 4 },
    { id: "lychee-rose-soda", name: "Lychee Rose Soda", category: "Signature Soda", price: 55000, stock: 50, image_path: "assets/products/lychee-rose-soda.png", note: "荔枝玫瑰苏打", sort_order: 5 },
    { id: "patuxai-sunset-soda", name: "Patuxai Sunset Soda", category: "Signature Soda", price: 55000, stock: 50, image_path: "assets/products/patuxai-sunset-soda.png", note: "百香果菠萝气泡", sort_order: 6 },
    { id: "peach-jasmine-sparkle", name: "Peach Jasmine Sparkle", category: "Signature Soda", price: 55000, stock: 50, image_path: "assets/products/peach-jasmine-sparkle.png", note: "蜜桃茉莉气泡", sort_order: 7 },
    { id: "grapefruit-sparkle", name: "Grapefruit Sparkle", category: "Signature Soda", price: 55000, stock: 50, image_path: "assets/products/grapefruit-sparkle.png", note: "西柚气泡", sort_order: 8 }
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

    function builder(table) {
      const state = {
        table,
        select: "*",
        filters: [],
        order: null,
        payload: null,
        mode: "select",
        upsert: false
      };

      async function execute() {
        const params = new URLSearchParams();
        if (state.mode === "select" && state.select) params.set("select", state.select);
        state.filters.forEach(filter => params.set(filter.column, `eq.${filter.value}`));
        if (state.order) {
          params.set("order", `${state.order.column}.${state.order.ascending ? "asc" : "desc"}`);
        }

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

        let response;
        try {
          response = await fetchWithTimeout(url, options);
        } catch (error) {
          return { data: null, error: { message: friendlyNetworkError(error) } };
        }

        if (!response.ok) {
          const text = await response.text();
          return { data: null, error: { message: normalizeApiError(text) } };
        }
        if (options.method === "GET") {
          return { data: await response.json(), error: null };
        }
        return { data: null, error: null };
      }

      return {
        select(columns) {
          state.select = columns || "*";
          state.mode = "select";
          return this;
        },
        order(column, options) {
          state.order = {
            column,
            ascending: !options || options.ascending !== false
          };
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
        upsert(payload) {
          state.payload = payload;
          state.mode = "upsert";
          return execute();
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
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
        let response;
        try {
          response = await fetchWithTimeout(`${config.SUPABASE_URL}/rest/v1/rpc/${name}`, {
            method: "POST",
            headers: await apiHeaders({
              "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload || {})
          });
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

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
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
        window.navigator.serviceWorker.register("sw.js").catch(() => {});
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

    function showAuth(show) {
      document.body.classList.toggle("locked", show);
      if (screen) screen.hidden = !show;
    }

    async function boot() {
      const result = await client.auth.getSession();
      const session = result.data && result.data.session;
      if (!session) {
        showAuth(true);
        return;
      }
      showAuth(false);
      if (signedIn) signedIn.textContent = session.user.email || "";
      await onReady(session);
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

    await boot();
  }

  window.POS = {
    productCatalog,
    getClient,
    money,
    todayKey,
    csvEscape,
    showToast,
    setSyncStatus,
    setBusy,
    initAuth,
    initPwa
  };

  initPwa();
})();
