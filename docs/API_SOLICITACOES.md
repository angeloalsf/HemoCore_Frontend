# Integração — Processos → Solicitações (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express: `models/Solicitacao.js`, `models/ItemSolicitacao.js`, `services/SolicitacaoService.js`, `controllers/SolicitacaoController.js`, `routes.js`, `_middleware/error-handler.js`) e respostas reais da API em produção.

A API **não exige autenticação** (sem header `Authorization`); CORS liberado.

> Observação: hospedagem em Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rotas de Solicitações

| Método | Rota                                                              | Ação        | Descrição |
|--------|-------------------------------------------------------------------|-------------|-----------|
| GET    | `/solicitacoes`                                                   | findAll     | Lista todas as solicitações (com `hospital`→`cidade`→`uf` e `itensSolicitacao`→`tipoSanguineo` aninhados). Sem paginação/filtros no servidor. |
| GET    | `/solicitacoes/:id`                                               | findByPk    | Retorna uma solicitação por id (mesmos aninhamentos). |
| POST   | `/solicitacoes`                                                   | create      | Cria uma solicitação e seus itens; **reduz o estoque** dos tipos sanguíneos. Retorna o objeto criado já aninhado. |
| PUT    | `/solicitacoes/:id`                                               | update      | Atualiza a solicitação: devolve o estoque dos itens antigos, regrava os dados e (se não for `CANCELADA`) recria itens reduzindo estoque. |
| DELETE | `/solicitacoes/:id`                                               | delete      | Remove a solicitação, **devolvendo o estoque** dos itens. Retorna o objeto removido. |
| GET    | `/solicitacoes/por-hospital/:hospitalId`                          | (relatório) | Solicitações por hospital (aceita `?inicio&termino`). Usado nos Relatórios, não no CRUD. |
| GET    | `/solicitacoes/maiores-solicitantes-por-tipo-sanguineo/:tipoId`   | (relatório) | Maiores solicitantes por tipo sanguíneo. Usado nos Relatórios. |

**Não existem** rotas PATCH, nem parâmetros de paginação/busca para o CRUD. A busca (hospital/observação) e os filtros (status, urgência) são feitos **no cliente** sobre a lista de `GET /solicitacoes`.

### Rotas auxiliares (para dropdowns / relacionamentos)
| Método | Rota                | Uso |
|--------|---------------------|-----|
| GET    | `/hospitais`        | Popular o select de Hospital (campo obrigatório `hospital.id`). |
| GET    | `/tipos-sanguineos` | Popular o select de tipo sanguíneo dos itens (`tipoSanguineo.id`) e exibir o **estoque disponível** (`quantidade`). |

---

## 2. Estrutura dos JSONs

### 2.1 Resposta — objeto Solicitação (GET / POST / PUT retornam este shape)

```json
{
  "id": 1,
  "data": "2026-04-01",
  "status": "EM ABERTO",
  "urgencia": "ALTA",
  "observacao": "Paciente em estado crítico, necessita de transfusão urgente.",
  "createdAt": "2026-06-23T23:08:00.799Z",
  "updatedAt": "2026-06-23T23:08:00.799Z",
  "hospitalId": 1,
  "hospital": {
    "id": 1,
    "nome": "Hospital Santa Casa",
    "sigla": "HSC",
    "telefone": "(28) 99999-9999",
    "cnpj": "12.345.678/0001-95",
    "tipo": "FILANTRÓPICO",
    "cidadeId": 1,
    "cidade": {
      "id": 1, "nome": "Cachoeiro", "habitantes": 210000, "area": 876.8,
      "ufId": 1, "uf": { "id": 1, "sigla": "ES", "nome": "Espírito Santo" }
    }
  },
  "itensSolicitacao": [
    {
      "id": 1,
      "quantidade": 2000,
      "solicitacaoId": 1,
      "tipoSanguineoId": 4,
      "tipoSanguineo": {
        "id": 4, "grupoABO": "O", "fatorRH": true, "quantidade": 500,
        "descricao": "Tipo Sanguíneo O positivo"
      }
    }
  ]
}
```

`GET /solicitacoes` devolve um **array** desses objetos. Uma solicitação pode ter `itensSolicitacao: []` (vazio).

### 2.2 Requisição — POST / PUT (contrato real lido por `SolicitacaoService`)

```json
{
  "data": "2026-06-25",
  "status": "EM ABERTO",
  "urgencia": "ALTA",
  "observacao": "Reposição de estoque do banco de sangue.",
  "hospital": { "id": 1 },
  "itensSolicitacao": [
    { "quantidade": 500, "tipoSanguineo": { "id": 4 } },
    { "quantidade": 1000, "tipoSanguineo": { "id": 1 } }
  ]
}
```

O backend desestrutura `{ data, status, urgencia, observacao, hospital, itensSolicitacao }` e grava `hospitalId: hospital.id`. Cada item é criado com `quantidade`, `tipoSanguineoId: item.tipoSanguineo.id`. **Não há `hospitalId` direto** nem `tipoSanguineoId` direto no corpo — usam-se os objetos aninhados `hospital: { id }` e `tipoSanguineo: { id }`.

---

## 3. Campos, tipos e validações (backend)

