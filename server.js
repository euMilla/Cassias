const fs = require("fs");
const os = require("os");
const path = require("path");

require("dotenv").config();

const express = require("express");

const app = express();
const publicDir = path.join(__dirname, "public");
const catalogPath = path.join(publicDir, "data", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const orderStatuses = new Set(["novo", "confirmado", "em_preparo", "saiu_para_entrega", "entregue", "cancelado"]);
const paymentStatuses = new Set(["pendente", "pago"]);
const businessHours = {
  1: { start: "10:00", end: "19:00" },
  2: { start: "10:00", end: "19:00" },
  3: { start: "10:00", end: "19:00" },
  4: { start: "10:00", end: "19:00" },
  5: { start: "10:00", end: "19:00" },
  6: { start: "10:00", end: "17:00" }
};

const kvPrefix = process.env.ORDER_STORE_PREFIX || "cassias";
const localOrdersPath = process.env.ORDER_FILE
  || (process.env.VERCEL ? path.join(os.tmpdir(), "cassias-orders.json") : path.join(__dirname, "database", "orders.json"));

let memoryStore = { nextId: 1, orders: [] };

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/cassias.html", (_req, res) => {
  res.redirect("/");
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/api/catalog", (_req, res) => {
  res.json(catalog);
});

app.get("/api/health", async (_req, res) => {
  try {
    const storage = await getStorageHealth();
    res.json({ ok: true, storage });
  } catch (error) {
    res.status(503).json({ ok: false, message: error.message });
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));
    const orders = await listOrders(limit);
    const summary = buildSummary(await listOrders(5000));

    res.json({ ok: true, summary, orders });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId < 1) {
      throwBadRequest("Pedido invalido.");
    }

    const updates = {};

    if (typeof req.body.status === "string") {
      if (!orderStatuses.has(req.body.status)) {
        throwBadRequest("Status de pedido invalido.");
      }

      updates.status = req.body.status;
    }

    if (typeof req.body.paymentStatus === "string") {
      if (!paymentStatuses.has(req.body.paymentStatus)) {
        throwBadRequest("Status de pagamento invalido.");
      }

      updates.paymentStatus = req.body.paymentStatus;
    }

    if (Object.keys(updates).length === 0) {
      throwBadRequest("Nada para atualizar.");
    }

    const updated = await updateStoredOrder(orderId, updates);

    if (!updated) {
      res.status(404).json({ ok: false, message: "Pedido nao encontrado." });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ ok: false, message: error.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = buildOrder(req.body);
    const storedOrder = await saveOrder(order);

    res.status(201).json({
      ok: true,
      orderId: storedOrder.id,
      subtotal: storedOrder.subtotal,
      total: storedOrder.total
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ ok: false, message: error.message });
  }
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(publicDir, "index.html"));
});

async function getStorageHealth() {
  if (hasKvStore()) {
    await kvCommand(["PING"]);
    return { type: "vercel-kv", persistent: true };
  }

  await readLocalStore();

  return {
    type: process.env.VERCEL ? "memory-fallback" : "local-file",
    persistent: !process.env.VERCEL,
    note: process.env.VERCEL ? "Configure KV_REST_API_URL e KV_REST_API_TOKEN para persistir no Vercel." : undefined
  };
}

async function listOrders(limit) {
  if (hasKvStore()) {
    return listKvOrders(limit);
  }

  const store = await readLocalStore();
  return store.orders.slice(0, limit);
}

async function saveOrder(order) {
  if (hasKvStore()) {
    return saveKvOrder(order);
  }

  return saveLocalOrder(order);
}

async function updateStoredOrder(orderId, updates) {
  if (hasKvStore()) {
    return updateKvOrder(orderId, updates);
  }

  return updateLocalOrder(orderId, updates);
}

function hasKvStore() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(command) {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.error) {
    throw new Error(payload.error || `KV respondeu ${response.status}.`);
  }

  return payload.result;
}

async function kvPipeline(commands) {
  const baseUrl = process.env.KV_REST_API_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands)
  });

  const payload = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(`KV pipeline respondeu ${response.status}.`);
  }

  return payload;
}

