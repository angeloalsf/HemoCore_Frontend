# Integração — Relatórios → Somatório por Tipo Sanguíneo (API HemoCore)

**Base URL:** `https://hemocore.onrender.com`
**Fonte da verdade:** código-fonte do backend (`HemoCore/src` — Sequelize + Express + SQL puro na camada `repository`). A API não exige autenticação; CORS liberado (`Access-Control-Allow-Origin: *`).

> Hospedagem Render free tier — a primeira requisição após inatividade pode levar ~30–60s (cold start). O cliente trata isso como latência normal de carregamento.

---

## 1. Rota do relatório

| Método | Rota                                          | Controller / Service / Repository |
|--------|-----------------------------------------------|-----------------------------------|
| GET    | `/doacoes/somatorio-por-tipo-sanguineo`       | `DoacaoController.findSomatorioPorTipoSanguineo` → `DoacaoService.findSomatorioPorTipoSanguineo` → `DoacaoRepository.findSomatorioPorTipoSanguineo` |

Relatório **somente leitura**. A rota é registrada **antes** de `/doacoes/:id` em `routes.js`, evitando colisão de path.

### 1.1 Parâmetros (query string — todos opcionais)

| Parâmetro    | Tipo       | Descrição                  |
|--------------|------------|----------------------------|
| `dataInicio` | data (ISO) | `doacoes.data >= dataInicio` |
| `dataFim`    | data (ISO) | `doacoes.data <= dataFim`    |

Não há filtro por tipo sanguíneo (o relatório agrupa todos) nem paginação.

### 1.2 Regras fixas aplicadas pelo backend

- `JOIN doadores` + `JOIN tipos_sanguineos`, agrupando por tipo sanguíneo.
- `total` = `COUNT(doacoes.id)` concatenado com o texto ` Doações`.
- Ordenação por `COUNT(doacoes.id)` **DESC**.

---

## 2. Resposta

`200 OK` — array de objetos:

```json
[
  { "tiposanguineo": "AB+", "total": "3 Doações" },
  { "tiposanguineo": "O+",  "total": "1 Doações" },
  { "tiposanguineo": "A+",  "total": "1 Doações" },
  { "tiposanguineo": "A-",  "total": "1 Doações" }
]
```

> **Casing das chaves:** o PostgreSQL rebaixa para minúsculas os aliases de coluna não escritos entre aspas. Apesar do SQL declarar `AS tipoSanguineo`, a resposta chega como `tiposanguineo`. O cliente reconcilia ambas as grafias (`tipoSanguineo ?? tiposanguineo`).
>
> **`total` é string descritiva** (`"3 Doações"`), não número. O cliente extrai a contagem numérica em `totalDoacoes` para formatação/ordenação, preservando `total` para exibição.

---

## 3. Mapeamento no frontend

| Camada    | Arquivo                                      |
|-----------|----------------------------------------------|
| Service   | `src/services/relatorioService.js` → `somatorioPorTipoSanguineo` |
| Hook      | `src/hooks/useSomatorioTipoSanguineo.js`     |
| Tela      | `src/pages/reports/Relatorio.jsx` → `RelSomatorio` |

Colunas exibidas: **Classificação** (ranking), **Tipo Sanguíneo** e **Total de Doações**.
