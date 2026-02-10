import { User, Permission } from './types'

const RESTRICTED_FINANCE_VIEW_USERS = new Set([
  'atendimento@majollo.com.br',
  'compras@majollo.com.br',
])

const CONTAS_PARTICULARES_USERS = new Set([
  'atendimento@majollo.com.br',
])

const CAIXINHA_ALLOWED_USERS = new Set([
  'atendimento@majollo.com.br',
])

function normalizeEmail(email?: string): string {
  return email?.trim().toLowerCase() || ''
}

function applyEmailOverrides(user: User, permissions: Permission): Permission {
  const email = normalizeEmail(user.email)
  let result = permissions

  if (RESTRICTED_FINANCE_VIEW_USERS.has(email)) {
    result = {
      ...result,
      canAccessFluxoCaixa: false,
      canViewSensitiveDashboardFinance: false,
    }
  }

  if (CONTAS_PARTICULARES_USERS.has(email)) {
    result = {
      ...result,
      canAccessContasParticulares: true,
    }
  }

  if (CAIXINHA_ALLOWED_USERS.has(email)) {
    result = {
      ...result,
      canAccessCaixinha: true,
    }
  }

  return result
}

function getNoAccessPermissions(): Permission {
  return {
    canViewAllObras: false,
    canViewLucro: false,
    canApprovePurchases: false,
    canManageUsers: false,
    canViewAllFinanceiro: false,
    canAccessFluxoCaixa: false,
    canAccessContasPessoais: false,
    canViewSensitiveDashboardFinance: false,
    canViewPrivateDocuments: false,
    canAccessContasParticulares: false,
    canAccessCaixinha: false,
  }
}

export function getPermissions(user: User | null): Permission {
  if (!user) {
    return getNoAccessPermissions()
  }

  let permissions: Permission

  switch (user.role) {
    case 'admin':
      permissions = {
        canViewAllObras: true,
        canViewLucro: true,
        canApprovePurchases: true,
        canManageUsers: true,
        canViewAllFinanceiro: true,
        canAccessFluxoCaixa: true,
        canAccessContasPessoais: true,
        canViewSensitiveDashboardFinance: true,
        canViewPrivateDocuments: true,
        canAccessContasParticulares: true,
        canAccessCaixinha: true,
      }
      break

    case 'financeiro':
      permissions = {
        canViewAllObras: true,
        canViewLucro: false,
        canApprovePurchases: true,
        canManageUsers: false,
        canViewAllFinanceiro: true,
        canAccessFluxoCaixa: true,
        canAccessContasPessoais: true,
        canViewSensitiveDashboardFinance: true,
        canViewPrivateDocuments: false,
        canAccessContasParticulares: false,
        canAccessCaixinha: true,
      }
      break

    case 'secretaria':
      permissions = {
        canViewAllObras: true,
        canViewLucro: false,
        canApprovePurchases: false,
        canManageUsers: false,
        canViewAllFinanceiro: true,
        canAccessFluxoCaixa: false,
        canAccessContasPessoais: true,
        canViewSensitiveDashboardFinance: false,
        canViewPrivateDocuments: false,
        canAccessContasParticulares: false,
        canAccessCaixinha: true,
      }
      break

    case 'engenharia':
      permissions = {
        canViewAllObras: false,
        canViewLucro: false,
        canApprovePurchases: false,
        canManageUsers: false,
        canViewAllFinanceiro: false,
        canAccessFluxoCaixa: true,
        canAccessContasPessoais: true,
        canViewSensitiveDashboardFinance: true,
        canViewPrivateDocuments: false,
        canAccessContasParticulares: false,
        canAccessCaixinha: false,
        obraIds: user.obraId ? [user.obraId] : [],
      }
      break

    default:
      permissions = getNoAccessPermissions()
      break
  }

  return applyEmailOverrides(user, permissions)
}

export function canAccessObra(user: User | null, obraId: string): boolean {
  if (!user) return false

  const permissions = getPermissions(user)

  if (permissions.canViewAllObras) return true
  if (permissions.obraIds?.includes(obraId)) return true

  return false
}
