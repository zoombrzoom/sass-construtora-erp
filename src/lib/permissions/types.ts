export type UserRole = 'admin' | 'financeiro' | 'engenharia'

export interface User {
  id: string
  email: string
  nome: string
  role: UserRole
  obraId?: string // Apenas para engenharia
}

export interface Permission {
  canViewAllObras: boolean
  canViewLucro: boolean
  canApprovePurchases: boolean
  canManageUsers: boolean
  canViewAllFinanceiro: boolean
  obraIds?: string[] // Obras que o usuário pode acessar
}