### Solicitação (`models/Solicitacao.js`)
| Campo         | Tipo / Enum                                            | Obrigatório | Regra |
|---------------|--------------------------------------------------------|-------------|-------|
| `data`        | `DATEONLY` (`YYYY-MM-DD`)                               | Sim         | Data válida; default = hoje. |
| `status`      | enum `EM ABERTO` / `CANCELADA` / `FINALIZADA`          | Sim         | Default `EM ABERTO`. |
| `urgencia`    | enum `BAIXA` / `MÉDIA` / `ALTA` / `CRÍTICA`            | Sim         | Default `BAIXA`. **`CRÍTICA` é definida apenas pelo sistema** (Regra 2) — não deve ser selecionada manualmente pelo usuário. |
| `observacao`  | string (máx. 500)                                      | Não         | Pode ser `null`. |
| `hospital`    | objeto `{ id }` → `hospitalId`                         | Sim         | O hospital deve existir (FK). |
| `itensSolicitacao` | array de itens                                    | Sim         | Deve conter **pelo menos um item**. |

### Item de Solicitação (`models/ItemSolicitacao.js`)
| Campo           | Tipo / Enum                  | Obrigatório | Regra |
|-----------------|------------------------------|-------------|-------|
| `quantidade`    | inteiro                      | Sim         | Mínimo 1. |
| `tipoSanguineo` | objeto `{ id }` → `tipoSanguineoId` | Sim  | O tipo sanguíneo deve existir. |

### Regras de negócio (em `SolicitacaoService`)
1. **Estoque suficiente:** a solicitação só é criada/atualizada se houver `quantidade` suficiente em estoque de cada `tipoSanguineo` no momento da efetivação. Caso contrário: `Estoque insuficiente para o tipo sanguíneo X±: Estoque disponível N, quantia solicitada M.` (HTTP 400).
2. **Prioridade automática:** se já houver **2 ou mais** solicitações com `urgencia: ALTA` e `status: CANCELADA` para o **mesmo hospital** e **mesmo tipo sanguíneo** nos últimos **7 dias**, a urgência é elevada para `CRÍTICA` automaticamente e um aviso `[SISTEMA]` é prefixado na observação.
3. **Movimentação de estoque:** criar reduz estoque; excluir devolve; atualizar devolve os itens antigos e (exceto quando `status === CANCELADA`) recria os novos reduzindo estoque.

---

## 4. Tratamento de erros

Formato do backend (`_middleware/error-handler.js`): `{ status, error, message, details?: [{ campo, mensagem }] }`. O cliente normaliza em `ApiError` e exibe `toUserMessage()` (agrega `details[].mensagem`).

| Cenário                                              | Status | Mensagem ao usuário |
|------------------------------------------------------|--------|----------------------|
| Validação (data/status/urgência/quantidade)          | 400    | Detalhes agregados (`details[].mensagem`). |
| Solicitação sem itens                                | 400    | "A solicitação deve conter pelo menos um item!". |
| Estoque insuficiente                                 | 400    | "Estoque insuficiente para o tipo sanguíneo …". |
| Hospital/tipo sanguíneo inexistente (FK)             | 400    | "Erro de integridade referencial" / campo relacionado. |
| Solicitação inexistente em PUT/DELETE                | 400    | "Solicitação não encontrada!". |
| Não autorizado / acesso negado                       | 401/403| "Não autorizado." / "Acesso negado." |
| Não encontrado (rota/strings terminadas em not found)| 404    | "Registro não encontrado." |
| Erro interno                                          | 500    | "Erro interno do servidor." |
| Falha de rede / cold start sem resposta              | 0      | "Falha de conexão com o servidor…". |

O cliente bloqueia ações enquanto há requisição em andamento (`saving`/`deleting`) e exibe spinners; erros de carregamento têm botão "Tentar novamente".

---

## 5. Divergências entre a tela antiga e o contrato da API

1. **Dados 100% mockados** — a tela usava `INITIAL_SOLICITACOES`, `INITIAL_HOSPITAIS` e `TIPOS_SANGUINEOS` de `data/seedData.js` e ids locais (`SOL-001`). Substituído por CRUD real via API; o id agora é numérico (gerado pelo backend).
2. **Enums de status** — a tela usava `Em Aberto` / `Finalizada` / `Cancelada`. A API usa `EM ABERTO` / `FINALIZADA` / `CANCELADA` (maiúsculas). O cliente envia/recebe o enum e exibe rótulos amigáveis apenas na UI.
3. **Enums de urgência** — a tela usava `Baixa` / `Média` / `Alta`. A API usa `BAIXA` / `MÉDIA` / `ALTA` / `CRÍTICA`. `CRÍTICA` **não** é oferecida no select (é atribuída pelo sistema); é apenas exibida quando retornada.
4. **Itens** — a tela guardava `{ tipo: 'A+', qtd }`. O contrato real é `itensSolicitacao: [{ quantidade, tipoSanguineo: { id } }]`. O id do tipo sanguíneo vem de `/tipos-sanguineos`; o rótulo `A+` é derivado de `grupoABO`+`fatorRH`.
5. **Hospital** — antes era uma string (`s.hospital`). Agora é o relacionamento `hospital: { id }`, com nome derivado de `hospital.nome`.
6. **Estoque** — a UI agora exibe automaticamente o **estoque disponível** do tipo sanguíneo selecionado (de `tipoSanguineo.quantidade`) e valida a quantidade contra ele antes de adicionar o item, evitando o erro 400 de estoque insuficiente.
7. **Sem paginação/busca no servidor** — busca (hospital/observação) e filtros (status, urgência) permanecem no cliente, sobre a lista de `GET /solicitacoes`.
