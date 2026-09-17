import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Upload, Wand2, Sparkles, RefreshCw, FileText, Trash2, Image as ImageIcon,
  ChevronDown, Send, Clock, Save, Loader2, AlertCircle, CheckCircle2,
  Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Zap, X, Plus
} from 'lucide-react'
import { aiAPI, mediaAPI, postsAPI, configAPI } from '../services/api'
import type { Media, Post, GeneratedContent, Tone, RegenerateAdjustment, AppConfig } from '../types'
import clsx from 'clsx'

// ========================================================
// Types
// ========================================================
type StudioStep = 'media' | 'generate' | 'preview'

interface DraftState {
  mediaId: string | null
  topic: string
  tone: Tone
  language: string
  caption: string
  hashtags: string[]
  callToAction: string
  media: Media | null
}

// ========================================================
// Constants
// ========================================================
const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'creative', label: 'Creative', emoji: '🎨' },
  { value: 'minimal', label: 'Minimal', emoji: '⚡' },
  { value: 'promotional', label: 'Promotional', emoji: '🚀' },
  { value: 'inspirational', label: 'Inspirational', emoji: '✨' },
]

const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Spanish', 'French', 'German']

// ========================================================
// Helper: Instagram Preview
// ========================================================
function InstagramPreview({ media, caption, hashtags, callToAction }: {
  media: Media | null
  caption: string
  hashtags: string[]
  callToAction: string
}) {
  const fullCaption = [caption, callToAction, hashtags.join(' ')].filter(Boolean).join('\n\n')

  return (
    <div className="max-w-sm mx-auto">
      {/* Preview label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Preview</span>
        <span className="badge badge-draft text-[10px]">Preview Only</span>
      </div>

      {/* Instagram post mockup */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
            <span className="text-white text-xs font-bold">YB</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">your_brand</p>
            <p className="text-[10px] text-gray-500">Sponsored</p>
          </div>
          <MoreHorizontal size={16} className="ml-auto text-gray-400" />
        </div>

        {/* Media */}
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {media?.url ? (
            media.file_type === 'video' ? (
              <video src={media.url} className="w-full h-full object-cover" muted loop />
            ) : (
              <img src={media.url} alt="Post preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300">
              <ImageIcon size={48} />
              <p className="text-xs text-gray-400">No media selected</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Heart size={22} className="text-gray-700" />
            <MessageCircle size={22} className="text-gray-700" />
            <Share size={22} className="text-gray-700" />
            <Bookmark size={22} className="ml-auto text-gray-700" />
          </div>
          <p className="text-xs font-semibold text-gray-900 mb-1.5">1,234 likes</p>

          {/* Caption */}
          {fullCaption ? (
            <div className="text-[11px] text-gray-700 leading-relaxed">
              <span className="font-semibold text-gray-900">your_brand</span>{' '}
              <span className="whitespace-pre-wrap line-clamp-4">{fullCaption}</span>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 italic">Caption will appear here…</p>
          )}

          <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">2 hours ago</p>
        </div>
      </div>

      <p className="text-xs text-text-muted text-center mt-3">
        ⚠️ This is a preview only — not a live Instagram post
      </p>
    </div>
  )
}

// ========================================================
// Main Content Studio Component
// ========================================================
export default function ContentStudio() {
  const { postId } = useParams()
  const navigate = useNavigate()

  // Draft state
  const [draft, setDraft] = useState<DraftState>({
    mediaId: null, topic: '', tone: 'friendly', language: 'English',
    caption: '', hashtags: [], callToAction: '', media: null
  })
  const [post, setPost] = useState<Post | null>(null)
  const [activeStep, setActiveStep] = useState<StudioStep>('media')

  // UI state
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [newHashtag, setNewHashtag] = useState('')
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    configAPI.get().then(r => setAppConfig(r.data)).catch(console.error)
  }, [])

  // Load existing post
  useEffect(() => {
    if (postId) {
      postsAPI.get(postId).then(r => {
        const p: Post = r.data
        setPost(p)
        setDraft({
          mediaId: p.media_id || null,
          topic: p.topic || '',
          tone: (p.tone as Tone) || 'friendly',
          language: p.language || 'English',
          caption: p.caption || '',
          hashtags: p.hashtags || [],
          callToAction: p.call_to_action || '',
          media: p.media || null,
        })
        if (p.caption) setActiveStep('preview')
      }).catch(() => toast.error('Post not found'))
    }
  }, [postId])

  // ---- Media Upload ----
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await mediaAPI.upload(file)
      const media: Media = { ...res.data, url: mediaAPI.getUrl(res.data.filename) }
      setDraft(d => ({ ...d, mediaId: media.id, media }))
      toast.success('Media uploaded successfully')
      setActiveStep('generate')
    } catch (e: any) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'video/*': ['.mp4', '.mov'] },
    maxFiles: 1,
    disabled: uploading,
  })

  // ---- AI Generate ----
  const handleGenerate = async () => {
    if (!draft.topic.trim()) {
      toast.error('Please describe what this post is about')
      return
    }
    setGenerating(true)
    try {
      const res = await aiAPI.generate({
        topic: draft.topic,
        tone: draft.tone,
        language: draft.language,
        media_context: draft.media?.original_name || undefined,
      })
      const content: GeneratedContent = res.data
      setGeneratedContent(content)
      setDraft(d => ({
        ...d,
        caption: content.caption,
        hashtags: content.hashtags,
        callToAction: content.call_to_action || '',
      }))
      setActiveStep('preview')
      toast.success('AI content generated!', { icon: '✨' })
    } catch (e: any) {
      toast.error(e.message || 'AI generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ---- Regenerate ----
  const handleRegenerate = async (adjustment: RegenerateAdjustment) => {
    setGenerating(true)
    try {
      const res = await aiAPI.regenerate({
        caption: draft.caption,
        hashtags: draft.hashtags,
        adjustment,
        topic: draft.topic,
        tone: draft.tone,
      })
      const content: GeneratedContent = res.data
      setDraft(d => ({
        ...d,
        caption: content.caption,
        hashtags: content.hashtags,
        callToAction: content.call_to_action || d.callToAction,
      }))
      toast.success(`Content ${adjustment === 'regenerate' ? 'regenerated' : 'adjusted'}!`)
    } catch (e: any) {
      toast.error(e.message || 'Regeneration failed')
    } finally {
      setGenerating(false)
    }
  }

  // ---- Save Draft ----
  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      if (post) {
        await postsAPI.update(post.id, {
          media_id: draft.mediaId || undefined,
          caption: draft.caption,
          hashtags: draft.hashtags,
          call_to_action: draft.callToAction,
          topic: draft.topic,
          tone: draft.tone,
          language: draft.language,
        })
        toast.success('Draft saved')
      } else {
        const res = await postsAPI.create({
          media_id: draft.mediaId || undefined,
          caption: draft.caption,
          hashtags: draft.hashtags,
          call_to_action: draft.callToAction,
          topic: draft.topic,
          tone: draft.tone,
          language: draft.language,
          status: 'draft',
        })
        setPost(res.data)
        navigate(`/studio/${res.data.id}`, { replace: true })
        toast.success('Draft saved')
      }
    } catch (e: any) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ---- Publish Now ----
  const handlePublish = async () => {
    setPublishing(true)
    setShowPublishConfirm(false)
    try {
      // Save first if new
      let postId_ = post?.id
      if (!postId_) {
        const res = await postsAPI.create({
          media_id: draft.mediaId || undefined,
          caption: draft.caption,
          hashtags: draft.hashtags,
          call_to_action: draft.callToAction,
          topic: draft.topic,
          tone: draft.tone,
          language: draft.language,
          status: 'draft',
        })
        postId_ = res.data.id
        setPost(res.data)
        navigate(`/studio/${res.data.id}`, { replace: true })
      } else {
        await postsAPI.update(postId_, {
          caption: draft.caption,
          hashtags: draft.hashtags,
          call_to_action: draft.callToAction,
        })
      }

      const res = await postsAPI.publish(postId_!)
      if (res.data.success || res.data.status === 'published') {
        toast.success('Published to Instagram! 🎉', { duration: 5000 })
        // Refresh post
        const refreshed = await postsAPI.get(postId_!)
        setPost(refreshed.data)
      } else {
        toast.error(res.data.error_message || 'Publishing failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }

  // ---- Add/Remove Hashtag ----
  const addHashtag = () => {
    if (!newHashtag.trim()) return
    const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`
    if (!draft.hashtags.includes(tag)) {
      setDraft(d => ({ ...d, hashtags: [...d.hashtags, tag] }))
    }
    setNewHashtag('')
  }

  const removeHashtag = (tag: string) => {
    setDraft(d => ({ ...d, hashtags: d.hashtags.filter(h => h !== tag) }))
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-full">
      {/* Studio Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Wand2 size={20} className="text-primary-400" />
              Content Studio
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {post ? `Editing post · ${post.status}` : 'Create a new Instagram post'}
            </p>
          </div>

          {/* Status indicator */}
          {post && (
            <div className={clsx('badge text-sm', {
              'badge-draft': post.status === 'draft',
              'badge-scheduled': post.status === 'scheduled',
              'badge-published': post.status === 'published',
              'badge-failed': post.status === 'failed',
            })}>
              {post.status}
            </div>
          )}
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'media', label: '1. Media' },
            { id: 'generate', label: '2. AI Generate' },
            { id: 'preview', label: '3. Preview & Publish' },
          ].map(step => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id as StudioStep)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                activeStep === step.id
                  ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 p-4 lg:p-6 max-w-[1400px] mx-auto">

        {/* ===== LEFT: Media ===== */}
        <div className={clsx('lg:w-72 flex-shrink-0', activeStep !== 'media' && 'hidden lg:block')}>
          <div className="card p-5">
            <h2 className="section-label mb-4">Media</h2>

            {draft.media ? (
              <div className="space-y-3">
                {/* Preview */}
                <div className="aspect-square rounded-xl overflow-hidden bg-surface relative group">
                  {draft.media.file_type === 'video' ? (
                    <video src={draft.media.url} className="w-full h-full object-cover" muted loop />
                  ) : (
                    <img src={draft.media.url} alt={draft.media.original_name} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setDraft(d => ({ ...d, media: null, mediaId: null }))}
                      className="btn-danger text-xs"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>

                {/* File info */}
                <div className="bg-surface rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Name</span>
                    <span className="text-text-secondary font-medium truncate max-w-[140px]">{draft.media.original_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Type</span>
                    <span className="text-text-secondary">{draft.media.mime_type}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Size</span>
                    <span className="text-text-secondary">{(draft.media.file_size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  {draft.media.width && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Dimensions</span>
                      <span className="text-text-secondary">{draft.media.width} × {draft.media.height}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveStep('generate')}
                  className="btn-primary w-full"
                >
                  Next: Generate Content →
                </button>
              </div>
            ) : (
              <div>
                <div
                  {...getRootProps()}
                  className={clsx(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                    isDragActive
                      ? 'border-primary-500 bg-primary-600/10'
                      : 'border-surface-border hover:border-primary-500/50 hover:bg-surface-hover'
                  )}
                >
                  <input {...getInputProps()} />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="text-primary-400 animate-spin" />
                      <p className="text-sm text-text-secondary">Uploading…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center">
                        <Upload size={22} className="text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {isDragActive ? 'Drop it here!' : 'Upload media'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP, MP4 · Max 50MB</p>
                      </div>
                      <span className="text-xs text-primary-400 font-medium">
                        Click or drag & drop
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center">
                  <span className="text-xs text-text-muted">or</span>
                </div>
                <button
                  onClick={() => navigate('/library')}
                  className="btn-secondary w-full mt-2 text-sm"
                >
                  <ImageIcon size={15} /> Browse Media Library
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===== CENTER: AI Content Generator ===== */}
        <div className={clsx('flex-1 space-y-4', activeStep === 'preview' && 'hidden lg:block')}>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-gradient-ai flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <h2 className="text-sm font-semibold text-text-primary">AI Content Generator</h2>
            </div>

            {appConfig && !appConfig.openai_configured && (
              <div className="mb-4 p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-300">OpenAI API Key Required</p>
                  <p className="text-text-muted mt-0.5">
                    To generate captions and hashtags with GPT-4o, set <code className="text-amber-300 bg-surface px-1 py-0.5 rounded">OPENAI_API_KEY</code> in <code className="text-primary-300 bg-surface px-1 py-0.5 rounded">backend/.env</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Topic input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  What is this post about? *
                </label>
                <textarea
                  className="textarea h-20"
                  placeholder="e.g. Morning coffee and productivity, launching our new product, team celebration…"
                  value={draft.topic}
                  onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))}
                />
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setDraft(d => ({ ...d, tone: t.value }))}
                      className={clsx(
                        'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 text-left',
                        draft.tone === t.value
                          ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                          : 'bg-surface border border-surface-border text-text-secondary hover:border-primary-500/30'
                      )}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Language</label>
                <select
                  className="input text-sm"
                  value={draft.language}
                  onChange={e => setDraft(d => ({ ...d, language: e.target.value }))}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !draft.topic.trim()}
                className="btn-gradient w-full py-3 font-semibold"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={16} /> Generate with AI</>
                )}
              </button>
            </div>
          </div>

          {/* Generated Caption */}
          {(draft.caption || draft.hashtags.length > 0) && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Generated Content</h3>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-text-secondary">Caption</label>
                  <div className="flex gap-1">
                    {(['shorten', 'professional', 'casual', 'engaging'] as RegenerateAdjustment[]).map(adj => (
                      <button
                        key={adj}
                        onClick={() => handleRegenerate(adj)}
                        disabled={generating}
                        className="text-[10px] px-2 py-1 rounded bg-surface-hover hover:bg-surface-border text-text-muted hover:text-text-secondary transition-colors capitalize"
                      >
                        {adj}
                      </button>
                    ))}
                    <button
                      onClick={() => handleRegenerate('regenerate')}
                      disabled={generating}
                      className="text-[10px] px-2 py-1 rounded bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={9} /> Regenerate
                    </button>
                  </div>
                </div>
                <textarea
                  className="textarea h-36 text-sm"
                  value={draft.caption}
                  onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))}
                  placeholder="Your caption will appear here…"
                />
                <p className="text-right text-xs text-text-muted mt-1">{draft.caption.length} chars</p>
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Hashtags ({draft.hashtags.length})
                </label>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-3 bg-surface rounded-lg border border-surface-border">
                  {draft.hashtags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-600/15 border border-primary-500/20 text-primary-300 text-xs"
                    >
                      {tag}
                      <button onClick={() => removeHashtag(tag)} className="hover:text-error ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {draft.hashtags.length === 0 && (
                    <span className="text-xs text-text-muted">No hashtags yet…</span>
                  )}
                </div>
                {/* Add hashtag */}
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1"
                    placeholder="Add hashtag…"
                    value={newHashtag}
                    onChange={e => setNewHashtag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addHashtag()}
                  />
                  <button onClick={addHashtag} className="btn-secondary px-3">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Call to Action */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Call to Action (optional)</label>
                <input
                  className="input text-sm"
                  placeholder="e.g. Check the link in bio!"
                  value={draft.callToAction}
                  onChange={e => setDraft(d => ({ ...d, callToAction: e.target.value }))}
                />
              </div>

              {/* Mobile preview button */}
              <button
                onClick={() => setActiveStep('preview')}
                className="btn-secondary w-full lg:hidden"
              >
                Preview Post →
              </button>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Instagram Preview + Actions ===== */}
        <div className={clsx('lg:w-80 flex-shrink-0 space-y-4', activeStep !== 'preview' && 'hidden lg:block')}>
          {/* Preview card */}
          <div className="card p-4">
            <InstagramPreview
              media={draft.media}
              caption={draft.caption}
              hashtags={draft.hashtags}
              callToAction={draft.callToAction}
            />
          </div>

          {/* Actions */}
          <div className="card p-4 space-y-3">
            <h3 className="section-label">Actions</h3>

            {/* Published status */}
            {post?.status === 'published' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-success">
                    Published to Instagram
                  </p>
                  {post.instagram_media_id && (
                    <p className="text-[10px] text-success/70 mt-0.5">ID: {post.instagram_media_id}</p>
                  )}
                </div>
              </div>
            )}

            {/* Failed status */}
            {post?.status === 'failed' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
                <AlertCircle size={16} className="text-error flex-shrink-0" />
                <p className="text-xs text-error">Publishing failed. Use Retry below.</p>
              </div>
            )}

            {appConfig && !appConfig.instagram_configured && (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-300">Instagram API Required</p>
                  <p className="text-text-muted mt-0.5">
                    Set <code className="text-amber-300 bg-surface px-1 py-0.5 rounded">INSTAGRAM_ACCESS_TOKEN</code> & <code className="text-amber-300 bg-surface px-1 py-0.5 rounded">INSTAGRAM_BUSINESS_ACCOUNT_ID</code> in backend/.env to publish.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="btn-secondary w-full"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Draft
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={!draft.caption.trim()}
              className="btn-secondary w-full"
            >
              <Clock size={15} /> Schedule
            </button>

            <button
              onClick={() => setShowPublishConfirm(true)}
              disabled={publishing || !draft.caption.trim() || post?.status === 'published'}
              className="btn-gradient w-full py-3 font-semibold"
            >
              {publishing ? (
                <><Loader2 size={16} className="animate-spin" /> Publishing…</>
              ) : (
                <><Send size={16} /> {post?.status === 'failed' ? 'Retry Publish' : 'Publish Now'}</>
              )}
            </button>

            <p className="text-[10px] text-text-muted text-center">
              Direct publish via Instagram Graph API
            </p>
          </div>

          {/* Mobile: back to editor */}
          <button
            onClick={() => setActiveStep('generate')}
            className="btn-ghost w-full text-sm lg:hidden"
          >
            ← Back to Editor
          </button>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          postId={post?.id || null}
          draft={draft}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={(scheduledAt) => {
            setShowScheduleModal(false)
            toast.success(`Post scheduled for ${new Date(scheduledAt).toLocaleString()}`)
          }}
        />
      )}

      {/* Publish Confirm Dialog */}
      {showPublishConfirm && (
        <PublishConfirmDialog
          draft={draft}
          onCancel={() => setShowPublishConfirm(false)}
          onConfirm={handlePublish}
        />
      )}
    </div>
  )
}

// ========================================================
// Schedule Modal
// ========================================================
function ScheduleModal({ postId, draft, onClose, onScheduled }: {
  postId: string | null
  draft: DraftState
  onClose: () => void
  onScheduled: (scheduledAt: string) => void
}) {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [scheduling, setScheduling] = useState(false)

  const handleSchedule = async () => {
    if (!date || !time) { toast.error('Please select date and time'); return }
    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    setScheduling(true)
    try {
      let id = postId
      if (!id) {
        const res = await postsAPI.create({
          ...draft,
          media_id: draft.mediaId || undefined,
          status: 'draft'
        })
        id = res.data.id
        navigate(`/studio/${id}`, { replace: true })
      } else {
        await postsAPI.update(id, {
          caption: draft.caption,
          hashtags: draft.hashtags,
          call_to_action: draft.callToAction,
        })
      }
      await postsAPI.schedule(id!, scheduledAt, timezone)
      onScheduled(scheduledAt)
    } catch (e: any) {
      toast.error(e.message || 'Scheduling failed')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary">Schedule Post</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Time</label>
            <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Timezone</label>
            <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {date && time && (
            <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-xs text-info">
              📅 Your post will be published on{' '}
              <strong>{new Date(`${date}T${time}`).toLocaleString()}</strong>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSchedule} disabled={scheduling} className="btn-primary flex-1">
            {scheduling ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

// ========================================================
// Publish Confirm Dialog
// ========================================================
function PublishConfirmDialog({ draft, onCancel, onConfirm }: {
  draft: DraftState
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="card w-full max-w-sm p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
            <Send size={16} className="text-success" />
          </div>
          <h2 className="font-semibold text-text-primary">Ready to Publish</h2>
        </div>

        {draft.media && (
          <div className="aspect-video rounded-lg overflow-hidden bg-surface mb-4">
            <img src={draft.media.url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="space-y-2 text-sm mb-4">
          <div className="flex gap-2">
            <span className="text-text-muted w-20 flex-shrink-0">Caption:</span>
            <span className="text-text-primary line-clamp-2">{draft.caption || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-20 flex-shrink-0">Hashtags:</span>
            <span className="text-text-secondary">{draft.hashtags.length} tags</span>
          </div>
          <div className="flex gap-2">
            <span className="text-text-muted w-20 flex-shrink-0">Publishing:</span>
            <span className="text-text-primary">Now</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-400 mb-4">
          <Send size={12} className="inline mr-1" />
          <strong>Live Publishing:</strong> Publishes directly to your connected Instagram Business account.
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn-primary flex-1 bg-success hover:bg-success/90">
            <Send size={15} /> Publish
          </button>
        </div>
      </div>
    </div>
  )
}
