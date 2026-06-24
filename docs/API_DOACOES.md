# Integração — Processos → Doações (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express) e respostas reais da API em produção. A API não exige autenticação (sem header `Authorization`); CORS liberado (`Access-Control-Allow-Origin: *`).

> Observação: a hospedagem é Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rotas de Doações

| Método | Rota              | Ação        | Descrição |
|--------|-------------------|-------------|-----------|
| GET    | `/doacoes`        | findAll     | Lista todas as doações (com `doador`→(`tipoSanguineo`,`cidade`→`uf`), `enfermeiro`→`unidadeColeta` e `unidadeColeta`→`cidade`→`uf` aninhados). Sem paginação/filtros no servidor. |
| GET    | `/doacoes/:id`    | findByPk    | Retorna uma doação por id (mesmos aninhamentos). |
| POST   | `/doacoes`        | create      | Cria uma doação. Aplica regras de negócio (ver §6). |
| PUT    | `/doacoes/:id`    | update      | Atualiza uma doação. Reavalia o status do doador (APTO/INAPTO). |
| DELETE | `/doacoes/:id`    | delete      | Remove uma doação. Retorna o objeto removido. |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca no backend. A busca e o filtro por data são feitos **no cliente** sobre a lista de `GET /doacoes`.

> Há ainda duas rotas analíticas (`/doacoes/somatorio-por-tipo-sanguineo` e `/doacoes/doadores-ativos`), usadas pelos relatórios — fora do escopo do CRUD desta tela.

### Rotas auxiliares (para dropdowns / relacionamentos)
| Método | Rota                 | Uso |
|--------|----------------------|-----|
| GET    | `/doadores`          | Popular o select de Doador (campo obrigatório `doador.id`). |
| GET    | `/enfermeiros`       | Popular o select de Enfermeiro (campo obrigatório `enfermeiro.id`). |
| GET    | `/unidades-coleta`   | Popular o select de Unidade de Coleta (campo obrigatório `unidadeColeta.id`). |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Doação (GET / POST / PUT retornam este shape)

```json
{
  "id": 1,
  "data": "2026-01-01",
  "quantia": 450,
  "createdAt": "2026-06-23T23:07:59.241Z",
  "updatedAt": "2026-06-23T23:07:59.241Z",
  "doadorId": 1,
  "enfermeiroId": 1,
  "unidadeColetaId": 1,
  "doador": {
    "id": 1, "nome": "Angelo", "sexo": "M", "telefone": "(28) 99999-9999",
    "cpf": "152.516.447-36", "status": "APTO", "tipoSanguineoId": 4, "cidadeId": 1,
    "tipoSanguineo": { "id": 4, "grupoABO": "O", "fatorRH": true, "descricao": "…" },
    "cidade": { "id": 1, "nome": "Cachoeiro", "ufId": 1, "uf": { "id": 1, "sigla": "ES", "nome": "Espírito Santo" } }
  },
  "enfermeiro": {
    "id": 1, "nome": "João Silva", "telefone": "(28) 98888-7777", "cpf": "123.456.789-10",
    "especialidade": "Hemoterapia", "registroCoren": "COREN-ES 12345-ENF", "unidadeColetaId": 1,
    "unidadeColeta": { "id": 1, "nome": "Unidade de Coleta 1", "tipo_unidade": "FIXA", "telefone": "(28) 99999-9999", "cidadeId": 1, "cidade": { "…": "…" } }
  },
  "unidadeColeta": {
    "id": 1, "nome": "Unidade de Coleta 1", "tipo_unidade": "FIXA", "telefone": "(28) 99999-9999",
    "cidadeId": 1, "cidade": { "id": 1, "nome": "Cachoeiro", "uf": { "id": 1, "sigla": "ES" } }
  }
}
```

`GET /doacoes` retorna um **array** desses objetos.

### 2.2 Requisição — POST / PUT (corpo)

O `DoacaoService` lê `doador.id`, `enfermeiro.id` e `unidadeColeta.id`. Portanto o corpo usa **objetos aninhados** (não `doadorId` direto):

```json
{
  "data": "2026-01-01",
  "quantia": 450,
  "doador": { "id": 1 },
  "enfermeiro": { "id": 1 },
  "unidadeColeta": { "id": 1 }
}
```

