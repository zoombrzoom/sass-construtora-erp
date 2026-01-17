# Configuração do Firebase - Passo a Passo

## 1. Criar arquivo .env.local

Crie um arquivo chamado `.env.local` na raiz do projeto (mesmo nível do `package.json`) com o seguinte conteúdo:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAADbgf6zhO0OrDcLI2F3QsCnrLaO-jOcM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sass-construtora.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sass-construtora
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sass-construtora.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=997750749569
NEXT_PUBLIC_FIREBASE_APP_ID=1:997750749569:web:20c74908847c900da49080
```

## 2. Configurar Firestore Security Rules

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **sass-construtora**
3. Vá em **Firestore Database** > **Regras**
4. Cole o conteúdo do arquivo `firestore.rules` que está na raiz do projeto
5. Clique em **Publicar**

**IMPORTANTE:** As regras atuais no Firebase são temporárias (permitem tudo até 14/02/2026). Você DEVE substituir pelas regras de segurança do arquivo `firestore.rules` para proteger seus dados.

## 3. Habilitar Authentication

1. No Firebase Console, vá em **Authentication**
2. Clique em **Começar** (se ainda não habilitado)
3. Vá na aba **Sign-in method**
4. Habilite **Email/Password**
5. Clique em **Salvar**

## 4. Criar Primeiro Usuário Admin

### 4.1. Criar usuário no Authentication

1. No Firebase Console, vá em **Authentication** > **Users**
2. Clique em **Adicionar usuário**
3. Digite um email (ex: `admin@sassconstrutora.com`)
4. Digite uma senha
5. Clique em **Adicionar usuário**
6. **Copie o UID** do usuário criado (será necessário no próximo passo)

### 4.2. Criar documento do usuário no Firestore

1. No Firebase Console, vá em **Firestore Database** > **Dados**
2. Clique em **Iniciar coleção**
3. Nome da coleção: `users`
4. Documento ID: Cole o **UID** copiado no passo anterior
5. Adicione os seguintes campos:

   | Campo | Tipo | Valor |
   |-------|------|-------|
   | email | string | admin@sassconstrutora.com |
   | nome | string | Administrador |
   | role | string | admin |

6. Clique em **Salvar**

## 5. Reiniciar o Servidor

Após configurar tudo, reinicie o servidor de desenvolvimento:

```bash
# Pare o servidor atual (Ctrl+C)
# Execute novamente:
npm run dev
```

## 6. Testar Login

1. Acesse `http://localhost:3000`
2. Você será redirecionado para a página de login
3. Use o email e senha criados no passo 4.1
4. Se tudo estiver correto, você será redirecionado para o dashboard

## Estrutura de Perfis

- **admin**: Acesso total ao sistema
- **financeiro**: Pode gerenciar contas, cotações e pedidos (sem ver lucro total)
- **engenharia**: Acesso apenas à obra atribuída (campo `obraId` no documento do usuário)

Para criar usuários de outros perfis, siga o mesmo processo, mas no campo `role` use:
- `financeiro` para usuários do financeiro
- `engenharia` para engenheiros (adicione também o campo `obraId` com o ID de uma obra)
