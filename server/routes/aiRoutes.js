const router = require('express').Router();
const axios = require('axios');
const config = require('../config');

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
    
    const response = await axios.post(`${aiServiceUrl}/api/chat`, {
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
