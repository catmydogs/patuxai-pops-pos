(function () {
  const storageKey = "patuxai-pops-language";
  const language = window.localStorage.getItem(storageKey) === "en" ? "en" : "zh";

  const exact = {
    "登录 POS": "Sign in to POS", "使用 Supabase 中创建的账号登录。": "Sign in with an account created in Supabase.",
    "邮箱": "Email", "密码": "Password", "登录": "Sign in", "今日开班": "Today's Shift",
    "开始营业": "Open Shift", "确认收银员和初始现金后，才可以开始正式收银。": "Confirm the cashier and opening cash before taking orders.",
    "收银员": "Cashier", "初始现金 LAK": "Opening Cash LAK", "开班备注": "Opening Note", "POS 收银": "POS Checkout",
    "Owner 后台": "Owner Dashboard", "管理后台": "Management", "查看报表": "View Reports", "库存 / 报损": "Stock / Waste",
    "交班": "Close Shift", "退出": "Sign Out", "全部": "All", "调整品类排序": "Reorder Categories",
    "按住品类右侧的拖动按钮，调整整个品类区块的前后顺序": "Drag the handle to reorder category sections.",
    "取消": "Cancel", "保存排序": "Save Order", "重新同步": "Retry Sync", "订单已安全保存在本机": "Order saved safely on this device",
    "今日营业概览": "Today's Business", "今日销售额": "Today's Sales", "销售额": "Sales", "订单数": "Orders", "总售出件数": "Items Sold", "销售件数": "Items Sold", "售出件数": "Items Sold",
    "热销": "Top Seller", "暂无": "None", "分类售出件数": "Items Sold by Category", "冰淇淋": "Ice Cream",
    "定制服务": "Custom Service", "文创周边": "Merchandise", "文创商品": "Merchandise", "饮品": "Beverages",
    "饮料": "Beverages", "套餐": "Bundles", "其他": "Other", "其他产品": "Other Products", "今日订单": "Today's Orders",
    "时间": "Time", "内容": "Items", "付款": "Payment", "金额": "Amount", "当前订单": "Current Order", "清空": "Clear",
    "小计": "Subtotal", "折扣": "Discount", "应收": "Amount Due", "转账": "Transfer", "更多选项": "More Options",
    "混合支付": "Split Payment", "赠送": "Complimentary", "其他支付": "Other Payment", "折扣备注": "Discount Note",
    "订单备注": "Order Note", "可选": "Optional", "选填": "Optional", "选择折扣": "Select Discount", "清除": "Clear",
    "其他折扣金额": "Other discount amount", "确认到账后再完成收款": "Confirm receipt before completing payment.",
    "交易参考号": "Transaction Reference", "合计": "Total", "刚好": "Exact", "实收金额 KIP": "Cash Received KIP",
    "选择商品开始点单": "Select a product to start an order", "完成现金收款": "Complete Cash Payment",
    "交班对账": "Shift Reconciliation", "结束当前班次": "Close Current Shift", "关闭": "Close", "实际现金": "Actual Cash",
    "实际 QR 到账": "Actual QR Received", "实际转账": "Actual Transfer", "其他实际到账": "Other Amount Received", "天气": "Weather",
    "晴": "Sunny", "多云": "Cloudy", "小雨": "Light Rain", "大雨": "Heavy Rain", "高温": "Very Hot",
    "库存问题": "Stock Issue", "设备问题": "Equipment Issue", "特殊活动": "Special Event", "差异原因": "Difference Reason",
    "交班备注": "Closing Note", "当日备注": "Daily Note", "确认交班": "Confirm Shift Close", "安装到 iPad": "Install on iPad",
    "点 Safari 分享按钮，选择“添加到主屏幕”。": "Tap Safari Share, then choose Add to Home Screen.",
    "后台管理": "Dashboard", "登录后台": "Sign in to Dashboard", "登录后查看统计、管理库存和日结。": "Sign in to view reports, manage stock and close the day.",
    "Patuxai Pops 销售数据": "Patuxai Pops Sales Data", "返回点单": "Back to POS", "测试连接": "Test Connection",
    "首页": "Overview", "经营概览": "Business Overview", "销售分析": "Sales Analytics", "趋势与排行": "Trends and Rankings",
    "菜单": "Menu", "商品与图片": "Products and Images", "库存": "Inventory", "补货与售罄": "Restock and Sold Out",
    "库存记录": "Stock History", "出入库流水": "Stock Movements", "日结": "Daily Close", "现金核对": "Cash Reconciliation",
    "订单": "Orders", "明细与取消": "Details and Cancellation", "营业记录": "Operations Log", "天气与活动": "Weather and Events",
    "班次": "Shifts", "开班与交班": "Open and Close Shifts", "促销": "Promotions", "折扣与赠品": "Discounts and Gifts",
    "对账": "Reconciliation", "支付核对": "Payment Reconciliation", "系统": "System", "检查与导出": "Checks and Exports",
    "今天": "Today", "近 7 天": "Last 7 Days", "本月": "This Month", "指定日期": "Custom Dates",
    "查询日期范围": "Select Date Range", "可以查看某一天、当月，或指定从哪一天到哪一天的数据。": "View one day, a month, or a custom date range.",
    "单日": "Single Day", "查看这一天": "View Day", "月份": "Month", "查看这个月": "View Month",
    "开始日期": "Start Date", "结束日期": "End Date", "查看日期范围": "View Date Range", "当前菜单": "Current Menu",
    "上架中": "Active", "已下架": "Inactive", "低库存": "Low Stock", "客单价": "Average Order Value",
    "每单平均件数": "Items per Order", "单件订单占比": "Single-item Order Rate", "冰淇淋数量": "Ice Cream Items",
    "文创商品数量": "Merchandise Items", "冰淇淋＋文创混合订单": "Ice Cream + Merchandise Orders", "取消 / 退款": "Cancelled / Refunded",
    "支付方式": "Payment Method", "商品销量排行": "Product Ranking", "低库存提醒": "Low Stock Alerts", "菜单管理": "Menu Management",
    "新增商品": "Add Product", "保存": "Save", "删除": "Delete", "下架": "Deactivate", "上架": "Activate",
    "补货": "Restock", "报损": "Waste", "试吃": "Sample", "盘点调整": "Stock Adjustment", "退货": "Return", "刷新": "Refresh",
    "刷新所选日期": "Refresh Selected Date", "每日对账": "Daily Reconciliation", "系统检查与导出": "System Checks and Exports",
    "导出订单 CSV": "Export Orders CSV", "导出明细 CSV": "Export Items CSV", "导出库存 CSV": "Export Inventory CSV",
    "导出 Excel": "Export Excel", "导出班次 CSV": "Export Shifts CSV", "导出支付 CSV": "Export Payments CSV",
    "导出促销 CSV": "Export Promotions CSV", "导出促销使用 CSV": "Export Promotion Usage CSV", "导出推荐效果 CSV": "Export Upsell CSV",
    "导出营业记录 CSV": "Export Operations CSV", "数据质量提醒": "Data Quality Alerts", "账号权限": "Account Roles",
    "最近操作": "Recent Activity", "顶部": "Top", "读取权限": "Loading Role", "正在读取权限": "Loading Role", "全店实时": "Store Live", "全店最近同步": "Store Last Synced", "本账号数据": "This Account",
    "未开班": "Shift Closed", "在线": "Online", "离线": "Offline", "售罄": "Sold Out", "已售罄": "Sold Out",
    "加入": "Add", "加入订单": "Add to Order", "移除": "Remove", "恢复销售": "Restore Sale", "设为赠品": "Mark as Gift",
    "无需找零": "No Change", "现金": "Cash", "扫码": "QR", "今日收款": "Today's Payments",
    "Patuxai Pops 后台统计": "Patuxai Pops Dashboard", "支付方式收款": "Sales by Payment Method", "低库存 SKU": "Low-stock SKUs",
    "今日日结": "Today's Close", "系统现金": "System Cash", "差额": "Difference", "保存日结": "Save Daily Close",
    "今天还没有日结记录。": "No daily close recorded today.", "产品名称": "Product Name", "分类": "Category", "订金": "Deposit",
    "系列": "Series", "售价 KIP": "Price KIP", "初始库存": "Opening Stock", "跟踪库存": "Track Inventory", "说明": "Description",
    "新增产品": "Add Product", "时段经营表现": "Hourly Performance", "商品件数": "Items", "每单件数": "Items per Order",
    "文创附加率": "Merchandise Attach Rate", "月度销售曲线": "Monthly Sales Trend", "每日高峰时段": "Daily Peak Hours",
    "冰淇淋销售": "Ice Cream Sales", "其他品类销售": "Other Category Sales", "类别销售": "Sales by Category",
    "购物篮与连带销售": "Basket and Attach Sales", "商品表现与需求": "Product Performance and Demand",
    "经营异常提醒": "Business Alerts", "库存与售罄": "Inventory and Sold-out", "订单明细": "Order Details",
    "全部支付": "All Payments", "混合": "Split", "日期": "Date", "状态": "Status", "操作": "Actions",
    "每日营业记录": "Daily Operations Log", "计划开门": "Planned Opening", "计划收摊": "Planned Closing", "活动": "Event",
    "异常与说明": "Exceptions and Notes", "正常营业": "Normal Trading", "晚开": "Opened Late", "提前收摊": "Closed Early",
    "部分营业": "Partial Trading", "未营业": "Closed", "活动日": "Event Day", "测试日": "Test Day",
    "保存营业记录": "Save Operations Log", "班次管理": "Shift Management", "系统金额与实际到账按班次核对": "Reconcile system and actual receipts by shift",
    "全部状态": "All Statuses", "未交班": "Open", "已关闭": "Closed", "已取消": "Cancelled", "促销管理": "Promotion Management",
    "当前先支持固定折扣、套餐价和买赠": "Supports fixed discounts, bundle pricing, and buy-X-get-Y promotions.",
    "名称": "Name", "代码": "Code", "类型": "Type", "固定折扣": "Fixed Discount", "套餐价": "Bundle Price",
    "买 X 送 Y": "Buy X Get Y", "满额赠品": "Gift with Minimum Spend", "最低件数": "Minimum Quantity",
    "最低金额": "Minimum Amount", "折扣 / 套餐价": "Discount / Bundle Price", "指定购买商品": "Required Products",
    "任意商品": "Any Product", "不送赠品": "No Gift", "开始时间": "Start Time", "结束时间": "End Time",
    "使用上限": "Usage Limit", "新增促销": "Add Promotion", "仅现金进入现金账；QR、转账分别核对": "Only cash is included in the cash account; reconcile QR and transfers separately.",
    "先在 Supabase Authentication → Users 创建员工登录账号。新账号会自动成为“员工”，Owner 可在这里调整角色或停用账号。": "Create staff accounts in Supabase Authentication → Users. New accounts default to Cashier; the Owner can change roles or deactivate accounts here.",
    "↑ 顶部": "↑ Top"
  };

  const phrases = [
    ["搜索商品或口味", "Search products or flavors"], ["点击重新同步菜单和库存", "Tap to sync menu and stock"],
    ["重新同步菜单和库存", "Sync menu and stock"], ["今天还没有订单。", "No orders today."],
    ["点选左侧商品后，这里会生成当前订单。", "Select a product on the left to build the order."],
    ["选择付款后完成收款", "Select payment to complete checkout"], ["正在安全保存订单", "Saving order safely"],
    ["正在安全保存", "Saving safely"], ["正在云端确认", "Confirming with cloud"], ["已安全保存", "Saved safely"],
    ["数据库响应超时，请稍后重试", "Database timed out. Please try again."],
    ["无法连接数据库，请检查 iPad 网络后重试", "Cannot reach the database. Check the iPad network and retry."],
    ["登录已过期，请重新登录", "Session expired. Please sign in again."], ["菜单和库存已同步", "Menu and stock synced"],
    ["菜单和真实库存已更新", "Menu and live stock updated"], ["正在同步菜单", "Syncing menu"], ["库存提醒", "Stock Alert"],
    ["没有符合条件的商品。", "No matching products."], ["当前账号不可使用折扣", "This account cannot apply discounts"],
    ["自动促销生效时不可叠加手动折扣", "Manual discounts cannot be added to an automatic promotion"],
    ["确认 QR 到账", "Confirm QR Payment"], ["确认转账到账", "Confirm Transfer"], ["确认混合支付", "Confirm Split Payment"],
    ["确认赠送", "Confirm Complimentary Order"], ["完成其他收款", "Complete Other Payment"], ["完成现金收款", "Complete Cash Payment"],
    ["找零", "Change"], ["应收", "Due"], ["优惠", "Discount"], ["赠品", "Gift"], ["扣库存", "Stock deducted"],
    ["可售", "In stock"], ["低库存或售罄", "low stock or sold out"], ["库存状态正常。", "Stock levels are normal."],
    ["开班中", "Opening shift"], ["开班成功，可以开始收银", "Shift opened. Checkout is ready."],
    ["交班完成，今日对账已保存", "Shift closed and reconciliation saved."], ["当前没有开启班次", "No shift is currently open"],
    ["请先开班再收银", "Open a shift before taking payment"], ["现金实收不足", "Cash received is insufficient"],
    ["本地保存失败，请勿向顾客确认收款", "Local save failed. Do not confirm payment to the customer."],
    ["订单已安全保存在本机，联网后自动同步", "Order saved on this device and will sync when online."],
    ["已完成收款并同步", "Payment completed and synced"], ["网络响应中断，订单已安全保存在本机", "Network interrupted. The order is safe on this device."],
    ["再点一次清空当前订单", "Tap again to clear the current order"], ["再点清空", "Tap Again"], ["保存中", "Saving"],
    ["同步失败", "Sync failed"], ["网络连接失败", "Network connection failed"], ["正在读取", "Loading"], ["加载中", "Loading"],
    ["操作成功", "Completed"], ["操作失败", "Operation failed"], ["请检查网络", "Check your network"],
    ["无则留空", "Leave blank if none"], ["有差额时必填", "Required when there is a difference"],
    ["客流、天气、异常情况等", "Traffic, weather, unusual events, etc."], ["返回顶部", "Back to top"],
    ["商品分类", "Product Categories"], ["商品", "Products"], ["购物车", "Cart"], ["今日报表", "Today's Report"],
    ["订单记录", "Order History"], ["后台功能", "Dashboard Sections"], ["统计范围", "Date Range"],
    ["按日期查询销售数据", "Sales by Date"], ["产品筛选", "Product Filters"]
  ];

  const regexRules = [
    [/^(\d+)\s*件$/, "$1 items"], [/^(\d+)\s*款$/, "$1 products"], [/^可售\s*(\d+)$/, "In stock $1"],
    [/^(\d+)\s*单等待同步$/, "$1 orders waiting to sync"], [/^(\d+)\s*单待同步$/, "$1 orders pending sync"],
    [/^(\d+)\s*单需处理$/, "$1 orders need attention"], [/^在线\s*·\s*(.+)\s*已同步$/, "Online · Synced $1"],
    [/^离线\s*·\s*(\d+)\s*单待同步$/, "Offline · $1 orders pending sync"],
    [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期一$/, "$1-$2-$3 Monday"], [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期二$/, "$1-$2-$3 Tuesday"],
    [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期三$/, "$1-$2-$3 Wednesday"], [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期四$/, "$1-$2-$3 Thursday"],
    [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期五$/, "$1-$2-$3 Friday"], [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期六$/, "$1-$2-$3 Saturday"],
    [/^(\d{4})年(\d{1,2})月(\d{1,2})日星期日$/, "$1-$2-$3 Sunday"]
  ];

  function translate(value) {
    if (language !== "en" || value == null) return String(value == null ? "" : value);
    const original = String(value);
    const trimmed = original.trim();
    if (!trimmed) return original;
    let translated = exact[trimmed] || trimmed;
    if (translated === trimmed) {
      for (const rule of regexRules) {
        rule[0].lastIndex = 0;
        if (rule[0].test(trimmed)) { translated = trimmed.replace(rule[0], rule[1]); break; }
      }
    }
    for (const pair of phrases) translated = translated.split(pair[0]).join(pair[1]);
    return original.replace(trimmed, translated);
  }

  function translateElement(element) {
    if (!element || element.nodeType !== 1 || element.tagName === "SCRIPT" || element.tagName === "STYLE") return;
    ["placeholder", "title", "aria-label"].forEach(attribute => {
      if (element.hasAttribute(attribute)) element.setAttribute(attribute, translate(element.getAttribute(attribute)));
    });
    Array.from(element.childNodes).forEach(node => {
      if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) node.nodeValue = translate(node.nodeValue);
      else if (node.nodeType === 1) translateElement(node);
    });
  }

  function apply(root) {
    if (language !== "en") return;
    document.documentElement.lang = "en";
    document.title = translate(document.title);
    translateElement(root || document.body);
  }

  function bindToggles() {
    document.querySelectorAll("[data-language-toggle]").forEach(button => {
      button.textContent = language === "en" ? "中文" : "EN";
      button.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "Switch to English");
      button.addEventListener("click", () => {
        window.localStorage.setItem(storageKey, language === "en" ? "zh" : "en");
        window.location.reload();
      });
    });
  }

  window.POS_I18N = { language, t: translate, apply };
  document.addEventListener("DOMContentLoaded", () => {
    apply(document.body);
    bindToggles();
    if (language === "en" && typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
          if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) node.nodeValue = translate(node.nodeValue);
          else if (node.nodeType === 1) translateElement(node);
        }));
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
