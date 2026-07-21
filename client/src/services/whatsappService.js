import API from '../api/axiosConfig';

// Read a File object as UTF-8 text (browser-side), so we can send exports as JSON.
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export const whatsappService = {
  // Upload one or more WhatsApp .txt exports (read client-side, sent as JSON).
  uploadChats: async (fileList) => {
    const files = await Promise.all(
      Array.from(fileList).map(async (f) => {
        if (f.content !== undefined) {
          return { filename: f.filename || f.name, content: f.content };
        }
        return {
          filename: f.name,
          content: await readFileAsText(f),
        };
      })
    );
    const response = await API.post('/api/ai/whatsapp/upload', { files });
    return response.data;
  },

  // Manually (re-)trigger the digest pipeline.
  triggerDigest: async () => {
    const response = await API.post('/api/ai/whatsapp/digest', {});
    return response.data;
  },

  // Fetch the most recent stored digest.
  getLatestDigest: async () => {
    const response = await API.get('/api/ai/whatsapp/digest/latest');
    return response.data;
  },

  // List stored conversations.
  getConversations: async (onlyUnprocessed = false) => {
    const response = await API.get('/api/ai/whatsapp/conversations', {
      params: { only_unprocessed: onlyUnprocessed },
    });
    return response.data;
  },

  // GET Google Drive Connection Status for current admin
  getDriveStatus: async () => {
    const response = await API.get('/api/ai/whatsapp/drive/status');
    return response.data;
  },

  // POST save Google Drive Config (code & folderId)
  saveDriveConfig: async (code, folderId) => {
    const response = await API.post('/api/ai/whatsapp/drive/config', { code, folderId });
    return response.data;
  },

  // POST disconnect Google Drive
  disconnectDrive: async () => {
    const response = await API.post('/api/ai/whatsapp/drive/disconnect');
    return response.data;
  },

  // GET files list from admin's Google Drive folder
  getDriveFiles: async () => {
    const response = await API.get('/api/ai/whatsapp/drive/files');
    return response.data;
  },

  // POST trigger manual sync of a specific file ID
  syncDriveFile: async (fileId) => {
    const response = await API.post('/api/ai/whatsapp/drive/sync-file', { fileId });
    return response.data;
  },
};
