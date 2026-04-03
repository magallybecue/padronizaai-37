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
