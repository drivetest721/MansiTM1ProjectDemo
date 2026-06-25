/**
 * AnnotationPanel — FP&A commentary layer
 *
 * Drop this onto any page to let users read and write notes that persist
 * server-side (in-memory, keyed by pageKey + period).
 *
 * Usage:
 *   <AnnotationPanel pageKey="pl-statement" period="2024:all" />
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface Annotation {
  id: string;
  text: string;
  author: string;
  period: string;
  timestamp: string;
}

interface Props {
  pageKey: string;
  period?: string;
  defaultAuthor?: string;
}

export default function AnnotationPanel({ pageKey, period = '', defaultAuthor = 'FP&A Team' }: Props) {
  const key = `${pageKey}:${period}`.replace(/[^a-z0-9:\-_]/gi, '_');

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(defaultAuthor);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/annotations/${key}`);
      setAnnotations(res.data.data ?? []);
    } catch {
      setError('Could not load annotations. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/annotations/${key}`, {
        text: text.trim(),
        author: author.trim() || defaultAuthor,
        period,
      });
      setText('');
      await load();
    } catch {
      setError('Failed to save annotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/api/annotations/${key}/${id}`);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to delete annotation.');
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-amber-200 dark:border-amber-800">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Commentary & Annotations
          </span>
          {annotations.length > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-full px-2 py-0.5 font-medium">
              {annotations.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-amber-100 dark:border-amber-900/40">

          {/* Error */}
          {error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Existing annotations */}
          {loading ? (
            <div className="flex items-center gap-2 mt-3 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : annotations.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400 dark:text-gray-500 italic">
              No annotations yet. Add one below.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {annotations.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                      {a.text}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {a.author} · {fmtDate(a.timestamp)}
                      {a.period && ` · ${a.period}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded"
                    aria-label="Delete annotation"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add new annotation */}
          <div className="border-t border-amber-100 dark:border-amber-900/40 pt-4 space-y-2">
            <input
              type="text"
              placeholder="Your name / team"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <textarea
              rows={3}
              placeholder="Add a comment, assumption, or flag for this period…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
            />
            <button
              onClick={submit}
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
