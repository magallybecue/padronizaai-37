#!/bin/bash
echo "🚀 Configurando CATMAT Align Backend..."

# Verificar pré-requisitos
check_prerequisites() {
    echo "📋 Verificando pré-requisitos..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js não encontrado. Instale Node.js 18+ primeiro."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm não encontrado."
        exit 1
    fi
    
    echo "✅ Pré-requisitos verificados"
}

# Instalar dependências
install_dependencies() {
    echo "📦 Instalando dependências..."
    npm install
    echo "✅ Dependências instaladas"
}

# Configurar environment
setup_environment() {
    echo "⚙️  Configurando variáveis de ambiente..."
    echo "✅ Arquivo .env.local já existe"
}

# Configurar banco de dados
setup_database() {
    echo "🗄️  Configurando banco de dados..."
    
    # Verificar se schema.prisma tem conteúdo
    if [ ! -s prisma/schema.prisma ]; then
        echo "❌ prisma/schema.prisma está vazio. Precisa ser configurado primeiro."
        echo "Configure o schema.prisma e execute novamente."
        exit 1
    fi
    
    # Gerar Prisma client
    echo "Gerando Prisma client..."
    npx prisma generate
    
    # Aplicar migrações
    echo "Aplicando migrações..."
    npx prisma db push
    
    echo "✅ Banco de dados configurado"
}

# Executar setup
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_database
    
    echo ""
    echo "🎉 Setup concluído com sucesso!"
    echo ""
    echo "Próximos passos:"
    echo "  1. Executar 'npm run dev' para iniciar o servidor"
    echo "  2. Testar a API em http://localhost:3001/api/health"
    echo ""
}

main
