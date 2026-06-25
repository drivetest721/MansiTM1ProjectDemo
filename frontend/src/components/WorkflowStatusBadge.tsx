/**
 * WorkflowStatusBadge — Budget / Forecast approval workflow
 *
* Shows the current status of a page (Draft → Submitted → Approved → Locked)
 * and lets authorised users advance or reset it.
 *
 * Usage:
 *   <WorkflowStatusBadge page="cfo-budgeting" entity={filters.entity} year={filters.year} />
 */

import { useState, useEffect, useCallback } from 'react';
import { getWorkflowStatus, setWorkflowStatus } from '../services/api';
import { Loader2, Lock, CheckCircle, Clock, FileText } from 'lucide-react';

type Status = 'Draft' | 'Submitted' | 'Approved' | 'Locked';

const STATUS_ORDER: Status[] = ['Draft', 'Submitted', 'Approved', 'Locked'];

const STATUS_META: Record<Status, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof FileText;
  description: string;
}> = {
  Draft: {
    label: 'Draft',
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
    icon: FileText,
    description: 'In preparation — data can be freely edited.',
  },
  Submitted: {
    label: 'Submitted',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-600',
    icon: Clock,
    description: 'Awaiting review — submitted for approval.',
  },
  Approved: {
    label: 'Approved',
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-600',
    icon: CheckCircle,
    description: 'Approved — ready to lock.',
  },
  Locked: {
    label: 'Locked',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-600',
    icon: Lock,
    description: 'Locked — read-only. No further edits permitted.',
  },
};

interface Props {
  page: string;
  entity?: string;
  year?: string;
}

export default function WorkflowStatusBadge({ page, entity = 'all', year = 'all' }: Props) {
  const [status, setStatus] = useState<Status>('Draft');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkflowStatus(page, entity, year);
      setStatus((res.data.status as Status) || 'Draft');
    } catch {
      setError('Could not load workflow status');
    } finally {
      setLoading(false);
    }
  }, [page, entity, year]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    const idx = STATUS_ORDER.indexOf(status);
    if (idx >= STATUS_ORDER.length - 1) return; // Already Locked
    const next = STATUS_ORDER[idx + 1];
    setSaving(true);
    setError(null);
    try {
      const res = await setWorkflowStatus({ page, entity, year, status: next });
      setStatus(res.data.status as Status);
    } catch {
      setError('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await setWorkflowStatus({ page, entity, year, status: 'Draft' });
      setStatus(res.data.status as Status);
    } catch {
      setError('Failed to reset status');
    } finally {
      setSaving(false);
    }
  };

  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const idx = STATUS_ORDER.indexOf(status);
  const isLocked = status === 'Locked';
  const nextLabel = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${meta.bg} ${meta.border}`}>
      {/* Status icon + label */}
      {loading ? (
        <Loader2 size={16} className="animate-spin text-gray-400" />
      ) : (
        <Icon size={18} className={meta.color} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
          {/* Step indicators */}
          <div className="flex items-center gap-1 ml-1">
            {STATUS_ORDER.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i <= idx
                    ? 'w-4 bg-current opacity-80'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                } ${meta.color}`}
              />
            ))}
          </div>
        </div>
        <p className={`text-xs mt-0.5 ${meta.color} opacity-75`}>{meta.description}</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isLocked && nextLabel && (
          <button
            onClick={advance}
            disabled={saving || loading}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors disabled:opacity-50 ${meta.bg} ${meta.border} ${meta.color} hover:brightness-95`}
          >
            {saving ? <Loader2 size={12} className="animate-spin inline" /> : `→ ${nextLabel}`}
          </button>
        )}
        {status !== 'Draft' && (
          <button
            onClick={reset}
            disabled={saving || loading}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            title="Reset to Draft"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
