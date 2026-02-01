# Criar Usuário Administrador

## Dados do Administrador

- **Email:** majollo@majollo.com.br
- **Senha Provisória:** 123567majollo
- **Função:** Administrador (todos os acessos)

## Passo a Passo (Firebase Console)

### 1. Criar usuário no Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. No menu lateral, vá em **Authentication** > **Users**
4. Clique em **Add user**
5. Preencha:
   - **Email:** `majollo@majollo.com.br`
   - **Password:** `123567majollo`
6. Clique em **Add user**
7. **IMPORTANTE:** Copie o **User UID** que aparece na tabela (será algo como `abc123xyz...`)

### 2. Criar documento no Firestore

1. No menu lateral, vá em **Firestore Database**
2. Clique na coleção **users** (ou crie se não existir)
3. Clique em **Add document**
4. No campo **Document ID**, cole o **User UID** copiado no passo anterior
5. Adicione os seguintes campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| email | string | majollo@majollo.com.br |
| nome | string | Administrador Majollo |
| role | string | admin |
| mustChangePassword | boolean | true |
| createdAt | timestamp | (clique no relógio e selecione a data atual) |

6. Clique em **Save**

## Como Funciona

1. O usuário faz login com email e senha provisória
2. O sistema detecta `mustChangePassword: true`
3. Redireciona automaticamente para a tela de definição de nova senha
4. O usuário define sua própria senha (com requisitos de segurança)
5. O campo `mustChangePassword` é atualizado para `false`
6. O usuário é redirecionado para o dashboard

## Requisitos da Nova Senha

- Mínimo 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos uma letra minúscula
- Pelo menos um número

## Permissões do Administrador

O usuário com role `admin` tem acesso completo:

- ✅ Visualizar todas as obras
- ✅ Visualizar lucro
- ✅ Aprovar compras
- ✅ Gerenciar usuários
- ✅ Acesso total ao financeiro
