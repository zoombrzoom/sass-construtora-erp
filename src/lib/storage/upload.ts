import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase/config'

/**
 * Comprime uma imagem antes do upload
 */
function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Redimensionar se necessário
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Falha ao comprimir imagem'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Erro ao carregar imagem'))
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Faz upload de uma imagem para Firebase Storage
 */
export async function uploadImage(
  file: File,
  path: string,
  compress: boolean = true
): Promise<string> {
  try {
    if (!storage) {
      throw new Error('Firebase Storage não inicializado')
    }

    let fileToUpload: Blob | File = file
    
    // Comprimir se for imagem
    if (compress && file.type.startsWith('image/')) {
      fileToUpload = await compressImage(file)
    }
    
    const storageRef = ref(storage, path)
    const metadata = file.type ? { contentType: file.type } : undefined
    const snapshot = await uploadBytes(storageRef, fileToUpload, metadata)
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return downloadURL
  } catch (error: any) {
    const code = error?.code ? ` (${error.code})` : ''
    const serverResponse = error?.customData?.serverResponse || error?.serverResponse
    const details = serverResponse ? ` | ${serverResponse}` : ''
    console.error('Erro ao fazer upload da imagem:', error)
    throw new Error(`Falha no upload para "${path}"${code}${details}`)
  }
}

/**
 * Faz upload de múltiplas imagens
 */
export async function uploadImages(
  files: File[],
  basePath: string,
  compress: boolean = true
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file, index) => {
      const fileName = `${Date.now()}_${index}_${file.name}`
      const path = `${basePath}/${fileName}`
      return uploadImage(file, path, compress)
    })
    
    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error('Erro ao fazer upload das imagens:', error)
    throw error
  }
}

/**
 * Deleta uma imagem do Firebase Storage
 */
export async function deleteImage(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    throw error
  }
}
