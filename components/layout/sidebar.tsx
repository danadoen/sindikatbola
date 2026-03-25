'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/app-context'
import { LOCALES, type Locale } from '@/lib/i18n'
import {
  Activity,
  BarChart3,
  Brain,
  ChevronRight,
  Database,
  Flame,
  Globe,
  LayoutDashboard,
  Menu,
  Moon,
  Radio,
  Settings,
  Shield,
  Sun,
  X,
  Zap,
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, theme, toggleTheme, locale, setLocale, t } = useApp()

  const NAV_ITEMS = [
    {
      label: t('nav_overview'),
      items: [
        { href: '/', label: t('nav_dashboard'), icon: LayoutDashboard },
        { href: '/live', label: t('nav_live'), icon: Radio, badge: 'LIVE' },
        { href: '/traps', label: t('nav_traps'), icon: Flame },
      ],
    },
    {
      label: t('nav_analysis'),
      items: [
        { href: '/algorithms', label: t('nav_algorithms'), icon: Brain },
        { href: '/markets', label: t('nav_markets'), icon: BarChart3 },
        { href: '/sentiment', label: t('nav_sentiment'), icon: Globe },
      ],
    },
    {
      label: t('nav_system'),
      items: [
        { href: '/data', label: t('nav_data'), icon: Database },
        { href: '/settings', label: t('nav_settings'), icon: Settings },
      ],
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed lg:relative z-30 flex flex-col h-screen bg-sidebar border-r border-sidebar-border overflow-y-auto transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-56 translate-x-0' : 'w-0 lg:w-14 -translate-x-full lg:translate-x-0 overflow-hidden'
        )}
      >
        {/* Logo + burger */}
        <div className="flex items-center gap-2.5 px-3 py-4 border-b border-sidebar-border shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 border border-primary/30 shrink-0">
            <Shield className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary pulse-live" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground leading-none tracking-wider">SINDIKAT</p>
              <p className="text-[10px] text-primary font-mono leading-none mt-0.5 tracking-widest">BOLA v1.0</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Engine status — only when expanded */}
        {sidebarOpen && (
          <div className="mx-3 mt-3 mb-1 p-2.5 rounded-md bg-surface-2 border border-border/60 shrink-0">
            <p className="text-[10px] font-mono text-muted-foreground mb-1.5 tracking-widest">
              {t('sys_engine_status')}
            </p>
            <div className="flex flex-col gap-1">
              {[
                { key: 'sys_python_engine', color: 'bg-signal-safe' },
                { key: 'sys_node_watcher', color: 'bg-signal-safe' },
                { key: 'sys_market_sync', color: 'bg-signal-warn' },
              ].map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.color} pulse-live shrink-0`} />
                  <span className="text-[10px] font-mono text-muted-foreground">{t(s.key)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed engine dots */}
        {!sidebarOpen && (
          <div className="flex flex-col items-center gap-1.5 mt-3 mb-1">
            {['bg-signal-safe', 'bg-signal-safe', 'bg-signal-warn'].map((c, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${c} pulse-live`} />
            ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2">
          {NAV_ITEMS.map((group) => (
            <div key={group.label} className="mb-4">
              {sidebarOpen && (
                <p className="px-2 mb-1 text-[10px] font-mono text-muted-foreground/60 tracking-widest truncate">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={!sidebarOpen ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md text-[13px] transition-all group',
                          sidebarOpen ? 'px-2 py-1.5' : 'justify-center px-1 py-2',
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-sidebar-foreground/70 hover:bg-accent hover:text-sidebar-foreground border border-transparent'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {sidebarOpen && (
                          <>
                            <span className="flex-1 font-medium truncate">{item.label}</span>
                            {'badge' in item && item.badge && (
                              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-signal-trap/20 text-signal-trap border border-signal-trap/30">
                                {item.badge}
                              </span>
                            )}
                            {isActive && <ChevronRight className="w-3 h-3 text-primary opacity-60" />}
                          </>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom: theme + language */}
        <div className={cn('border-t border-sidebar-border shrink-0', sidebarOpen ? 'px-3 py-3' : 'px-1.5 py-3')}>
          {sidebarOpen ? (
            <>
              {/* Market sync info */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3 h-3 text-signal-warn shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground">{t('sys_market_sync_label')}: 2m {t('sys_ago')}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <Activity className="w-3 h-3 text-signal-safe shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground">312 {t('sys_markets_active')}</span>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-1.5"
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                {theme === 'dark' ? t('theme_dark') : t('theme_light')}
              </button>

              {/* Language picker */}
              <div className="flex gap-1 flex-wrap mt-1">
                {(Object.keys(LOCALES) as Locale[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    title={LOCALES[l].label}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all',
                      locale === l
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                    )}
                  >
                    <span>{LOCALES[l].flag}</span>
                    <span>{l.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Collapsed: icon-only theme + language */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? t('theme_dark') : t('theme_light')}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  const locales = Object.keys(LOCALES) as Locale[]
                  const next = locales[(locales.indexOf(locale) + 1) % locales.length]
                  setLocale(next)
                }}
                title={LOCALES[locale].label}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm"
              >
                {LOCALES[locale].flag}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
