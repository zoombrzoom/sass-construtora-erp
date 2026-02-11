import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where,
    type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { Empreiteiro, EmpreiteiroStatus } from '@/types/financeiro'

const COLLECTION_NAME = 'empreiteiros'

export async function getEmpreiteiro(id: string): Promise<Empreiteiro | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
            return null
        }

        const data = docSnap.data()
        return {
            id: docSnap.id,
            ...data,
            dataReferencia: data.dataReferencia?.toDate?.() || new Date(),
            dataPagamento: data.dataPagamento?.toDate?.() || undefined,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Empreiteiro
    } catch (error) {
        console.error('Erro ao buscar empreiteiro:', error)
        throw error
    }
}

export async function getEmpreiteiros(filters?: {
    status?: EmpreiteiroStatus
    obraId?: string
}): Promise<Empreiteiro[]> {
    try {
        const constraints: QueryConstraint[] = []

        if (filters?.status) {
            constraints.push(where('status', '==', filters.status))
        }
        if (filters?.obraId) {
            constraints.push(where('obraId', '==', filters.obraId))
        }

        const q = constraints.length > 0
            ? query(collection(db, COLLECTION_NAME), ...constraints)
            : collection(db, COLLECTION_NAME)

        const querySnapshot = await getDocs(q)

        return querySnapshot.docs.map((d) => {
            const data = d.data()
            return {
                id: d.id,
                ...data,
                dataReferencia: data.dataReferencia?.toDate?.() || new Date(),
                dataPagamento: data.dataPagamento?.toDate?.() || undefined,
                createdAt: data.createdAt?.toDate?.() || new Date(),
            } as Empreiteiro
        })
    } catch (error) {
        console.error('Erro ao buscar empreiteiros:', error)
        throw error
    }
}

export async function createEmpreiteiro(
    data: Omit<Empreiteiro, 'id' | 'createdAt'>
): Promise<string> {
    try {
        const cleanData: any = {
            empreiteiroNome: data.empreiteiroNome,
            obraId: data.obraId,
            servico: data.servico,
            medicaoNumero: data.medicaoNumero,
            percentualExecutado: data.percentualExecutado,
            valorContrato: data.valorContrato,
            valorMedicao: data.valorMedicao,
            valor: data.valor,
            valorPago: data.valorPago,
            status: data.status,
            dataReferencia: Timestamp.fromDate(data.dataReferencia as Date),
            createdBy: data.createdBy,
            createdAt: Timestamp.now(),
        }

        if (data.cpf) cleanData.cpf = data.cpf
        if (data.agencia) cleanData.agencia = data.agencia
        if (data.conta) cleanData.conta = data.conta
        if (data.formaPagamento) cleanData.formaPagamento = data.formaPagamento
        if (data.dataPagamento) {
            cleanData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
        }
        if (data.comprovanteUrl) cleanData.comprovanteUrl = data.comprovanteUrl
        if (data.observacoes) cleanData.observacoes = data.observacoes

        const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData)
        return docRef.id
    } catch (error) {
        console.error('Erro ao criar empreiteiro:', error)
        throw error
    }
}

export async function updateEmpreiteiro(
    id: string,
    data: Partial<Omit<Empreiteiro, 'id' | 'createdAt' | 'createdBy'>> & {
        formaPagamento?: string | null
        dataPagamento?: Timestamp | Date | null
        comprovanteUrl?: string | null
    }
): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id)
        const updateData: any = { ...data }

        if (data.dataReferencia) {
            updateData.dataReferencia = Timestamp.fromDate(data.dataReferencia as Date)
        }
        if (data.dataPagamento === null) {
            updateData.dataPagamento = null
        } else if (data.dataPagamento) {
            updateData.dataPagamento = Timestamp.fromDate(data.dataPagamento as Date)
        }

        await updateDoc(docRef, updateData)
    } catch (error) {
        console.error('Erro ao atualizar empreiteiro:', error)
        throw error
    }
}

export async function deleteEmpreiteiro(id: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, id)
        await deleteDoc(docRef)
    } catch (error) {
        console.error('Erro ao deletar empreiteiro:', error)
        throw error
    }
}
