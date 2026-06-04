const TOKEN_KEY = "cassias-admin-token";
const LOCAL_ORDERS_KEY = "cassias-local-orders";
const DEFAULT_ADMIN_PASSWORD = "Admin2";

const adminState = {
  token: sessionStorage.getItem(TOKEN_KEY) || "",
  orders: [],
  summary: null,
  selectedOrderId: null,
  storage: "api"
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const orderStatusLabels = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado"
};

const paymentStatusLabels = {
  pendente: "Pendente",
  pago: "Pago"
};

const API_BASE = "";

const loginPanel = document.querySelector("#loginPanel");
const loginForm = document.querySelector("#loginForm");
const adminPassword = document.querySelector("#adminPassword");
const loginStatus = document.querySelector("#loginStatus");
const dashboard = document.querySelector("#dashboard");
const summaryCards = document.querySelector("#summaryCards");
const ordersTableBody = document.querySelector("#ordersTableBody");
const orderDetail = document.querySelector("#orderDetail");
const adminStatus = document.querySelector("#adminStatus");
const orderSearch = document.querySelector("#orderSearch");
const refreshOrders = document.querySelector("#refreshOrders");
const logoutAdmin = document.querySelector("#logoutAdmin");

initAdmin();

async function initAdmin() {
  try {
    await loadOrders({ silent: true });
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    adminState.token = "";
    showLogin(error.message, true);
  }
}

async function loadOrders(options = {}) {
  if (!options.silent) {
    setAdminStatus("Carregando pedidos...");
  }

  if (!canUseApi()) {
    loadLocalOrdersDashboard("Admin local: mostrando pedidos salvos neste navegador.");
    return;
  }

  let response;

  try {
    response = await fetch(apiUrl("/api/admin/orders?limit=200"), {
      headers: getAuthHeaders()
    });
  } catch (error) {
    loadLocalOrdersDashboard(`API indisponivel (${error.message}). Mostrando pedidos salvos neste navegador.`);
    return;
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(result.message || "Senha de admin invalida.");
    }

    loadLocalOrdersDashboard(result.message || `API respondeu ${response.status}. Mostrando pedidos locais.`);
    return;
  }

  adminState.storage = "api";
  adminState.summary = result.summary;
  adminState.orders = result.orders;
  normalizeSelectedOrder();

  showDashboard();
  renderSummary();
  renderOrders();
  renderOrderDetail();
  setAdminStatus(adminState.orders.length ? `${adminState.orders.length} pedido(s) carregado(s).` : "Nenhum pedido salvo ainda.");
}

function loadLocalOrdersDashboard(reason) {
  ensureLocalAdminAccess();

  adminState.storage = "local";
  adminState.orders = loadLocalOrders();
  adminState.summary = buildSummary(adminState.orders);
  normalizeSelectedOrder();

  showDashboard();
  renderSummary();
  renderOrders();
  renderOrderDetail();

  const message = adminState.orders.length
    ? `${adminState.orders.length} pedido(s) local(is) carregado(s). ${reason}`
    : `Nenhum pedido local salvo ainda. ${reason}`;

  setAdminStatus(message, true);
}

function ensureLocalAdminAccess() {
  if (adminState.token !== DEFAULT_ADMIN_PASSWORD) {
    throw new Error("Digite a senha Admin2 para entrar no admin.");
  }
}

function normalizeSelectedOrder() {
  if (!adminState.selectedOrderId && adminState.orders.length > 0) {
    adminState.selectedOrderId = adminState.orders[0].id;
  }

  if (!adminState.orders.some((order) => order.id === adminState.selectedOrderId)) {
    adminState.selectedOrderId = adminState.orders[0]?.id || null;
  }
}

function renderSummary() {
  const summary = adminState.summary || {};
  const cards = [
    ["Pedidos", summary.totalOrders || 0],
    ["Vendido", money.format(summary.totalSales || 0)],
    ["Pago", money.format(summary.paidSales || 0)],
    ["Pendente", money.format(summary.pendingSales || 0)]
  ];

  summaryCards.innerHTML = cards
    .map(([label, value]) => `
      <article class="summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `)
    .join("");
}

