# Integração — Cadastros → Doadores (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express). A API não exige autenticação (sem header `Authorization`); CORS liberado (`Access-Control-Allow-Origin: *`).

> Observação: a hospedagem é Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rotas de Doadores

| Método | Rota              | Ação        | Descrição |
|--------|-------------------|-------------|-----------|
| GET    | `/doadores`       | findAll     | Lista todos os doadores (com `tipoSanguineo`, `cidade`→`uf` e `doacoes` aninhados). Sem paginação/filtros no servidor. |
| GET    | `/doadores/:id`   | findByPk    | Retorna um doador por id (mesmos aninhamentos). |
| POST   | `/doadores`       | create      | Cria um doador. |
| PUT    | `/doadores/:id`   | update      | Atualiza um doador. |
| DELETE | `/doadores/:id`   | delete      | Remove um doador (bloqueado se houver doações vinculadas). |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca no backend. A busca e o filtro por status são feitos **no cliente** sobre a lista retornada por `GET /doadores`.

### Rotas auxiliares (para dropdowns / relacionamentos)
| Método | Rota                 | Uso |
|--------|----------------------|-----|
| GET    | `/tipos-sanguineos`  | Popular o select de Tipo Sanguíneo (campo obrigatório `tipoSanguineo.id`). |
| GET    | `/cidades`           | Popular o select de Cidade (campo obrigatório `cidade.id`); cada cidade traz `uf`. |
| GET    | `/ufs`               | Popular o select de UF (filtra as cidades por estado, somente no cliente). |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Doador (GET / POST / PUT retornam este shape)

```json
{
  "id": 1,
  "nome": "Ana Paula Ferreira",
  "sexo": "F",
  "telefone": "(27) 98823-1100",
  "cpf": "123.456.789-00",
  "status": "APTO",
  "tipoSanguineoId": 1,
  "cidadeId": 1,
  "createdAt": "2025-05-01T12:00:00.000Z",
  "updatedAt": "2025-05-01T12:00:00.000Z",
  "tipoSanguineo": {
    "id": 1,
    "grupoABO": "A",
    "fatorRH": true,
    "quantidade": 10,
    "descricao": "…"
  },
  "cidade": {
    "id": 1,
    "nome": "Vitória",
    "habitantes": 365855,
    "area": 98.19,
    "ufId": 1,
    "uf": { "id": 1, "sigla": "ES", "nome": "Espírito Santo" }
  },
  "doacoes": []
}
```

`GET /doadores` retorna um **array** desses objetos.

### 2.2 Requisição — POST / PUT (corpo)

O `DoadorService` lê `tipoSanguineo?.id` e `cidade?.id`. Portanto o corpo usa **objetos aninhados** (não `tipoSanguineoId` direto):

```json
{
  "nome": "Ana Paula Ferreira",
  "sexo": "F",
  "telefone": "(27) 98823-1100",
  "cpf": "123.456.789-00",
  "status": "APTO",
  "tipoSanguineo": { "id": 1 },
  "cidade": { "id": 1 }
}
```

`DELETE /doadores/:id` — sem corpo.

---

## 3. Campos, validações e tipos (modelo Sequelize `Doador`)

| Campo        | Tipo            | Obrigatório | Validação backend |
|--------------|-----------------|-------------|-------------------|
| `nome`       | string          | sim         | 2–50 caracteres. |
| `sexo`       | enum            | sim         | **`M` ou `F`** apenas. |
| `telefone`   | string          | sim         | padrão `(NN) NNNNN-NNNN` (regex aceita 4–5 dígitos no meio). |
| `cpf`        | string          | sim         | padrão `NNN.NNN.NNN-NN`, **único**. |
| `status`     | enum            | sim         | **`APTO`, `INAPTO` ou `PENDENTE`**. |
| `tipoSanguineo.id` | int (FK)  | sim         | deve existir (`notNull`). |
| `cidade.id`  | int (FK)        | sim         | deve existir (`notNull`). |

---

## 4. Tratamento de erros (formato do error-handler do backend)

Todas as respostas de erro seguem:

```json
{
  "status": 400,
  "error": "Validation Error",
  "message": "Erro de validação",
  "details": [{ "campo": "cpf", "mensagem": "CPF do Doador deve seguir o padrão NNN.NNN.NNN-NN!" }]
}
```

| HTTP | Quando |
|------|--------|
| 400  | `SequelizeValidationError` (campos inválidos), `SequelizeUniqueConstraintError` (CPF duplicado), `SequelizeForeignKeyConstraintError` (FK inexistente), ou erro custom (string) que não termina em "not found". |
| 404  | Erro custom cuja mensagem termina em "not found". |
| 500  | Erro interno. |

> O backend não emite 401/403/409 atualmente. Mesmo assim, o cliente trata 401/403/404/409/500 e falhas de rede de forma genérica, conforme solicitado, exibindo a `message`/`details` ao usuário.

---

## 5. Divergências entre a tela atual (mock) e o contrato da API

| # | Tela atual (mock) | Contrato da API | Ação na integração |
|---|-------------------|-----------------|--------------------|
| 1 | `status` = `"Apto para Doação"` / `"Pendente para Doação"` / `"Inapto para Doação"` | `status` = `APTO` / `PENDENTE` / `INAPTO` | Usar os enums da API; rótulos amigáveis só na UI. |
| 2 | `sexo` inclui `O` (Outro) | `sexo` só aceita `M`/`F` | Remover "Outro"; manter Masculino/Feminino. |
| 3 | Tipo sanguíneo = string estática (`"A+"`, …) | Entidade `tipoSanguineo` por `id`; rótulo = `grupoABO + (fatorRH ? '+' : '-')` | Carregar `/tipos-sanguineos`; enviar `tipoSanguineo:{id}`. |
| 4 | UF/Cidade = strings estáticas (`seedData`) | Entidade `cidade` por `id`, com relação `uf` | Carregar `/cidades` e `/ufs`; enviar `cidade:{id}`. |
| 5 | `id` no formato `D-001` | `id` inteiro autoincremento | Usar o id inteiro retornado pela API. |
| 6 | Paginação/busca local sobre array mock | Sem paginação/busca no servidor | Busca e filtro feitos no cliente sobre `GET /doadores`. |
| 7 | Exclusão sempre permitida | Bloqueada se houver doações vinculadas (erro 400) | Exibir a mensagem de erro do backend ao usuário. |
