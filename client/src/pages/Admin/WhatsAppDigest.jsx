import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Upload, RefreshCw, Sparkles, Star, ListChecks,
  AlertCircle, Send, Loader2, CheckCircle2, FileText, Database,
  Search, X, ChevronRight, User, Download, ExternalLink, Lock
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import JSZip from 'jszip';
import { whatsappService } from '../../services/whatsappService';

const INTENT_STYLE = {
  order_inquiry: 'bg-blue-100 text-blue-700',
  pricing_question: 'bg-cyan-100 text-cyan-700',
  feedback: 'bg-green-100 text-green-700',
  complaint: 'bg-red-100 text-red-700',
  general_chat: 'bg-gray-100 text-gray-600',
};

const PRIORITY_STYLE = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-gray-50 border-gray-200 text-gray-600',
};

const waLink = (phone, msg) =>
  `https://wa.me/${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg || '')}`;

const WhatsAppDigest = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState(null);
  
  // Google Drive & JSZip states
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [driveFolderId, setDriveFolderId] = useState(() => localStorage.getItem('cc_whatsapp_drive_folder_id') || '');
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [syncingFileId, setSyncingFileId] = useState(null);
  
  // Conversations list & interactive chat view states
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const pollRef = useRef(null);

  const loadDigest = useCallback(async () => {
    try {
      const data = await whatsappService.getLatestDigest();
      setDigest(data?.digest || null);
      return data?.digest || null;
    } catch {
      setError('Could not reach the AI service.');
      return null;
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await whatsappService.getConversations();
      setConversations(data?.conversations || []);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, []);

  useEffect(() => {
    loadDigest();
    loadConversations();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [loadDigest, loadConversations]);

  // Poll for a digest newer than `prevGeneratedAt` (background job just kicked off).
  const pollForNewDigest = (prevGeneratedAt) => {
    setAnalyzing(true);
    let attempts = 0;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      attempts += 1;
      const d = await loadDigest();
      await loadConversations();
      const isNew = d && d.generated_at && d.generated_at !== prevGeneratedAt;
      if (isNew || attempts >= 10) {
        clearInterval(pollRef.current);
        setAnalyzing(false);
      }
    }, 4000);
  };

  // Helper to decompress client-side using JSZip
  const handleZipFile = async (file) => {
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(file);
    const textFiles = [];
    for (const [filename, fileObj] of Object.entries(zip.files)) {
      if (!fileObj.dir && filename.toLowerCase().endsWith('.txt')) {
        const content = await fileObj.async('text');
        textFiles.push({ name: filename, content });
      }
    }
    return textFiles;
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    const prevGeneratedAt = digest?.generated_at || null;
    try {
      // Unpack any zip files client-side before sending
      const processedFilesList = [];
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const unzipped = await handleZipFile(file);
          processedFilesList.push(...unzipped);
        } else {
          processedFilesList.push(file);
        }
      }

      if (processedFilesList.length === 0) {
        throw new Error('No valid text files found inside the uploaded archives.');
      }

      const result = await whatsappService.uploadChats(processedFilesList);
      setUploadResult(result);
      setFiles([]);
      pollForNewDigest(prevGeneratedAt); // digest runs in the background
    } catch (e) {
      setError(e?.response?.data?.detail?.message || e?.response?.data?.error || e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Google Drive Authorization Handler
  const connectGoogleDrive = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleAccessToken(tokenResponse.access_token);
      if (driveFolderId) {
        fetchDriveFiles(tokenResponse.access_token, driveFolderId);
      }
    },
    scope: 'https://www.googleapis.com/auth/drive',
    onError: () => setError('Google Drive authorization failed.'),
  });

  const handleFolderIdChange = (e) => {
    const val = e.target.value.trim();
    setDriveFolderId(val);
    localStorage.setItem('cc_whatsapp_drive_folder_id', val);
  };

  const fetchDriveFiles = async (token, folderId) => {
    if (!folderId) return;
    setLoadingFiles(true);
    setError(null);
    try {
      // Query zip and text files inside the configured folder
      const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/zip' or mimeType = 'text/plain')`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&orderBy=name`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setGoogleAccessToken(null);
        }
        let errMsg = 'Could not fetch files. Check if Folder ID is correct and shared.';
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errMsg = `${errMsg} (Drive API: ${errData.error.message})`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      setDriveFiles(data.files || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleImportDriveFile = async (file) => {
    setSyncingFileId(file.id);
    setError(null);
    setUploadResult(null);
    const prevGeneratedAt = digest?.generated_at || null;
    try {
      // Download the media content of the Google Drive File
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setGoogleAccessToken(null);
        }
        let errMsg = `Failed to download file from Google Drive.`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errMsg = `${errMsg} (Drive API: ${errData.error.message})`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      let payloadFiles = [];
      if (file.mimeType === 'application/zip') {
        const blob = await response.blob();
        const unzipped = await handleZipFile(blob);
        payloadFiles.push(...unzipped);
      } else {
        const text = await response.text();
        payloadFiles.push({ name: file.name, content: text });
      }

      if (payloadFiles.length === 0) {
        throw new Error('No valid text logs found in the selected Drive file.');
      }

      const result = await whatsappService.uploadChats(payloadFiles);
      setUploadResult(result);
      pollForNewDigest(prevGeneratedAt);

      // Automatically delete the file from Google Drive after successful import
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });
        setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch (deleteErr) {
        console.error('Failed to auto-delete file from Google Drive:', deleteErr);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncingFileId(null);
    }
  };

  const cleanupDriveFolder = async () => {
    if (!window.confirm("Are you sure you want to delete all zip and text files in this Google Drive folder?")) {
      return;
    }
    setLoadingFiles(true);
    setError(null);
    try {
      for (const file of driveFiles) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });
      }
      setDriveFiles([]);
    } catch (err) {
      setError(`Failed to clean up some files: ${err.message}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const classifications = digest?.classifications || [];
  const happyCustomers = digest?.happy_customers || [];
  const drafts = digest?.whatsapp_drafts || [];
  const actionItems = digest?.action_items || [];

  // Find the selected conversation details
  const activeConversation = conversations.find(c => c.phone === selectedPhone);
  const filteredMessages = activeConversation?.messages?.filter(m => {
    if (!chatSearchQuery) return true;
    return m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()) || 
           m.sender.toLowerCase().includes(chatSearchQuery.toLowerCase());
  }) || [];

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-inner">
            <MessageSquare className="text-green-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">WhatsApp Manager</h1>
            <p className="text-sm text-gray-500">Sync backups, analyze chats, and review customer feedback logs.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadDigest();
              loadConversations();
            }}
            className="flex items-center gap-2 text-gray-600 bg-white border border-gray-200 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw size={15} /> Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold">An error occurred</p>
            <p className="mt-0.5 text-red-600/90 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Upload & Integration Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Direct Upload Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div>
            <h3 className="font-black text-gray-800 text-base mb-1 flex items-center gap-2">
              <Upload className="text-green-600" size={18} /> Upload Local Backup
            </h3>
            <p className="text-xs text-gray-400 mb-4">Upload WhatsApp export files (.txt or .zip archives).</p>
            
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-green-300 hover:bg-green-50/10 transition-all duration-300">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm font-bold text-gray-700">
                  Select WhatsApp archives
                </p>
                <p className="text-xs text-gray-400 mt-1">Supports both .txt and .zip exports</p>
                <input
                  type="file"
                  accept=".txt,.zip"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </div>
            </label>

            {files.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-600">
                    <FileText size={13} className="text-gray-400" /> {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!files.length || uploading}
              className="flex items-center gap-2 bg-green-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-40 hover:bg-green-700 transition active:scale-95 shadow-sm shadow-green-600/10"
            >
              {uploading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {uploading ? 'Decompressing & Uploading…' : 'Analyze Selected'}
            </button>
          </div>
        </div>

        {/* Google Drive Integration Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div>
            <h3 className="font-black text-gray-800 text-base mb-1 flex items-center gap-2">
              <Database className="text-blue-600" size={18} /> Google Drive Folder Sync
            </h3>
            <p className="text-xs text-gray-400 mb-4">Pull WhatsApp exports directly from your shared Google Drive folder.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Drive Folder ID</label>
                <input
                  type="text"
                  placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                  value={driveFolderId}
                  onChange={handleFolderIdChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              {!googleAccessToken ? (
                <button
                  onClick={connectGoogleDrive}
                  disabled={!driveFolderId}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition active:scale-95"
                >
                  <Lock size={15} /> Authorize & Load Folder
                </button>
              ) : (
                <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 max-h-[140px] overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-400 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-green-500" /> Connected
                      </span>
                      <button
                        onClick={() => {
                          setGoogleAccessToken(null);
                          setDriveFiles([]);
                          setError(null);
                        }}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchDriveFiles(googleAccessToken, driveFolderId)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        <RefreshCw size={11} className={loadingFiles ? 'animate-spin' : ''} /> reload files
                      </button>
                      {driveFiles.length > 0 && (
                        <button
                          onClick={cleanupDriveFolder}
                          disabled={loadingFiles}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Clean up Folder
                        </button>
                      )}
                    </div>
                  </div>
                  {loadingFiles ? (
                    <p className="text-xs text-gray-400 text-center py-4">Fetching file list...</p>
                  ) : driveFiles.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No zip or text backups found in this folder.</p>
                  ) : (
                    <div className="space-y-1">
                      {driveFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                          <span className="truncate max-w-[170px] font-semibold text-gray-700 flex items-center gap-1">
                            <FileText size={12} className="text-gray-400 shrink-0" /> {file.name}
                          </span>
                          <button
                            onClick={() => handleImportDriveFile(file)}
                            disabled={syncingFileId !== null}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2 py-1 rounded transition shrink-0 flex items-center gap-1"
                          >
                            {syncingFileId === file.id ? (
                              <Loader2 className="animate-spin" size={11} />
                            ) : (
                              <Download size={11} />
                            )}
                            Import
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-[10px] text-gray-400 leading-normal border-t border-gray-50 pt-3">
            To get the Folder ID, open the folder on Google Drive and copy the alphanumeric string at the end of the URL.
          </div>
        </div>

      </div>

      {/* Upload Results Message */}
      {uploadResult && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 font-black text-green-900">
            <CheckCircle2 size={18} className="text-green-600" /> {uploadResult.files_processed} backup export(s) processed
          </div>
          <p className="mt-1 font-semibold text-green-800/80">
            {uploadResult.total_new_messages} new message(s),{' '}
            {uploadResult.duplicates_skipped} duplicate(s) skipped across{' '}
            {uploadResult.conversations_updated?.length || 0} conversation thread(s).
          </p>
          {analyzing && (
            <p className="mt-2 flex items-center gap-1.5 text-green-700 font-bold">
              <Loader2 className="animate-spin text-green-600" size={14} /> Analysis is running in the background... digest will refresh shortly.
            </p>
          )}
          {uploadResult.errors?.length > 0 && (
            <ul className="mt-2 text-xs text-amber-700 list-disc list-inside bg-amber-50/50 border border-amber-100 rounded-xl p-2">
              {uploadResult.errors.map((er, i) => <li key={i}>{er}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Digest View */}
      {!digest ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
          <h4 className="font-bold text-gray-700 text-base">No chat digests found</h4>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">Upload a WhatsApp backup manually or sync your Google Drive folder to kick off the analysis.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Summary Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
              <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <Sparkles size={20} className="text-green-600" /> Executive AI Summary
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                Period: {digest.period} · {digest.conversations_analyzed} chats
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">{digest.summary}</p>
          </div>

          {/* Action items */}
          {actionItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-800 text-base flex items-center gap-2 mb-4">
                <ListChecks size={18} className="text-indigo-600" /> High-Priority Action Items
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {actionItems.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 border rounded-xl p-3 text-sm transition hover:shadow-sm ${PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.low}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white border px-1.5 py-0.5 rounded mt-0.5 shrink-0 shadow-sm">{a.priority}</span>
                    <span className="text-gray-700 font-semibold leading-normal">
                      <b>{a.contact}:</b> {a.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Happy customers + drafts */}
          {happyCustomers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-800 text-base flex items-center gap-2 mb-4">
                <Star size={18} className="text-amber-500 fill-amber-500" /> Prominent Happy Customers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {happyCustomers.map((hc, i) => {
                  const draft = drafts.find((d) => d.customer_name === hc.name);
                  return (
                    <div key={i} className="border border-gray-100 rounded-2xl p-4 bg-gradient-to-br from-white to-gray-50/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-gray-800 text-sm">{hc.name}</p>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border px-2 py-0.5 rounded-full">{hc.bike_type}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mt-1 italic">"{hc.satisfaction_reason}"</p>
                        {draft && (
                          <div className="mt-3 bg-white border border-gray-100 rounded-xl p-3 text-xs text-gray-600 font-medium relative shadow-sm">
                            <span className="absolute -top-2 left-3 bg-white text-[9px] text-gray-400 font-bold px-1 uppercase tracking-wider">Review Request Draft</span>
                            “{draft.message_draft}”
                          </div>
                        )}
                      </div>
                      {draft && (
                        <div className="mt-4 flex items-center gap-2">
                          <a
                            href={waLink(hc.phone || draft.thread_id, draft.message_draft)}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-green-100 transition active:scale-95"
                          >
                            <Send size={12} /> Send review request
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation classifications (Interactive Viewer Trigger) */}
          {classifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-800 text-base mb-4">Conversations History Logs</h2>
              <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto pr-2">
                {classifications.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedPhone(c.phone)}
                    className="flex items-center justify-between gap-4 py-3.5 px-3 rounded-2xl cursor-pointer hover:bg-green-50/20 active:bg-green-50/40 transition-all duration-200 group"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0 group-hover:bg-white transition">
                        <User className="text-gray-400" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-gray-800 flex items-center gap-1.5">
                          {c.contact}
                          <span className="font-semibold text-xs text-gray-400">· {c.phone}</span>
                        </p>
                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5 max-w-[300px] md:max-w-[500px]">
                          {c.summary}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        {c.needs_review && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertCircle size={10} /> review
                          </span>
                        )}
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${INTENT_STYLE[c.intent] || INTENT_STYLE.general_chat}`}>
                          {c.intent?.replace('_', ' ')}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[10px] font-bold text-gray-400">
            Generated {digest.generated_at ? new Date(digest.generated_at).toLocaleString('en-IN') : '—'} · digest {digest.digest_id}
          </p>
        </div>
      )}

      {/* WhatsApp Message Logs Slide Drawer View */}
      {selectedPhone && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay */}
            <div
              onClick={() => setSelectedPhone(null)}
              className="absolute inset-0 bg-gray-500 bg-opacity-40 backdrop-blur-sm transition-opacity"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md md:max-w-lg transform transition-all duration-500 ease-in-out slide-in-from-right">
                <div className="flex h-full flex-col bg-[#efeae2] shadow-2xl relative">
                  
                  {/* WhatsApp Top Navigation Bar */}
                  <div className="bg-[#008069] px-4 py-3 flex items-center justify-between text-white shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedPhone(null)}
                        className="p-1 hover:bg-teal-700/50 rounded-full transition md:hidden"
                      >
                        <X size={20} />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-white/20 border border-white/10 flex items-center justify-center">
                        <User className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm leading-tight truncate max-w-[180px] md:max-w-[240px]">
                          {activeConversation?.contact_name || 'Chat Logs'}
                        </h3>
                        <p className="text-[11px] font-semibold text-teal-100/90 mt-0.5">
                          {activeConversation?.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPhone(null)}
                        className="p-1.5 hover:bg-teal-700/50 rounded-full transition hidden md:block"
                        title="Close chat"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Messaging History Area Search Bar */}
                  <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                      <input
                        type="text"
                        placeholder="Search message logs..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-1.5 pl-9 pr-8 text-xs font-semibold text-gray-700 focus:outline-none focus:border-green-400 transition"
                      />
                      {chatSearchQuery && (
                        <button
                          onClick={() => setChatSearchQuery('')}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages Bubble Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {filteredMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-gray-400 font-bold bg-white/70 px-3 py-1.5 rounded-full shadow-sm">No matching messages</p>
                      </div>
                    ) : (
                      filteredMessages.map((msg, index) => {
                        const isCustomer = msg.sender !== 'ASSISTANT' && 
                                           !msg.sender.toLowerCase().includes('assistant') && 
                                           !msg.sender.toLowerCase().includes('city cycling') && 
                                           !msg.sender.toLowerCase().includes('bot');
                        
                        return (
                          <div
                            key={index}
                            className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} w-full`}
                          >
                            <div
                              className={`max-w-[85%] rounded-xl px-3 py-1.5 shadow-sm text-sm relative ${
                                isCustomer 
                                  ? 'bg-white text-gray-800 rounded-tl-none' 
                                  : 'bg-[#d9fdd3] text-gray-800 rounded-tr-none'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                                  {msg.sender}
                                </span>
                              </div>
                              <p className="mt-1 font-semibold whitespace-pre-wrap leading-relaxed text-[13px]">
                                {msg.text}
                              </p>
                              <span className="block text-[9px] text-gray-400 font-bold text-right mt-1">
                                {msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WhatsAppDigest;