async function listKvOrders(limit) {
  const ids = await kvCommand(["LRANGE", kvKey("order_ids"), "0", String(limit - 1)]);

  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const results = await kvPipeline(ids.map((id) => ["GET", kvKey(`order:${id}`)]));

  return results
    .map((entry) => entry?.result)
    .filter(Boolean)
    .map((entry) => JSON.parse(entry));
}

async function saveKvOrder(order) {
  const id = Number(await kvCommand(["INCR", kvKey("next_id")]));
  const storedOrder = serializeOrder(order, id);

  await kvPipeline([
    ["SET", kvKey(`order:${id}`), JSON.stringify(storedOrder)],
    ["LPUSH", kvKey("order_ids"), String(id)]
  ]);

  return storedOrder;
}

async function updateKvOrder(orderId, updates) {
  const rawOrder = await kvCommand(["GET", kvKey(`order:${orderId}`)]);

  if (!rawOrder) {
    return false;
  }

  const order = { ...JSON.parse(rawOrder), ...updates };
  await kvCommand(["SET", kvKey(`order:${orderId}`), JSON.stringify(order)]);

  return true;
}

function kvKey(key) {
  return `${kvPrefix}:${key}`;
}

async function readLocalStore() {
  try {
    const text = await fs.promises.readFile(localOrdersPath, "utf8");
    memoryStore = normalizeStore(JSON.parse(text));
    return memoryStore;
  } catch {
    return memoryStore;
  }
}

async function writeLocalStore(store) {
  memoryStore = normalizeStore(store);

  try {
    await fs.promises.mkdir(path.dirname(localOrdersPath), { recursive: true });
    await fs.promises.writeFile(localOrdersPath, JSON.stringify(memoryStore, null, 2), "utf8");
  } catch {
    // On serverless without KV the filesystem may be temporary or read-only; memory keeps the request working.
  }
}

async function saveLocalOrder(order) {
  const store = await readLocalStore();
  const id = store.nextId;
  const storedOrder = serializeOrder(order, id);

  store.nextId = id + 1;
  store.orders.unshift(storedOrder);
  await writeLocalStore(store);

  return storedOrder;
}

async function updateLocalOrder(orderId, updates) {
  const store = await readLocalStore();
  const order = store.orders.find((entry) => entry.id === orderId);

  if (!order) {
    return false;
  }

  Object.assign(order, updates);
  await writeLocalStore(store);

  return true;
}

function normalizeStore(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.orders)) {
    return { nextId: 1, orders: [] };
  }

  const nextId = Number.isInteger(value.nextId) && value.nextId > 0
    ? value.nextId
    : value.orders.reduce((max, order) => Math.max(max, Number(order.id || 0) + 1), 1);

  return { nextId, orders: value.orders };
}

