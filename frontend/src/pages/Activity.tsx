import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, CheckCircle2, AlertCircle, Info,
  AlertTriangle, RefreshCw, ChevronRight, Wand2
} from 'lucide-react'
import { activityAPI } from '../services/api'
import type { ActivityLog, ActivityStatus } from '../types'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

const STATUS_CONFIG: Record<ActivityStatus, { icon: any; color: string; bg: string; label: string }> = {
  success: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20', label: 'Success' },
  error: { icon: AlertCircle, color: 'text-error', bg: 'bg-error/10 border-error/20', label: 'Error' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', label: 'Warning' },
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10 border-info/20', label: 'Info' },
}

const ACTION_LABELS: Record<string, string> = {
  post_created: 'Post Created',
  post_updated: 'Post Updated',
  post_scheduled: 'Post Scheduled',
  post_published: 'Post Published',
  post_publish_failed: 'Publish Failed',
  post_retry_initiated: 'Retry Initiated',
  ai_content_generated: 'AI Content Generated',
  ai_content_regenerated: 'AI Content Adjusted',
  instagram_connection_tested: 'Instagram Connection Tested',
}

function ActivityItem({ log, onViewPost }: { log: ActivityLog; onViewPost?: () => void }) {
  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.info
  const Icon = cfg.icon
  const label = ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')

  return (
    <div className={clsx('card p-4 border transition-all duration-200 hover:border-opacity-50', cfg.bg)}>
      <div className="flex gap-3">
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <Icon size={16} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-text-primary">{label}</span>
            {Boolean(log.metadata?.is_demo) && (
              <span className="badge bg-violet-900/30 text-violet-400 text-[10px] border border-violet-500/20">Demo</span>
            )}
          </div>
          {log.description && (
            <p className="text-xs text-text-secondary mt-0.5">{log.description}</p>
          )}

          {/* Metadata details */}
          {log.action === 'post_published' && Boolean(log.metadata?.instagram_media_id) && (
            <p className="text-xs text-text-muted mt-1 font-mono">
              ID: {String(log.metadata?.instagram_media_id)}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-text-muted" title={format(new Date(log.created_at), 'PPpp')}>
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
            {log.post_id && onViewPost && (
              <button
                onClick={onViewPost}
                className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors"
              >
                View post <ChevronRight size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Activity() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await activityAPI.list(100)
      setLogs(res.data.items || [])
    } catch (e) {
      console.error('Failed to load activity', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = filter === 'all'
    ? logs
    : logs.filter(l => l.status === filter)

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'success', label: '✓ Success' },
    { id: 'error', label: '✗ Errors' },
    { id: 'warning', label: '⚠ Warnings' },
    { id: 'info', label: 'ℹ Info' },
  ]

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <ActivityIcon size={20} className="text-primary-400" /> Activity
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {logs.length} events · Chronological log of all operations
            </p>
          </div>
          <button onClick={fetchLogs} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f.id
                  ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                  : 'text-text-muted hover:bg-surface-hover'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded shimmer" />
                    <div className="h-3 w-64 rounded shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <ActivityIcon size={48} className="text-text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-text-primary mb-2">No activity yet</h3>
            <p className="text-sm text-text-secondary mb-5">
              Activity will appear here as you use the application.
            </p>
            <button onClick={() => navigate('/studio')} className="btn-primary mx-auto">
              <Wand2 size={16} /> Create a Post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Group by day */}
            {filtered.map(log => (
              <ActivityItem
                key={log.id}
                log={log}
                onViewPost={log.post_id ? () => navigate(`/studio/${log.post_id}`) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
