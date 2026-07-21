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

const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const googleDriveService = require('../services/googleDriveService');

// GET /api/ai/whatsapp/drive/status - check status
router.get('/drive/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      isConnected: user.googleDriveConfig?.isConnected || false,
      driveFolderId: user.googleDriveConfig?.driveFolderId || '',
      processedFilesCount: user.googleDriveConfig?.processedFiles?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/whatsapp/drive/config - exchange code & save config
router.post('/drive/config', protect, async (req, res) => {
  const { code, folderId } = req.body;
  if (!code || !folderId) {
    return res.status(400).json({ error: 'Authorization code and Folder ID are required.' });
  }

  try {
    const tokens = await googleDriveService.getTokensFromCode(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Google did not return a refresh token. Please revoke access in your Google Account settings and try again to grant offline permissions.' 
      });
    }

    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          'googleDriveConfig.isConnected': true,
          'googleDriveConfig.driveFolderId': folderId,
          'googleDriveConfig.refreshToken': refreshToken
        }
      }
    );

    res.json({ success: true, message: 'Google Drive connected successfully!' });
  } catch (error) {
    console.error('[Google Drive Config Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to authorize Google Drive.' });
  }
});

// POST /api/ai/whatsapp/drive/disconnect - disconnect Google Drive
router.post('/drive/disconnect', protect, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          'googleDriveConfig.isConnected': false,
          'googleDriveConfig.driveFolderId': '',
          'googleDriveConfig.refreshToken': ''
        }
      }
    );
    res.json({ success: true, message: 'Google Drive disconnected.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/whatsapp/drive/files - list files in folder
router.get('/drive/files', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.googleDriveConfig?.isConnected) {
      return res.status(400).json({ error: 'Google Drive is not connected for this user.' });
    }

    const { driveFolderId, refreshToken } = user.googleDriveConfig;
    const oauthClient = googleDriveService.getOAuthClient(refreshToken);
    const files = await googleDriveService.listFiles(oauthClient, driveFolderId);

    const processedIds = new Set(user.googleDriveConfig.processedFiles.map(f => f.fileId));
    const filesWithStatus = files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      isProcessed: processedIds.has(file.id)
    }));

    res.json({ files: filesWithStatus });
  } catch (error) {
    console.error('[Google Drive Files Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch files from Google Drive.' });
  }
});

// POST /api/ai/whatsapp/drive/sync-file - trigger manual sync/import of a specific file
router.post('/drive/sync-file', protect, async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.googleDriveConfig?.isConnected) {
      return res.status(400).json({ error: 'Google Drive is not connected.' });
    }

    const { driveFolderId, refreshToken } = user.googleDriveConfig;
    const oauthClient = googleDriveService.getOAuthClient(refreshToken);
    
    const driveFiles = await googleDriveService.listFiles(oauthClient, driveFolderId);
    const targetFile = driveFiles.find(f => f.id === fileId);

    if (!targetFile) {
      return res.status(404).json({ error: 'File not found in the connected Google Drive folder.' });
    }

    const JSZip = require('jszip');
    const fileBuffer = await googleDriveService.downloadFile(oauthClient, fileId);
    let payloadFiles = [];

    if (targetFile.mimeType === 'application/zip') {
      const zip = await JSZip.loadAsync(fileBuffer);
      for (const [filename, fileObj] of Object.entries(zip.files)) {
        if (!fileObj.dir && filename.toLowerCase().endsWith('.txt')) {
          const content = await fileObj.async('text');
          payloadFiles.push({ filename: filename, content });
        }
      }
    } else {
      const content = fileBuffer.toString('utf8');
      payloadFiles.push({ filename: targetFile.name, content });
    }

    if (payloadFiles.length === 0) {
      return res.status(400).json({ error: 'No valid text logs found in the selected file.' });
    }

    const response = await aiClient.post(
      `${config.AI_SERVICE_URL}/api/whatsapp/upload`,
      { files: payloadFiles },
      { headers: authHeaders() }
    );

    await User.updateOne(
      { _id: user._id },
      {
        $addToSet: {
          'googleDriveConfig.processedFiles': {
            fileId,
            fileName: targetFile.name,
            processedAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      files_processed: 1,
      total_new_messages: response.data.total_new_messages || 0,
      duplicates_skipped: response.data.duplicates_skipped || 0,
      conversations_updated: response.data.conversations_updated || []
    });

  } catch (error) {
    console.error('[Manual Sync Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to sync selected file.' });
  }
});

module.exports = router;
