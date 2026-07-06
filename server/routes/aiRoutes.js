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

// Verification webhook for Meta WhatsApp API
router.get('/whatsapp/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'citycycling_token';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verification successful.');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  
  res.status(200).json({ status: 'active', message: 'WhatsApp Webhook Endpoint' });
});

// Incoming message webhook handler (Meta & Twilio compatible)
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    let messageText = '';
    let fromNumber = '';
    let isTwilio = false;
    
    // 1. Detect Twilio Webhook (URL-encoded POST request)
    if (req.body.Body && req.body.From) {
      isTwilio = true;
      messageText = req.body.Body;
      // Strip 'whatsapp:' prefix if present
      fromNumber = req.body.From.replace('whatsapp:', '').trim();
      console.log(`[WhatsApp Webhook] Twilio incoming from ${fromNumber}: ${messageText}`);
    } 
    // 2. Detect Meta WhatsApp Cloud API Webhook
    else if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = req.body.entry[0].changes[0].value.messages[0];
      if (message.type === 'text') {
        messageText = message.text.body;
      } else {
        messageText = `[Non-text message type: ${message.type}]`;
      }
      fromNumber = message.from;
      console.log(`[WhatsApp Webhook] Meta incoming from ${fromNumber}: ${messageText}`);
    }
    
    if (!messageText || !fromNumber) {
      console.log('[WhatsApp Webhook] Ignoring empty or unsupported message payload');
      return res.status(200).json({ status: 'ignored', reason: 'No message content or sender number detected.' });
    }
    
    // Use the sender's phone number as the thread ID to keep conversational memory persistent
    const threadId = `whatsapp_${fromNumber}`;
    const aiServiceUrl = config.AI_SERVICE_URL;
    
    const headers = {};
    if (config.AI_SERVICE_TOKEN) {
      headers['Authorization'] = `Bearer ${config.AI_SERVICE_TOKEN}`;
    }
    
    console.log(`[WhatsApp Webhook] Routing to AI Service for thread: ${threadId}`);
    const response = await aiClient.post(`${aiServiceUrl}/api/chat`, {
      message: messageText,
      thread_id: threadId
    }, { headers });
    
    const chatbotResponse = response.data.response || 'I am sorry, I could not process your request at this time.';
    
    // 3. Respond back
    if (isTwilio) {
      // Send TwiML response back to Twilio
      res.type('text/xml');
      return res.send(`
        <Response>
          <Message>${chatbotResponse}</Message>
        </Response>
      `.trim());
    } else {
      // For Meta, we log the generated response.
      console.log(`[WhatsApp Webhook] Meta Chatbot response generated: ${chatbotResponse}`);
      
      // If Meta Cloud API token is configured, try to send message back
      const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (metaToken && phoneId) {
        try {
          await axios.post(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            messaging_product: 'whatsapp',
            to: fromNumber,
            type: 'text',
            text: { body: chatbotResponse }
          }, {
            headers: { Authorization: `Bearer ${metaToken}` }
          });
          console.log('[WhatsApp Webhook] Successfully sent message via Meta API');
        } catch (metaErr) {
          console.error('[WhatsApp Webhook Error] Failed to send Meta Cloud message:', metaErr.response?.data || metaErr.message);
        }
      }
      
      return res.status(200).json({ status: 'success', response: chatbotResponse });
    }
  } catch (error) {
    console.error('[WhatsApp Webhook Error] Error processing incoming WhatsApp event:', error.message);
    // Return 200 to webhook provider to prevent retry loops on failure
    return res.status(200).json({ error: 'Failed to process WhatsApp event internally.' });
  }
});

module.exports = router;
