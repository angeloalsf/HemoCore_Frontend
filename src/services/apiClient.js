// Cliente HTTP base para a API do HemoCore.
// Centraliza a base URL, o parsing de JSON e a normalização de erros
// no formato { status, error, message, details } usado pelo backend.

const BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'https://hemocore.onrender.com';

/**
 * Erro de API com os campos retornados pelo backend.
 * - status: código HTTP (0 = falha de conexão)
 * - details: lista de { campo, mensagem } quando houver validação
 */
export class ApiError extends Error {
  constructor(message, { status = 0, error = '', details = [], method = '', path = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.details = details || [];
    this.method = method;
    this.path = path;
  }

  /** Mensagem amigável agregando os detalhes de validação, se houver. */
  toUserMessage() {
    if (this.details.length) {
      return this.details.map((d) => d.mensagem || d.message).filter(Boolean).join(' • ');
    }
    return this.message;
  }
}

function messageForStatus(status, body) {
  if (body && body.message) return body.message;
  switch (status) {
    case 400: return 'Requisição inválida.';
    case 401: return 'Não autorizado.';
    case 403: return 'Acesso negado.';
    case 404: return 'Registro não encontrado.';
    case 409: return 'Conflito: registro já existe ou em uso.';
    case 500: return 'Erro interno do servidor.';
    default:  return `Erro inesperado (HTTP ${status}).`;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const url = `${BASE_URL}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Falha de rede / conexão (inclui abort por timeout)
    console.error(`[HemoCore API] Falha de conexão em ${method} ${url}`, err);
    throw new ApiError(
      'Falha de conexão com o servidor. Verifique sua internet e tente novamente.',
      { status: 0, error: 'NetworkError', method, path }
    );
  }

  // 204 ou corpo vazio
  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    // Log completo para diagnóstico (status, corpo do erro, payload enviado).
    console.error(`[HemoCore API] ${method} ${url} → HTTP ${res.status}`, {
      response: data ?? text,
      requestBody: body ?? null,
    });
    const base = messageForStatus(res.status, data);
    throw new ApiError(`${base} (HTTP ${res.status} em ${method} ${path})`, {
      status: res.status,
      error: data?.error || '',
      details: data?.details || [],
      method,
      path,
    });
  }

  return data;
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { BASE_URL };
