import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Upload, RefreshCw, Sparkles, Star, ListChecks,
  AlertCircle, Send, Loader2, CheckCircle2, FileText, Database,
  Search, X, ChevronRight, User, Download, ExternalLink, Lock,
  ThumbsUp, ThumbsDown, PlusCircle, Check, ShoppingBag, Eye
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import JSZip from 'jszip';
import { whatsappService } from '../../services/whatsappService';
import { orderService } from '../../services/orderService';

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
  
  // Google Drive integration states
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [tempFolderId, setTempFolderId] = useState('');
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [syncingFileId, setSyncingFileId] = useState(null);
  
  const navigate = useNavigate();
  // Conversations list & interactive chat view states
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [drawerTab, setDrawerTab] = useState('messages'); // 'messages' | 'analysis' | 'order'
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [expandedSummaryPhone, setExpandedSummaryPhone] = useState(null);

  const extractOrderParams = (conv, classification) => {
    const messages = conv?.messages || [];
    
    // Separate customer messages vs all messages
    const customerMsgs = messages.filter(m => 
      m.sender !== 'ASSISTANT' && 
      !m.sender?.toLowerCase().includes('assistant') && 
      !m.sender?.toLowerCase().includes('city cycling') && 
      !m.sender?.toLowerCase().includes('bot')
    );

    const customerText = customerMsgs.map(m => m.text).join('\n');
    const fullText = messages.map(m => m.text).join('\n');

    // 1. Primary Phone comes ONLY from numeric metadata phone
    const rawPhoneOrName = conv?.phone || conv?.thread_id || '';
    const isNumericPhone = /^[+\d\s\-()]{7,16}$/.test(rawPhoneOrName) && /\d{5,}/.test(rawPhoneOrName);

    let primaryPhone = isNumericPhone ? rawPhoneOrName.replace(/\D/g, '') : '';
    let extractedName = conv?.contact_name || classification?.contact;

    if (!extractedName || extractedName === 'Customer') {
      if (!isNumericPhone && rawPhoneOrName && !rawPhoneOrName.includes('.txt')) {
        extractedName = rawPhoneOrName;
      } else {
        extractedName = 'Customer';
      }
    }

    // 2. Strict Rule: Any 10-digit number typed in chat text goes strictly to Alternate Phone!
    const phoneTypedInChat = [...customerText.matchAll(/(?:\+?91[\s-]?)?([6-9]\d{9})/g)].map(m => m[1]);
    let alternatePhone = phoneTypedInChat[0] || '';

    let email = '';
    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) email = emailMatch[0];

    let address = '';
    const isUrl = (txt) => /https?:\/\//i.test(txt);
    const isShopLocation = (txt) => /city\s*cycling|our\s*store|our\s*shop|pickup\s*location|shop\s*address/i.test(txt);

    // 1. Search customer messages line by line for explicit address keywords
    for (const m of customerMsgs) {
      const text = m.text || '';
      if (isShopLocation(text)) continue;

      const addrMatch = text.match(/(?:delivery address|my address|address|deliver to|location|drop at)\s*[-:]?\s*([^\n]+)/i);
      if (addrMatch && !isShopLocation(addrMatch[1])) {
        address = addrMatch[1].trim();
        break;
      }
    }

    // 2. If no explicit label, check customer messages for common address keywords
    if (!address) {
      for (const m of customerMsgs) {
        const text = (m.text || '').trim();
        if (isUrl(text) || isShopLocation(text)) continue;
        if (/(?:flat|apartment|apt|house|no|street|road|layout|society|tower|block|sector|near|opp|behind|bangalore|bengaluru|casablanca|express)/i.test(text)) {
          address = text;
          break;
        }
      }
    }

    let pincode = '';
    const pinMatch = customerText.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) pincode = pinMatch[1];

    let bikeModel = '';
    const bikeMatch = customerText.match(/(Scott|Sportster|Trek|Giant|Montra|Firefox|Btwin|Rockrider|Hybrid|Gear|Non-Gear)[^\n,]*/i);
    if (bikeMatch) bikeModel = bikeMatch[0];

    let rentalRates = '';
    const rateMatch = fullText.match(/(?:rate|price|cost|rent)\s*[-:]?\s*(₹?\s*\d+(?:\s*\/\s*(?:day|week|month))?)/i);
    if (rateMatch) rentalRates = rateMatch[1];

    let amountReceived = 0;
    const amountMatch = customerText.match(/(?:received|paid|token|sent|upi|gpay|paytm)\s*₹?\s*(\d+)/i) ||
                        fullText.match(/(?:received|paid|token)\s*₹?\s*(\d+)/i);
    if (amountMatch) amountReceived = parseInt(amountMatch[1], 10);

    return {
      name: extractedName,
      phone: primaryPhone,
      email,
      alternatePhone,
      address,
      pincode,
      bikeModel,
      rentalRates,
      amountReceived,
      paymentNote: amountReceived ? `WhatsApp payment received: ₹${amountReceived}` : '',
    };
  };

  const [systemOrders, setSystemOrders] = useState([]);

  const loadSystemOrders = useCallback(async () => {
    try {
      const res = await orderService.getAll();
      setSystemOrders(Array.isArray(res) ? res : res?.orders || []);
    } catch (e) {
      console.error('Failed to load system orders:', e);
    }
  }, []);

  const handleSendFeedback = async () => {
    if (!selectedPhone || !feedbackRating) return;
    try {
      await whatsappService.submitAIFeedback(selectedPhone, feedbackRating, feedbackComment);
      setFeedbackSubmitted(true);
      setTimeout(() => setFeedbackSubmitted(false), 3000);
    } catch (e) {
      setError('Failed to submit feedback');
    }
  };

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

  const fetchDriveFiles = useCallback(async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const data = await whatsappService.getDriveFiles();
      setDriveFiles(data.files || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load files.');
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const loadDriveStatus = useCallback(async () => {
    try {
      const data = await whatsappService.getDriveStatus();
      setIsDriveConnected(data.isConnected);
      setDriveFolderId(data.driveFolderId);
      setTempFolderId(data.driveFolderId);
      if (data.isConnected) {
        // Fetch files list if connected
        setLoadingFiles(true);
        const filesData = await whatsappService.getDriveFiles();
        setDriveFiles(filesData.files || []);
        setLoadingFiles(false);
      }
    } catch (e) {
      console.error('Failed to load Google Drive status:', e);
    }
  }, []);

  useEffect(() => {
    loadDigest();
    loadConversations();
    loadDriveStatus();
    loadSystemOrders();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [loadDigest, loadConversations, loadDriveStatus, loadSystemOrders]);

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

  // Google Drive Authorization Handler (Authorization Code Flow)
  const connectGoogleDrive = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setError(null);
      setLoadingFiles(true);
      try {
        await whatsappService.saveDriveConfig(codeResponse.code, tempFolderId);
        setIsDriveConnected(true);
        setDriveFolderId(tempFolderId);
        // Reload files
        const filesData = await whatsappService.getDriveFiles();
        setDriveFiles(filesData.files || []);
      } catch (err) {
        setError(err?.response?.data?.error || err.message || 'Drive authorization failed.');
      } finally {
        setLoadingFiles(false);
      }
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/drive',
    onError: () => setError('Google Drive authorization failed.'),
  });

  const handleFolderIdChange = (e) => {
    setTempFolderId(e.target.value.trim());
  };

  const handleImportDriveFile = async (file) => {
    setSyncingFileId(file.id);
    setError(null);
    setUploadResult(null);
    const prevGeneratedAt = digest?.generated_at || null;
    try {
      const result = await whatsappService.syncDriveFile(file.id);
      setUploadResult(result);
      pollForNewDigest(prevGeneratedAt);
      
      // Refresh files list to show updated isProcessed status
      const filesData = await whatsappService.getDriveFiles();
      setDriveFiles(filesData.files || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'File import failed.');
    } finally {
      setSyncingFileId(null);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Drive?")) {
      return;
    }
    setError(null);
    try {
      await whatsappService.disconnectDrive();
      setIsDriveConnected(false);
      setDriveFolderId('');
      setTempFolderId('');
      setDriveFiles([]);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to disconnect.');
    }
  };

  const classifications = digest?.classifications || [];
  const happyCustomers = digest?.happy_customers || [];
  const drafts = digest?.whatsapp_drafts || [];
  const actionItems = digest?.action_items || [];

  const handleStageChange = async (phone, newStage) => {
    try {
      await whatsappService.updateConversationStage(phone, newStage);
      setConversations(prev => prev.map(c => c.phone === phone ? { ...c, current_stage: newStage } : c));
      loadDigest();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to update stage');
    }
  };

  const handleReanalyzeChat = async (phone) => {
    const prevGeneratedAt = digest?.generated_at || null;
    try {
      await whatsappService.reanalyzeConversation(phone);
      pollForNewDigest(prevGeneratedAt);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to re-analyze conversation');
    }
  };

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
                  value={tempFolderId}
                  onChange={handleFolderIdChange}
                  disabled={isDriveConnected}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-blue-400 transition disabled:opacity-75"
                />
              </div>

              {!isDriveConnected ? (
                <button
                  onClick={connectGoogleDrive}
                  disabled={!tempFolderId}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition active:scale-95 shadow-sm"
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
                        onClick={handleDisconnectDrive}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchDriveFiles}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        <RefreshCw size={11} className={loadingFiles ? 'animate-spin' : ''} /> reload files
                      </button>
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
                          <span className="truncate max-w-[150px] font-semibold text-gray-700 flex items-center gap-1">
                            <FileText size={12} className="text-gray-400 shrink-0" /> {file.name}
                            {file.isProcessed && (
                              <CheckCircle2 size={12} className="text-green-500 shrink-0" title="Already Imported" />
                            )}
                          </span>
                          <button
                            onClick={() => handleImportDriveFile(file)}
                            disabled={syncingFileId !== null}
                            className={`font-bold px-2 py-1 rounded transition shrink-0 flex items-center gap-1 ${
                              file.isProcessed 
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            {syncingFileId === file.id ? (
                              <Loader2 className="animate-spin" size={11} />
                            ) : (
                              <Download size={11} />
                            )}
                            {file.isProcessed ? 'Re-import' : 'Import'}
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

      {/* Executive AI Summary Panel */}
      {digest?.summary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
            <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
              <Sparkles size={20} className="text-green-600" /> Executive AI Summary
            </h2>
            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
              Period: {digest.period || 'Today'} · {digest.conversations_analyzed || 0} chats
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed font-medium">{digest.summary}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">

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

          {/* Customer Conversations & Order Lifecycle Table */}
          {conversations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-50">
                <div>
                  <h2 className="font-black text-gray-800 text-base flex items-center gap-2">
                    <MessageSquare size={18} className="text-green-600" /> Customer Chats & Order Lifecycle (Past 7 Days)
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Manage order stages, trigger re-analysis, or view chat logs.</p>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full shrink-0">
                  {conversations.length} Chat(s) Logged
                </span>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto pr-1">
                {conversations.map((conv, i) => {
                  const classification = classifications.find(c => c.phone === conv.phone) || {};
                  const currentStage = conv.current_stage || classification.current_stage || 'Inquiry';
                  const summary = classification.summary || (conv.messages?.length ? conv.messages[conv.messages.length - 1].text : 'No messages');
                  const isExpanded = expandedSummaryPhone === conv.phone;
                  return (
                    <div
                      key={conv.phone || i}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-3 rounded-2xl hover:bg-gray-50/80 transition-all duration-200"
                    >
                      <div className="min-w-0 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shrink-0 mt-0.5">
                          <User className="text-green-600" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm text-gray-800 flex items-center gap-2">
                            {conv.contact_name || classification.contact || 'Customer'}
                            <span className="font-semibold text-xs text-gray-400">· {conv.phone}</span>
                          </p>
                          <p 
                            onClick={() => setExpandedSummaryPhone(isExpanded ? null : conv.phone)}
                            className={`text-xs text-gray-600 font-medium cursor-pointer hover:text-gray-900 mt-1 max-w-[280px] md:max-w-[420px] ${isExpanded ? '' : 'truncate'}`}
                            title="Click to expand/collapse full summary"
                          >
                            {summary}
                          </p>
                          {conv.messages?.length > 0 && (
                            <p className="text-[10px] text-gray-400 font-semibold mt-1">
                              {conv.messages.length} message(s) · Last updated: {conv.last_updated ? new Date(conv.last_updated).toLocaleDateString('en-IN') : 'Recently'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center flex-wrap">
                        {/* Lifecycle Stage Selector */}
                        <div className="flex items-center gap-1 bg-indigo-50/60 border border-indigo-100 rounded-xl px-2.5 py-1">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Stage:</span>
                          <select
                            value={currentStage}
                            onChange={(e) => handleStageChange(conv.phone, e.target.value)}
                            className="bg-transparent text-xs font-black text-indigo-900 focus:outline-none cursor-pointer"
                          >
                            <option value="Inquiry">Inquiry</option>
                            <option value="On-Hold">On-Hold</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="In-Progress">In-Progress</option>
                            <option value="Returned">Returned</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Re-analyze Button */}
                        <button
                          onClick={() => handleReanalyzeChat(conv.phone)}
                          className="flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs px-3 py-1.5 rounded-xl transition"
                          title="Reset state and re-run AI digest analysis for this conversation"
                        >
                          <RefreshCw size={12} className={analyzing ? 'animate-spin' : ''} />
                          Re-analyze
                        </button>

                        {/* View Chat Button */}
                        <button
                          onClick={() => {
                            setSelectedPhone(conv.phone);
                            setDrawerTab('messages');
                          }}
                          className="flex items-center gap-1 bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-green-700 transition shadow-sm"
                        >
                          View Chat <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {digest && (
            <p className="text-center text-[10px] font-bold text-gray-400">
              Generated {digest?.generated_at ? new Date(digest.generated_at).toLocaleString('en-IN') : '—'} · digest {digest?.digest_id || '—'}
            </p>
          )}
        </div>

      {/* Actionable WhatsApp Chat Workspace Drawer */}
      {selectedPhone && (() => {
        const activeConv = conversations.find(c => c.phone === selectedPhone || c.thread_id === selectedPhone);
        const classification = classifications.find(c => c.phone === selectedPhone) || {};
        const extractedParams = extractOrderParams(activeConv, classification);
        const filteredMsgs = activeConv?.messages?.filter(m => {
          if (!chatSearchQuery) return true;
          return m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()) || 
                 m.sender?.toLowerCase().includes(chatSearchQuery.toLowerCase());
        }) || [];

        return (
          <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="absolute inset-0 overflow-hidden">
              {/* Overlay */}
              <div
                onClick={() => setSelectedPhone(null)}
                className="absolute inset-0 bg-gray-500 bg-opacity-40 backdrop-blur-sm transition-opacity"
              />

              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="pointer-events-auto w-screen max-w-md md:max-w-xl transform transition-all duration-500 ease-in-out slide-in-from-right">
                  <div className="flex h-full flex-col bg-white shadow-2xl relative">
                    
                    {/* Top Navigation Bar */}
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
                          <h3 className="font-black text-sm leading-tight truncate max-w-[180px] md:max-w-[280px]">
                            {activeConv?.contact_name || classification.contact || 'Chat Workspace'}
                          </h3>
                          <p className="text-[11px] font-semibold text-teal-100/90 mt-0.5">
                            {activeConv?.phone || selectedPhone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPhone(null)}
                          className="p-1.5 hover:bg-teal-700/50 rounded-full transition hidden md:block"
                          title="Close drawer"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Workspace Tabs Navigation Bar */}
                    <div className="bg-[#006e5a] px-4 py-2 flex items-center justify-around text-white shrink-0 border-t border-teal-700/50">
                      <button
                        onClick={() => setDrawerTab('messages')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition ${drawerTab === 'messages' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:bg-teal-700/50'}`}
                      >
                        <MessageSquare size={14} /> Messages
                      </button>
                      <button
                        onClick={() => setDrawerTab('analysis')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition ${drawerTab === 'analysis' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:bg-teal-700/50'}`}
                      >
                        <Sparkles size={14} /> AI Analysis
                      </button>
                      <button
                        onClick={() => setDrawerTab('order')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition ${drawerTab === 'order' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:bg-teal-700/50'}`}
                      >
                        <ShoppingBag size={14} /> Order Actions
                      </button>
                    </div>

                    {/* TAB 1: MESSAGES STREAM */}
                    {drawerTab === 'messages' && (
                      <div className="flex-1 flex flex-col bg-[#efeae2] overflow-hidden">
                        {/* Search Bar */}
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
                          {filteredMsgs.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-xs text-gray-400 font-bold bg-white/70 px-3 py-1.5 rounded-full shadow-sm">No matching messages</p>
                            </div>
                          ) : (
                            filteredMsgs.map((msg, index) => {
                              const isCustomer = msg.sender !== 'ASSISTANT' && 
                                                 !msg.sender?.toLowerCase().includes('assistant') && 
                                                 !msg.sender?.toLowerCase().includes('city cycling') && 
                                                 !msg.sender?.toLowerCase().includes('bot');
                              
                              return (
                                <div
                                  key={index}
                                  className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                                      isCustomer
                                        ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                        : 'bg-[#dcf8c6] text-gray-900 rounded-tr-none'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-4 mb-1 border-b border-black/5 pb-1">
                                      <span className="font-bold text-[10px] opacity-75">
                                        {msg.sender}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap leading-relaxed font-medium">
                                      {msg.text}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 2: AI ANALYSIS & FEEDBACK */}
                    {drawerTab === 'analysis' && (
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                        {/* Summary & Intent Card */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                              <Sparkles className="text-indigo-600" size={16} /> AI Summary & Intelligence
                            </h4>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                              Stage: {activeConv?.current_stage || classification.current_stage || 'Inquiry'}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Summary</p>
                            <p className="text-xs text-gray-800 font-medium leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                              {classification.summary || 'Classification summary pending or unavailable.'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Primary Intent</p>
                              <p className="text-xs font-black text-gray-800 capitalize mt-0.5">
                                {classification.intent?.replace('_', ' ') || 'General Chat'}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Confidence Score</p>
                              <p className="text-xs font-black text-gray-800 mt-0.5">
                                {classification.confidence ? `${(classification.confidence * 100).toFixed(0)}%` : '100%'}
                              </p>
                            </div>
                          </div>

                          {classification.categories?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Detected Categories</p>
                              <div className="flex flex-wrap gap-1.5">
                                {classification.categories.map((cat, ci) => (
                                  <span key={ci} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                                    #{cat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* AI Feedback Form Card */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
                          <h4 className="font-black text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Star className="text-amber-500" size={16} /> Rate AI Classification Accuracy
                          </h4>

                          <p className="text-xs text-gray-500 font-medium">
                            Help us improve our AI models! Is this classification and summary accurate?
                          </p>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setFeedbackRating('positive')}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border transition ${
                                feedbackRating === 'positive'
                                  ? 'bg-green-50 border-green-300 text-green-700 shadow-sm'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <ThumbsUp size={16} /> Accurate
                            </button>
                            <button
                              onClick={() => setFeedbackRating('negative')}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border transition ${
                                feedbackRating === 'negative'
                                  ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <ThumbsDown size={16} /> Incorrect
                            </button>
                          </div>

                          <textarea
                            placeholder="Optional comments or suggestions for the AI model..."
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-400 transition"
                            rows={3}
                          />

                          <button
                            onClick={handleSendFeedback}
                            disabled={!feedbackRating}
                            className="w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                          >
                            {feedbackSubmitted ? (
                              <>
                                <Check size={16} /> Feedback Submitted!
                              </>
                            ) : (
                              'Submit AI Feedback'
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: ORDER ACTIONS */}
                    {drawerTab === 'order' && (() => {
                      const cleanPhone = (ph) => String(ph || '').replace(/\D/g, '');
                      const targetPhone = cleanPhone(selectedPhone);
                      const targetAlt = cleanPhone(extractedParams.alternatePhone);
                      const targetEmail = (extractedParams.email || '').toLowerCase().trim();

                      const matchingOrders = systemOrders.filter(ord => {
                        const p1 = cleanPhone(ord.customer?.phone);
                        const p2 = cleanPhone(ord.customer?.alternatePhone);
                        const em = (ord.customer?.email || '').toLowerCase().trim();

                        const phoneMatch = targetPhone && (p1.includes(targetPhone) || targetPhone.includes(p1) || p2.includes(targetPhone));
                        const altMatch = targetAlt && (p1.includes(targetAlt) || p2.includes(targetAlt));
                        const emailMatch = targetEmail && em && em === targetEmail;

                        return phoneMatch || altMatch || emailMatch;
                      });

                      return (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                          {/* Existing System Orders Card (If Found) */}
                          {matchingOrders.length > 0 ? (
                            <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200/80 shadow-sm space-y-3">
                              <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                                <h4 className="font-black text-amber-900 text-sm flex items-center gap-2">
                                  <Database className="text-amber-600" size={16} /> Linked Order Found ({matchingOrders.length})
                                </h4>
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                  In Database
                                </span>
                              </div>

                              <div className="space-y-3">
                                {matchingOrders.map(ord => (
                                  <div key={ord._id || ord.orderId} className="bg-white rounded-xl p-3 border border-amber-100 flex items-center justify-between text-xs">
                                    <div>
                                      <p className="font-black text-gray-800">Order #{ord.orderId}</p>
                                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                        Status: <span className="font-bold text-indigo-600">{ord.orderState || ord.orderStatus}</span> · Total: ₹{ord.financials?.grandTotal || 0}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => navigate(`/admin/orders`)}
                                      className="flex items-center gap-1 bg-amber-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg hover:bg-amber-700 transition"
                                    >
                                      View Order <ExternalLink size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-xs text-blue-700 flex items-center gap-2 font-semibold">
                              <Database size={16} className="text-blue-500 shrink-0" />
                              No existing order found in system for this customer.
                            </div>
                          )}

                          {/* Extracted Parameters Card */}
                          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
                            <h4 className="font-black text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
                              <FileText className="text-green-600" size={16} /> Extracted Order Parameters (From Chat)
                            </h4>

                            <div className="space-y-2.5 text-xs">
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Customer Name:</span>
                                <span className="font-black text-gray-800">{extractedParams.name || '—'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Phone:</span>
                                <span className="font-black text-gray-800">{extractedParams.phone || '—'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Email:</span>
                                <span className="font-black text-gray-800">{extractedParams.email || 'Not specified'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Alternate Phone:</span>
                                <span className="font-black text-gray-800">{extractedParams.alternatePhone || 'Not specified'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Delivery Address:</span>
                                <span className="font-black text-gray-800 text-right max-w-[240px]">{extractedParams.address || 'Not specified'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Pincode:</span>
                                <span className="font-black text-gray-800">{extractedParams.pincode || 'Not specified'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Requested Bike Model:</span>
                                <span className="font-black text-green-700">{extractedParams.bikeModel || 'Not specified'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Rental Rates / Duration:</span>
                                <span className="font-black text-gray-800">{extractedParams.rentalRates || 'Not specified'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-bold text-gray-400">Amount Received / Deposit:</span>
                                <span className="font-black text-green-600">
                                  {extractedParams.amountReceived > 0 ? `₹${extractedParams.amountReceived}` : 'None'}
                                </span>
                              </div>
                            </div>

                            {/* 1-Click Create Order Button */}
                            <button
                              onClick={() => {
                                navigate('/admin/orders/new', {
                                  state: { prefillCustomer: extractedParams }
                                });
                              }}
                              className="w-full bg-green-600 text-white font-black text-xs py-3 rounded-xl hover:bg-green-700 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <PlusCircle size={16} /> Create Order from Chat Data
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default WhatsAppDigest;
