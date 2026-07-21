const functions = require('firebase-functions');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const express = require('express');
const cors = require('cors');

initializeApp();
const db = getFirestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// ─── API Key Middleware ────────────────────────────────────────────────────────
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header. Add it like: x-api-key: sk_live_...' });
  }

  try {
    const snapshot = await db.collection('api_keys')
      .where('key', '==', apiKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ success: false, error: 'Invalid API key.' });
    }

    const keyDoc = snapshot.docs[0];
    const keyData = keyDoc.data();

    if (keyData.status !== 'active') {
      return res.status(401).json({ success: false, error: 'This API key has been revoked or is inactive.' });
    }

    // Log usage
    await keyDoc.ref.update({
      lastUsed: FieldValue.serverTimestamp(),
      usageCount: FieldValue.increment(1)
    }).catch(() => {});

    req.tenantId = keyData.tenantId;
    req.keyScope = keyData.scope || 'read'; // 'read' | 'read_write'
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
  }
};

// ─── Write Permission Guard ───────────────────────────────────────────────────
const requireWriteAccess = (req, res, next) => {
  if (req.keyScope !== 'read_write') {
    return res.status(403).json({
      success: false,
      error: 'This API key only has read access. Generate a read-write key in your ERP settings to create or update records.'
    });
  }
  next();
};

// Apply auth to all /v1 routes
app.use('/v1', authenticateApiKey);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toISO = (ts) => ts?.toDate ? ts.toDate().toISOString() : (ts || null);

const formatDoc = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  };
};

const fetchCollection = async (tenantId, collectionName, res, query = {}) => {
  try {
    let ref = db.collection(`organizations/${tenantId}/${collectionName}`);
    // Basic filtering support via query params
    const limit = Math.min(parseInt(query.limit) || 100, 500);
    try { ref = ref.orderBy('createdAt', 'desc'); } catch {}
    ref = ref.limit(limit);

    const snapshot = await ref.get();
    const items = snapshot.docs.map(formatDoc);
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) {
    console.error(`Error fetching ${collectionName}:`, err);
    res.status(500).json({ success: false, error: `Failed to fetch ${collectionName}.` });
  }
};

const fetchDocument = async (tenantId, collectionName, docId, res) => {
  try {
    const docRef = await db.collection(`organizations/${tenantId}/${collectionName}`).doc(docId).get();
    if (!docRef.exists) return res.status(404).json({ success: false, error: 'Record not found.' });
    res.status(200).json({ success: true, data: formatDoc(docRef) });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to fetch record.` });
  }
};

const createDocument = async (tenantId, collectionName, body, requiredFields, res) => {
  // Validate required fields
  const missing = requiredFields.filter(f => !body[f]);
  if (missing.length > 0) {
    return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
  }
  try {
    const docRef = await db.collection(`organizations/${tenantId}/${collectionName}`).add({
      ...body,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: 'api'
    });
    res.status(201).json({ success: true, id: docRef.id, message: `${collectionName} record created.` });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to create record.` });
  }
};

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/v1/health', async (req, res) => {
  try {
    const configDoc = await db.doc(`organizations/${req.tenantId}/config/settings`).get();
    const config = configDoc.data() || {};
    res.status(200).json({
      success: true,
      message: 'API is healthy. Your key is valid.',
      tenant: {
        id: req.tenantId,
        companyName: config.companyName || 'Unknown',
        industry: config.industry || 'retail',
      },
      keyScope: req.keyScope,
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(200).json({ success: true, message: 'API is healthy.', tenant: { id: req.tenantId } });
  }
});

// ─── Customers / Clients ─────────────────────────────────────────────────────
app.get('/v1/customers', (req, res) => fetchCollection(req.tenantId, 'customers', res, req.query));
app.get('/v1/customers/:id', (req, res) => fetchDocument(req.tenantId, 'customers', req.params.id, res));
app.post('/v1/customers', requireWriteAccess, (req, res) =>
  createDocument(req.tenantId, 'customers', req.body, ['name', 'email'], res));

// ─── Invoices ─────────────────────────────────────────────────────────────────
app.get('/v1/invoices', (req, res) => fetchCollection(req.tenantId, 'invoices', res, req.query));
app.get('/v1/invoices/:id', (req, res) => fetchDocument(req.tenantId, 'invoices', req.params.id, res));
app.post('/v1/invoices', requireWriteAccess, (req, res) =>
  createDocument(req.tenantId, 'invoices', req.body, ['customerName', 'totalAmount', 'status'], res));

// ─── Projects / Cases ─────────────────────────────────────────────────────────
app.get('/v1/projects', (req, res) => fetchCollection(req.tenantId, 'projects', res, req.query));
app.get('/v1/projects/:id', (req, res) => fetchDocument(req.tenantId, 'projects', req.params.id, res));
app.post('/v1/projects', requireWriteAccess, (req, res) =>
  createDocument(req.tenantId, 'projects', req.body, ['name', 'status'], res));

