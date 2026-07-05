// server/routes/whatsappRoutes.js
// Proxy routes for the WhatsApp digest pipeline (Phase A — read-only).
// Same pattern as aiRoutes.js: forward to the FastAPI agent service with a
// Bearer token. Files arrive as JSON (browser reads .txt text client-side), so
// no multipart handling is needed here.

const router = require('express').Router();
const axios = require('axios');
const https = require('https');
const config = require('../config');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
  freeSocketTimeout: 30000,
});

const aiClient = axios.create({ httpsAgent });

function authHeaders() {
  const headers = {};
  if (config.AI_SERVICE_TOKEN) {
    headers['Authorization'] = `Bearer ${config.AI_SERVICE_TOKEN}`;
  }
  return headers;
}

// POST /api/ai/whatsapp/upload — { files: [{ filename, content }] }
router.post('/upload', async (req, res) => {
  try {
    const url = `${config.AI_SERVICE_URL}/api/whatsapp/upload`;
    console.log(`[WhatsApp Proxy] Relaying upload to: ${url}`);
    const response = await aiClient.post(url, req.body, { headers: authHeaders() });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    console.error('[WhatsApp Proxy Error] upload:', error.response?.data || error.message);
    res.status(status).json(
      error.response?.data || { error: 'AI service is currently offline or unreachable.' }
    );
  }
});

// POST /api/ai/whatsapp/digest — manually (re-)trigger the digest
router.post('/digest', async (req, res) => {
  try {
    const url = `${config.AI_SERVICE_URL}/api/whatsapp/digest`;
    const response = await aiClient.post(url, req.body || {}, { headers: authHeaders() });
    res.json(response.data);
  } catch (error) {
    console.error('[WhatsApp Proxy Error] digest:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'AI service is currently offline or unreachable.' }
    );
  }
});

// GET /api/ai/whatsapp/digest/latest
router.get('/digest/latest', async (req, res) => {
  try {
    const url = `${config.AI_SERVICE_URL}/api/whatsapp/digest/latest`;
    const response = await aiClient.get(url, { headers: authHeaders() });
    res.json(response.data);
  } catch (error) {
    console.error('[WhatsApp Proxy Error] digest/latest:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'AI service is currently offline or unreachable.' }
    );
  }
});

// GET /api/ai/whatsapp/conversations?only_unprocessed=true
router.get('/conversations', async (req, res) => {
  try {
    const url = `${config.AI_SERVICE_URL}/api/whatsapp/conversations`;
    const response = await aiClient.get(url, { headers: authHeaders(), params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('[WhatsApp Proxy Error] conversations:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'AI service is currently offline or unreachable.' }
    );
  }
});

module.exports = router;
