# Integração — Cadastros → Unidades de Coleta (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express: `models/UnidadeColeta.js`, `services/UnidadeColetaService.js`, `controllers/UnidadeColetaController.js`, `routes.js`), coleção oficial do Postman (`HemoCore/postman/collections/HemoCore.postman_collection.json`) e respostas reais da API em produção.

A API **não exige autenticação** (sem header `Authorization`); CORS liberado.

> Observação: hospedagem em Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rotas de Unidades de Coleta

| Método | Rota                    | Ação     | Descrição |
|--------|-------------------------|----------|-----------|
| GET    | `/unidades-coleta`      | findAll  | Lista todas as unidades (com `cidade`→`uf` aninhados). Sem paginação/filtros no servidor. |
| GET    | `/unidades-coleta/:id`  | findByPk | Retorna uma unidade por id (mesmos aninhamentos). |
| POST   | `/unidades-coleta`      | create   | Cria uma unidade. Retorna o objeto criado já com `cidade`→`uf`. |
| PUT    | `/unidades-coleta/:id`  | update   | Atualiza uma unidade. Retorna o objeto atualizado. |
| DELETE | `/unidades-coleta/:id`  | delete   | Remove uma unidade (responde **204 No Content**). Bloqueado se houver campanhas vinculadas. |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca no backend. A busca (por nome/cidade) e o filtro por tipo são feitos **no cliente** sobre a lista de `GET /unidades-coleta`.

### Rotas auxiliares (para dropdowns / relacionamentos)
| Método | Rota         | Uso |
|--------|--------------|-----|
| GET    | `/cidades`   | Popular o select de Cidade (campo obrigatório `cidade.id`); cada cidade traz `uf`. |
| GET    | `/ufs`       | Popular o select de UF (filtra as cidades por estado, somente no cliente). |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Unidade de Coleta (GET / POST / PUT retornam este shape)

```json
{
  "id": 1,
  "nome": "Unidade de Coleta 1",
  "tipo_unidade": "FIXA",
  "telefone": "(28) 99999-9999",
  "createdAt": "2026-06-23T23:07:56.770Z",
  "updatedAt": "2026-06-23T23:07:56.770Z",
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

`GET /unidades-coleta` devolve um **array** desses objetos.

### 2.2 Requisição — POST / PUT (contrato oficial do Postman)

```json
{
  "nome": "Unidade Móvel Praça do Papa",
  "tipo_unidade": "MÓVEL",
  "telefone": "(27) 99888-7777",
  "cidade": { "id": 2 }
}
```

O backend (`UnidadeColetaService`) desestrutura `{ nome, tipo_unidade, telefone, cidade }` e grava `cidadeId: cidade?.id`. **Não há campo `cidadeId` direto no corpo** — a cidade é enviada como objeto aninhado `{ id }`.

---

## 3. Campos, tipos e validações (backend `models/UnidadeColeta.js`)

| Campo          | Tipo / Enum                 | Obrigatório | Regra |
|----------------|-----------------------------|-------------|-------|
| `nome`         | string                      | Sim         | 2–50 caracteres, não vazio. |
| `tipo_unidade` | enum `MÓVEL` / `FIXA`       | Sim         | Deve ser exatamente `MÓVEL` (com acento) ou `FIXA` (maiúsculas). |
| `telefone`     | string                      | Sim         | Padrão `(NN) NNNNN-NNNN` (regex `^\([0-9]{2}\) [0-9]?[0-9]{4}-[0-9]{4}`). Aceita fixo (8) ou celular (9 dígitos). |
| `cidade`       | objeto `{ id }` → `cidadeId`| Sim         | A cidade deve existir (FK `allowNull: false`). |

Não existem outros campos no contrato — qualquer "observação", "UF" como string livre, ou id local (`UC-001`) presente na tela antiga é mock e foi removido.

---

## 4. Tratamento de erros

Formato de erro do backend (`_middleware/error-handler.js`): `{ status, error, message, details: [{ campo, mensagem }] }`. O cliente normaliza isso em `ApiError` e exibe `toUserMessage()` (agrega `details[].mensagem`).

| Cenário                                        | Status   | Mensagem ao usuário |
|------------------------------------------------|----------|----------------------|
| Validação (nome/tipo_unidade/telefone/cidade)  | 400      | Detalhes agregados (`details[].mensagem`). |
| Tipo fora do enum (`tipo_unidade`)             | 400      | "Tipo da Unidade de Coleta deve ser 'MÓVEL' ou 'FIXA'!". |
| FK de cidade inexistente                        | 400      | "Erro de integridade referencial" / campo `cidadeId`. |
| Unidade inexistente em PUT/DELETE              | 404/400  | "Unidade de Coleta não encontrada!". |
| Exclusão com campanhas vinculadas              | 400      | "Não é possível remover uma Unidade de Coleta que possui Campanhas!". |
| Erro interno                                    | 500      | "Erro interno do servidor." |
| Falha de rede / cold start sem resposta        | 0        | "Falha de conexão com o servidor…". |

> O `error-handler` mapeia strings custom terminadas em "not found" para 404; "Unidade de Coleta não encontrada!" não termina assim, então retorna **400** — o cliente trata ambos exibindo a mensagem do backend.

---

## 5. Divergências entre a tela antiga e o contrato da API

1. **Dados 100% mockados** — a tela usava `INITIAL_UNIDADES`, `CIDADES_MAP` e `UFS` de `data/seedData.js` e ids locais (`UC-001`). Substituído por CRUD real via API; o id agora é numérico (gerado pelo backend).
2. **Tipo** — a tela usava rótulos `Fixa` / `Móvel` como valor. A API usa o enum `FIXA` / `MÓVEL` (maiúsculas, `MÓVEL` com acento). O cliente envia/recebe o enum e exibe os rótulos amigáveis apenas na UI.
3. **UF/Cidade** — antes eram strings de uma tabela estática (`CIDADES_MAP[uf]`). Agora vêm de `/ufs` e `/cidades`; o vínculo é por `cidade.id` e a UF é derivada de `cidade.uf`.
4. **Telefone** — era opcional na tela antiga; no backend é **obrigatório** e validado pelo padrão `(NN) NNNNN-NNNN`. Passou a ser obrigatório no formulário.
5. **Sem paginação/busca no servidor** — busca (nome/cidade) e filtro por tipo permanecem no cliente, sobre a lista retornada por `GET /unidades-coleta`.
