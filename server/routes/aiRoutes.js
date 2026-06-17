const router = require('express').Router();
const axios = require('axios');
const https = require('https');
const config = require('../config');

// Create a pooled HTTPS agent with Keep-Alive enabled to eliminate TLS handshake overheads
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,          // Cap maximum connections to prevent leaks
  freeSocketTimeout: 30000 // Close idle sockets after 30s to stay synchronized with Hugging Face/Cloudflare timeouts
});

const aiClient = axios.create({
  httpsAgent
});

// Proxy endpoint to send user queries to the FastAPI backend service
router.post('/chat', async (req, res) => {
  try {
    const { message, thread_id } = req.body;
    
    const aiServiceUrl = config.AI_SERVICE_URL;
    console.log(`[AI Proxy] Relaying chat request to: ${aiServiceUrl}/api/chat`);
    
    const headers = {};
    if (config.AI_SERVICE_TOKEN) {
      headers['Authorization'] = `Bearer ${config.AI_SERVICE_TOKEN}`;
    }
    
    const response = await aiClient.post(`${aiServiceUrl}/api/chat`, {
      message,
      thread_id
    }, { headers });

    
    res.json(response.data);
  } catch (error) {
    console.error('[AI Proxy Error] Error proxying chat to AI service:', error.message);
    res.status(500).json({ error: 'AI service is currently offline or unreachable.' });
  }
});

module.exports = router;
