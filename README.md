# HemoCore - Frontend

Interface web do sistema **HemoCore**, uma aplicação para gestão de banco de sangue. O sistema permite gerenciar doadores, doações, campanhas, solicitações de hospitais e gerar relatórios gerenciais.

## Integrantes

- Angelo Antonio Lima Silveira Filho
- Caio Torres Seares
- Gabriela Benevides Pereira Marques

## Tecnologias

- **React 18** — biblioteca de interface
- **Vite** — build e servidor de desenvolvimento
- **React Router DOM** — navegação entre páginas
- **Bootstrap 5** + Bootstrap Icons — estilização e componentes

## Funcionalidades

- Cadastro e gerenciamento de **doadores** e **recepcionistas**
- Registro de **doações** e **campanhas** de coleta
- Controle de **solicitações** de sangue por hospitais
- Gestão de **unidades de coleta**, **hospitais**, **cidades** e **tipos sanguíneos**
- **Relatórios** gerenciais (maiores solicitantes, doadores ativos, coletas por cidade, somatório por tipo sanguíneo, etc.)

## Estrutura do projeto

```
src/
├── components/   # Componentes reutilizáveis (layout e comuns)
├── context/      # Contextos globais (ex.: autenticação)
├── hooks/        # Hooks customizados de cada entidade
├── pages/        # Páginas da aplicação (inclui relatórios)
├── services/     # Comunicação com a API do backend
└── utils/        # Funções utilitárias
```

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org/) instalado.

```bash
# Instalar as dependências
npm install

# Rodar em modo de desenvolvimento
npm run dev

# Gerar build de produção
npm run build

# Visualizar o build de produção localmente
npm run preview
```

Após rodar `npm run dev`, a aplicação fica disponível em `http://localhost:5173`.

> Este projeto é apenas o frontend e depende da API do backend do HemoCore para funcionar.
