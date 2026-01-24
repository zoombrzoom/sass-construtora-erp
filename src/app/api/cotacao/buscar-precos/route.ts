import { NextRequest, NextResponse } from 'next/server'

interface ItemPreco {
  descricao: string
  quantidade: number
  unidade?: string
  precoMedio?: number
  precoMinimo?: number
  precoMaximo?: number
  fornecedoresEncontrados?: number
  observacoes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itens, regiao } = body

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { error: 'Lista de itens é obrigatória' },
        { status: 400 }
      )
    }

    // Simular busca de preços via IA
    // Em produção, você pode integrar com OpenAI, Google AI, ou outro serviço
    const precosEncontrados: ItemPreco[] = await Promise.all(
      itens.map(async (item: any) => {
        // Aqui você pode integrar com uma API de IA real
        // Por enquanto, vamos simular uma resposta baseada em dados de mercado
        
        const descricao = item.descricao.toLowerCase()
        const quantidade = item.quantidade || 1
        
        // Simulação de preços baseados em categorias comuns
        let precoBase = 0
        
        if (descricao.includes('cimento') || descricao.includes('cimento')) {
          precoBase = 35 // R$ por saco de 50kg
        } else if (descricao.includes('tijolo') || descricao.includes('bloco')) {
          precoBase = 0.85 // R$ por unidade
        } else if (descricao.includes('areia') || descricao.includes('areia')) {
          precoBase = 45 // R$ por m³
        } else if (descricao.includes('brita') || descricao.includes('pedra')) {
          precoBase = 65 // R$ por m³
        } else if (descricao.includes('ferro') || descricao.includes('aço')) {
          precoBase = 4.5 // R$ por kg
        } else if (descricao.includes('tinta')) {
          precoBase = 120 // R$ por galão
        } else if (descricao.includes('telha')) {
          precoBase = 8.5 // R$ por unidade
        } else if (descricao.includes('tinta') || descricao.includes('pintura')) {
          precoBase = 120 // R$ por galão
        } else {
          // Preço genérico para itens não identificados
          precoBase = 50
        }
        
        // Adicionar variação de ±15% para simular variação de mercado
        const variacao = 0.15
        const precoMinimo = precoBase * (1 - variacao)
        const precoMaximo = precoBase * (1 + variacao)
        const precoMedio = precoBase
        
        // Se você quiser usar uma API de IA real, descomente e configure:
        /*
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em preços de materiais de construção. Forneça preços médios de mercado para materiais de construção na região especificada.'
              },
              {
                role: 'user',
                content: `Qual o preço médio de mercado para "${item.descricao}" na região de ${regiao || 'Brasil'}? Forneça preço médio, mínimo e máximo em formato JSON: {precoMedio: number, precoMinimo: number, precoMaximo: number, observacoes: string}`
              }
            ]
          })
        })
        
        const data = await response.json()
        // Processar resposta da IA...
        */
        
        return {
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade || item.info,
          precoMedio: Math.round(precoMedio * 100) / 100,
          precoMinimo: Math.round(precoMinimo * 100) / 100,
          precoMaximo: Math.round(precoMaximo * 100) / 100,
          fornecedoresEncontrados: Math.floor(Math.random() * 20) + 5, // Simulação
          observacoes: regiao 
            ? `Preços médios para a região de ${regiao}. Variação de mercado considerada.`
            : 'Preços médios de mercado. Considere variações regionais.'
        }
      })
    )

    return NextResponse.json({
      success: true,
      precos: precosEncontrados,
      regiao: regiao || 'Brasil',
      dataConsulta: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Erro ao buscar preços:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar preços de mercado' },
      { status: 500 }
    )
  }
}
