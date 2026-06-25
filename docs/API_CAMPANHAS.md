# Integração — Processos → Campanhas (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express: `models/Campanha.js`, `models/ItemCampanha.js`, `services/CampanhaService.js`, `controllers/CampanhaController.js`, `routes.js`) e respostas reais da API em produção.

A API **não exige autenticação** (sem header `Authorization`); CORS liberado.

> Observação: hospedagem em Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rotas de Campanhas

| Método | Rota                          | Ação      | Descrição |
|--------|-------------------------------|-----------|-----------|
| GET    | `/campanhas`                  | findAll   | Lista todas as campanhas com `unidadeColeta`→`cidade`→`uf` e `itensCampanha`→`tipoSanguineo` aninhados. Sem paginação/filtros no servidor. |
| GET    | `/campanhas/:id`              | findByPk  | Retorna uma campanha por id (mesmos aninhamentos). |
| POST   | `/campanhas`                  | create    | Cria uma campanha e seus itens. Retorna o objeto criado já aninhado. |
| PUT    | `/campanhas/:id`              | update    | Atualiza a campanha e **substitui** todos os itens (destroy + recreate). Retorna o objeto atualizado. |
| DELETE | `/campanhas/:id`              | delete    | Remove a campanha (cascade nos itens). Responde **200** com o objeto removido. |
| GET    | `/campanhas/agenda`           | relatório | Relatório de agenda (não usado nesta tela). |
| GET    | `/campanhas/coletas-por-cidade` | relatório | Relatório de coletas por cidade (não usado nesta tela). |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca no backend. A busca (por nome/unidade/cidade) é feita **no cliente** sobre a lista de `GET /campanhas`.

### Rotas auxiliares (para dropdowns / relacionamentos)
| Método | Rota                 | Uso |
|--------|----------------------|-----|
| GET    | `/unidades-coleta`   | Popular o select de Unidade de Coleta (obrigatório `unidadeColeta.id`). Cada unidade traz `cidade`→`uf`. |
| GET    | `/tipos-sanguineos`  | Popular o select de Tipo Sanguíneo de cada item (obrigatório `tipoSanguineo.id`). |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Campanha (GET / POST / PUT / DELETE retornam este shape)

```json
{
  "id": 1,
  "nome": "Campanha de Doação de Sangue - Abril Vermelho",
  "data": "2026-04-15",
  "createdAt": "2026-06-23T23:08:02.028Z",
  "updatedAt": "2026-06-23T23:08:02.028Z",
  "unidadeColetaId": 1,
  "unidadeColeta": {
    "id": 1,
    "nome": "Unidade de Coleta 1",
    "tipo_unidade": "FIXA",
    "telefone": "(28) 99999-9999",
    "cidadeId": 1,
    "cidade": {
      "id": 1,
      "nome": "Cachoeiro",
      "habitantes": 210000,
      "area": 876.8,
      "ufId": 1,
      "uf": { "id": 1, "sigla": "ES", "nome": "Espírito Santo" }
    }
  },
  "itensCampanha": [
    {
      "id": 1,
      "metaColeta": 5000,
      "quantiaColetada": 0,
      "campanhaId": 1,
      "tipoSanguineoId": 4,
      "tipoSanguineo": {
        "id": 4,
        "grupoABO": "O",
        "fatorRH": true,
        "quantidade": 500,
        "descricao": "Tipo Sanguíneo O positivo"
      }
    }
  ]
}
```

`GET /campanhas` devolve um **array** desses objetos.

### 2.2 Requisição — POST / PUT (contrato exato exigido pelo `CampanhaService`)

O service desestrutura `{ nome, data, unidadeColeta, itensCampanha }` e lê `unidadeColeta.id`,
`item.metaColeta`, `item.quantiaColetada` e `item.tipoSanguineo.id`. Portanto o corpo é:

```json
{
  "nome": "Campanha Julho Vermelho",
  "data": "2026-07-15",
  "unidadeColeta": { "id": 1 },
  "itensCampanha": [
    { "metaColeta": 5000, "quantiaColetada": 0, "tipoSanguineo": { "id": 4 } },
    { "metaColeta": 3000, "quantiaColetada": 0, "tipoSanguineo": { "id": 1 } }
  ]
}
```

Observações de contrato (não inventar campos):
- **POST**: o backend força `quantiaColetada: 0` em todo item criado, independentemente do enviado.
- **PUT**: o backend usa `item.quantiaColetada || 0` — a quantidade coletada pode ser editada.
- `data` é `DATEONLY` no formato `YYYY-MM-DD`.
- Não enviar `id` dos itens: o PUT apaga e recria todos os itens.

---

## 3. Campos, obrigatoriedade e validações (do backend)

| Campo | Tipo | Obrigatório | Validação (backend) |
|-------|------|-------------|---------------------|
| `nome` | string | sim | 2 a 50 caracteres, não vazio. |
| `data` | date (`YYYY-MM-DD`) | sim | data válida, não nula. |
| `unidadeColeta.id` | int | sim | unidade deve existir. |
| `itensCampanha` | array | sim | pelo menos 1 item (`Os Itens da Campanha (metas de doação) devem ser preenchidos!`). |
| `item.metaColeta` | int | sim | inteiro ≥ 1 (em mL). |
| `item.quantiaColetada` | int | não (default 0) | inteiro ≥ 0. |
| `item.tipoSanguineo.id` | int | sim | tipo sanguíneo deve existir. |

### Regras de negócio (retornam erro no POST/PUT)
1. A data não pode coincidir com outra campanha já agendada para a **mesma Unidade de Coleta**.
2. Não é permitido mais de uma campanha na **mesma cidade** dentro de uma janela de **±7 dias**.

---

## 4. Tratamento de erros

O `apiClient` normaliza erros para `{ status, error, message, details }`. Mensagens de regra de
negócio do backend chegam em `message`; erros de validação Sequelize chegam em `details[]`.
Tratados na UI: 400, 401, 403, 404, 409, 500 e falha de conexão (`status: 0`).

---

## 5. Divergências entre a tela original (mock) e o contrato da API

A tela original usava `data/seedData.js` (`INITIAL_CAMPANHAS`, `UNIDADES_OPTIONS`,
`TIPOS_SANGUINEOS`) — totalmente removidos da integração. Principais divergências corrigidas:

| Tela original (mock) | Contrato real da API |
|----------------------|----------------------|
| `id` no formato `CAM-001` (string) | `id` inteiro autoincrementado pelo backend. |
| Campo `cidade` digitado/derivado de string | Cidade vem de `unidadeColeta.cidade` (não é campo da campanha). |
| `metas: [{ tipoSang: 'O+', meta, coletado }]` | `itensCampanha: [{ tipoSanguineo:{id}, metaColeta, quantiaColetada }]`. |
| Tipo sanguíneo como string `'O+'` / `'Todos os tipos'` | Objeto com `id`; rótulo = `grupoABO + (fatorRH ? '+' : '-')`. Não existe "Todos os tipos". |
| Unidade selecionada por **nome** | Selecionada por **id** (`unidadeColeta.id`). |
| Validação `meta >= 100` | Backend exige `metaColeta >= 1`. |
| Persistência local (`useState`) | CRUD real via `fetch` na API. |
