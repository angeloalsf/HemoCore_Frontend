# Integração — Cadastros → Cidades (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express): `routes.js`, `controllers/CidadeController.js`, `services/CidadeService.js`, `models/Cidade.js`, `models/Uf.js` e `_middleware/error-handler.js`. A API não exige autenticação (sem header `Authorization`); CORS liberado.

> Observação: a hospedagem é Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento (estado de loading).

---

## 1. Rotas de Cidades

| Método | Rota                      | Ação      | Descrição |
|--------|---------------------------|-----------|-----------|
| GET    | `/cidades`                | findAll   | Lista todas as cidades (com `uf` aninhado). Sem paginação/filtros no servidor. |
| GET    | `/cidades/:id`            | findByPk  | Retorna uma cidade por id (com `uf` aninhado). |
| GET    | `/cidades/findByUf/:id`   | findByUf  | Lista cidades de uma UF específica. |
| POST   | `/cidades`                | create    | Cria uma cidade. Retorna o objeto criado já com `uf`. |
| PUT    | `/cidades/:id`            | update    | Atualiza uma cidade. Retorna o objeto atualizado com `uf`. |
| DELETE | `/cidades/:id`            | delete    | Remove uma cidade (`204 No Content`). Bloqueado se houver dados relacionados. |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca no backend. A busca textual e o filtro por UF são feitos **no cliente** sobre a lista retornada por `GET /cidades`.

### Rota auxiliar (para o dropdown de UF)
| Método | Rota     | Uso |
|--------|----------|-----|
| GET    | `/ufs`   | Popular o select de UF (campo obrigatório `uf.id`) e filtrar a lista por estado no cliente. |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Cidade (GET / POST / PUT retornam este shape)

```json
{
  "id": 1,
  "nome": "Cachoeiro de Itapemirim",
  "habitantes": 210000,
  "area": 876.8,
  "createdAt": "2026-06-23T23:07:56.155Z",
  "updatedAt": "2026-06-23T23:07:56.155Z",
  "ufId": 1,
  "uf": { "id": 1, "sigla": "ES", "nome": "Espírito Santo" }
}
```

### 2.2 Requisição — POST / PUT (contrato oficial)

```json
{
  "nome": "Cachoeiro de Itapemirim",
  "habitantes": 210000,
  "area": 876.8,
  "uf": { "id": 1 }
}
```

O backend desestrutura `req.body` em `{ nome, area, habitantes, uf }` e grava `ufId: uf?.id`. **Apenas** estes quatro campos são lidos — qualquer outro campo enviado é ignorado. O `id` é gerado pelo backend (não enviar no corpo).

---

## 3. Campos, tipos e validações (backend `models/Cidade.js`)

| Campo        | Tipo            | Obrigatório | Regra (mensagem do backend) |
|--------------|-----------------|-------------|------------------------------|
| `nome`       | string          | Sim         | 2–50 caracteres, não vazio. ("Nome da Cidade deve ter entre 2 e 50 letras!") |
| `habitantes` | integer         | Sim         | Inteiro ≥ 0. ("Habitantes deve ser um número inteiro!" / "Habitantes não pode ser negativo!") |
| `area`       | double          | Sim         | Número ≥ 0. ("Área deve ser um número!" / "Área não pode ser negativa!") |
| `uf`         | objeto `{ id }` | Sim         | FK obrigatória. ("Uf da Cidade deve ser preenchida!") |

---

## 4. Tratamento de erros (formato padronizado do `error-handler.js`)

Todas as respostas de erro seguem o shape:

```json
{
  "status": 400,
  "error": "Validation Error",
  "message": "Erro de validação",
  "details": [
    { "campo": "nome", "mensagem": "Nome da Cidade deve ter entre 2 e 50 letras!" }
  ]
}
```

| Status | Quando ocorre |
|--------|---------------|
| 400    | Erro de validação Sequelize (`details[]` com `campo`/`mensagem`), unicidade ou integridade referencial (FK inexistente). |
| 404    | `Cidade não encontrada!` em GET/PUT/DELETE de id inexistente. |
| 401 / 403 | Não usados hoje pela API (sem auth), mas tratados defensivamente pelo cliente. |
| 409    | Não emitido pelo backend (conflitos viram 400); tratado pelo cliente por robustez. |
| 500    | Erro interno inesperado. |

Falha de conexão / cold-start: o `apiClient` converte em `ApiError` com `status: 0` e mensagem amigável.

---

## 5. Divergências entre a tela atual e o contrato da API (antes desta integração)

1. **Dados mockados:** a tela usava `INITIAL_CIDADES` e a constante `UFS` de `src/data/seedData.js`; todo o CRUD era em memória (`useState`). → Removido; agora consome `GET /cidades` e `GET /ufs`.
2. **IDs falsos:** gerava ids no formato `CID-008`. O backend usa `id` inteiro autoincrement. → Passa a exibir o `id` real.
3. **UF como string:** o formulário guardava a sigla (`"ES"`). O contrato exige `uf: { id }` (inteiro). → Select de UF agora usa `uf.id`, exibindo a `sigla`.
4. **Sem estados de carregamento/erro:** não havia loading, bloqueio de ações nem tratamento de erro da API. → Adicionados (loading da lista, `busy` durante ações, banner de erro com "tentar novamente", mensagens de validação do backend).
5. **Requisito "atualizar após seleção do tipo sanguíneo":** não se aplica a Cidades (campo inexistente nesta entidade — provável herança de outra tela). Interpretado como **atualização automática da interface após cada operação de CRUD**, que foi implementada (recarregamento da lista após criar/editar/excluir).
