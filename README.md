# ERP Construtora - Sistema de Gestão Interna

Sistema completo de gestão para construtoras com controle de custos, compras, financeiro e gestão de obras.

## Tecnologias

- Next.js 14+ (App Router)
- TypeScript
- Firebase (Firestore, Storage, Authentication)
- Tailwind CSS
- PWA (Progressive Web App) com suporte offline

## Funcionalidades

### Módulos Principais

1. **Obras (Centro de Custos)**
   - Cadastro e gestão de obras
   - Controle de status (ativa, pausada, concluída)

2. **Financeiro**
   - Contas a Pagar (com upload obrigatório de foto)
   - Contas a Receber
   - Fluxo de Caixa (visualização em calendário)
   - Rateio entre obras

3. **Compras (Supply Chain)**
   - Requisições de material
   - Cotações (3 fornecedores por item)
   - Pedidos de Compra (com geração de PDF)
   - Status tracking completo

4. **Obras (Campo)**
   - Medição de Empreiteiros
   - Recebimento Físico de materiais

5. **Dashboard**
   - Saldo Geral
   - Total a Pagar/Receber Hoje
   - Alertas e notificações

## Perfis de Acesso

- **Admin**: Acesso total, relatórios de lucro
- **Financeiro**: Lança notas, cotações, agenda pagamentos (sem ver lucro total)
- **Engenharia**: Solicita material, confirma entregas (apenas obra atribuída)

## Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Preencha as variáveis do Firebase no arquivo `.env`.

3. Execute o projeto:
```bash
npm run dev
```

## Estrutura do Projeto

```
src/
├── app/              # Rotas Next.js
├── components/        # Componentes React
├── lib/              # Utilitários e configurações
│   ├── firebase/     # Configuração Firebase
│   ├── db/           # Funções de acesso ao Firestore
│   ├── storage/      # Upload de arquivos
│   ├── offline/      # Gerenciamento offline
│   └── permissions/  # Sistema de permissões
├── hooks/            # React Hooks customizados
└── types/            # TypeScript types
```

## Suporte Offline

O sistema possui suporte offline-first:
- Cache local com IndexedDB
- Fila de sincronização automática
- Service Worker para funcionar sem internet

## Licença

Proprietário - Sass Construtora
