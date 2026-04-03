#!/bin/bash
# deploy.sh - Script de deploy para produção

set -e

echo "🚀 Iniciando deploy para produção..."

# Configurações
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}

# Funções auxiliares
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "❌ $1" >&2
    exit 1
}

# Verificar git status
check_git_status() {
    log "📋 Verificando status do Git..."
    
    if [[ $(git diff --stat) != '' ]]; then
        error "Existem mudanças não commitadas. Commit ou stash antes do deploy."
    fi
    
    if [[ $(git status --porcelain) ]]; then
        error "Existem arquivos não commitados."
    fi
    
    log "✅ Git status limpo"
}

# Build da aplicação
build_application() {
    log "🔨 Building aplicação..."
    
    # Limpar builds anteriores
    rm -rf .next
    
    # Instalar dependências
    npm ci --only=production
    
    # Gerar Prisma client
    npx prisma generate
    
    # Build Next.js
    npm run build
    
    log "✅ Build concluído"
}

# Deploy para Vercel
deploy_vercel() {
    log "☁️  Fazendo deploy para Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI não encontrado. Instale com: npm i -g vercel"
    fi
    
    # Deploy
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --confirm
    else
        vercel --confirm
    fi
    
    log "✅ Deploy para Vercel concluído"
}

# Deploy via Docker
deploy_docker() {
    log "🐳 Fazendo deploy via Docker..."
    
    # Build da imagem
    docker build -t catmat-backend:latest .
    
    # Tag para registry (se configurado)
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        docker tag catmat-backend:latest $DOCKER_REGISTRY/catmat-backend:latest
        docker push $DOCKER_REGISTRY/catmat-backend:latest
    fi
    
    # Deploy com docker-compose
    if [ -f docker-compose.prod.yml ]; then
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        docker-compose up -d --build
    fi
    
    log "✅ Deploy Docker concluído"
}

# Deploy para servidor (VPS/Cloud)
deploy_server() {
    log "🖥️  Fazendo deploy para servidor..."
    
    SERVER_HOST=${SERVER_HOST:-"your-server.com"}
    SERVER_USER=${SERVER_USER:-"deploy"}
    DEPLOY_PATH=${DEPLOY_PATH:-"/var/www/catmat-backend"}
    
    # Sync código para servidor
    rsync -avz --delete \
        --exclude node_modules \
        --exclude .git \
        --exclude .env.local \
        . $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH
    
    # Executar comandos no servidor
    ssh $SERVER_USER@$SERVER_HOST << EOF
        cd $DEPLOY_PATH
        npm ci --only=production
        npx prisma generate
        npx prisma migrate deploy
        npm run build
        pm2 restart catmat-backend || pm2 start ecosystem.config.js
EOF
    
    log "✅ Deploy para servidor concluído"
}

# Executar migrações
run_migrations() {
    log "🗄️  Executando migrações..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        npx prisma migrate deploy
    else
        npx prisma db push
    fi
    
    log "✅ Migrações executadas"
}

# Health check pós-deploy
health_check() {
    log "🏥 Verificando saúde da aplicação..."
    
    local url=${HEALTH_CHECK_URL:-"http://localhost:3001/api/health"}
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            log "✅ Aplicação está saudável"
            return 0
        fi
        
        log "🔄 Tentativa $attempt/$max_attempts - aguardando aplicação..."
        sleep 10
        ((attempt++))
    done
    
    error "Aplicação não respondeu ao health check"
}

# Rollback (em caso de falha)
rollback() {
    log "🔄 Iniciando rollback..."
    
    if [ ! -z "$PREVIOUS_VERSION" ]; then
        git checkout $PREVIOUS_VERSION
        build_application
        
        case $DEPLOY_TYPE in
            vercel) deploy_vercel ;;
            docker) deploy_docker ;;
            server) deploy_server ;;
        esac
        
        log "✅ Rollback concluído"
    else
        error "Versão anterior não encontrada para rollback"
    fi
}

# Função principal
main() {
    # Verificar parâmetros
    DEPLOY_TYPE=${DEPLOY_TYPE:-"vercel"}
    
    log "📝 Configurações do deploy:"
    log "   Environment: $ENVIRONMENT"
    log "   Branch: $BRANCH"
    log "   Deploy Type: $DEPLOY_TYPE"
    
    # Salvar versão atual para rollback
    PREVIOUS_VERSION=$(git rev-parse HEAD)
    
    # Executar deploy
    trap 'rollback' ERR
    
    check_git_status
    build_application
    
    case $DEPLOY_TYPE in
        vercel)
            deploy_vercel
            ;;
        docker)
            deploy_docker
            ;;
        server)
            deploy_server
            ;;
        *)
            error "Tipo de deploy não suportado: $DEPLOY_TYPE"
            ;;
    esac
    
    if [ "$DEPLOY_TYPE" != "vercel" ]; then
        run_migrations
        health_check
    fi
    
    log "🎉 Deploy concluído com sucesso!"
    log "   Version: $(git rev-parse --short HEAD)"
    log "   Time: $(date)"
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

---

#!/bin/bash
# test.sh - Script de testes

echo "🧪 Executando testes do CATMAT Align Backend..."

# Configurar ambiente de teste
setup_test_env() {
    echo "⚙️  Configurando ambiente de teste..."
    
    export NODE_ENV=test
    export DATABASE_URL="postgresql://test:test@localhost:5432/catmat_test"
    
    # Verificar se banco de teste existe
    if ! psql $DATABASE_URL -c '\q' 2>/dev/null; then
        echo "🗄️  Criando banco de teste..."
        createdb catmat_test -h localhost -U test
    fi
    
    # Aplicar migrações
    npx prisma migrate deploy
}

# Executar testes unitários
run_unit_tests() {
    echo "🔬 Executando testes unitários..."
    npm run test -- --testPathPattern=unit
}

# Executar testes de integração
run_integration_tests() {
    echo "🔗 Executando testes de integração..."
    npm run test -- --testPathPattern=integration
}

# Executar todos os testes
run_all_tests() {
    echo "🚀 Executando todos os testes..."
    npm test
}

# Gerar relatório de cobertura
generate_coverage() {
    echo "📊 Gerando relatório de cobertura..."
    npm run test:coverage
    echo "📂 Relatório disponível em: coverage/lcov-report/index.html"
}

# Limpeza pós-teste
cleanup() {
    echo "🧹 Limpando ambiente de teste..."
    dropdb catmat_test -h localhost -U test --if-exists
}

# Função principal
main() {
    local test_type=${1:-"all"}
    
    setup_test_env
    
    case $test_type in
        unit)
            run_unit_tests
            ;;
        integration)
            run_integration_tests
            ;;
        coverage)
            generate_coverage
            ;;
        all|*)
            run_all_tests
            ;;
    esac
    
    cleanup
    echo "✅ Testes concluídos!"
}

main "$@"

---

# ecosystem.config.js - Configuração PM2
module.exports = {
  apps: [{
    name: 'catmat-backend',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }, {
    name: 'catmat-cron',
    script: './scripts/sync-catmat.ts',
    cron_restart: '0 2 * * *',
    autorestart: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
}