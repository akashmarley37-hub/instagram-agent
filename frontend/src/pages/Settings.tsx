import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Settings as SettingsIcon, Save, Zap, Shield, Sliders, Globe,
  Brain, Clock, Hash, Volume2
} from 'lucide-react'
import clsx from 'clsx'

type Tone = 'professional' | 'friendly' | 'creative' | 'minimal' | 'promotional' | 'inspirational'

interface UserSettings {
  defaultTone: Tone
  defaultLanguage: string
  defaultHashtags: string[]
  timezone: string
  brandInstructions: string
  postLength: 'short' | 'medium' | 'long'
}

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'creative', label: 'Creative', emoji: '🎨' },
  { value: 'minimal', label: 'Minimal', emoji: '⚡' },
  { value: 'promotional', label: 'Promotional', emoji: '🚀' },
  { value: 'inspirational', label: 'Inspirational', emoji: '✨' },
]

const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese']
const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore', 'Asia/Tokyo']

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    defaultTone: 'friendly',
    defaultLanguage: 'English',
    defaultHashtags: [],
    timezone: 'Asia/Kolkata',
    brandInstructions: '',
    postLength: 'medium',
  })

  const [newHashtag, setNewHashtag] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600)) // Simulate save
    setSaving(false)
    toast.success('Settings saved')
  }

  const addDefaultHashtag = () => {
    if (!newHashtag.trim()) return
    const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`
    if (!settings.defaultHashtags.includes(tag)) {
      setSettings(s => ({ ...s, defaultHashtags: [...s.defaultHashtags, tag] }))
    }
    setNewHashtag('')
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-5">
        <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <SettingsIcon size={20} className="text-primary-400" /> Settings
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">Customize your Instagram Agent preferences</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

        {/* Live Integrations Summary */}
        <div className="card p-5 border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-text-primary">Production Live Mode</h2>
            </div>
            <a
              href="/connections"
              className="text-xs text-primary-400 hover:text-primary-300 font-medium"
            >
              Manage Credentials →
            </a>
          </div>
          <p className="text-xs text-text-muted">
            All API interactions run directly against OpenAI, Meta Instagram Graph API, and Google Services.
            Credentials are configured via your backend <code className="bg-surface px-1 py-0.5 rounded text-primary-300">.env</code> file.
          </p>
        </div>

        {/* AI Preferences */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-primary-400" />
            <h2 className="text-sm font-semibold text-text-primary">AI Preferences</h2>
          </div>
          <div className="space-y-4">
            {/* Default Tone */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Default Caption Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSettings(s => ({ ...s, defaultTone: t.value }))}
                    className={clsx(
                      'px-3 py-2 rounded-lg text-xs font-medium transition-all text-left',
                      settings.defaultTone === t.value
                        ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                        : 'bg-surface border border-surface-border text-text-secondary hover:border-primary-500/30'
                    )}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Language */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Default Language</label>
              <select
                className="input text-sm"
                value={settings.defaultLanguage}
                onChange={e => setSettings(s => ({ ...s, defaultLanguage: e.target.value }))}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Post Length */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Preferred Post Length</label>
              <div className="flex gap-2">
                {['short', 'medium', 'long'].map(len => (
                  <button
                    key={len}
                    onClick={() => setSettings(s => ({ ...s, postLength: len as any }))}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all',
                      settings.postLength === len
                        ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                        : 'bg-surface border border-surface-border text-text-secondary hover:border-primary-500/30'
                    )}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand instructions */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Brand Instructions (optional)</label>
              <textarea
                className="textarea h-20 text-sm"
                placeholder="e.g. We're a sustainable fashion brand. Always mention eco-friendly values. Never use aggressive sales language."
                value={settings.brandInstructions}
                onChange={e => setSettings(s => ({ ...s, brandInstructions: e.target.value }))}
              />
              <p className="text-xs text-text-muted mt-1">These instructions are included in every AI generation prompt.</p>
            </div>
          </div>
        </div>

        {/* Default Hashtags */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hash size={16} className="text-primary-400" />
            <h2 className="text-sm font-semibold text-text-primary">Default Hashtags</h2>
          </div>
          <p className="text-xs text-text-secondary mb-3">These hashtags will be automatically added to every generated post.</p>
          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-surface rounded-lg border border-surface-border mb-3">
            {settings.defaultHashtags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-600/15 border border-primary-500/20 text-primary-300 text-xs">
                {tag}
                <button
                  onClick={() => setSettings(s => ({ ...s, defaultHashtags: s.defaultHashtags.filter(h => h !== tag) }))}
                  className="hover:text-error ml-0.5 text-[10px]"
                >
                  ✕
                </button>
              </span>
            ))}
            {settings.defaultHashtags.length === 0 && (
              <span className="text-xs text-text-muted">No default hashtags</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Add hashtag…"
              value={newHashtag}
              onChange={e => setNewHashtag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDefaultHashtag()}
            />
            <button onClick={addDefaultHashtag} className="btn-secondary px-4 text-sm">Add</button>
          </div>
        </div>

        {/* Timezone */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-primary-400" />
            <h2 className="text-sm font-semibold text-text-primary">Timezone & Scheduling</h2>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Default Timezone</label>
            <select
              className="input text-sm"
              value={settings.timezone}
              onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
            <p className="text-xs text-text-muted mt-2">Scheduled posts will use this timezone by default.</p>
          </div>
        </div>

        {/* Security info */}
        <div className="card p-5 border-surface-border">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">API Configuration</h2>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            API keys are configured via environment variables and are never stored in the frontend.
          </p>
          <div className="space-y-2">
            {[
              { label: 'OpenAI API Key', env: 'OPENAI_API_KEY', masked: '••••••••••••••••' },
              { label: 'Instagram Access Token', env: 'INSTAGRAM_ACCESS_TOKEN', masked: '••••••••••••••••' },
              { label: 'Google Client Secret', env: 'GOOGLE_CLIENT_SECRET', masked: '••••••••••••••••' },
            ].map(item => (
              <div key={item.env} className="flex items-center justify-between p-2.5 rounded-lg bg-surface">
                <div>
                  <p className="text-xs font-medium text-text-primary">{item.label}</p>
                  <p className="text-[10px] text-text-muted font-mono">{item.env}</p>
                </div>
                <code className="text-xs text-text-muted font-mono">{item.masked}</code>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-3">
            Edit credentials in <code className="bg-surface px-1 rounded">backend/.env</code>
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3 font-semibold"
        >
          {saving ? (
            <><span className="animate-spin inline-block">◌</span> Saving…</>
          ) : (
            <><Save size={16} /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  )
}