function serializeOrder(order, id) {
  return {
    id,
    customerName: order.customerName,
    phone: order.phone,
    deliveryZoneId: order.deliveryZone.id,
    deliveryZoneName: order.deliveryZone.name,
    deliveryFee: order.deliveryZone.fee,
    street: order.street,
    addressNumber: order.addressNumber,
    complement: order.complement,
    deliveryDate: order.deliveryDate,
    deliveryTime: order.deliveryTime,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    notes: order.notes,
    subtotal: order.subtotal,
    total: order.total,
    status: "novo",
    createdAt: formatDateTime(new Date()),
    items: order.items.map((item) => ({
      productName: item.product.name,
      category: item.product.category,
      sizeLabel: item.size.label,
      flavor: item.flavor,
      quantity: item.quantity,
      unitPrice: item.size.price,
      lineTotal: item.lineTotal
    }))
  };
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

function buildOrder(payload) {
  if (!payload || typeof payload !== "object") {
    throwBadRequest("Pedido invalido.");
  }

  const customer = payload.customer || {};
  const delivery = payload.delivery || {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  const customerName = requiredText(customer.name, "Informe o nome.");
  const phone = requiredText(customer.phone, "Informe o telefone.");
  const street = requiredText(delivery.street, "Informe a rua.");
  const addressNumber = requiredText(delivery.number, "Informe o numero.");
  const deliveryZone = catalog.deliveryZones.find((zone) => zone.id === delivery.zoneId);
  const deliveryDate = requiredDate(delivery.date);
  const deliveryTime = requiredTime(delivery.time);
  validateBusinessHours(deliveryDate, deliveryTime);

  if (!deliveryZone) {
    throwBadRequest("Bairro de entrega invalido.");
  }

  if (rawItems.length === 0) {
    throwBadRequest("Adicione pelo menos um item ao pedido.");
  }

  const items = rawItems.map((rawItem) => normalizeItem(rawItem));
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const total = roundMoney(subtotal + deliveryZone.fee);

  return {
    customerName,
    phone,
    deliveryZone,
    street,
    addressNumber,
    complement: cleanOptional(delivery.complement),
    deliveryDate,
    deliveryTime,
    paymentMethod: requiredText(payload.paymentMethod, "Informe a forma de pagamento."),
    paymentStatus: "pendente",
    notes: cleanOptional(payload.notes),
    items,
    subtotal,
    total
  };
}

function normalizeItem(rawItem) {
  const product = catalog.products.find((entry) => entry.id === rawItem.productId);

  if (!product) {
    throwBadRequest("Produto invalido.");
  }

  const size = product.sizes.find((entry) => entry.id === rawItem.sizeId);

  if (!size) {
    throwBadRequest(`Tamanho invalido para ${product.name}.`);
  }

  const quantity = Number(rawItem.quantity);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throwBadRequest(`Quantidade invalida para ${product.name}.`);
  }

  const flavor = requiredText(rawItem.flavor, `Informe o sabor de ${product.name}.`);

  if (!product.flavors.includes(flavor)) {
    throwBadRequest(`Sabor invalido para ${product.name}.`);
  }

  return {
    product,
    size,
    flavor,
    quantity,
    lineTotal: roundMoney(size.price * quantity)
  };
}

function requiredText(value, message) {
  const text = cleanOptional(value);

  if (!text) {
    throwBadRequest(message);
  }

  return text;
}

function requiredDate(value) {
  const text = requiredText(value, "Informe a data do pedido.");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (!match) {
    throwBadRequest("Data do pedido invalida.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throwBadRequest("Data do pedido invalida.");
  }

  return text;
}

function requiredTime(value) {
  const text = requiredText(value, "Informe o horario do pedido.");

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) {
    throwBadRequest("Horario do pedido invalido.");
  }

  return text;
}

function validateBusinessHours(date, time) {
  const hours = businessHours[getWeekday(date)];

  if (!hours) {
    throwBadRequest("Atendemos de segunda a sexta das 10h as 19h e sabado das 10h as 17h.");
  }

  if (!isTimeBetween(time, hours.start, hours.end)) {
    throwBadRequest(`Para essa data, escolha um horario entre ${hours.start} e ${hours.end}.`);
  }
}

function getWeekday(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isTimeBetween(time, start, end) {
  const value = timeToMinutes(time);
  return value >= timeToMinutes(start) && value <= timeToMinutes(end);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function cleanOptional(value) {
  return typeof value === "string" ? value.trim() : "";
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatDateTime(date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function requireAdmin(req, res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD || "Admin2";
  const token = getAdminToken(req);

  if (token === configuredPassword) {
    next();
    return;
  }

  res.status(401).json({ ok: false, message: "Senha de admin invalida. Use Admin2 ou o valor de ADMIN_PASSWORD definido no Vercel." });
}

function getAdminToken(req) {
  const authorization = req.get("authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return "";
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => {
    console.log(`Cassia's Doces rodando na porta ${port}.`);
    console.log("Admin disponivel em /admin.");
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`A porta ${port} ja esta em uso. Feche o outro servidor ou use outra porta com PORT=3001 node server.js.`);
      process.exit(1);
    }

    throw error;
  });
}

module.exports = app;
