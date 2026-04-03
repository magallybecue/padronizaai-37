#!/bin/bash

# Script para reorganizar projeto PadronizaAi
# Execute este script na pasta PadronizaAi

echo "🚀 Reorganizando projeto PadronizaAi..."

# Verificar se estamos na pasta correta
if [ ! -d "backend" ]; then
    echo "❌ Erro: Pasta 'backend' não encontrada. Execute este script na pasta PadronizaAi/"
    exit 1
fi

echo "📁 Criando estrutura de pastas..."

# Criar pasta frontend se não existir
if [ ! -d "frontend" ]; then
    mkdir frontend
    echo "✅ Pasta frontend/ criada"
else
    echo "ℹ️  Pasta frontend/ já existe"
fi

# Criar pasta docs se não existir
if [ ! -d "docs" ]; then
    mkdir docs
    echo "✅ Pasta docs/ criada"
fi

# Verificar se há arquivos React na raiz que precisam ser movidos
echo "🔍 Verificando arquivos React na raiz..."

# Lista de arquivos/pastas típicos de projeto React
react_files=(
    "src"
    "public" 
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "tsconfig.app.json"
    "tsconfig.node.json"
    "vite.config.ts"
    "tailwind.config.ts"
    "postcss.config.js"
    "eslint.config.js"
    "components.json"
    "index.html"
    "node_modules"
    "dist"
    ".env.local"
    ".env.example"
)

# Verificar se existem arquivos React na raiz
has_react_files=false
for file in "${react_files[@]}"; do
    if [ -e "$file" ] && [ "$file" != "package.json" ] || [ -e "$file" ] && [ "$file" = "package.json" ] && grep -q "react" "$file" 2>/dev/null; then
        has_react_files=true
        break
    fi
done

if [ "$has_react_files" = true ]; then
    echo "📦 Movendo arquivos React da raiz para frontend/..."
    
    # Mover arquivos React para frontend/
    for file in "${react_files[@]}"; do
        if [ -e "$file" ]; then
            # Verificar se é arquivo React (para package.json)
            if [ "$file" = "package.json" ]; then
                if grep -q "react" "$file" 2>/dev/null; then
                    mv "$file" "frontend/"
                    echo "   ✅ Movido: $file"
                fi
            else
                mv "$file" "frontend/"
                echo "   ✅ Movido: $file"
            fi
        fi
    done
else
    echo "ℹ️  Nenhum arquivo React encontrado na raiz"
fi

echo "📄 Criando arquivos de configuração..."

# Criar .gitignore principal
cat > .gitignore << 'EOF'
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Backend specific
backend/logs/
backend/data/materials.csv

# Frontend specific
frontend/dist/
frontend/.vite/

# Database
*.sqlite
*.db
EOF

echo "✅ .gitignore principal criado"

# Criar README principal
cat > README.md << 'EOF'
# CATMAT Padronização - Sistema Completo

Sistema inteligente de padronização de materiais usando dados oficiais do catálogo CATMAT do governo brasileiro.

## 📋 Estrutura do Projeto

```
PadronizaAi/
├── backend/          # API Node.js + Next.js + PostgreSQL
├── frontend/         # Interface React + TypeScript
├── docs/            # Documentação técnica
└── README.md        # Este arquivo
```

## 🚀 Quick Start

### Backend (API + Database)
```bash
cd backend
npm install
cp .env.example .env.local
# Configure DATABASE_URL no .env.local
npm run dev
```

### Frontend (Interface)
```bash
cd frontend
npm install
cp .env.example .env.local
# Configure VITE_API_URL no .env.local
npm run dev
```

## 🎯 Funcionalidades

- ✅ **326.195 materiais CATMAT** oficiais importados
- ✅ **Upload de CSV** com validação automática
- ✅ **4 algoritmos** de matching inteligente
- ✅ **Processamento em tempo real** com progresso
- ✅ **Resultados detalhados** com scores de matching
- ✅ **Interface moderna** React + TypeScript
- ✅ **APIs RESTful** production-ready

## 📚 Documentação

- [Documentação Completa do Backend](./backend/catmat_align_documentation.md)
- [Setup e Configuração](./docs/setup.md)
- [API Reference](./docs/api-reference.md)
- [Guia de Desenvolvimento](./docs/development.md)

## 🛠️ Tecnologias

### Backend
- Node.js 18+
- Next.js 14
- TypeScript
- Prisma ORM
- PostgreSQL 15+
- Docker (opcional)

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Query

## 📄 Status

- **Backend**: ✅ Production Ready (porta 3003)
- **Frontend**: 🔄 Em desenvolvimento
- **Integração**: 🔄 Em progresso

## 🤝 Contribuição

1. Fork do projeto
2. Crie branch para feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Add nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

## 📞 Suporte

Para dúvidas técnicas ou problemas:
- Verifique a [documentação completa](./docs/)
- Abra uma issue no repositório
- Consulte os logs de erro em `backend/logs/`
EOF

echo "✅ README.md principal criado"

# Criar estrutura da pasta docs
echo "📚 Criando documentação..."

# Mover documentação existente
if [ -f "backend/catmat_align_documentation.md" ]; then
    cp "backend/catmat_align_documentation.md" "docs/backend-documentation.md"
    echo "✅ Documentação do backend copiada para docs/"
fi

# Criar arquivo de setup
cat > docs/setup.md << 'EOF'
# Setup e Configuração

## Pré-requisitos

- Node.js 18+
- npm 8+
- PostgreSQL 15+ (ou Docker)
- Git

## Instalação Completa

### 1. Clone o repositório
```bash
git clone <url-do-repo>
cd PadronizaAi
```

### 2. Setup do Backend
```bash
cd backend
npm install
cp .env.example .env.local
# Configure as variáveis no .env.local
npm run dev
```

### 3. Setup do Frontend
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Configure VITE_API_URL=http://localhost:3003
npm run dev
```

### 4. Verificar Funcionamento
- Backend: http://localhost:3003/api/health
- Frontend: http://localhost:5173

## Configuração Avançada

### Docker (Opcional)
```bash
# PostgreSQL via Docker
docker run --name catmat-postgres \
  -e POSTGRES_DB=catmat_align \
  -e POSTGRES_USER=catmat_user \
  -e POSTGRES_PASSWORD=catmat_password \
  -p 5432:5432 \
  -d postgres:15
```

### Importação de Dados
```bash
cd backend
# Colocar arquivo materials.csv em data/
npx tsx scripts/import-materials.ts
```
EOF

echo "✅ docs/setup.md criado"

echo ""
echo "🎉 Reorganização concluída!"
echo ""
echo "📁 Estrutura final:"
echo "PadronizaAi/"
echo "├── backend/          # API existente"
echo "├── frontend/         # Interface React"
echo "├── docs/             # Documentação"
echo "├── .gitignore        # Git ignore principal"
echo "└── README.md         # Documentação principal"
echo ""
echo "🔄 Próximos passos:"
echo "1. cd frontend && npm install"
echo "2. Verificar se backend ainda funciona: cd backend && npm run dev"
echo "3. Configurar frontend conforme documentação"
echo ""
echo "✅ Projeto reorganizado com sucesso!"