/**
 * Script para restaurar coleções de folha de pagamento do backup.
 * Restaura: folhaPagamento, folhaFuncionarios, folha_pagamento_categorias
 *
 * Uso:
 *   node scripts/restoreFolha.mjs <email> <senha> [caminho-do-backup.json]
 *
 * O backup padrão é o mais recente encontrado em ~/Downloads.
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, doc, writeBatch, getDocs, Timestamp } from 'firebase/firestore'
import { readFileSync } from 'fs'

const FOLHA_COLLECTIONS = ['folhaPagamento', 'folhaFuncionarios', 'folha_pagamento_categorias']

const firebaseConfig = {
    apiKey: 'AIzaSyAADbgf6zhO0OrDcLI2F3QsCnrLaO-jOcM',
    authDomain: 'sass-construtora.firebaseapp.com',
    projectId: 'sass-construtora',
    storageBucket: 'sass-construtora.firebasestorage.app',
    messagingSenderId: '997750749569',
    appId: '1:997750749569:web:20c74908847c900da49080',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const MAX_BATCH = 400

function deserializeValue(value) {
    if (value === null || value === undefined) return value

    if (Array.isArray(value)) {
        return value.map((item) => deserializeValue(item))
    }

    if (typeof value === 'object') {
        if (value.__backupType === 'timestamp' || value.__backupType === 'date') {
            const d = new Date(String(value.value || ''))
            if (Number.isNaN(d.getTime())) return null
            return Timestamp.fromDate(d)
        }

        const result = {}
        Object.keys(value).forEach((key) => {
            result[key] = deserializeValue(value[key])
        })
        return result
    }

    return value
}

async function main() {
    const args = process.argv.slice(2)
    if (args.length < 2) {
        console.error('Uso: node scripts/restoreFolha.mjs <email> <senha> [backup.json]')
        process.exit(1)
    }

    const email = args[0]
    const password = args[1]
    const backupPath = args[2] || '/Users/David/Downloads/backup-sass-construtora-2026-02-14T18-20-04.json'

    console.log('📂 Carregando backup:', backupPath)
    const raw = readFileSync(backupPath, 'utf-8')
    const backup = JSON.parse(raw)

    const hasAnyCollection = FOLHA_COLLECTIONS.some((name) => {
        const docs = backup?.collections?.[name]
        return docs && Array.isArray(docs)
    })
    if (!hasAnyCollection) {
        console.error('❌ Nenhuma coleção de folha encontrada no backup (folhaPagamento, folhaFuncionarios, folha_pagamento_categorias).')
        process.exit(1)
    }

    // Autenticar
    console.log('🔐 Autenticando como', email, '...')
    try {
        await signInWithEmailAndPassword(auth, email, password)
        console.log('✅ Autenticado com sucesso.')
    } catch (err) {
        console.error('❌ Falha na autenticação:', err.message)
        process.exit(1)
    }

    let totalWritten = 0
    let totalDeleted = 0

    for (const COLLECTION_NAME of FOLHA_COLLECTIONS) {
        const folhaDocs = backup?.collections?.[COLLECTION_NAME]
        if (!folhaDocs || !Array.isArray(folhaDocs)) {
            console.log(`⏭️  Coleção ${COLLECTION_NAME} não presente no backup, ignorando.`)
            continue
        }

        console.log('')
        console.log(`📋 ${COLLECTION_NAME}: ${folhaDocs.length} documentos no backup.`)

        const currentSnap = await getDocs(collection(db, COLLECTION_NAME))
        console.log(`   Atualmente: ${currentSnap.size} documentos no Firestore.`)

        console.log('📝 Restaurando documentos...')
        let written = 0

        for (let i = 0; i < folhaDocs.length; i += MAX_BATCH) {
            const chunk = folhaDocs.slice(i, i + MAX_BATCH)
            const batch = writeBatch(db)

            for (const entry of chunk) {
                const ref = doc(db, COLLECTION_NAME, entry.id)
                batch.set(ref, deserializeValue(entry.data))
            }

            await batch.commit()
            written += chunk.length
            console.log(`   ✅ ${written}/${folhaDocs.length} gravados`)
        }

        const backupIds = new Set(folhaDocs.map((d) => d.id))
        const toDeleteIds = currentSnap.docs
            .map((d) => d.id)
            .filter((id) => !backupIds.has(id))

        if (toDeleteIds.length > 0) {
            console.log(`🗑️  Removendo ${toDeleteIds.length} documentos extras...`)
            for (let i = 0; i < toDeleteIds.length; i += MAX_BATCH) {
                const chunk = toDeleteIds.slice(i, i + MAX_BATCH)
                const batch = writeBatch(db)
                for (const id of chunk) {
                    batch.delete(doc(db, COLLECTION_NAME, id))
                }
                await batch.commit()
            }
        }

        totalWritten += written
        totalDeleted += toDeleteIds.length
        console.log(`   ✓ ${COLLECTION_NAME}: ${written} gravados, ${toDeleteIds.length} removidos`)
    }

    console.log('')
    console.log('🎉 Restauração da folha de pagamento concluída!')
    console.log(`   Total: ${totalWritten} documentos gravados, ${totalDeleted} extras removidos.`)
    process.exit(0)
}

main().catch((err) => {
    console.error('Erro fatal:', err)
    process.exit(1)
})
