const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Creates and returns an OAuth2Client configured with client credentials.
 * If a refresh token is provided, sets the credentials.
 */
function getOAuthClient(refreshToken = null) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Google Client ID and Secret must be configured in environment variables.');
  }
  // 'postmessage' is required when exchanging authorization codes generated from popup flows
  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, 'postmessage');
  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken });
  }
  return client;
}

/**
 * Exchanges a frontend authorization code for access and refresh tokens.
 */
async function getTokensFromCode(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Lists text and zip files inside a specific Google Drive folder.
 */
async function listFiles(client, folderId) {
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/zip' or mimeType = 'text/plain')`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&orderBy=name`;
  
  const response = await client.request({ url });
  return response.data.files || [];
}

/**
 * Downloads a file's content from Google Drive.
 * Returns response as arraybuffer.
 */
async function downloadFile(client, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await client.request({
    url,
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

/**
 * Deletes a file from Google Drive.
 */
async function deleteFile(client, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  await client.request({
    url,
    method: 'DELETE'
  });
  return true;
}

module.exports = {
  getOAuthClient,
  getTokensFromCode,
  listFiles,
  downloadFile,
  deleteFile
};
