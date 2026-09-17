import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Wand2, Image, Calendar, Activity, Link2, Settings,
  Sparkles, ChevronRight, Zap, Menu, X
} from 'lucide-react'
import { configAPI } from '../services/api'
import type { AppConfig } from '../types'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/studio', icon: Wand2, label: 'Content Studio' },
  { to: '/library', icon: Image, label: 'Media Library' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/connections', icon: Link2, label: 'Connections' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    configAPI.get().then(r => setConfig(r.data)).catch(() => {
      // Default to live unconfigured if backend is unreachable
      setConfig({ demo_mode: false, app_mode: 'live', openai_configured: false, instagram_configured: false, google_configured: false })
    })
  }, [])

  return (
    <div className="flex h-screen bg-surface-dark overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:relative inset-y-0 left-0 z-30 w-64 flex flex-col',
        'bg-surface border-r border-surface-border',
        'transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">Instagram Agent</h1>
            <p className="text-xs text-text-muted">AI Content Studio</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        {/* Status indicator */}
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-text-primary">Production Live</span>
            </div>
            <span className="text-[10px] text-text-muted">Real APIs</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-all duration-150 group',
                isActive
                  ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-primary-400' : 'text-text-muted group-hover:text-text-secondary'} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-primary-500" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Create Post CTA */}
        <div className="px-4 pb-6">
          <button
            onClick={() => { navigate('/studio'); setSidebarOpen(false) }}
            className="w-full btn-gradient py-3 rounded-xl font-semibold text-sm"
          >
            <Wand2 size={16} />
            Create Post
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex lg:hidden items-center gap-4 px-4 py-3 bg-surface border-b border-surface-border">
          <button onClick={() => setSidebarOpen(true)} className="text-text-muted hover:text-text-primary">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-primary flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold">Instagram Agent</span>
          </div>

        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
