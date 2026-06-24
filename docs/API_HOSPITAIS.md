# Integração — Cadastros → Hospitais (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express), coleção oficial do Postman (`HemoCore/postman/collections/HemoCore.postman_collection.json`) e respostas reais da API. A API não exige autenticação (sem header `Authorization`); CORS liberado.

> Observação: a hospedagem é Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rotas de Hospitais

| Método | Rota              | Ação     | Descrição |
|--------|-------------------|----------|-----------|
| GET    | `/hospitais`      | findAll  | Lista todos os hospitais (com `cidade`→`uf` aninhados). Sem paginação/filtros no servidor. |
| GET    | `/hospitais/:id`  | findByPk | Retorna um hospital por id (mesmos aninhamentos). |
| POST   | `/hospitais`      | create   | Cria um hospital. Retorna o objeto criado já com `cidade`→`uf`. |
| PUT    | `/hospitais/:id`  | update   | Atualiza um hospital. Retorna o objeto atualizado. |
| DELETE | `/hospitais/:id`  | delete   | Remove um hospital (bloqueado se houver solicitações vinculadas). |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca no backend. A busca e o filtro por tipo são feitos **no cliente** sobre a lista retornada por `GET /hospitais`.

### Rotas auxiliares (para dropdowns / relacionamentos)
| Método | Rota         | Uso |
|--------|--------------|-----|
| GET    | `/cidades`   | Popular o select de Cidade (campo obrigatório `cidade.id`); cada cidade traz `uf`. |
| GET    | `/ufs`       | Popular o select de UF (filtra as cidades por estado, somente no cliente). |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Hospital (GET / POST / PUT retornam este shape)

```json
{
  "id": 1,
  "nome": "Hospital Santa Casa",
  "sigla": "HSC",
  "telefone": "(28) 99999-9999",
  "cnpj": "12.345.678/0001-95",
  "tipo": "FILANTRÓPICO",
  "createdAt": "2026-06-23T23:07:56.155Z",
  "updatedAt": "2026-06-23T23:07:56.155Z",
  "cidadeId": 1,
  "cidade": {
    "id": 1,
    "nome": "Cachoeiro",
    "habitantes": 210000,
    "area": 876.8,
    "ufId": 1,
    "uf": { "id": 1, "sigla": "ES", "nome": "Espírito Santo" }
  }
}
```

### 2.2 Requisição — POST / PUT (contrato oficial do Postman)

```json
{
  "nome": "Hospital Santa Casa",
  "sigla": "HSC",
  "telefone": "(28) 99999-9999",
  "CNPJ": "12.345.678/0001-95",
  "tipo": "FILANTRÓPICO",
  "cidade": { "id": 1 }
}
```

O backend lê `req.body` desestruturando `{ nome, sigla, telefone, CNPJ, tipo, cidade }` e grava `cidadeId: cidade?.id`.

---

## 3. Campos, tipos e validações (backend `models/Hospital.js`)

| Campo      | Tipo / Enum                                   | Obrigatório | Regra |
|------------|-----------------------------------------------|-------------|-------|
| `nome`     | string                                        | Sim         | 2–150 caracteres, não vazio. |
| `sigla`    | string(20)                                    | Sim         | 1–20 caracteres, não vazio. |
| `telefone` | string(20)                                    | Sim         | Padrão `(NN) NNNNN-NNNN` (regex `^\([0-9]{2}\) [0-9]?[0-9]{4}-[0-9]{4}`). |
| `CNPJ`     | string(18), **único**                         | Sim         | `14 dígitos` ou `NN.NNN.NNN/NNNN-NN`. Backend valida só o formato; o front também valida dígitos verificadores. |
| `tipo`     | enum `PUBLICO` / `PRIVADO` / `FILANTRÓPICO`   | Sim         | Deve ser um dos três valores (atenção: `PUBLICO` sem acento, `FILANTRÓPICO` com acento). |
| `cidade`   | objeto `{ id }` → grava `cidadeId`            | Sim         | A cidade deve existir. |

Não há campo de observações no contrato — qualquer campo "obs"/"observação" presente na tela antiga é mock e foi removido.

---

## 4. Tratamento de erros

Formato de erro do backend (`_middleware/error-handler.js`): `{ status, error, message, details: [{ campo, mensagem }] }`. O cliente normaliza isso em `ApiError` e exibe `toUserMessage()`.

| Cenário                                   | Status | Mensagem ao usuário |
|-------------------------------------------|--------|----------------------|
| Validação (nome/telefone/CNPJ/tipo/cidade)| 400    | Detalhes agregados (`details[].mensagem`). |
| CNPJ duplicado (`unique`)                 | 400/409| Mensagem do backend (conflito de CNPJ). |
| Hospital inexistente em PUT/DELETE        | 404/400| "Hospital não encontrado!". |
| Exclusão com solicitações vinculadas      | 400    | "Não é possível remover um Hospital com participações em solicitações!". |
| Erro interno                              | 500    | "Erro interno do servidor." |
| Falha de rede / cold start sem resposta   | 0      | "Falha de conexão com o servidor…". |

---

## 5. Divergências entre a tela antiga e o contrato da API

1. **Dados 100% mockados** — a tela usava `INITIAL_HOSPITAIS`, `CIDADES_MAP` e `UFS` de `data/seedData.js` e IDs locais (`H-001`). Substituído por CRUD real via API; o id agora é numérico (gerado pelo backend).
2. **Tipo** — a tela usava rótulos `Público/Privado/Filantrópico` como valor. A API usa o enum `PUBLICO/PRIVADO/FILANTRÓPICO`. O cliente envia/recebe o enum e exibe os rótulos amigáveis apenas na UI.
3. **CNPJ (casing)** — a resposta usa `cnpj` (minúsculo); o corpo da requisição usa `CNPJ` (maiúsculo, conforme `HospitalService` e Postman). O cliente lê `cnpj` e envia `CNPJ`.
4. **UF/Cidade** — antes eram strings de uma tabela estática. Agora vêm de `/ufs` e `/cidades`; o vínculo é por `cidade.id` e a UF é derivada de `cidade.uf`.
5. **Campo "Observações"** — não existe no contrato; removido.
6. **Sem paginação/busca no servidor** — busca e filtro por tipo permanecem no cliente.
