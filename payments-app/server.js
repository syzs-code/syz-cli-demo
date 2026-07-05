'use strict';

/*
 * payments-app — the System Under Test for the SYZYGY CLI demo.
 *
 * A deliberately tiny, in-memory HTTP payments service. Every capability is
 * exposed over HTTP so the SYZ HTTP executor can drive it. No database, no
 * external services — start it, point `syz run` at it, tear it down.
 *
 * The authoritative description of this surface lives in ./api-spec/openapi.yaml
 * and ./api-spec/payments.postman_collection.json — this file implements them.
 *
 * Config (env):
 *   PORT            listen port                 (default 3000)
 *   PAYMENTS_TOKEN  bearer token for /refunds   (default "demo-secret-token")
 *   SETTLE_DELAY_MS async settle → settled lag  (default 3500)
 */

const express = require('express');

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.PAYMENTS_TOKEN || 'demo-secret-token';
const SETTLE_DELAY_MS = Number(process.env.SETTLE_DELAY_MS || 3500);

const CURRENCIES = ['USD', 'EUR', 'GBP'];
const AMOUNT_MIN = 1;
const AMOUNT_MAX = 1_000_000;

const app = express();
app.use(express.json());

// ── In-memory state ──────────────────────────────────────────────────────────
/** @type {Map<string, object>} */
const orders = new Map();
let orderSeq = 1000;
let refundSeq = 5000;

function nextOrderId() {
  orderSeq += 1;
  return `ord_${orderSeq}`;
}
function nextRefundId() {
  refundSeq += 1;
  return `rfnd_${refundSeq}`;
}

// ── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ── POST /orders — create an order ───────────────────────────────────────────
app.post('/orders', (req, res) => {
  const { amount, currency, userId } = req.body || {};

  if (!Number.isInteger(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    return res
      .status(400)
      .json({ error: `amount must be an integer between ${AMOUNT_MIN} and ${AMOUNT_MAX}` });
  }
  if (typeof currency !== 'string' || !CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: `currency must be one of ${CURRENCIES.join(', ')}` });
  }
  if (typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({ error: 'userId is required' });
  }

  const order = {
    orderId: nextOrderId(),
    amount,
    currency,
    userId,
    status: 'created',
    createdAt: new Date().toISOString(),
  };
  orders.set(order.orderId, order);

  // A session cookie so the demo can show header assertions + Set-Cookie masking.
  res.setHeader('Set-Cookie', `session=sess_${order.orderId}; Path=/; HttpOnly`);
  res.status(201).json(order);
});

// ── GET /orders — list, with optional status + repeated ids filters ──────────
app.get('/orders', (req, res) => {
  const { status } = req.query;
  let ids = req.query.ids;
  if (ids !== undefined && !Array.isArray(ids)) ids = [ids];

  let result = [...orders.values()];
  if (typeof status === 'string') result = result.filter((o) => o.status === status);
  if (Array.isArray(ids)) result = result.filter((o) => ids.includes(o.orderId));

  res.status(200).json({ orders: result, count: result.length });
});

// ── GET /orders/:id — fetch one ──────────────────────────────────────────────
app.get('/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: `order ${req.params.id} not found` });
  res.status(200).json({ order });
});

// ── POST /orders/:id/settle — kick off async settlement ──────────────────────
// Returns immediately with status "settling"; flips to "settled" after a delay.
// This models eventual consistency — the target of a SYZ `poll:` workflow.
app.post('/orders/:id/settle', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: `order ${req.params.id} not found` });

  if (order.status === 'created') {
    order.status = 'settling';
    setTimeout(() => {
      const o = orders.get(order.orderId);
      if (o && o.status === 'settling') o.status = 'settled';
    }, SETTLE_DELAY_MS);
  }
  res.status(202).json({ orderId: order.orderId, status: order.status });
});

// ── GET /orders/:id/status — the poll target ─────────────────────────────────
app.get('/orders/:id/status', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: `order ${req.params.id} not found` });
  res.status(200).json({ orderId: order.orderId, status: order.status });
});

// ── POST /refunds — protected by a bearer token ──────────────────────────────
app.post('/refunds', (req, res) => {
  const auth = req.get('authorization') || '';
  const presented = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (presented !== TOKEN) {
    return res.status(401).json({ error: 'missing or invalid bearer token' });
  }

  const { orderId, amount } = req.body || {};
  if (typeof orderId !== 'string' || orderId.trim() === '') {
    return res.status(400).json({ error: 'orderId is required' });
  }
  if (!Number.isInteger(amount) || amount < AMOUNT_MIN) {
    return res.status(400).json({ error: 'amount must be a positive integer' });
  }

  res.status(201).json({
    refundId: nextRefundId(),
    orderId,
    amount,
    status: 'refunded',
  });
});

// ── POST /notifications — a second integration for the cross-service demo ────
// Simulates a notification service so the workspace DOMAIN spans > 1 integration.
app.post('/notifications', (req, res) => {
  const { orderId, channel } = req.body || {};
  if (typeof orderId !== 'string' || orderId.trim() === '') {
    return res.status(400).json({ error: 'orderId is required' });
  }
  if (channel !== 'email' && channel !== 'sms') {
    return res.status(400).json({ error: 'channel must be email or sms' });
  }
  res.status(201).json({
    notificationId: `ntf_${Date.now()}`,
    orderId,
    channel,
    status: 'sent',
  });
});

// ── Fallback ─────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `no route for ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`payments-app listening on http://127.0.0.1:${PORT}  (settle lag ${SETTLE_DELAY_MS}ms)`);
});
