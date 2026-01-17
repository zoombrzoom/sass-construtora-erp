# Guia de Instalação - ERP Construtora

## Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn instalado
- Conta no Firebase (para backend)

## Passo 1: Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
npm install
```

Isso instalará todas as dependências necessárias listadas no `package.json`.

## Passo 2: Configurar Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Vá em **Configurações do Projeto** > **Seus apps** > **Web**
4. Copie as credenciais do Firebase

5. Crie um arquivo `.env.local` na raiz do projeto com:

```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

## Passo 3: Configurar Firestore

1. No Firebase Console, vá em **Firestore Database**
2. Crie o banco de dados (modo de produção ou teste)
3. Vá em **Regras** e cole o conteúdo do arquivo `firestore.rules`
4. Deploy das regras (se tiver Firebase CLI):
   ```bash
   firebase deploy --only firestore:rules
   ```

## Passo 4: Habilitar Authentication

1. No Firebase Console, vá em **Authentication**
2. Clique em **Começar**
3. Habilite **Email/Password** como método de login

## Passo 5: Criar Primeiro Usuário

1. No Firebase Console, vá em **Authentication** > **Users**
2. Clique em **Adicionar usuário**
3. Crie um usuário com email e senha

4. No Firestore, crie um documento na coleção `users` com o ID igual ao UID do usuário criado:
   ```json
   {
     "email": "admin@exemplo.com",
     "nome": "Administrador",
     "role": "admin"
   }
   ```

   Para usuários de engenharia, adicione também:
   ```json
   {
     "email": "engenheiro@exemplo.com",
     "nome": "Engenheiro",
     "role": "engenharia",
     "obraId": "id_da_obra"
   }
   ```

## Passo 6: Executar o Projeto

```bash
npm run dev
```

O projeto estará disponível em: `http://localhost:3000`

## Solução de Problemas

### Erro: "Cannot find module"
Execute novamente:
```bash
npm install
```

### Erro: "Firebase not initialized"
Verifique se o arquivo `.env.local` está configurado corretamente com todas as variáveis.

### Erro: "Permission denied" no Firestore
Verifique se as Security Rules foram deployadas corretamente.

### Erro ao fazer login
Verifique se:
- O usuário foi criado no Firebase Authentication
- O documento do usuário existe na coleção `users` do Firestore
- O campo `role` está definido corretamente

## Estrutura de Perfis

- **admin**: Acesso total ao sistema
- **financeiro**: Pode gerenciar contas, cotações e pedidos (sem ver lucro total)
- **engenharia**: Acesso apenas à obra atribuída (campo `obraId` no documento do usuário)
