# Deploy via GitHub - Passo a Passo

## Opção 1: Criar Repositório Manualmente no GitHub

### Passo 1: Criar o repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `sass-construtora-erp` (ou qualquer nome que preferir)
3. **NÃO** marque "Add a README file", "Add .gitignore" ou "Choose a license"
4. Deixe o repositório como **Private** (recomendado) ou **Public**
5. Clique em **Create repository**

### Passo 2: Conectar e fazer Push

Depois de criar o repositório, o GitHub mostrará comandos. Execute no terminal:

```bash
cd "/Users/David/Library/CloudStorage/GoogleDrive-davidmajollo@gmail.com/Outros computadores/Maquina Suprema/Downloads/1.Personalizaçao do Pc/Automacao/Sass Construtora"

# Adicionar o remote (substitua SEU_USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU_USUARIO/sass-construtora-erp.git

# Ou se preferir SSH (mais seguro):
# git remote add origin git@github.com:SEU_USUARIO/sass-construtora-erp.git

# Fazer push
git branch -M main
git push -u origin main
```

## Opção 2: Usar GitHub CLI (se instalar)

Se você instalar a GitHub CLI, podemos fazer tudo automaticamente. Para instalar:

```bash
# macOS (com Homebrew)
brew install gh

# Depois autenticar
gh auth login
```

## Conectar na Vercel

Após o push para o GitHub:

1. Acesse https://vercel.com/new
2. Clique em **Import Git Repository**
3. Selecione seu repositório `sass-construtora-erp`
4. As variáveis de ambiente **já estão configuradas** (foram adicionadas anteriormente)
5. Clique em **Deploy**

A Vercel detectará automaticamente que é um projeto Next.js e fará o build.

## Vantagens do Deploy via GitHub

✅ Deploy automático a cada push  
✅ Histórico de commits visível  
✅ Melhor integração com Vercel  
✅ Builds mais estáveis que via CLI  
✅ Possibilidade de usar Preview Deployments  
