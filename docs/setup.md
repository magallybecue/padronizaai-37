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