`DELETE /doacoes/:id` — sem corpo.

---

## 3. Campos, validações e tipos (modelo Sequelize `Doacao`)

| Campo               | Tipo         | Obrigatório | Validação backend |
|---------------------|--------------|-------------|-------------------|
| `data`              | DATEONLY     | sim         | formato `YYYY-MM-DD`; data válida. |
| `quantia`           | int          | sim         | inteiro **igual a 450 ou 500** (mL). |
| `doador.id`         | int (FK)     | sim         | deve existir; doador precisa estar **`APTO`** (ver §6). |
| `enfermeiro.id`     | int (FK)     | sim         | deve existir (`notNull`). |
| `unidadeColeta.id`  | int (FK)     | sim         | deve existir (`notNull`). |

---

## 4. Tratamento de erros (formato do error-handler do backend)

Todas as respostas de erro seguem:

```json
{
  "status": 400,
  "error": "Validation Error",
  "message": "Erro de validação",
  "details": [{ "campo": "quantia", "mensagem": "Quantia deve ser 450ml ou 500ml" }]
}
```

| HTTP | Quando |
|------|--------|
| 400  | `SequelizeValidationError` (campos inválidos), `SequelizeForeignKeyConstraintError` (FK inexistente), ou erro custom (string) — ex.: `"Doador está inapto para doação…"`, `"Limite anual atingido…"`, `"Intervalo mínimo de N dias não respeitado…"`, `"Quantia deve ser igual a 450ml ou 500ml!"`. |
| 404  | Erro custom cuja mensagem termina em "not found". |
| 500  | Erro interno. |

> O backend não emite 401/403/409 atualmente. Mesmo assim, o cliente trata 401/403/404/409/500 e falhas de rede de forma genérica (`apiClient.js`), exibindo a `message`/`details` ao usuário.

---

## 5. Regras de negócio do backend (POST/PUT) — refletidas na UX

O `DoacaoService.verificarRegrasDeNegocio` rejeita a operação (HTTP 400, mensagem string) quando:

1. `quantia` diferente de 450 ou 500.
2. Doador com `status !== 'APTO'`.
3. Limite anual de doações ultrapassado: **4** para `M`, **3** para `F`.
4. Intervalo mínimo entre doações não respeitado: **60 dias** (M) / **90 dias** (F).

Além disso, após criar/atualizar, o backend recalcula o `status` do doador (pode virar `INAPTO` ao atingir o limite, ou voltar a `APTO` no update). A tela apenas recarrega a lista após cada operação — não duplica essas regras, mas exibe as mensagens retornadas.

---

## 6. Divergências entre a tela atual (mock) e o contrato da API

| # | Tela atual (mock) | Contrato da API | Ação na integração |
|---|-------------------|-----------------|--------------------|
| 1 | `id` no formato `DOA-001` | `id` inteiro autoincremento | Usar o id inteiro retornado pela API. |
| 2 | Doação tem só `doadorId`, `unidade` (string), `data`, `quantidade` | Entidades por `id`: `doador`, **`enfermeiro`** (ausente no mock) e `unidadeColeta` | Adicionar select obrigatório de Enfermeiro; enviar os três como `{id}`. |
| 3 | Unidade de coleta = string estática (`UNIDADES_OPTIONS` do `seedData`) | Entidade `unidadeColeta` por `id` | Carregar `/unidades-coleta`; enviar `unidadeColeta:{id}`. |
| 4 | Doador = lista mock filtrada por `"Apto para Doação"` | `/doadores` com enum `status = APTO` | Carregar `/doadores`; permitir só `APTO` no cadastro (o backend exige). |
| 5 | Campo `quantidade` | Campo da API chama-se **`quantia`** | Enviar `quantia` (não `quantidade`). |
| 6 | Tipo sanguíneo digitado no mock | Vem aninhado em `doador.tipoSanguineo` (`grupoABO + fatorRH`) | Exibir derivado do doador; não é campo do formulário. |
| 7 | Paginação/busca local sobre array mock | Sem paginação/busca no servidor | Busca e filtro por data feitos no cliente sobre `GET /doacoes`. |
| 8 | Exclusão local imediata | `DELETE /doacoes/:id` real | Chamar a API e recarregar a lista. |
