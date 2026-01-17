# Guia de Deploy na Vercel - ERP Construtora

## Opção 1: Deploy via CLI (Recomendado)

### Passo 1: Fazer Login na Vercel
```bash
npx vercel login
```

### Passo 2: Fazer o Deploy
```bash
npx vercel
```

### Passo 3: Configurar Variáveis de Ambiente
Após o primeiro deploy, você precisará configurar as variáveis de ambiente:

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione as seguintes variáveis (uma por vez):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAADbgf6zhO0OrDcLI2F3QsCnrLaO-jOcM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sass-construtora.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sass-construtora
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sass-construtora.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=997750749569
NEXT_PUBLIC_FIREBASE_APP_ID=1:997750749569:web:20c74908847c900da49080
```

5. Marque as variáveis para os ambientes: **Production**, **Preview** e **Development**
6. Clique em **Save** para cada variável

### Passo 4: Fazer Novo Deploy
Após configurar as variáveis, faça um novo deploy:
```bash
npx vercel --prod
```

## Opção 2: Deploy via Interface Web (GitHub/GitLab)

1. Faça push do código para um repositório GitHub ou GitLab
2. Acesse [vercel.com](https://vercel.com)
3. Clique em **Add New Project**
4. Importe seu repositório
5. Configure as variáveis de ambiente (mesmas do Passo 3 acima)
6. Clique em **Deploy**

## Importante: Configurações do Firebase

⚠️ **Antes de fazer o deploy, certifique-se de:**

1. **Firebase Authentication**: Habilitado no Firebase Console
2. **Firestore Rules**: Configuradas corretamente no arquivo `firestore.rules`
3. **Storage Rules**: Configuradas no Firebase Console (se necessário)
4. **Domínios Autorizados**: Adicione o domínio da Vercel no Firebase Console:
   - Vá em **Authentication** > **Settings** > **Authorized domains**
   - Adicione: `seu-projeto.vercel.app` e `*.vercel.app`

## Verificar o Deploy

Após o deploy, acesse a URL fornecida pela Vercel (ex: `https://seu-projeto.vercel.app`).

O Firebase já está configurado e funcionando, então o sistema deve funcionar normalmente online.

## Atualizações Futuras

Para fazer atualizações:
```bash
npx vercel --prod
```

Ou simplesmente faça push para o repositório Git conectado (se usar a Opção 2).
