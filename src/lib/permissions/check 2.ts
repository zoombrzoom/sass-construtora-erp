import { User, Permission } from './types'

const USER_WITH_RESTRICTED_FINANCE_VIEW = 'atendimento@majollo.com.br'

function isRestrictedFinanceViewUser(user: User): boolean {
  return user.email?.trim().toLowerCase() === USER_WITH_RESTRICTED_FINANCE_VIEW
}

function applyUserOverrides(user: User, permissions: Permission): Permission {
  if (!isRestrictedFinanceViewUser(user)) {
    return permissions
  }

  return {
    ...permissions,
    canAccessFluxoCaixa: false,
    canAccessContasPessoais: false,
    canViewSensitiveDashboardFinance: false,
  }
}

export function getPermissions(user: User | null): Permission {
  if (!user) {
    return {
      canViewAllObras: false,
      canViewLucro: false,
      canApprovePurchases: false,
      canManageUsers: false,
      canViewAllFinanceiro: false,
      canAccessFluxoCaixa: false,
      canAccessContasPessoais: false,
      canViewSensitiveDashboardFinance: false,
    }
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
      }
      break
    
    case 'financeiro':
      permissions = {
        canViewAllObras: true,
        canViewLucro: false, // Não vê lucro total
        canApprovePurchases: true,
        canManageUsers: false,
        canViewAllFinanceiro: true,
        canAccessFluxoCaixa: true,
        canAccessContasPessoais: true,
        canViewSensitiveDashboardFinance: true,
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
        obraIds: user.obraId ? [user.obraId] : [],
      }
      break
    
    default:
      permissions = {
        canViewAllObras: false,
        canViewLucro: false,
        canApprovePurchases: false,
        canManageUsers: false,
        canViewAllFinanceiro: false,
        canAccessFluxoCaixa: false,
        canAccessContasPessoais: false,
        canViewSensitiveDashboardFinance: false,
      }
  }

  return applyUserOverrides(user, permissions)
}

export function canAccessObra(user: User | null, obraId: string): boolean {
  if (!user) return false
  
  const permissions = getPermissions(user)
  
  if (permissions.canViewAllObras) return true
  if (permissions.obraIds?.includes(obraId)) return true
  
  return false
}
