import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Upload, RefreshCw, Sparkles, Star, ListChecks,
  AlertCircle, Send, Loader2, CheckCircle2, FileText
} from 'lucide-react';
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

  useEffect(() => {
    loadDigest();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [loadDigest]);

  // Poll for a digest newer than `prevGeneratedAt` (background job just kicked off).
  const pollForNewDigest = (prevGeneratedAt) => {
    setAnalyzing(true);
    let attempts = 0;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      attempts += 1;
      const d = await loadDigest();
      const isNew = d && d.generated_at && d.generated_at !== prevGeneratedAt;
      if (isNew || attempts >= 10) {
        clearInterval(pollRef.current);
        setAnalyzing(false);
      }
    }, 4000);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    const prevGeneratedAt = digest?.generated_at || null;
    try {
      const result = await whatsappService.uploadChats(files);
      setUploadResult(result);
      setFiles([]);
      pollForNewDigest(prevGeneratedAt); // digest runs in the background
    } catch (e) {
      setError(e?.response?.data?.detail?.message || e?.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const classifications = digest?.classifications || [];
  const happyCustomers = digest?.happy_customers || [];
  const drafts = digest?.whatsapp_drafts || [];
  const actionItems = digest?.action_items || [];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
          <MessageSquare className="text-green-600" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">WhatsApp Digest</h1>
          <p className="text-sm text-gray-500">Upload chat exports and get an AI summary of the day's conversations.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <label className="block">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-300 transition">
            <Upload className="mx-auto text-gray-400 mb-2" size={26} />
            <p className="text-sm font-semibold text-gray-700">
              Select WhatsApp exports (.txt, “Without Media”)
            </p>
            <p className="text-xs text-gray-400 mt-1">You can select multiple files</p>
            <input
              type="file"
              accept=".txt"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>
        </label>

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
                <FileText size={12} /> {f.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={!files.length || uploading}
            className="flex items-center gap-2 bg-green-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-40 hover:bg-green-700 transition"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {uploading ? 'Uploading…' : 'Upload & Analyze'}
          </button>
          <button
            onClick={loadDigest}
            className="flex items-center gap-2 text-gray-600 font-semibold text-sm px-3 py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {uploadResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} /> {uploadResult.files_processed} file(s) processed
            </div>
            <p className="mt-1">
              {uploadResult.total_new_messages} new message(s),{' '}
              {uploadResult.duplicates_skipped} duplicate(s) skipped across{' '}
              {uploadResult.conversations_updated?.length || 0} conversation(s).
            </p>
            {analyzing && (
              <p className="mt-1 flex items-center gap-1 text-green-700">
                <Loader2 className="animate-spin" size={13} /> Analysis running in the background…
              </p>
            )}
            {uploadResult.errors?.length > 0 && (
              <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                {uploadResult.errors.map((er, i) => <li key={i}>{er}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Digest */}
      {!digest ? (
        <div className="text-center text-gray-400 text-sm py-10">
          No digest yet. Upload a chat export to generate one.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Sparkles size={17} className="text-green-600" /> Summary
              </h2>
              <span className="text-xs text-gray-400">
                {digest.period} · {digest.conversations_analyzed} chats
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{digest.summary}</p>
          </div>

          {/* Action items */}
          {actionItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <ListChecks size={17} className="text-indigo-600" /> Action Items
              </h2>
              <div className="space-y-2">
                {actionItems.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 border rounded-lg p-2.5 text-sm ${PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.low}`}>
                    <span className="text-[10px] font-black uppercase mt-0.5">{a.priority}</span>
                    <span className="text-gray-700"><b>{a.contact}:</b> {a.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Happy customers + drafts */}
          {happyCustomers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Star size={17} className="text-amber-500" /> Happy Customers
              </h2>
              <div className="space-y-3">
                {happyCustomers.map((hc, i) => {
                  const draft = drafts.find((d) => d.customer_name === hc.name);
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl p-3">
                      <p className="font-bold text-gray-800 text-sm">{hc.name} <span className="font-normal text-gray-400">· {hc.bike_type}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{hc.satisfaction_reason}</p>
                      {draft && (
                        <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs text-gray-600 italic">“{draft.message_draft}”</div>
                      )}
                      {draft && (
                        <a
                          href={waLink(hc.phone || draft.thread_id, draft.message_draft)}
                          target="_blank" rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
                        >
                          <Send size={13} /> Send review request
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classifications */}
          {classifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Conversations</h2>
              <div className="space-y-2">
                {classifications.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">
                        {c.contact} <span className="font-normal text-gray-400">· {c.phone}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">{c.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.needs_review && (
                        <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                          <AlertCircle size={11} /> review
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${INTENT_STYLE[c.intent] || INTENT_STYLE.general_chat}`}>
                        {c.intent}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400">
            Generated {digest.generated_at ? new Date(digest.generated_at).toLocaleString('en-IN') : '—'} · digest {digest.digest_id}
          </p>
        </div>
      )}
    </div>
  );
};

export default WhatsAppDigest;
