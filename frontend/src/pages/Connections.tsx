import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Link2, CheckCircle2, XCircle, AlertCircle, Loader2,
  RefreshCw, Brain, Instagram, HardDrive, Table2, ExternalLink
} from 'lucide-react'
import { integrationsAPI, driveAPI } from '../services/api'
import type { Integration } from '../types'
import clsx from 'clsx'

const ICON_MAP: Record<string, any> = {
  brain: Brain,
  instagram: Instagram,
  'hard-drive': HardDrive,
  table: Table2,
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string; border: string }> = {
  connected: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-500/30',
    label: 'Connected'
  },
  not_configured: {
    icon: XCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-950/10',
    border: 'border-amber-500/20',
    label: 'Configuration Required'
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-950/20',
    border: 'border-rose-500/30',
    label: 'Connection Error'
  },
}

function IntegrationCard({
  integration,
  onTest,
  onConnectGoogle
}: {
  integration: Integration;
  onTest: () => void;
  onConnectGoogle?: () => void;
}) {
  const [testing, setTesting] = useState(false)
  const cfg = STATUS_CONFIG[integration.status] || STATUS_CONFIG.not_configured
  const StatusIcon = cfg.icon
  const ServiceIcon = ICON_MAP[integration.icon] || Link2

  const handleTest = async () => {
    setTesting(true)
    try {
      await onTest()
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={clsx('card border p-5 transition-all duration-200', cfg.bg, cfg.border)}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-surface-card flex items-center justify-center flex-shrink-0 border border-surface-border">
          <ServiceIcon size={20} className={integration.configured ? 'text-primary-400' : 'text-text-muted'} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-text-primary">{integration.display_name}</h3>
            <div className={clsx('badge text-[11px] font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-full border', cfg.bg, cfg.border, cfg.color)}>
              <StatusIcon size={11} />
              {cfg.label}
            </div>
          </div>
          <p className="text-xs text-text-secondary">{integration.description}</p>

          {integration.status === 'connected' && (
            <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
              ✓ Active and operational
            </p>
          )}

          {integration.status === 'not_configured' && (
            <div className="mt-2 text-xs text-amber-300/90 bg-surface/80 p-2.5 rounded-lg border border-amber-500/20">
              <p className="font-medium text-amber-300 mb-0.5">Configuration Required:</p>
              <p className="text-text-muted text-[11px]">
                {integration.setup_guide || 'Add your credentials to backend/.env to connect.'}
              </p>
            </div>
          )}

          {/* Action button for Google Drive OAuth */}
          {integration.service === 'google_drive' && integration.status !== 'connected' && onConnectGoogle && (
            <div className="mt-3">
              <button
                onClick={onConnectGoogle}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <ExternalLink size={12} />
                Authorize Google Account
              </button>
            </div>
          )}
        </div>

        {/* Test button */}
        <button
          onClick={handleTest}
          disabled={testing}
          className="btn-ghost text-xs py-1.5 px-3 flex-shrink-0 border border-surface-border hover:border-primary-500/40"
        >
          {testing ? <Loader2 size={12} className="animate-spin text-primary-400" /> : <RefreshCw size={12} />}
          <span>Test</span>
        </button>
      </div>
    </div>
  )
}

export default function Connections() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIntegrations = async () => {
    setLoading(true)
    try {
      const res = await integrationsAPI.list()
      setIntegrations(res.data.integrations || [])
    } catch {
      toast.error('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const handleTest = async (service: string) => {
    try {
      const res = await integrationsAPI.test(service)
      const data = res.data
      if (data.connected || data.status === 'connected') {
        toast.success(`${service} connection verified!`, { icon: '✓' })
      } else {
        toast.error(`${service}: ${data.message || data.status || 'Not connected'}`)
      }
      fetchIntegrations()
    } catch (e: any) {
      toast.error(`Test failed: ${e.message}`)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      const res = await driveAPI.getAuthUrl()
      if (res.data.url) {
        window.location.href = res.data.url
      } else {
        toast.error(res.data.message || 'Google OAuth credentials not configured in backend/.env')
      }
    } catch (e: any) {
      toast.error(`Google auth error: ${e.message}`)
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-surface border-b border-surface-border px-6 py-5">
        <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Link2 size={20} className="text-primary-400" /> API & Service Connections
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Manage real external integrations for OpenAI, Instagram Graph API, Google Drive, and Google Sheets.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Production setup guide */}
        <div className="card p-5 border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Configuration Instructions</h3>
          <p className="text-xs text-text-muted mb-3">
            All integrations use real production credentials configured in <code className="bg-surface px-1 py-0.5 rounded text-primary-300">backend/.env</code>.
            Missing credentials display <strong className="text-amber-400">Configuration Required</strong> and refuse fake publishing.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-surface/60 p-3 rounded-lg border border-surface-border">
              <span className="font-semibold text-text-primary block mb-1">🤖 OpenAI GPT-4o</span>
              <span className="text-text-muted">Set <code className="text-primary-300">OPENAI_API_KEY</code></span>
            </div>
            <div className="bg-surface/60 p-3 rounded-lg border border-surface-border">
              <span className="font-semibold text-text-primary block mb-1">📸 Instagram Graph API</span>
              <span className="text-text-muted">Set <code className="text-primary-300">INSTAGRAM_ACCESS_TOKEN</code> and <code className="text-primary-300">INSTAGRAM_BUSINESS_ACCOUNT_ID</code></span>
            </div>
            <div className="bg-surface/60 p-3 rounded-lg border border-surface-border">
              <span className="font-semibold text-text-primary block mb-1">📁 Google Drive</span>
              <span className="text-text-muted">Set <code className="text-primary-300">GOOGLE_CLIENT_ID</code> + <code className="text-primary-300">GOOGLE_CLIENT_SECRET</code> or Service Account</span>
            </div>
            <div className="bg-surface/60 p-3 rounded-lg border border-surface-border">
              <span className="font-semibold text-text-primary block mb-1">📊 Google Sheets</span>
              <span className="text-text-muted">Set <code className="text-primary-300">GOOGLE_SHEETS_SPREADSHEET_ID</code></span>
            </div>
          </div>
        </div>

        {/* Integration cards */}
        <div>
          <h2 className="section-label mb-3">Live Service Status</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-5">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl shimmer flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded shimmer" />
                      <div className="h-3 w-56 rounded shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map(integration => (
                <IntegrationCard
                  key={integration.service}
                  integration={integration}
                  onTest={() => handleTest(integration.service)}
                  onConnectGoogle={integration.service === 'google_drive' ? handleConnectGoogle : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Security notice */}
        <div className="card p-4 border-amber-500/20 bg-amber-950/10">
          <h3 className="text-sm font-semibold text-amber-300 mb-1.5 flex items-center gap-2">
            <AlertCircle size={15} /> Credential Security
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            API keys and tokens are strictly kept on the backend in your local environment file and are never sent to the browser.
            Do not commit secrets or <code className="bg-surface px-1 rounded text-primary-300">.env</code> to version control.
          </p>
        </div>
      </div>
    </div>
  )
}
