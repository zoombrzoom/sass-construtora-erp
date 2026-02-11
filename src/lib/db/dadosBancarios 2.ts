import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION_NAME = 'dados_bancarios'

export interface DadosBancarios {
  id: string
  favorecido: string
  banco: string
  agencia?: string
  conta?: string
  chavePix?: string
  updatedAt?: Date
}

function getFavorecidoKey(favorecido: string): string {
  return favorecido.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}

export async function getDadosBancarios(): Promise<DadosBancarios[]> {
  if (!db) throw new Error('Firebase não está inicializado')

  const q = query(collection(db, COLLECTION_NAME), orderBy('favorecido', 'asc'))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    updatedAt: docSnap.data().updatedAt?.toDate?.() || undefined,
  })) as DadosBancarios[]
}

export async function saveDadosBancarios(data: {
  favorecido: string
  banco: string
  agencia?: string
  conta?: string
  chavePix?: string
}): Promise<void> {
  if (!db) throw new Error('Firebase não está inicializado')

  const favorecido = data.favorecido.trim()
  const banco = data.banco.trim()
  if (!favorecido || !banco) {
    return
  }

  const docId = getFavorecidoKey(favorecido)
  const docRef = doc(db, COLLECTION_NAME, docId)

  await setDoc(
    docRef,
    {
      favorecido,
      banco,
      agencia: data.agencia?.trim() || '',
      conta: data.conta?.trim() || '',
      chavePix: data.chavePix?.trim() || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}
