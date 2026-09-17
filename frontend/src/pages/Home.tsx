import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wand2, HardDrive, FileText, Clock, CheckCircle2, AlertCircle, Sparkles, ArrowRight, Zap } from 'lucide-react'
import { postsAPI, configAPI } from '../services/api'
import type { Post, AppConfig } from '../types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'badge-draft',
    scheduled: 'badge-scheduled',
    published: 'badge-published',
    failed: 'badge-failed',
    publishing: 'badge-publishing',
  }
  const labels: Record<string, string> = {
    draft: 'Draft', scheduled: 'Scheduled', published: 'Published',
    failed: 'Failed', publishing: 'Publishing…'
  }
  return <span className={map[status] || 'badge-draft'}>{labels[status] || status}</span>
}

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="card p-4 hover:border-primary-500/30 hover:shadow-card-hover cursor-pointer transition-all duration-200 group"
    >
      <div className="flex gap-3">
        {/* Media thumb */}
        {post.media?.url ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
            <img
              src={post.media.url}
              alt={post.media.original_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-text-muted" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={post.status} />
            <span className="text-xs text-text-muted ml-auto">
              {formatDistanceToNow(new Date(post.updated_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-text-primary line-clamp-1 font-medium">
            {post.caption || post.topic || 'Untitled post'}
          </p>
          {post.hashtags?.length > 0 && (
            <p className="text-xs text-primary-400 mt-0.5 line-clamp-1">
              {post.hashtags.slice(0, 3).join(' ')}
              {post.hashtags.length > 3 && ` +${post.hashtags.length - 3}`}
            </p>
          )}
        </div>

        <ArrowRight
          size={16}
          className="text-text-muted group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
        />
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      postsAPI.list(1, 5),
      configAPI.get()
    ]).then(([postsRes, configRes]) => {
      setRecentPosts(postsRes.data.items || [])
      setConfig(configRes.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: recentPosts.length,
    published: recentPosts.filter(p => p.status === 'published').length,
    scheduled: recentPosts.filter(p => p.status === 'scheduled').length,
    drafts: recentPosts.filter(p => p.status === 'draft').length,
  }

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface border-b border-surface-border">
        {/* Background gradient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
          <div className="absolute -top-16 right-1/4 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-16">
          {/* Hero heading */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
              <Sparkles size={12} />
              AI-Powered Instagram Automation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight mb-4">
              Create your next{' '}
              <span className="gradient-text">Instagram post</span>
            </h1>
            <p className="text-lg text-text-secondary max-w-xl">
              Turn your media into publish-ready content with AI. Generate captions, hashtags, schedule, and publish — all in one place.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/studio')}
              className="btn-gradient px-6 py-3 text-base font-semibold rounded-xl"
            >
              <Wand2 size={18} />
              Create Post
            </button>
            <button
              onClick={() => navigate('/library')}
              className="btn-secondary px-6 py-3 text-base rounded-xl"
            >
              <HardDrive size={18} />
              Import from Drive
            </button>
            <button
              onClick={() => navigate('/studio')}
              className="btn-ghost px-6 py-3 text-base rounded-xl"
            >
              <FileText size={18} />
              View Drafts
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Workflow steps */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-5">How it works</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { step: '1', label: 'Select Media', icon: '📸' },
              { step: '2', label: 'AI Generates', icon: '✨' },
              { step: '3', label: 'Review & Edit', icon: '✏️' },
              { step: '4', label: 'Preview', icon: '👁️' },
              { step: '5', label: 'Publish', icon: '🚀' },
            ].map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-lg mb-2">
                  {s.icon}
                </div>
                <span className="text-xs font-medium text-text-secondary">{s.label}</span>
                {i < 4 && (
                  <div className="hidden md:block absolute top-5 left-[60%] w-[80%] h-px bg-gradient-to-r from-surface-border to-surface-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Posts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Recent Work</h2>
            <button
              onClick={() => navigate('/schedule')}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              View all →
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-lg shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded shimmer" />
                      <div className="h-3 w-full rounded shimmer" />
                      <div className="h-3 w-32 rounded shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-600/10 flex items-center justify-center mx-auto mb-4">
                <Wand2 size={28} className="text-primary-400" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">No posts yet</h3>
              <p className="text-sm text-text-secondary mb-5">
                Create your first AI-powered Instagram post to get started.
              </p>
              <button onClick={() => navigate('/studio')} className="btn-primary mx-auto">
                <Wand2 size={16} /> Create your first post
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/studio/${post.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
