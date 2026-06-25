# API — Recepcionistas

Base URL: `https://hemocore.onrender.com`

Integração real usada pela tela **Cadastros → Recepcionistas**. Documento levantado
diretamente do backend HemoCore (`src/models/Recepcionista.js`,
`src/services/RecepcionistaService.js`, `src/controllers/RecepcionistaController.js`,
`src/routes.js`) e de respostas reais da API em produção.

## Rotas

| Método | Caminho                | Descrição                          |
| ------ | ---------------------- | ---------------------------------- |
| GET    | `/recepcionistas`      | Lista todas as recepcionistas      |
| GET    | `/recepcionistas/:id`  | Obtém uma recepcionista por id     |
| POST   | `/recepcionistas`      | Cria uma recepcionista             |
| PUT    | `/recepcionistas/:id`  | Atualiza uma recepcionista         |
| DELETE | `/recepcionistas/:id`  | Remove uma recepcionista           |

Não há paginação, filtros ou parâmetros de busca no backend — a listagem retorna o
array completo. Busca e filtros são feitos no cliente.

Rotas auxiliares usadas pelos selects do formulário:
`GET /cidades` e `GET /ufs`.

## Estrutura da resposta (GET)

`findAll` e `findByPk` incluem todos os relacionamentos aninhados
(`include: { all: true, nested: true }`):

```json
{
  "id": 4,
  "nome": "Juliana Rocha",
  "telefone": "(28) 99444-5555",
  "cpf": "456.789.012-66",
  "login": "julianar",
  "senha": "password123",
  "createdAt": "2026-06-23T23:08:00.644Z",
  "updatedAt": "2026-06-23T23:08:00.644Z",
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

`GET /recepcionistas` devolve um array desses objetos.

## Corpo da requisição (POST / PUT)

O `RecepcionistaService` lê exatamente: `nome`, `telefone`, `cpf`, `login`, `senha` e
`cidade` (objeto aninhado — usa `cidade.id`). **A cidade é enviada como objeto, não
como `cidadeId`.**

```json
{
  "nome": "Juliana Rocha",
  "telefone": "(28) 99444-5555",
  "cpf": "456.789.012-66",
  "login": "julianar",
  "senha": "password123",
  "cidade": { "id": 1 }
}
```

Observações:

- O PUT exige o corpo completo (incluindo `senha`): o service faz
  `Object.assign(obj, { nome, telefone, cpf, login, senha, cidadeId: cidade.id })`,
  ou seja, todos os campos são sobrescritos. Enviar `senha` vazia falha na validação.
- A resposta de POST/PUT é o objeto completo com os relacionamentos aninhados.

## Campos, obrigatoriedade e validações (modelo Sequelize)

| Campo      | Tipo   | Obrigatório | Validação no backend                                   |
| ---------- | ------ | ----------- | ------------------------------------------------------ |
| `nome`     | string | sim         | 2 a 50 caracteres                                      |
| `telefone` | string | sim         | padrão `(NN) NNNNN-NNNN` (regex)                       |
| `cpf`      | string | sim, único  | padrão `NNN.NNN.NNN-NN` (regex); único                 |
| `login`    | string | sim, único  | 4 a 20 caracteres; único                               |
| `senha`    | string | sim         | mínimo 6 caracteres                                    |
| `cidade`   | objeto | sim         | `cidade.id` obrigatório (`belongsTo cidade`)           |

## Erros

Formato de erro do backend (tratado por `apiClient` / `ApiError`):

```json
{ "status": 400, "error": "...", "message": "...", "details": [ { "campo": "...", "mensagem": "..." } ] }
```

- **400** — validação (nome/telefone/cpf/login/senha/cidade) ou regra de negócio
  (`"A Cidade do Recepcionista deve ser preenchida!"`).
- **404** — id inexistente (`"Recepcionista não encontrado!"`).
- **409** — conflito de unicidade (`cpf` ou `login` já cadastrados).
- **401 / 403** — autorização (tratados genericamente na UI).
- **500** — erro interno.
- **status 0** — falha de conexão (rede), tratada por `ApiError`.

## Divergências entre a tela antiga (mock) e o contrato da API

1. **Dados mockados**: a tela usava `INITIAL_RECEPCIONISTAS`, `CIDADES_MAP` e `UFS`
   de `seedData.js`. Substituídos por `GET /recepcionistas`, `GET /cidades` e `GET /ufs`.
2. **ID**: o mock usava `REC-00X` (string). A API usa `id` numérico autoincrementado.
3. **Cidade/UF**: o mock guardava `uf` e `cidade` como strings livres. A API exige
   `cidade: { id }` e devolve `cidade.nome` + `cidade.uf.sigla`. O formulário agora
   seleciona UF e Cidade reais (cidade filtrada pela UF via `cidade.ufId`).
4. **Validação de login**: mock exigia mínimo 3; o backend exige **4 a 20**. Alinhado.
5. **Validação de senha**: mock exigia mínimo 8; o backend exige **mínimo 6**. Alinhado.
6. **Senha na edição**: o mock não reenviava senha. O backend sobrescreve a senha em
   todo PUT, então a edição pré-preenche a senha atual (retornada pela API) e a
   reenvia, evitando apagá-la.
