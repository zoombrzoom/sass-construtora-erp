import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { Cotacao } from '@/types/compras'
import { getCotacao } from '../db/cotacoes'
import { getRequisicao } from '../db/requisicoes'
import { getObra } from '../db/obras'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  col: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #ccc',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 5,
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: '1 solid #ccc',
    fontSize: 10,
    color: '#666',
  },
})

interface PedidoPDFProps {
  cotacao: Cotacao
  requisicao: any
  obra: any
  fornecedorSelecionado: string
}

const PedidoPDF = ({ cotacao, requisicao, obra, fornecedorSelecionado }: PedidoPDFProps) => {
  const fornecedor = 
    fornecedorSelecionado === 'A' ? cotacao.fornecedorA :
    fornecedorSelecionado === 'B' ? cotacao.fornecedorB :
    cotacao.fornecedorC

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>PEDIDO DE COMPRA</Text>
          <Text>Data: {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Obra:</Text>
          <Text>{obra.nome}</Text>
          <Text>{obra.endereco}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Fornecedor:</Text>
          <Text>{fornecedor.nome}</Text>
          {fornecedor.cnpj && <Text>CNPJ: {fornecedor.cnpj}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Item:</Text>
          <Text>{cotacao.item}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Valor:</Text>
          <Text>R$ {fornecedor.preco.toFixed(2).replace('.', ',')}</Text>
        </View>

        {requisicao.itens && requisicao.itens.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Itens da Requisição:</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Descrição</Text>
                <Text style={styles.tableCell}>Quantidade</Text>
                <Text style={styles.tableCell}>Unidade</Text>
              </View>
              {requisicao.itens.map((item: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.descricao}</Text>
                  <Text style={styles.tableCell}>{item.quantidade}</Text>
                  <Text style={styles.tableCell}>{item.unidade}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Este documento foi gerado automaticamente pelo sistema ERP Construtora.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function gerarPedidoPDF(
  cotacaoId: string,
  fornecedorSelecionado: 'A' | 'B' | 'C'
): Promise<Blob> {
  try {
    const cotacao = await getCotacao(cotacaoId)
    if (!cotacao) {
      throw new Error('Cotação não encontrada')
    }

    const requisicao = await getRequisicao(cotacao.requisicaoId)
    if (!requisicao) {
      throw new Error('Requisição não encontrada')
    }

    const obra = await getObra(requisicao.obraId)
    if (!obra) {
      throw new Error('Obra não encontrada')
    }

    const doc = (
      <PedidoPDF
        cotacao={cotacao}
        requisicao={requisicao}
        obra={obra}
        fornecedorSelecionado={fornecedorSelecionado}
      />
    )

    const blob = await pdf(doc).toBlob()
    return blob
  } catch (error) {
    console.error('Erro ao gerar PDF do pedido:', error)
    throw error
  }
}
