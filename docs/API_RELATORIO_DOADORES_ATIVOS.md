# Integração — Relatórios → Doadores Ativos (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express + SQL puro na camada `repository`). A API não exige autenticação (sem header `Authorization`); CORS liberado (`Access-Control-Allow-Origin: *`).

> Hospedagem Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rota do relatório

| Método | Rota                              | Controller / Service / Repository                                                            |
|--------|-----------------------------------|----------------------------------------------------------------------------------------------|
| GET    | `/doacoes/doadores-ativos`        | `DoacaoController.findDoadoresAtivos` → `DoacaoService.findDoadoresAtivos` → `DoacaoRepository.findDoadoresAtivos` |

Não há POST/PUT/PATCH/DELETE para este recurso — é um relatório **somente leitura**. As demais operações de CRUD do agregado de doações usam `/doacoes` (não fazem parte desta tela).

A rota é registrada **antes** de `/doacoes/:id` em `routes.js`, evitando colisão de path.

### 1.1 Parâmetros (query string — todos opcionais)

| Parâmetro       | Tipo            | Descrição                                                                 |
|-----------------|-----------------|---------------------------------------------------------------------------|
| `tipoSanguineo` | número (id)     | Filtra por `doadores.tipo_sanguineo_id`. É o **id** do tipo sanguíneo, não o rótulo `"A+"`. |
| `dataInicio`    | data (ISO)      | `doacoes.data >= dataInicio`.                                              |
| `dataFim`       | data (ISO)      | `doacoes.data <= dataFim`.                                                 |

Não há paginação no servidor.

### 1.2 Regras fixas aplicadas pelo backend (não parametrizáveis)

- **Status:** somente `doadores.status = 'APTO'` (cláusula `WHERE` fixa). A tela não precisa — e não deve — enviar filtro de status.
- **Ordenação:** `ORDER BY d.data DESC` — decrescente pela data da doação (última doação primeiro).

---

## 2. SQL e JOINs (DoacaoRepository.findDoadoresAtivos)

```sql
SELECT
  doa.nome,
  doa.cpf,
  u.sigla AS uf,
  ts.grupo_abo || (CASE WHEN ts.fator_rh = 1 THEN '+' ELSE '-' END) AS tipoSanguineo,
  doa.status,
  d.data AS dataDoacao
FROM doacoes d
JOIN doadores doa        ON d.doador_id        = doa.id
JOIN tipos_sanguineos ts ON doa.tipo_sanguineo_id = ts.id
JOIN cidades cid         ON doa.cidade_id      = cid.id
JOIN ufs u               ON cid.uf_id          = u.id
WHERE doa.status = 'APTO'
  [AND doa.tipo_sanguineo_id = :tipoSanguineo]
  [AND d.data >= :dataInicio]
  [AND d.data <= :dataFim]
ORDER BY d.data DESC
```

Consequência do `JOIN doacoes`: a granularidade é **uma linha por doação**. Um mesmo doador apto com várias doações aparece em várias linhas — uma por doação — ordenadas pela data. Isto é o contrato; o cliente renderiza exatamente o que a API retorna (sem deduplicar).

---

## 3. Contrato dos JSONs

### 3.1 Resposta — `GET /doacoes/doadores-ativos`

Array de objetos, cada um com **exatamente** estes campos (nomes e tipos vindos do SQL acima):

```json
[
  {
    "nome": "Rafael",
    "cpf": "123.456.789-03",
    "uf": "MG",
    "tipoSanguineo": "AB+",
    "status": "APTO",
    "dataDoacao": "2026-04-02"
  }
]
```

| Campo           | Tipo    | Origem                                                        |
|-----------------|---------|--------------------------------------------------------------|
| `nome`          | string  | `doadores.nome`                                              |
| `cpf`           | string  | `doadores.cpf`                                               |
| `uf`            | string  | `ufs.sigla` (ex.: `"ES"`, `"MG"`)                            |
| `tipoSanguineo` | string  | rótulo já formatado pelo SQL (ex.: `"O+"`, `"AB+"`)         |
| `status`        | string  | sempre `"APTO"` (filtro fixo)                                |
| `dataDoacao`    | string  | `doacoes.data` (formato `YYYY-MM-DD`)                        |

