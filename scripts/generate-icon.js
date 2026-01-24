const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function generateIcon() {
  try {
    const inputPath = path.join(__dirname, '..', 'public', 'logo_x1.png')
    const outputPath = path.join(__dirname, '..', 'public', 'logo_x1_dark.png')
    
    // Verificar se o arquivo original existe
    if (!fs.existsSync(inputPath)) {
      console.error('Arquivo logo_x1.png não encontrado em public/')
      process.exit(1)
    }
    
    // Criar fundo escuro (cor #0f0f0f que é a cor do tema)
    const darkBackground = sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 15, g: 15, b: 15, alpha: 1 } // #0f0f0f
      }
    })
    
    // Redimensionar e compor a imagem original sobre o fundo escuro
    await darkBackground
      .composite([
        {
          input: await sharp(inputPath)
            .resize(192, 192, { fit: 'contain' })
            .toBuffer(),
          gravity: 'center'
        }
      ])
      .png()
      .toFile(outputPath)
    
    console.log('✅ Ícone com fundo escuro gerado com sucesso: logo_x1_dark.png')
  } catch (error) {
    console.error('❌ Erro ao gerar ícone:', error)
    process.exit(1)
  }
}

generateIcon()
