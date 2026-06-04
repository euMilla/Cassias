const CART_KEY = "cassias-cart";
const LOCAL_ORDERS_KEY = "cassias-local-orders";
const WHATSAPP_NUMBER = "5513981177979";

const state = {
  catalog: null,
  activeCategory: "todos",
  cart: loadCart(),
  isCartDrawerOpen: false
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const categoryTabs = document.querySelector("#categoryTabs");
const productsGrid = document.querySelector("#productsGrid");
const cartList = document.querySelector("#cartList");
const cartDrawer = document.querySelector("#cartDrawer");
const cartBackdrop = document.querySelector("#cartBackdrop");
const cartDrawerList = document.querySelector("#cartDrawerList");
const closeCartDrawer = document.querySelector("#closeCartDrawer");
const cartFab = document.querySelector("#cartFab");
const cartFabCount = document.querySelector("#cartFabCount");
const drawerSubtotalValue = document.querySelector("#drawerSubtotalValue");
const drawerDeliveryValue = document.querySelector("#drawerDeliveryValue");
const drawerTotalValue = document.querySelector("#drawerTotalValue");
const goToCheckout = document.querySelector("#goToCheckout");
const deliveryGrid = document.querySelector("#deliveryGrid");
const deliveryZoneSelect = document.querySelector("#deliveryZone");
const subtotalValue = document.querySelector("#subtotalValue");
const deliveryValue = document.querySelector("#deliveryValue");
const totalValue = document.querySelector("#totalValue");
const orderForm = document.querySelector("#orderForm");
const orderStatus = document.querySelector("#orderStatus");
const deliveryDateInput = orderForm.querySelector('[name="date"]');
const deliveryTimeInput = document.querySelector("#deliveryTime");
const checkoutPanel = document.querySelector("#pedido");

const businessHours = {
  1: { start: "10:00", end: "19:00" },
  2: { start: "10:00", end: "19:00" },
  3: { start: "10:00", end: "19:00" },
  4: { start: "10:00", end: "19:00" },
  5: { start: "10:00", end: "19:00" },
  6: { start: "10:00", end: "17:00" }
};

const API_BASE = "";

init();

async function init() {
  try {
    state.catalog = await loadCatalog();
    renderCategories();
    renderProducts();
    renderDeliveryOptions();
    renderDeliveryGrid();
    renderCart();
    setupDeliverySchedule();
  } catch (error) {
    productsGrid.innerHTML = `<p class="status-message is-error">Nao foi possivel carregar o cardapio.</p>`;
  }
}

async function loadCatalog() {
  if (location.protocol !== "file:") {
    try {
      const response = await fetch("data/catalog.json");

      if (response.ok) {
        return response.json();
      }
    } catch {
      // The inline catalog below keeps the menu visible when static loading fails.
    }
  }

  if (window.CASSIAS_CATALOG) {
    return window.CASSIAS_CATALOG;
  }

  throw new Error("Catalogo indisponivel.");
}

function renderCategories() {
  categoryTabs.innerHTML = state.catalog.categories
    .map((category) => {
      const activeClass = category.id === state.activeCategory ? " is-active" : "";
      return `<button class="tab-button${activeClass}" type="button" data-category="${category.id}">${escapeHtml(category.label)}</button>`;
    })
    .join("");
}

function renderProducts() {
  const products = state.catalog.products.filter((product) => {
    return state.activeCategory === "todos" || product.category === state.activeCategory;
  });

  productsGrid.innerHTML = products.map(renderProductCard).join("");
}

function renderProductCard(product) {
  const firstSize = product.sizes[0];
  const flavorOptions = product.flavors.map((flavor) => `<option value="${escapeAttr(flavor)}">${escapeHtml(flavor)}</option>`).join("");
  const sizeOptions = product.sizes
    .map((size) => `<option value="${escapeAttr(size.id)}">${escapeHtml(size.label)} - ${currency.format(size.price)}</option>`)
    .join("");

  return `
    <article class="product-card" data-product-card="${escapeAttr(product.id)}">
      <div class="product-media">
        <img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" loading="lazy" />
        <span class="product-tag">${escapeHtml(product.tag)}</span>
      </div>
      <div class="product-body">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
        </div>
        <div class="field-grid">
          <label>
            Tamanho
            <select data-size>
              ${sizeOptions}
            </select>
          </label>
          <label>
            Sabor
            <select data-flavor>
              ${flavorOptions}
            </select>
          </label>
        </div>
        <div class="price-row">
          <label>
            Qtd.
            <input type="number" data-qty min="1" max="99" value="1" />
          </label>
          <strong data-price>${currency.format(firstSize.price)}</strong>
        </div>
        <button class="button primary" type="button" data-add>Adicionar ao carrinho</button>
      </div>
    </article>
  `;
}

function renderDeliveryOptions() {
  deliveryZoneSelect.innerHTML = state.catalog.deliveryZones
    .map((zone) => `<option value="${escapeAttr(zone.id)}">${escapeHtml(zone.name)} - ${currency.format(zone.fee)}</option>`)
    .join("");
}

function renderDeliveryGrid() {
  deliveryGrid.innerHTML = state.catalog.deliveryZones
    .map((zone) => {
      return `
        <article class="delivery-card">
          <strong>${escapeHtml(zone.name)}</strong>
          <span>${currency.format(zone.fee)} - ${escapeHtml(zone.eta)}</span>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const html = getCartHtml();

  cartList.innerHTML = html;

  if (cartDrawerList) {
    cartDrawerList.innerHTML = html;
  }

  saveCart();
  renderTotals();
  updateCartCount();

  if (!state.cart.length) {
    closeDrawer();
  }
}

function getCartHtml() {
  if (!state.cart.length) {
    return `<div class="empty-cart">Carrinho vazio</div>`;
  }

  return state.cart
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity;

      return `
        <div class="cart-line">
          <div>
            <strong>${escapeHtml(item.productName)}</strong>
            <span>${escapeHtml(item.sizeLabel)} - ${escapeHtml(item.flavor)}</span>
            <span>${item.quantity} x ${currency.format(item.unitPrice)} = ${currency.format(lineTotal)}</span>
          </div>
          <div class="cart-actions" aria-label="Alterar quantidade">
            <button class="cart-action" type="button" data-cart-action="decrease" data-key="${escapeAttr(item.key)}">-</button>
            <button class="cart-action" type="button" data-cart-action="increase" data-key="${escapeAttr(item.key)}">+</button>
            <button class="cart-action" type="button" data-cart-action="remove" data-key="${escapeAttr(item.key)}">x</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTotals() {
  const subtotal = getSubtotal();
  const delivery = getSelectedDeliveryFee();
  const total = subtotal + delivery;

  subtotalValue.textContent = currency.format(subtotal);
  deliveryValue.textContent = currency.format(delivery);
  totalValue.textContent = currency.format(total);

  if (drawerSubtotalValue) {
    drawerSubtotalValue.textContent = currency.format(subtotal);
    drawerDeliveryValue.textContent = currency.format(delivery);
    drawerTotalValue.textContent = currency.format(total);
  }
}

function updateCartCount() {
  const quantity = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartFabCount) {
    cartFabCount.textContent = String(quantity);
  }

  if (cartFab) {
    cartFab.hidden = quantity === 0;
    cartFab.setAttribute("aria-expanded", state.isCartDrawerOpen ? "true" : "false");
  }
}

function addProduct(card) {
  const productId = card.dataset.productCard;
  const product = getProduct(productId);
  const sizeId = card.querySelector("[data-size]").value;
  const size = product.sizes.find((entry) => entry.id === sizeId);
  const flavor = card.querySelector("[data-flavor]").value;
  const quantity = Math.max(1, Math.min(99, Number(card.querySelector("[data-qty]").value || 1)));
  const key = [product.id, size.id, flavor].join("|");
  const existing = state.cart.find((item) => item.key === key);

  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
  } else {
    state.cart.push({
      key,
      productId: product.id,
      productName: product.name,
      category: product.category,
      sizeId: size.id,
      sizeLabel: size.label,
      flavor,
      quantity,
      unitPrice: size.price
    });
  }

  renderCart();
  openCartDrawer();
  highlightCheckout();
  setStatus(`${product.name} adicionado ao carrinho.`);
}

function updateProductPrice(card) {
  const product = getProduct(card.dataset.productCard);
  const sizeId = card.querySelector("[data-size]").value;
  const size = product.sizes.find((entry) => entry.id === sizeId);
  card.querySelector("[data-price]").textContent = currency.format(size.price);
}

function updateCartItem(key, action) {
  const item = state.cart.find((entry) => entry.key === key);

  if (!item) {
    return;
  }

  if (action === "increase") {
    item.quantity = Math.min(99, item.quantity + 1);
  }

  if (action === "decrease") {
    item.quantity -= 1;
  }

  if (action === "remove" || item.quantity < 1) {
    state.cart = state.cart.filter((entry) => entry.key !== key);
  }

  renderCart();
}

async function submitOrder(event) {
  event.preventDefault();

  if (!state.cart.length) {
    setStatus("Adicione pelo menos um item antes de salvar.", true);
    return;
  }

  const scheduleError = getScheduleError(deliveryDateInput.value, deliveryTimeInput.value);

  if (scheduleError) {
    setStatus(scheduleError, true);
    return;
  }

  const formData = new FormData(orderForm);
  const payload = buildPayload(formData);

  setStatus("Salvando pedido...");

  try {
    if (!canUseApi()) {
      throw new Error("Pagina aberta como arquivo. Pedido salvo no navegador.");
    }

    const response = await fetch(apiUrl("/api/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Erro ao salvar pedido.");
    }

    clearOrderForm();
    setStatus(`Pedido #${result.orderId} salvo. Total: ${currency.format(result.total)}.`);
  } catch (error) {
    const localOrder = createLocalOrderSnapshot(payload);

    saveLocalOrder(localOrder);
    clearOrderForm();
    setLocalOrderStatus(localOrder, error.message);
  }
}

function buildPayload(formData) {
  return {
    customer: {
      name: formData.get("customerName"),
      phone: formData.get("phone")
    },
    delivery: {
      zoneId: formData.get("deliveryZone"),
      street: formData.get("street"),
      number: formData.get("number"),
      complement: formData.get("complement"),
      date: formData.get("date"),
      time: formData.get("time")
    },
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
    items: state.cart.map((item) => ({
      productId: item.productId,
      sizeId: item.sizeId,
      flavor: item.flavor,
      quantity: item.quantity
    }))
  };
}

function clearOrderForm() {
  state.cart = [];
  renderCart();
  orderForm.reset();
  renderDeliveryOptions();
  setupDeliverySchedule();
  closeDrawer();
}

function canUseApi() {
  return location.protocol !== "file:";
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function createLocalOrderSnapshot(payload) {
  const zone = getDeliveryZone(payload.delivery.zoneId);
  const subtotal = getSubtotal();
  const deliveryFee = zone ? zone.fee : 0;

  return {
    id: Date.now(),
    customerName: cleanText(payload.customer.name),
    phone: cleanText(payload.customer.phone),
    deliveryZoneId: zone ? zone.id : cleanText(payload.delivery.zoneId),
    deliveryZoneName: zone ? zone.name : "Entrega",
    deliveryFee,
    street: cleanText(payload.delivery.street),
    addressNumber: cleanText(payload.delivery.number),
    complement: cleanText(payload.delivery.complement),
    deliveryDate: cleanText(payload.delivery.date),
    deliveryTime: cleanText(payload.delivery.time),
    paymentMethod: cleanText(payload.paymentMethod),
    paymentStatus: "pendente",
    notes: cleanText(payload.notes),
    subtotal,
    total: subtotal + deliveryFee,
    status: "novo",
    createdAt: formatDateTime(new Date()),
    localOnly: true,
    items: state.cart.map((item) => ({
      productName: item.productName,
      category: item.category,
      sizeLabel: item.sizeLabel,
      flavor: item.flavor,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity
    }))
  };
}

function setLocalOrderStatus(order, errorMessage) {
  const href = getWhatsappHref(order);

  orderStatus.innerHTML = `
    Pedido salvo no navegador como #${escapeHtml(order.id)}.
    <a href="${escapeAttr(href)}" target="_blank" rel="noopener">Enviar pedido no WhatsApp</a>
    <span class="status-note">API indisponivel: ${escapeHtml(errorMessage)}</span>
  `;
  orderStatus.classList.add("is-error");
}

function getWhatsappHref(order) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsappMessage(order))}`;
}

function buildWhatsappMessage(order) {
  const address = [order.street, order.addressNumber, order.complement].filter(Boolean).join(", ");
  const lines = [
    `Oi, Cassia's Doces! Quero confirmar o pedido #${order.id}.`,
    "",
    `Cliente: ${order.customerName}`,
    `Telefone: ${order.phone}`,
    `Entrega: ${formatDate(order.deliveryDate)} ${order.deliveryTime}`,
    `Bairro: ${order.deliveryZoneName}`,
    `Endereco: ${address}`,
    `Pagamento: ${order.paymentMethod}`,
    "",
    "Itens:"
  ];

  order.items.forEach((item) => {
    lines.push(`- ${item.quantity}x ${item.productName} (${item.sizeLabel}, ${item.flavor}) - ${currency.format(item.lineTotal)}`);
  });

  lines.push("");
  lines.push(`Subtotal: ${currency.format(order.subtotal)}`);
  lines.push(`Entrega: ${currency.format(order.deliveryFee)}`);
  lines.push(`Total: ${currency.format(order.total)}`);

  if (order.notes) {
    lines.push(`Observacoes: ${order.notes}`);
  }

  return lines.join("\n");
}