> **Não há** `id`, nem nome da cidade, nem contagem total de doações nesta resposta. Não inventar esses campos no cliente.

### 3.2 Rota auxiliar — dropdown de filtro

Para popular o seletor de tipo sanguíneo (o filtro envia o **id**):

```
GET /tipos-sanguineos
```

```json
[
  { "id": 4, "grupoABO": "O", "fatorRH": true, "quantidade": 500, "descricao": "..." }
]
```

Rótulo no cliente: `grupoABO + (fatorRH ? '+' : '-')` — mesma regra do backend (`getModelVerboso`). Já existe `tipoSanguineoLabel` em `services/lookupService.js`.

---

## 4. Exemplos reais

Requisição (sem filtro):
```
GET https://hemocore.onrender.com/doacoes/doadores-ativos
```

Requisição (filtro por tipo sanguíneo AB+ = id 5):
```
GET https://hemocore.onrender.com/doacoes/doadores-ativos?tipoSanguineo=5
```

Resposta esperada (ordenada por `dataDoacao` desc, só `status = APTO`):
```json
[
  { "nome": "Rafael", "cpf": "123.456.789-03", "uf": "MG", "tipoSanguineo": "AB+", "status": "APTO", "dataDoacao": "2026-04-02" },
  { "nome": "Rafael", "cpf": "123.456.789-03", "uf": "MG", "tipoSanguineo": "AB+", "status": "APTO", "dataDoacao": "2026-01-02" }
]
```

---

## 5. Tratamento de erros (cliente)

Reaproveita `apiClient` / `ApiError` (`services/apiClient.js`), que já normaliza:

| Situação                  | Tratamento                                                            |
|---------------------------|----------------------------------------------------------------------|
| Falha de conexão / timeout| `status: 0` → mensagem "Falha de conexão…" + botão "Tentar novamente". |
| 400/401/403/404/409/500   | mensagem amigável por status + detalhes de validação (`details[]`).   |
| Resposta não-array        | tratada como lista vazia (defensivo).                                 |

Estados de carregamento: `loading` (consulta inicial e a cada troca de filtro) exibe spinner; durante a requisição o seletor de tipo sanguíneo fica desabilitado para evitar disparos concorrentes.

---

## 6. Divergências entre a tela atual (mock) e o contrato da API

A implementação anterior de `RelDoadores` usava um array estático. Diferenças corrigidas:

| Tela mock (antes)                          | Contrato real da API                              | Ação                                                        |
|--------------------------------------------|---------------------------------------------------|-------------------------------------------------------------|
| Coluna `ID` (`D-001`)                      | não existe                                         | **Removida**.                                               |
| Coluna `Total de Doações`                  | não existe                                         | **Removida**.                                               |
| Coluna `Cidade/UF` (`Vitória/ES`)          | apenas `uf` (sigla)                                | Substituída por coluna **UF**.                              |
| Filtro por rótulo `"A+"` no cliente        | filtro por **id** via query `?tipoSanguineo=`     | Filtro passa a chamar a API com o id.                       |
| Lista filtrada localmente (`useMemo`)      | filtro/ordenação no servidor                      | Refetch na API a cada seleção (auto-atualização).           |
| Status livre / "Apto para Doação" textual  | backend força `status = 'APTO'`                   | Status sempre Apto (badge), sem opção de outros status.     |
| Dados estáticos                            | `GET /doacoes/doadores-ativos`                    | Integração real, sem mocks/local/estático.                  |

### Observação sobre o ambiente publicado
No momento da implementação, o deploy em `hemocore.onrender.com` respondia vazio para `/doacoes/doadores-ativos` e `/doacoes/somatorio-por-tipo-sanguineo`, enquanto rotas baseadas em model (`/doacoes`, `/tipos-sanguineos`) retornavam dados normalmente. Os endpoints de relatório **existem no código-fonte mais recente** do backend (commit `a3f4162`, camada `repository`), portanto a divergência é de **deploy desatualizado** — basta um novo deploy do backend para a rota servir os dados. O cliente já está implementado conforme o contrato oficial e passará a exibir os dados assim que o backend for republicado.