// ─── Employees / Staff ───────────────────────────────────────────────────────
app.get('/v1/employees', (req, res) => fetchCollection(req.tenantId, 'employees', res, req.query));
app.get('/v1/employees/:id', (req, res) => fetchDocument(req.tenantId, 'employees', req.params.id, res));

// ─── Expenses ────────────────────────────────────────────────────────────────
app.get('/v1/expenses', (req, res) => fetchCollection(req.tenantId, 'expenses', res, req.query));
app.get('/v1/expenses/:id', (req, res) => fetchDocument(req.tenantId, 'expenses', req.params.id, res));
app.post('/v1/expenses', requireWriteAccess, (req, res) =>
  createDocument(req.tenantId, 'expenses', req.body, ['description', 'amount', 'category'], res));

// ─── Inventory / Products ─────────────────────────────────────────────────────
app.get('/v1/inventory', (req, res) => fetchCollection(req.tenantId, 'inventory', res, req.query));
app.get('/v1/inventory/:id', (req, res) => fetchDocument(req.tenantId, 'inventory', req.params.id, res));
app.post('/v1/inventory', requireWriteAccess, (req, res) =>
  createDocument(req.tenantId, 'inventory', req.body, ['name', 'price'], res));

// ─── Sales (POS) ─────────────────────────────────────────────────────────────
app.get('/v1/sales', (req, res) => fetchCollection(req.tenantId, 'sales', res, req.query));
app.get('/v1/sales/:id', (req, res) => fetchDocument(req.tenantId, 'sales', req.params.id, res));

// ─── B2B Orders ──────────────────────────────────────────────────────────────
app.get('/v1/b2b-orders', (req, res) => fetchCollection(req.tenantId, 'b2bOrders', res, req.query));
app.get('/v1/b2b-orders/:id', (req, res) => fetchDocument(req.tenantId, 'b2bOrders', req.params.id, res));

// ─── Contracts ───────────────────────────────────────────────────────────────
app.get('/v1/contracts', (req, res) => fetchCollection(req.tenantId, 'contracts', res, req.query));
app.get('/v1/contracts/:id', (req, res) => fetchDocument(req.tenantId, 'contracts', req.params.id, res));
app.post('/v1/contracts', requireWriteAccess, (req, res) =>
  createDocument(req.tenantId, 'contracts', req.body, ['customerName', 'serviceName', 'amount', 'status'], res));

// ─── Documents metadata ───────────────────────────────────────────────────────
app.get('/v1/documents', (req, res) => fetchCollection(req.tenantId, 'documents', res, req.query));

// ─── Deals (CRM) ─────────────────────────────────────────────────────────────
app.get('/v1/deals', (req, res) => fetchCollection(req.tenantId, 'deals', res, req.query));
app.get('/v1/deals/:id', (req, res) => fetchDocument(req.tenantId, 'deals', req.params.id, res));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.path}` });
});

exports.api = functions.https.onRequest(app);

// ─── Webhook Dispatcher ──────────────────────────────────────────────────────
const SUPPORTED_COLLECTIONS = ['customers', 'invoices', 'projects', 'employees'];

exports.webhookDispatcher = onDocumentWritten('organizations/{tenantId}/{collectionId}/{docId}', async (event) => {
  const { tenantId, collectionId, docId } = event.params;
  
  // Only process supported collections to save invocations
  if (!SUPPORTED_COLLECTIONS.includes(collectionId)) return;

  const beforeData = event.data.before.exists ? event.data.before.data() : null;
  const afterData = event.data.after.exists ? event.data.after.data() : null;

  let eventType = '';
  if (!beforeData && afterData) eventType = `${collectionId}.created`;
  else if (beforeData && !afterData) eventType = `${collectionId}.deleted`;
  else if (beforeData && afterData) eventType = `${collectionId}.updated`;

  if (!eventType) return;

  // Fetch all active webhooks for this tenant and this event
  const webhooksSnapshot = await db.collection('webhooks')
    .where('tenantId', '==', tenantId)
    .where('event', '==', eventType)
    .where('isActive', '==', true)
    .get();

  if (webhooksSnapshot.empty) return; // No webhooks listening to this

  const payload = {
    event: eventType,
    tenantId,
    timestamp: new Date().toISOString(),
    data: {
      id: docId,
      ...afterData || beforeData
    }
  };

  const promises = [];
  webhooksSnapshot.forEach((docSnap) => {
    const webhook = docSnap.data();
    const url = webhook.targetUrl;
    
    // Dispatch via fetch
    const p = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Recloud-ERP-Webhook/1.0' },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      // Update lastTriggered timestamp
      await docSnap.ref.update({ lastTriggered: FieldValue.serverTimestamp() });
      console.log(`Webhook fired successfully: ${url} for ${eventType}`);
    }).catch(err => {
      console.error(`Webhook failed: ${url}`, err);
    });
    
    promises.push(p);
  });

  await Promise.all(promises);
});