function getProduct(productId) {
  return state.catalog.products.find((product) => product.id === productId);
}

function getDeliveryZone(zoneId) {
  return state.catalog.deliveryZones.find((entry) => entry.id === zoneId);
}

function getSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function getSelectedDeliveryFee() {
  if (!state.catalog || !deliveryZoneSelect.value) {
    return 0;
  }

  const zone = getDeliveryZone(deliveryZoneSelect.value);
  return zone ? zone.fee : 0;
}

function setStatus(message, isError = false) {
  orderStatus.textContent = message;
  orderStatus.classList.toggle("is-error", isError);
}

function setupDeliverySchedule() {
  const today = new Date();
  const todayValue = dateToValue(today);

  deliveryDateInput.min = todayValue;

  if (!deliveryDateInput.value || deliveryDateInput.value < todayValue || !getBusinessHours(deliveryDateInput.value)) {
    deliveryDateInput.value = getNextOpenDateValue(today);
  }

  renderTimeOptions();
}

function renderTimeOptions() {
  const date = deliveryDateInput.value;

  if (!date) {
    deliveryTimeInput.innerHTML = '<option value="">Escolha a data primeiro</option>';
    deliveryTimeInput.disabled = true;
    return;
  }

  const hours = getBusinessHours(date);
  const selectedTime = deliveryTimeInput.value;

  if (!hours) {
    deliveryTimeInput.innerHTML = '<option value="">Fechado nessa data</option>';
    deliveryTimeInput.disabled = true;
    return;
  }

  const options = ['<option value="">Escolha o horario</option>'];

  for (let value = timeToMinutes(hours.start); value <= timeToMinutes(hours.end); value += 30) {
    const time = minutesToTime(value);
    const selected = time === selectedTime ? " selected" : "";
    options.push(`<option value="${time}"${selected}>${time}</option>`);
  }

  deliveryTimeInput.disabled = false;
  deliveryTimeInput.innerHTML = options.join("");
}

