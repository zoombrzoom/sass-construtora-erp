'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import {
  Menu,
  X,
  Home,
  Building2,
  Wallet,
  ShoppingCart,
  LogOut,
  ChevronDown,
  UserRound,
  Key,
  Database,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AppFooter } from '@/components/ui/AppFooter'
import { ChangePasswordModal } from '@/components/modules/auth/ChangePasswordModal'
import { UndoRedoButton } from '@/components/ui/UndoRedoButton'
import { getPermissions } from '@/lib/permissions/check'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/obras', label: 'Obras e Gestão', icon: Building2 },
  {
    label: 'Financeiro',
    icon: Wallet,
    children: [
      { href: '/financeiro/contas-pagar', label: 'Contas a Pagar' },
      { href: '/financeiro/contas-receber', label: 'Contas a Receber' },
      { href: '/financeiro/folha-pagamento', label: 'Folha de Pagamento' },
      { href: '/financeiro/empreiteiros', label: 'Empreiteiros' },
      { href: '/financeiro/fluxo-caixa', label: 'Fluxo de Caixa' },
      { href: '/financeiro/caixinha', label: 'Caixinha' },
    ]
  },
  { href: '/financeiro/contas-pessoais', label: 'Contas Pessoais', icon: UserRound },
  {
    label: 'Compras',
    icon: ShoppingCart,
    children: [
      { href: '/compras/requisicoes', label: 'Pedidos e Compras' },
      { href: '/compras/cotacoes', label: 'Cotações' },
    ]
  },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, mustChangePassword } = useAuth()
  const { isOnline, isSyncing } = useOfflineSync()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  useEffect(() => {
    if (mounted && !loading && user && mustChangePassword) {
      router.push('/set-password')
    }
  }, [user, loading, router, mounted, mustChangePassword])

  // Bloquear rotas sem permissão
  useEffect(() => {
    if (!mounted || loading || !user) return

    const permissions = getPermissions(user)
    const blockedRoutes = [
      !permissions.canAccessFluxoCaixa && '/financeiro/fluxo-caixa',
      !permissions.canAccessContasPessoais && '/financeiro/contas-pessoais',
      !permissions.canViewAllFinanceiro && '/financeiro/folha-pagamento',
      !permissions.canAccessCaixinha && '/financeiro/caixinha',
      !permissions.canManageUsers && '/backup',
    ].filter(Boolean) as string[]

    const isBlockedRoute = blockedRoutes.some((route) => pathname === route || pathname?.startsWith(route + '/'))

    if (isBlockedRoute) {
      router.replace('/dashboard')
    }
  }, [mounted, loading, user, pathname, router])

  // Fechar menu mobile ao mudar de página
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Auto-expand menus based on current path
  useEffect(() => {
    if (!pathname) return
    menuItems.forEach(item => {
      if (item.children?.some(child => pathname.startsWith(child.href))) {
        setExpandedMenus(prev => prev.includes(item.label) ? prev : [...prev, item.label])
      }
    })
  }, [pathname])

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center animate-pulse-soft">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Redirecionando...</p>
      </div>
    )
  }

  const permissions = getPermissions(user)
  const visibleMenuItems = menuItems
    .filter((item) => item.href !== '/financeiro/contas-pessoais' || permissions.canAccessContasPessoais)
    .map((item) => {
      if (!item.children) return item

      return {
        ...item,
        children: item.children.filter((child) => {
          if (child.href === '/financeiro/fluxo-caixa' && !permissions.canAccessFluxoCaixa) return false
          if (child.href === '/financeiro/folha-pagamento' && !permissions.canViewAllFinanceiro) return false
          if (child.href === '/financeiro/caixinha' && !permissions.canAccessCaixinha) return false
          return true
        }),
      }
    })
    .filter((item) => !item.children || item.children.length > 0)

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const userInitials = user.nome ? user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* ===== SIDEBAR (Desktop) ===== */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out"
        style={{
          width: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
          background: 'var(--background-sidebar)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Sidebar header / Logo */}
        <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 animate-fade-in">
              <Image
                src="/logo_x1.png"
                alt="Majollo"
                width={120}
                height={36}
                className="h-9 w-auto"
                priority
              />
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/dashboard" className="mx-auto">
              <Image
                src="/logo_x1.png"
                alt="Majollo"
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
                priority
              />
            </Link>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleMenuItems.map((item) =>
            item.children ? (
              <div key={item.label}>
                <button
                  onClick={() => toggleSubmenu(item.label)}
                  className={`sidebar-item w-full ${sidebarCollapsed ? 'justify-center px-3' : ''}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>
                {!sidebarCollapsed && expandedMenus.includes(item.label) && (
                  <div className="ml-4 mt-1 space-y-0.5 animate-fade-in">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sidebar-item text-[13px] pl-8 ${isActive(child.href) ? 'active' : ''}`}
                      >
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className={`sidebar-item ${sidebarCollapsed ? 'justify-center px-3' : ''} ${isActive(item.href!) ? 'active' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          {!sidebarCollapsed && (
            <>
              {permissions.canManageUsers && (
                <Link href="/backup" className="sidebar-item text-[13px]">
                  <Database className="w-4 h-4" />
                  <span>Backup</span>
                </Link>
              )}
              <button
                onClick={() => setShowChangePassword(true)}
                className="sidebar-item text-[13px] w-full"
              >
                <Key className="w-4 h-4" />
                <span>Alterar Senha</span>
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-[13px] hover:!text-red-500"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}
      >
        {/* Top Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-6 lg:px-8"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex-shrink-0 p-2 rounded-xl transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile logo */}
            <Link href="/dashboard" className="lg:hidden flex items-center flex-shrink-0">
              <Image src="/logo_x1.png" alt="Majollo" width={80} height={24} className="h-6 w-auto" priority />
            </Link>

            {/* Desktop: sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex flex-shrink-0 p-2 rounded-xl transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
              title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page breadcrumb / title */}
            <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
              <span style={{ color: 'var(--foreground)' }} className="font-semibold">
                {pathname === '/dashboard' ? 'Dashboard' :
                  pathname?.includes('/obras') ? 'Obras e Gestão' :
                    pathname?.includes('/financeiro') ? 'Financeiro' :
                      pathname?.includes('/compras') ? 'Compras' : 'Majollo'}
              </span>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Status badges */}
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
            {isSyncing && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(79, 140, 255, 0.1)', color: 'var(--accent-blue)' }}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Sincronizando</span>
              </div>
            )}

            <ThemeToggle />

            {/* User avatar + dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-xl transition-all hover:bg-[var(--background-hover)]">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
                >
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>{user.nome}</p>
                  <p className="text-[11px] capitalize leading-tight" style={{ color: 'var(--foreground-muted)' }}>{user.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 hidden sm:block" style={{ color: 'var(--foreground-muted)' }} />
              </button>

              {/* Dropdown */}
              <div
                className="absolute right-0 mt-2 w-52 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden"
                style={{
                  background: 'var(--background-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{user.nome}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--foreground-muted)' }}>{user.role}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-[var(--background-hover)]"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    <Key className="w-4 h-4" />
                    Alterar Senha
                  </button>
                  {permissions.canManageUsers && (
                    <Link
                      href="/backup"
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-[var(--background-hover)]"
                      style={{ color: 'var(--foreground-secondary)' }}
                    >
                      <Database className="w-4 h-4" />
                      Backup
                    </Link>
                  )}
                </div>
                <div className="p-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    style={{ color: 'var(--error)' }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden animate-slide-in-left overflow-y-auto"
              style={{
                background: 'var(--background-sidebar)',
                borderRight: '1px solid var(--border)',
              }}
            >
              {/* Mobile sidebar header */}
              <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <Link href="/dashboard" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                  <Image src="/logo_x1.png" alt="Majollo" width={100} height={32} className="h-8 w-auto" priority />
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--foreground-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User info mobile */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
                  >
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{user.nome}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--foreground-muted)' }}>{user.role}</p>
                  </div>
                </div>

                {/* Status badges mobile */}
                <div className="flex items-center gap-2 mt-3">
                  {!isOnline && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                      <WifiOff className="w-3 h-3" /> Offline
                    </span>
                  )}
                  {isSyncing && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ background: 'rgba(79, 140, 255, 0.1)', color: 'var(--accent-blue)' }}>
                      <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando
                    </span>
                  )}
                  <ThemeToggle />
                </div>
              </div>

              {/* Mobile nav items */}
              <nav className="p-3 space-y-1">
                {visibleMenuItems.map((item) =>
                  item.children ? (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleSubmenu(item.label)}
                        className="sidebar-item w-full"
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedMenus.includes(item.label) && (
                        <div className="ml-4 mt-1 space-y-0.5 animate-fade-in">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`sidebar-item text-[13px] pl-8 ${isActive(child.href) ? 'active' : ''}`}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href!}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`sidebar-item ${isActive(item.href!) ? 'active' : ''}`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                )}
              </nav>

              {/* Mobile bottom actions */}
              <div className="p-3 mt-auto space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
                {permissions.canManageUsers && (
                  <Link href="/backup" onClick={() => setMobileMenuOpen(false)} className="sidebar-item text-[13px]">
                    <Database className="w-4 h-4" />
                    <span>Backup</span>
                  </Link>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); setShowChangePassword(true); }}
                  className="sidebar-item text-[13px] w-full"
                >
                  <Key className="w-4 h-4" />
                  <span>Alterar Senha</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="sidebar-item w-full text-[13px] hover:!text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0">
          <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col min-h-0 py-5 px-4 sm:py-6 sm:px-6 lg:px-8 pb-safe-bottom">
            {children}
          </div>
          <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <AppFooter />
          </div>
        </main>
      </div>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Botão fixo Desfazer / Refazer */}
      <UndoRedoButton />
    </div>
  )
}
