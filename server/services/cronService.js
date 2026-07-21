const cron = require('node-cron');
const JSZip = require('jszip');
const axios = require('axios');
const https = require('https');
const User = require('../models/User');
const googleDriveService = require('./googleDriveService');
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

// Function to process and import files from an admin's Google Drive
async function syncAdminGoogleDrive(user) {
  const { driveFolderId, refreshToken } = user.googleDriveConfig;
  if (!driveFolderId || !refreshToken) return null;

  try {
    const oauthClient = googleDriveService.getOAuthClient(refreshToken);
    const driveFiles = await googleDriveService.listFiles(oauthClient, driveFolderId);

    // Find files that are not already processed
    const processedIds = new Set(user.googleDriveConfig.processedFiles.map(f => f.fileId));
    const newFiles = driveFiles.filter(f => !processedIds.has(f.id));

    if (newFiles.length === 0) {
      return { filesProcessed: 0, totalNewMessages: 0, errors: [] };
    }

    let totalNewMessages = 0;
    const errors = [];
    const newlyProcessed = [];

    for (const file of newFiles) {
      try {
        const fileBuffer = await googleDriveService.downloadFile(oauthClient, file.id);
        let payloadFiles = [];

        if (file.mimeType === 'application/zip') {
          const zip = await JSZip.loadAsync(fileBuffer);
          for (const [filename, fileObj] of Object.entries(zip.files)) {
            if (!fileObj.dir && filename.toLowerCase().endsWith('.txt')) {
              const content = await fileObj.async('text');
              payloadFiles.push({ filename: filename, content });
            }
          }
        } else {
          const content = fileBuffer.toString('utf8');
          payloadFiles.push({ filename: file.name, content });
        }

        if (payloadFiles.length > 0) {
          // Send to the AI service proxy
          const url = `${config.AI_SERVICE_URL}/api/whatsapp/upload`;
          const response = await aiClient.post(url, { files: payloadFiles }, { headers: authHeaders() });
          
          totalNewMessages += response.data.total_new_messages || 0;
        }

        newlyProcessed.push({
          fileId: file.id,
          fileName: file.name,
          processedAt: new Date()
        });

      } catch (fileErr) {
        console.error(`Error processing file ${file.name} (ID: ${file.id}) for user ${user.email}:`, fileErr);
        errors.push(`File ${file.name}: ${fileErr.message}`);
      }
    }

    if (newlyProcessed.length > 0) {
      // Save newly processed files to User record
      await User.updateOne(
        { _id: user._id },
        { $push: { 'googleDriveConfig.processedFiles': { $each: newlyProcessed } } }
      );
    }

    return {
      filesProcessed: newlyProcessed.length,
      totalNewMessages,
      errors
    };

  } catch (err) {
    console.error(`Sync failed for user ${user.email}:`, err);
    throw err;
  }
}

// Global sync function for all connected admins
async function syncAllConnectedAdmins() {
  console.log(`[Google Drive Scheduler] Starting global sync...`);
  const connectedUsers = await User.find({ 'googleDriveConfig.isConnected': true });
  console.log(`[Google Drive Scheduler] Found ${connectedUsers.length} connected admin(s).`);
  
  for (const user of connectedUsers) {
    try {
      console.log(`[Google Drive Scheduler] Syncing for ${user.email}...`);
      const res = await syncAdminGoogleDrive(user);
      if (res) {
        console.log(`[Google Drive Scheduler] Sync completed for ${user.email}: Processed ${res.filesProcessed} file(s), ${res.totalNewMessages} new message(s).`);
      }
    } catch (err) {
      console.error(`[Google Drive Scheduler] Sync failed for ${user.email}:`, err);
    }
  }
}

// Weekly cleanup function to delete processed files older than 7 days from Google Drive
async function runWeeklyCleanup() {
  console.log(`[Google Drive Scheduler] Starting weekly cleanup...`);
  const connectedUsers = await User.find({ 'googleDriveConfig.isConnected': true });
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const user of connectedUsers) {
    const { refreshToken } = user.googleDriveConfig;
    if (!refreshToken) continue;

    try {
      const oauthClient = googleDriveService.getOAuthClient(refreshToken);
      const filesToDelete = user.googleDriveConfig.processedFiles.filter(
        f => f.processedAt < sevenDaysAgo
      );

      if (filesToDelete.length === 0) continue;

      console.log(`[Google Drive Scheduler] Found ${filesToDelete.length} file(s) to cleanup for ${user.email}`);

      const deletedIds = [];

      for (const file of filesToDelete) {
        try {
          await googleDriveService.deleteFile(oauthClient, file.fileId);
          deletedIds.push(file.fileId);
          console.log(`[Google Drive Scheduler] Successfully deleted file ${file.fileName} from Google Drive.`);
        } catch (delErr) {
          console.error(`[Google Drive Scheduler] Failed to delete file ${file.fileName} from Drive:`, delErr);
        }
      }

      if (deletedIds.length > 0) {
        // Filter user's processedFiles array to remove deleted files
        await User.updateOne(
          { _id: user._id },
          { $pull: { 'googleDriveConfig.processedFiles': { fileId: { $in: deletedIds } } } }
        );
      }

    } catch (err) {
      console.error(`[Google Drive Scheduler] Cleanup failed for ${user.email}:`, err);
    }
  }
}

// Start scheduling
function initScheduler() {
  // Sync at 06:00, 12:00, 18:00, and 21:00 IST every day
  cron.schedule('0 6,12,18,21 * * *', syncAllConnectedAdmins, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // Cleanup every Sunday at 00:00 IST
  cron.schedule('0 0 * * 0', runWeeklyCleanup, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log(`[Google Drive Scheduler] Initialized cron schedules (6AM, 12PM, 6PM, 9PM IST & Weekly Sunday Cleanup).`);
}

module.exports = {
  initScheduler,
  syncAdminGoogleDrive,
  syncAllConnectedAdmins,
  runWeeklyCleanup
};
