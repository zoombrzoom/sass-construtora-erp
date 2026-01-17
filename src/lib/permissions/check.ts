import { User, UserRole, Permission } from './types'

export function getPermissions(user: User | null): Permission {
  if (!user) {
    return {
      canViewAllObras: false,
      canViewLucro: false,
      canApprovePurchases: false,
      canManageUsers: false,
      canViewAllFinanceiro: false,
    }
  }

  switch (user.role) {
    case 'admin':
      return {
        canViewAllObras: true,
        canViewLucro: true,
        canApprovePurchases: true,
        canManageUsers: true,
        canViewAllFinanceiro: true,
      }
    
    case 'financeiro':
      return {
        canViewAllObras: true,
        canViewLucro: false, // Não vê lucro total
        canApprovePurchases: true,
        canManageUsers: false,
        canViewAllFinanceiro: true,
      }
    
    case 'engenharia':
      return {
        canViewAllObras: false,
        canViewLucro: false,
        canApprovePurchases: false,
        canManageUsers: false,
        canViewAllFinanceiro: false,
        obraIds: user.obraId ? [user.obraId] : [],
      }
    
    default:
      return {
        canViewAllObras: false,
        canViewLucro: false,
        canApprovePurchases: false,
        canManageUsers: false,
        canViewAllFinanceiro: false,
      }
  }
}

export function canAccessObra(user: User | null, obraId: string): boolean {
  if (!user) return false
  
  const permissions = getPermissions(user)
  
  if (permissions.canViewAllObras) return true
  if (permissions.obraIds?.includes(obraId)) return true
  
  return false
}
