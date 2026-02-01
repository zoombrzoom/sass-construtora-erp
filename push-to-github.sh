#!/bin/bash

# Script para fazer push do projeto para o GitHub
# Execute este script DEPOIS de criar o repositório no GitHub

echo "🚀 Preparando para fazer push para o GitHub..."
echo ""

# Verificar se há um remote já configurado
if git remote | grep -q origin; then
    echo "⚠️  Já existe um remote 'origin' configurado."
    read -p "Deseja substituir? (s/N): " resposta
    if [[ $resposta =~ ^[Ss]$ ]]; then
        git remote remove origin
    else
        echo "❌ Operação cancelada."
        exit 1
    fi
fi

# Solicitar o URL do repositório
echo "Por favor, forneça o URL do seu repositório GitHub:"
echo "Exemplos:"
echo "  HTTPS: https://github.com/seu-usuario/sass-construtora-erp.git"
echo "  SSH:   git@github.com:seu-usuario/sass-construtora-erp.git"
echo ""
read -p "URL do repositório: " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ URL não fornecido. Operação cancelada."
    exit 1
fi

# Adicionar remote
echo ""
echo "📡 Adicionando remote..."
git remote add origin "$repo_url"

# Verificar se o branch é 'main'
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "📝 Renomeando branch para 'main'..."
    git branch -M main
fi

# Verificar se há commits
if [ -z "$(git log --oneline -1)" ]; then
    echo "❌ Não há commits no repositório. Faça commit das alterações primeiro."
    exit 1
fi

# Fazer push
echo ""
echo "⬆️  Fazendo push para o GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push realizado com sucesso!"
    echo ""
    echo "Próximos passos:"
    echo "1. Acesse https://vercel.com/new"
    echo "2. Clique em 'Import Git Repository'"
    echo "3. Selecione o repositório: $(basename "$repo_url" .git)"
    echo "4. Clique em 'Deploy'"
    echo ""
    echo "As variáveis de ambiente já estão configuradas na Vercel!"
else
    echo ""
    echo "❌ Erro ao fazer push. Verifique:"
    echo "   - O repositório existe no GitHub"
    echo "   - Você tem permissão para fazer push"
    echo "   - O URL está correto"
    echo ""
    echo "Se estiver usando autenticação HTTPS, pode ser necessário:"
    echo "   - Usar um Personal Access Token"
    echo "   - Ou configurar credenciais do Git"
fi