function getScheduleError(date, time) {
  if (!date) {
    return "Informe a data do pedido.";
  }

  const hours = getBusinessHours(date);

  if (!hours) {
    return "Atendemos de segunda a sexta das 10h as 19h e sabado das 10h as 17h.";
  }

  if (!time) {
    return "Escolha um horario para o pedido.";
  }

  if (!isTimeBetween(time, hours.start, hours.end)) {
    return `Para essa data, escolha um horario entre ${hours.start} e ${hours.end}.`;
  }

  return "";
}

function getNextOpenDateValue(startDate) {
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = addDays(startDate, offset);
    const value = dateToValue(candidate);

    if (getBusinessHours(value)) {
      return value;
    }
  }

  return dateToValue(startDate);
}

function getBusinessHours(date) {
  const day = getWeekday(date);
  return businessHours[day] || null;
}

function getWeekday(date) {
  const [year, month, day] = String(date).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day).getDay();
}

function isTimeBetween(time, start, end) {
  const value = timeToMinutes(time);
  return value >= timeToMinutes(start) && value <= timeToMinutes(end);
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dateToValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateTime(date) {
  return `${dateToValue(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function openCartDrawer() {
  if (!cartDrawer || !state.cart.length) {
    return;
  }

  state.isCartDrawerOpen = true;
  cartDrawer.hidden = false;
  cartBackdrop.hidden = false;
  document.body.classList.add("cart-open");
  updateCartCount();
}

function closeDrawer() {
  state.isCartDrawerOpen = false;

  if (cartDrawer) {
    cartDrawer.hidden = true;
  }

  if (cartBackdrop) {
    cartBackdrop.hidden = true;
  }

  document.body.classList.remove("cart-open");
  updateCartCount();
}

function highlightCheckout() {
  if (!checkoutPanel) {
    return;
  }

  checkoutPanel.classList.add("is-highlighted");
  window.setTimeout(() => checkoutPanel.classList.remove("is-highlighted"), 1200);
}

function handleCartAction(event) {
  const button = event.target.closest("[data-cart-action]");

  if (!button) {
    return;
  }

  updateCartItem(button.dataset.key, button.dataset.cartAction);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function loadLocalOrders() {
  try {
    const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || "[]");
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order) {
  const orders = loadLocalOrders();
  orders.unshift(order);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
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

categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");

  if (!button) {
    return;
  }

  state.activeCategory = button.dataset.category;
  renderCategories();
  renderProducts();
});

productsGrid.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");

  if (!addButton) {
    return;
  }

  addProduct(addButton.closest("[data-product-card]"));
});

productsGrid.addEventListener("change", (event) => {
  const sizeSelect = event.target.closest("[data-size]");

  if (!sizeSelect) {
    return;
  }

  updateProductPrice(sizeSelect.closest("[data-product-card]"));
});

cartList.addEventListener("click", handleCartAction);
cartDrawerList.addEventListener("click", handleCartAction);

cartFab.addEventListener("click", openCartDrawer);
closeCartDrawer.addEventListener("click", closeDrawer);
cartBackdrop.addEventListener("click", closeDrawer);
goToCheckout.addEventListener("click", () => {
  closeDrawer();
  highlightCheckout();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
  }
});

deliveryZoneSelect.addEventListener("change", renderTotals);
deliveryDateInput.addEventListener("change", renderTimeOptions);
orderForm.addEventListener("submit", submitOrder);
