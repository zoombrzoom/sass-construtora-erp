# Configurar Variáveis de Ambiente na Vercel

## Passo 1: Acessar as Configurações do Projeto

1. Acesse https://vercel.com/dashboard
2. Selecione o projeto **sass-construtora-erp** (ou o nome que você escolheu)
3. Vá em **Settings** > **Environment Variables**

## Passo 2: Adicionar Variáveis do Firebase

Adicione as seguintes variáveis de ambiente (uma por vez):

1. **NEXT_PUBLIC_FIREBASE_API_KEY**
   - Value: `AIzaSyAADbgf6zhO0OrDcLI2F3QsCnrLaO-jOcM`
   - Environments: ☑ Production ☑ Preview ☑ Development

2. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
   - Value: `sass-construtora.firebaseapp.com`
   - Environments: ☑ Production ☑ Preview ☑ Development

3. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
   - Value: `sass-construtora`
   - Environments: ☑ Production ☑ Preview ☑ Development

4. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
   - Value: `sass-construtora.firebasestorage.app`
   - Environments: ☑ Production ☑ Preview ☑ Development

5. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
   - Value: `997750749569`
   - Environments: ☑ Production ☑ Preview ☑ Development

6. **NEXT_PUBLIC_FIREBASE_APP_ID**
   - Value: `1:997750749569:web:20c74908847c900da49080`
   - Environments: ☑ Production ☑ Preview ☑ Development

## Passo 3: Fazer Novo Deploy

Após adicionar todas as variáveis:

```bash
npx vercel --prod
```

Ou simplesmente faça um push para o repositório Git conectado (se houver).

## Passo 4: Verificar o Deploy

Após o deploy, acesse a URL fornecida pela Vercel (ex: `https://seu-projeto.vercel.app`).

O Firebase já está configurado e funcionando, então o sistema deve funcionar normalmente online.

## Nota sobre Domínios Autorizados no Firebase

⚠️ **IMPORTANTE**: Após o deploy, adicione o domínio da Vercel no Firebase Console:

1. Acesse https://console.firebase.google.com/
2. Selecione o projeto **sass-construtora**
3. Vá em **Authentication** > **Settings** > **Authorized domains**
4. Clique em **Add domain**
5. Adicione: `seu-projeto.vercel.app` e `*.vercel.app`

Isso permitirá que os usuários façam login na aplicação hospedada na Vercel.