function renderOrders() {
  const orders = getFilteredOrders();

  if (!orders.length) {
    ordersTableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-cart">Nenhum pedido encontrado.</div>
        </td>
      </tr>
    `;
    return;
  }

  ordersTableBody.innerHTML = orders
    .map((order) => {
      const selectedClass = order.id === adminState.selectedOrderId ? " is-selected" : "";
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const localLabel = order.localOnly ? "local" : "";

      return `
        <tr class="${selectedClass}" data-order-id="${order.id}">
          <td>
            <button class="order-link" type="button" data-select-order="${order.id}">#${order.id}</button>
            <span class="order-mini">${itemCount} item(ns) ${escapeHtml(localLabel)}</span>
          </td>
          <td>
            <strong>${escapeHtml(order.customerName)}</strong>
            <span>${escapeHtml(order.phone)}</span>
          </td>
          <td>${escapeHtml(order.paymentMethod)}</td>
          <td>
            <select class="admin-select" data-payment-status="${order.id}">
              ${renderOptions(paymentStatusLabels, order.paymentStatus)}
            </select>
          </td>
          <td>${money.format(order.total)}</td>
          <td>
            <select class="admin-select" data-order-status="${order.id}">
              ${renderOptions(orderStatusLabels, order.status)}
            </select>
          </td>
          <td>${escapeHtml(formatDateTime(order.createdAt))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderOrderDetail() {
  const order = adminState.orders.find((entry) => entry.id === adminState.selectedOrderId);

  if (!order) {
    orderDetail.innerHTML = `<div class="empty-cart">Selecione um pedido para ver os detalhes.</div>`;
    return;
  }

  const address = [
    order.street,
    order.addressNumber,
    order.complement
  ].filter(Boolean).join(", ");

  orderDetail.innerHTML = `
    <div class="detail-heading">
      <div>
        <p class="eyebrow">Pedido #${order.id}${order.localOnly ? " - local" : ""}</p>
        <h2>${escapeHtml(order.customerName)}</h2>
        <p>${escapeHtml(order.phone)}</p>
      </div>
      <span class="status-pill">${escapeHtml(paymentStatusLabels[order.paymentStatus] || order.paymentStatus)}</span>
    </div>

    <dl class="detail-list">
      <div>
        <dt>Total</dt>
        <dd>${money.format(order.total)}</dd>
      </div>
      <div>
        <dt>Produtos</dt>
        <dd>${money.format(order.subtotal)}</dd>
      </div>
      <div>
        <dt>Entrega</dt>
        <dd>${money.format(order.deliveryFee)} - ${escapeHtml(order.deliveryZoneName)}</dd>
      </div>
      <div>
        <dt>Pagamento</dt>
        <dd>${escapeHtml(order.paymentMethod)} - ${escapeHtml(paymentStatusLabels[order.paymentStatus] || order.paymentStatus)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>${escapeHtml(orderStatusLabels[order.status] || order.status)}</dd>
      </div>
      <div>
        <dt>Endereco</dt>
        <dd>${escapeHtml(address)}</dd>
      </div>
      <div>
        <dt>Data combinada</dt>
        <dd>${escapeHtml(formatDelivery(order.deliveryDate, order.deliveryTime))}</dd>
      </div>
      <div>
        <dt>Criado em</dt>
        <dd>${escapeHtml(formatDateTime(order.createdAt))}</dd>
      </div>
      <div>
        <dt>Observacoes</dt>
        <dd>${escapeHtml(order.notes || "Sem observacoes")}</dd>
      </div>
    </dl>

    <div class="items-list">
      <h3>Itens comprados</h3>
      ${order.items.map(renderItem).join("")}
    </div>
  `;
}

function renderItem(item) {
  return `
    <article class="admin-item">
      <div>
        <strong>${escapeHtml(item.quantity)}x ${escapeHtml(item.productName)}</strong>
        <span>${escapeHtml(item.sizeLabel)} - ${escapeHtml(item.flavor)}</span>
      </div>
      <span>${money.format(item.lineTotal)}</span>
    </article>
  `;
}

function getFilteredOrders() {
  const query = orderSearch.value.trim().toLowerCase();

  if (!query) {
    return adminState.orders;
  }

  return adminState.orders.filter((order) => {
    return [
      order.id,
      order.customerName,
      order.phone,
      order.paymentMethod,
      order.paymentStatus,
      order.status,
      order.deliveryZoneName
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });
}

async function updateOrder(orderId, payload) {
  setAdminStatus("Atualizando pedido...");

  if (adminState.storage === "local") {
    updateLocalOrder(orderId, payload);
    setAdminStatus(`Pedido #${orderId} atualizado no admin local.`);
    return;
  }

  const response = await fetch(apiUrl(`/api/admin/orders/${orderId}`), {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Nao foi possivel atualizar.");
  }

  await loadOrders({ silent: true });
  setAdminStatus(`Pedido #${orderId} atualizado.`);
}

function updateLocalOrder(orderId, payload) {
  const orders = loadLocalOrders();
  const order = orders.find((entry) => entry.id === orderId);

  if (!order) {
    throw new Error("Pedido local nao encontrado.");
  }

  Object.assign(order, payload);
  saveLocalOrders(orders);
  adminState.orders = orders;
  adminState.summary = buildSummary(orders);
  normalizeSelectedOrder();
  renderSummary();
  renderOrders();
  renderOrderDetail();
}

function renderOptions(options, selectedValue) {
  return Object.entries(options)
    .map(([value, label]) => {
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeAttr(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function buildSummary(orders) {
  return orders.reduce((summary, order) => {
    const total = Number(order.total || 0);

    summary.totalOrders += 1;
    summary.totalSales += total;

    if (order.paymentStatus === "pago") {
      summary.paidSales += total;
    } else {
      summary.pendingSales += total;
    }

    return summary;
  }, {
    totalOrders: 0,
    totalSales: 0,
    paidSales: 0,
    pendingSales: 0
  });
}

function getAuthHeaders(extra = {}) {
  const headers = { ...extra };

  if (adminState.token) {
    headers.Authorization = `Bearer ${adminState.token}`;
  }

  return headers;
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function canUseApi() {
  return location.protocol !== "file:";
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  loginStatus.textContent = "";
  loginStatus.classList.remove("is-error");
}

function showLogin(message = "", isError = false) {
  dashboard.hidden = true;
  loginPanel.hidden = false;
  loginStatus.textContent = message;
  loginStatus.classList.toggle("is-error", isError);
}

function setAdminStatus(message, isError = false) {
  adminStatus.textContent = message;
  adminStatus.classList.toggle("is-error", isError);
}

function formatDelivery(date, time) {
  if (!date && !time) {
    return "Nao informado";
  }

  return [formatDate(date), time].filter(Boolean).join(" as ");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const [date, time = ""] = String(value).split(" ");
  return [formatDate(date), time.slice(0, 5)].filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value).slice(0, 10).split("-");

  if (!year || !month || !day) {
    return String(value);
  }

  return `${day}/${month}/${year}`;
}

function loadLocalOrders() {
  try {
    const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || "[]");
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders) {
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  adminState.token = adminPassword.value.trim();
  sessionStorage.setItem(TOKEN_KEY, adminState.token);
  loginStatus.textContent = "Entrando...";

  try {
    await loadOrders({ silent: true });
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    adminState.token = "";
    loginStatus.textContent = error.message;
    loginStatus.classList.add("is-error");
  }
});

refreshOrders.addEventListener("click", () => {
  loadOrders().catch((error) => setAdminStatus(error.message, true));
});

logoutAdmin.addEventListener("click", () => {
  adminState.token = "";
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin("Voce saiu do admin.");
});

orderSearch.addEventListener("input", () => {
  renderOrders();
});

ordersTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-order]");

  if (!button) {
    return;
  }

  adminState.selectedOrderId = Number(button.dataset.selectOrder);
  renderOrders();
  renderOrderDetail();
});

ordersTableBody.addEventListener("change", async (event) => {
  const paymentSelect = event.target.closest("[data-payment-status]");
  const orderSelect = event.target.closest("[data-order-status]");

  try {
    if (paymentSelect) {
      const orderId = Number(paymentSelect.dataset.paymentStatus);
      adminState.selectedOrderId = orderId;
      await updateOrder(orderId, { paymentStatus: paymentSelect.value });
      return;
    }

    if (orderSelect) {
      const orderId = Number(orderSelect.dataset.orderStatus);
      adminState.selectedOrderId = orderId;
      await updateOrder(orderId, { status: orderSelect.value });
    }
  } catch (error) {
    setAdminStatus(error.message, true);
  }
});
