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

  useEffect(() => {
    // Verificar se auth e db estão disponíveis (apenas no cliente)
    if (typeof window === 'undefined' || !auth || !db) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          // Buscar dados do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...userDoc.data(),
            } as User)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase não está inicializado. Verifique as configurações.')
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
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
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer logout')
    }
  }

  return {
    user,
    firebaseUser,
    loading,
    login,
    logout,
  }
}
