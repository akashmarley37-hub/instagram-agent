import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, CheckCircle2, AlertCircle, FileText,
  Edit, RefreshCw, X, ChevronRight, Loader2
} from 'lucide-react'
import { postsAPI } from '../services/api'
import type { Post } from '../types'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-text-muted', bg: 'bg-text-muted/10', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'text-info', bg: 'bg-info/10', icon: Clock },
  publishing: { label: 'Publishing…', color: 'text-warning', bg: 'bg-warning/10', icon: Loader2 },
  published: { label: 'Published', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-error', bg: 'bg-error/10', icon: AlertCircle },
}

function PostCard({ post, onEdit, onRetry, onCancel }: {
  post: Post
  onEdit: () => void
  onRetry: () => void
  onCancel: () => void
}) {
  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
  const Icon = cfg.icon

  return (
    <div className="card p-4 hover:border-primary-500/20 transition-all duration-200">
      <div className="flex gap-4">
        {/* Media thumb */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          {post.media?.url ? (
            <img src={post.media.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText size={20} className="text-text-muted" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {/* Status */}
            <span className={clsx('badge text-xs', cfg.bg, cfg.color)}>
              <Icon size={10} className={post.status === 'publishing' ? 'animate-spin' : ''} />
              {cfg.label}
            </span>
            <span className="text-xs text-text-muted ml-auto">
              {formatDistanceToNow(new Date(post.updated_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-text-primary font-medium line-clamp-1">
            {post.caption || post.topic || 'Untitled post'}
          </p>

          {post.hashtags?.length > 0 && (
            <p className="text-xs text-primary-400/70 mt-0.5 line-clamp-1">
              {post.hashtags.slice(0, 4).join(' ')}
              {post.hashtags.length > 4 && ` +${post.hashtags.length - 4} more`}
            </p>
          )}

          {/* Scheduled time */}
          {post.scheduled_at && post.status === 'scheduled' && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-info">
              <Clock size={11} />
              {format(new Date(post.scheduled_at), 'MMM d, yyyy · h:mm a')}
            </div>
          )}

          {/* Published time */}
          {post.published_at && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-success">
              <CheckCircle2 size={11} />
              Published {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
            </div>
          )}

          {/* Failed error */}
          {post.status === 'failed' && post.publishing_attempts?.[0]?.error_message && (
            <p className="text-xs text-error/80 mt-1.5 line-clamp-1">
              ⚠ {post.publishing_attempts[0].error_message}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border">
        <button onClick={onEdit} className="btn-ghost text-xs py-1.5 px-3">
          <Edit size={12} /> Edit
        </button>
        {post.status === 'failed' && (
          <button onClick={onRetry} className="btn-success text-xs py-1.5 px-3">
            <RefreshCw size={12} /> Retry
          </button>
        )}
        {(post.status === 'draft' || post.status === 'scheduled') && (
          <button onClick={onCancel} className="btn-danger text-xs py-1.5 px-3 ml-auto">
            <X size={12} /> {post.status === 'scheduled' ? 'Cancel Schedule' : 'Delete'}
          </button>
        )}
        <ChevronRight size={14} className="text-text-muted ml-auto self-center" />
      </div>
    </div>
  )
}

export default function Schedule() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [retrying, setRetrying] = useState<string | null>(null)

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'scheduled', label: '📅 Scheduled' },
    { id: 'draft', label: '📝 Drafts' },
    { id: 'published', label: '✅ Published' },
    { id: 'failed', label: '⚠ Failed' },
  ]

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const res = await postsAPI.list(1, 50, filter === 'all' ? undefined : filter)
      setPosts(res.data.items || [])
    } catch {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [filter])

  const handleRetry = async (postId: string) => {
    setRetrying(postId)
    try {
      const res = await postsAPI.retry(postId)
      if (res.data.success || res.data.status === 'published') {
        toast.success('Published successfully!')
      } else {
        toast.error('Retry failed: ' + (res.data.error_message || 'Unknown error'))
      }
      fetchPosts()
    } catch (e: any) {
      toast.error(e.message || 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try {
      await postsAPI.delete(postId)
      setPosts(p => p.filter(x => x.id !== postId))
      toast.success('Post deleted')
    } catch (e: any) {
      toast.error(e.message || 'Delete failed')
    }
  }

  const scheduled = posts.filter(p => p.status === 'scheduled')
  const otherPosts = posts.filter(p => p.status !== 'scheduled')

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Calendar size={20} className="text-primary-400" /> Schedule
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">{posts.length} posts · Manage your content calendar</p>
          </div>
          <button onClick={fetchPosts} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Filter tabs */}
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

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded shimmer" />
                    <div className="h-3 w-full rounded shimmer" />
                    <div className="h-3 w-48 rounded shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="card p-12 text-center">
            <Calendar size={48} className="text-text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-text-primary mb-2">No posts found</h3>
            <p className="text-sm text-text-secondary mb-5">
              {filter === 'all' ? 'Create your first post to get started.' : `No ${filter} posts.`}
            </p>
            <button onClick={() => navigate('/studio')} className="btn-primary mx-auto">
              Create Post
            </button>
          </div>
        ) : (
          <>
            {/* Upcoming scheduled posts */}
            {filter === 'all' && scheduled.length > 0 && (
              <div>
                <h2 className="section-label mb-3">Upcoming ({scheduled.length})</h2>
                <div className="space-y-3">
                  {scheduled.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onEdit={() => navigate(`/studio/${post.id}`)}
                      onRetry={() => handleRetry(post.id)}
                      onCancel={() => handleDelete(post.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All other posts */}
            <div>
              {filter === 'all' && <h2 className="section-label mb-3">All Posts</h2>}
              <div className="space-y-3">
                {(filter === 'all' ? otherPosts : posts).map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onEdit={() => navigate(`/studio/${post.id}`)}
                    onRetry={() => handleRetry(post.id)}
                    onCancel={() => handleDelete(post.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
