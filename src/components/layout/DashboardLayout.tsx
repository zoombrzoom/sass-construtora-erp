'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Menu, X, Home, Building2, Wallet, ShoppingCart, LogOut, ChevronDown, UserRound } from 'lucide-react'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/obras', label: 'Obras', icon: Building2 },
  { 
    label: 'Financeiro', 
    icon: Wallet,
    children: [
      { href: '/financeiro/contas-pagar', label: 'Contas a Pagar' },
      { href: '/financeiro/contas-receber', label: 'Contas a Receber' },
      { href: '/financeiro/fluxo-caixa', label: 'Fluxo de Caixa' },
    ]
  },
  { href: '/financeiro/contas-pessoais', label: 'Contas Pessoais', icon: UserRound },
  { 
    label: 'Compras', 
    icon: ShoppingCart,
    children: [
      { href: '/compras/requisicoes', label: 'Requisições' },
      { href: '/compras/cotacoes', label: 'Cotações' },
      { href: '/compras/pedidos', label: 'Pedidos' },
      { href: '/compras/recebimentos', label: 'Recebimentos' },
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

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Redirecionar para página de troca de senha se necessário
  useEffect(() => {
    if (mounted && !loading && user && mustChangePassword) {
      router.push('/set-password')
    }
  }, [user, loading, router, mounted, mustChangePassword])

  // Fechar menu mobile ao mudar de página
  useEffect(() => {
    setMobileMenuOpen(false)
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
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="text-lg text-brand">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="text-lg text-gray-400">Redirecionando...</div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <div className="min-h-screen bg-dark-800">
      {/* Header */}
      <nav className="bg-dark-500 border-b border-dark-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            {/* Logo e Menu Desktop */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <Image 
                  src="/logo_x1.png" 
                  alt="Majollo" 
                  width={100}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              
              {/* Menu Desktop */}
              <div className="hidden md:flex md:ml-8 md:space-x-1">
                {menuItems.map((item) => (
                  item.children ? (
                    <div key={item.label} className="relative group">
                      <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-brand rounded-lg hover:bg-dark-400 transition-colors">
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </button>
                      <div className="absolute left-0 mt-1 w-48 bg-dark-400 border border-dark-100 rounded-lg shadow-dark-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              isActive(child.href)
                                ? 'bg-brand/20 text-brand'
                                : 'text-gray-300 hover:bg-dark-300 hover:text-brand'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive(item.href!)
                          ? 'bg-brand/20 text-brand'
                          : 'text-gray-300 hover:text-brand hover:bg-dark-400'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  )
                ))}
              </div>
            </div>

            {/* Status e User Info */}
            <div className="flex items-center space-x-3">
              {!isOnline && (
                <span className="hidden sm:inline-flex text-xs text-warning bg-warning/20 px-2 py-1 rounded-full">
                  Offline
                </span>
              )}
              {isSyncing && (
                <span className="hidden sm:inline-flex text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                  Sincronizando...
                </span>
              )}
              
              {/* User info - Desktop */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-200">{user.nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-brand hover:bg-dark-400 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-brand hover:bg-dark-400 rounded-lg transition-colors min-h-touch min-w-touch flex items-center justify-center"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-dark-500 border-t border-dark-100">
            <div className="px-4 py-3 space-y-1">
              {/* Status badges mobile */}
              <div className="flex items-center space-x-2 pb-3 border-b border-dark-100">
                {!isOnline && (
                  <span className="text-xs text-warning bg-warning/20 px-2 py-1 rounded-full">
                    Offline
                  </span>
                )}
                {isSyncing && (
                  <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                    Sincronizando...
                  </span>
                )}
              </div>

              {/* Menu items mobile */}
              {menuItems.map((item) => (
                item.children ? (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className="w-full flex items-center justify-between px-3 py-3 text-base font-medium text-gray-300 hover:text-brand hover:bg-dark-400 rounded-lg transition-colors min-h-touch"
                    >
                      <span className="flex items-center">
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.label}
                      </span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedMenus.includes(item.label) && (
                      <div className="ml-8 space-y-1 mt-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-3 py-2.5 text-sm rounded-lg transition-colors min-h-touch flex items-center ${
                              isActive(child.href)
                                ? 'bg-brand/20 text-brand'
                                : 'text-gray-400 hover:bg-dark-400 hover:text-brand'
                            }`}
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
                    className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors min-h-touch ${
                      isActive(item.href!)
                        ? 'bg-brand/20 text-brand'
                        : 'text-gray-300 hover:text-brand hover:bg-dark-400'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                )
              ))}

              {/* User info mobile */}
              <div className="pt-3 mt-3 border-t border-dark-100">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{user.nome}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-2 text-sm text-gray-400 hover:text-brand hover:bg-dark-400 rounded-lg transition-colors min-h-touch"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8 pb-safe-bottom">
        {children}
      </main>
    </div>
  )
}
