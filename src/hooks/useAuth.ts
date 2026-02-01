'use client'

import { useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { User } from '@/lib/permissions/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  useEffect(() => {
    // Verificar se auth e db estão disponíveis (apenas no cliente)
    if (typeof window === 'undefined' || !auth || !db) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser && db) {
        try {
          // Buscar dados do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setMustChangePassword(userData.mustChangePassword === true)
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...userData,
            } as User)
          } else {
            setUser(null)
            setMustChangePassword(false)
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error)
          setUser(null)
          setMustChangePassword(false)
        }
      } else {
        setUser(null)
        setMustChangePassword(false)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<{ mustChangePassword: boolean }> => {
    if (!auth || !db) {
      throw new Error('Firebase não está inicializado. Verifique as configurações.')
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Verificar se o usuário precisa trocar a senha
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        return { mustChangePassword: userData.mustChangePassword === true }
      }
      
      return { mustChangePassword: false }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login')
    }
  }

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase não está inicializado. Verifique as configurações.')
    }
    try {
      await signOut(auth)
      setUser(null)
      setMustChangePassword(false)
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer logout')
    }
  }

  return {
    user,
    firebaseUser,
    loading,
    mustChangePassword,
    login,
    logout,
  }
}
