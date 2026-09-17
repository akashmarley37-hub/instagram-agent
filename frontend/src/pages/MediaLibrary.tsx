import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Upload, Trash2, Search, Image as ImageIcon, Video, Loader2, Grid3X3,
  HardDrive, RefreshCw, X, Play, Eye, Wand2, ExternalLink
} from 'lucide-react'
import { mediaAPI, driveAPI } from '../services/api'
import type { Media, DriveFile } from '../types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type Tab = 'library' | 'drive'

export default function MediaLibrary() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('library')
  const [media, setMedia] = useState<Media[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all')
  const [selected, setSelected] = useState<Media | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [driveSearch, setDriveSearch] = useState('')
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveConnected, setDriveConnected] = useState<boolean>(true)
  const [importingId, setImportingId] = useState<string | null>(null)

  const PER_PAGE = 20

  const fetchMedia = async () => {
    setLoading(true)
    try {
      const res = await mediaAPI.list(page, PER_PAGE, filter === 'all' ? undefined : filter)
      setMedia(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (e) {
      toast.error('Failed to load media')
    } finally {
      setLoading(false)
    }
  }

  const fetchDriveFiles = async () => {
    setDriveLoading(true)
    try {
      const res = await driveAPI.listMedia(driveSearch || undefined)
      setDriveConnected(res.data.connected ?? true)
      setDriveFiles(res.data.files || [])
    } catch {
      toast.error('Failed to load Drive files')
    } finally {
      setDriveLoading(false)
    }
  }

  const handleUseDriveFile = async (f: DriveFile) => {
    setImportingId(f.id)
    try {
      const res = await driveAPI.importFile(f.id, f.name, f.mimeType)
      toast.success(`Imported ${f.name} to media library!`)
      fetchMedia()
      navigate(`/studio?mediaId=${res.data.media.id}`)
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`)
    } finally {
      setImportingId(null)
    }
  }

  useEffect(() => { fetchMedia() }, [page, filter])
  useEffect(() => { if (tab === 'drive') fetchDriveFiles() }, [tab])

  // Upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      if (!files[0]) return
      setUploading(true)
      try {
        const res = await mediaAPI.upload(files[0])
        toast.success('Uploaded successfully')
        fetchMedia()
      } catch (e: any) {
        toast.error(e.message || 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    accept: { 'image/*': [], 'video/*': ['.mp4', '.mov'] },
    maxFiles: 1,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media?')) return
    try {
      await mediaAPI.delete(id)
      setMedia(m => m.filter(x => x.id !== id))
      if (selected?.id === id) setSelected(null)
      toast.success('Media deleted')
    } catch (e: any) {
      toast.error(e.message || 'Delete failed')
    }
  }

  const filtered = media.filter(m => {
    if (search && !m.original_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <ImageIcon size={20} className="text-primary-400" /> Media Library
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">{total} files · Upload and manage your Instagram media</p>
          </div>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <button disabled={uploading} className="btn-primary">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload Media
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'library', label: 'My Library', icon: Grid3X3 },
            { id: 'drive', label: 'Google Drive', icon: HardDrive },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                  : 'text-text-muted hover:bg-surface-hover'
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'library' ? (
            <>
              {/* Filters */}
              <div className="flex gap-3 mb-5">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    className="input pl-9 text-sm"
                    placeholder="Search media…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {['all', 'image', 'video'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f as any); setPage(1) }}
                    className={clsx(
                      'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                      filter === f
                        ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                        : 'text-text-muted hover:bg-surface-hover border border-surface-border'
                    )}
                  >
                    {f === 'all' ? 'All' : f === 'image' ? '📷 Images' : '🎬 Videos'}
                  </button>
                ))}
                <button onClick={fetchMedia} className="btn-ghost p-2">
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Drop zone */}
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center mb-5 cursor-pointer transition-all',
                  isDragActive ? 'border-primary-500 bg-primary-600/10' : 'border-surface-border hover:border-primary-500/40'
                )}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <p className="text-sm text-text-muted flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary-400" /> Uploading…
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">
                    {isDragActive ? '📁 Drop files here' : 'Drag & drop files here to upload'}
                  </p>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl shimmer" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <ImageIcon size={48} className="text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary font-medium">No media found</p>
                  <p className="text-text-muted text-sm mt-1">Upload your first image or video to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filtered.map(m => (
                    <MediaCard
                      key={m.id}
                      media={m}
                      selected={selected?.id === m.id}
                      onSelect={() => setSelected(selected?.id === m.id ? null : m)}
                      onDelete={() => handleDelete(m.id)}
                      onUse={() => navigate('/studio', { state: { mediaId: m.id } })}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Drive tab */
            <div>
              <div className="flex gap-3 mb-5">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    className="input pl-9 text-sm"
                    placeholder="Search Drive…"
                    value={driveSearch}
                    onChange={e => setDriveSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchDriveFiles()}
                  />
                </div>
                <button onClick={fetchDriveFiles} className="btn-secondary" disabled={driveLoading}>
                  {driveLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  Search
                </button>
              </div>

              {!driveConnected && (
                <div className="card p-8 text-center border-amber-500/20 bg-amber-950/10 mb-6">
                  <HardDrive size={36} className="mx-auto text-amber-400 mb-3" />
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Google Drive Not Connected</h3>
                  <p className="text-xs text-text-muted max-w-md mx-auto mb-4">
                    Connect your Google account in Connections to browse and import your Google Drive images and videos.
                  </p>
                  <Link to="/connections" className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                    Open Connections
                  </Link>
                </div>
              )}

              {driveLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="aspect-square rounded-xl shimmer" />)}
                </div>
              ) : driveFiles.length === 0 && driveConnected ? (
                <div className="card p-8 text-center border-surface-border">
                  <p className="text-xs text-text-muted">No media files found in Google Drive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {driveFiles.map(f => (
                    <div
                      key={f.id}
                      onClick={() => handleUseDriveFile(f)}
                      className="card overflow-hidden group cursor-pointer hover:border-primary-500/30 transition-all"
                    >
                      <div className="aspect-square bg-surface relative overflow-hidden">
                        {f.thumbnailLink ? (
                          <img src={f.thumbnailLink} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={32} className="text-text-muted" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white font-medium px-3 py-1.5 rounded-lg bg-primary-600 flex items-center gap-1.5">
                            {importingId === f.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            Use in Post
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-text-primary truncate">{f.name}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{formatBytes(parseInt(f.size || '0'))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: selected media detail */}
        {selected && (
          <div className="w-64 border-l border-surface-border bg-surface p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted uppercase">Details</span>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1">
                <X size={14} />
              </button>
            </div>
            <div className="aspect-square rounded-lg overflow-hidden bg-surface-card mb-4">
              {selected.file_type === 'video' ? (
                <video src={selected.url} className="w-full h-full object-cover" muted loop />
              ) : (
                <img src={selected.url} alt={selected.original_name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-text-muted">Name</span>
                <span className="text-text-secondary truncate max-w-[120px]">{selected.original_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Type</span>
                <span className="text-text-secondary capitalize">{selected.file_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Size</span>
                <span className="text-text-secondary">{formatBytes(selected.file_size)}</span>
              </div>
              {selected.width && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Dimensions</span>
                  <span className="text-text-secondary">{selected.width}×{selected.height}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Added</span>
                <span className="text-text-secondary">{formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/studio')}
              className="btn-primary w-full text-sm"
            >
              <Wand2 size={14} /> Use in Post
            </button>
            <button
              onClick={() => handleDelete(selected.id)}
              className="btn-danger w-full text-sm mt-2"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MediaCard({ media, selected, onSelect, onDelete, onUse }: {
  media: Media
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUse: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative rounded-xl overflow-hidden cursor-pointer group transition-all',
        selected ? 'ring-2 ring-primary-500' : 'hover:ring-1 hover:ring-surface-border'
      )}
    >
      <div className="aspect-square bg-surface-card">
        {media.file_type === 'video' ? (
          <div className="w-full h-full relative">
            <video src={media.url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Play size={20} className="text-white drop-shadow-lg" />
            </div>
          </div>
        ) : (
          <img src={media.url} alt={media.original_name} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <button
          onClick={e => { e.stopPropagation(); onUse() }}
          className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-500"
        >
          <Wand2 size={12} className="inline mr-1" /> Use in Post
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="px-3 py-1.5 rounded-lg bg-error/80 text-white text-xs hover:bg-error"
        >
          <Trash2 size={12} className="inline mr-1" /> Delete
        </button>
      </div>

      {/* Name tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white truncate">{media.original_name}</p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </div>
      )}
    </div>
  )
}
