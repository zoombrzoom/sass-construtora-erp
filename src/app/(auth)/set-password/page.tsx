'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { SetPasswordForm } from '@/components/modules/auth/SetPasswordForm'

export default function SetPasswordPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    if (!auth || !db) {
      router.push('/login')
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login')
        return
      }

      try {
        // Verificar se o usuário precisa trocar a senha
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          
          if (!userData.mustChangePassword) {
            // Se não precisa trocar senha, redirecionar para dashboard
            router.push('/dashboard')
            return
          }
          
          setUserId(firebaseUser.uid)
          setUserEmail(firebaseUser.email || '')
        } else {
          // Usuário não existe no Firestore
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
        router.push('/login')
        return
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return <SetPasswordForm userId={userId} userEmail={userEmail} />
}
