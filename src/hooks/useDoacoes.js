// Composable que centraliza o estado e as operações de CRUD de Doações.
// Expõe estados de carregamento granulares (lista x ação) e atualiza
// automaticamente a interface após criar, editar ou excluir.
import { useState, useEffect, useCallback } from 'react';
import { doacaoService } from '../services/doacaoService';
import { doadorService } from '../services/doadorService';
import { enfermeiroService } from '../services/lookupService';
import { unidadeColetaService } from '../services/unidadeColetaService';
import { ApiError } from '../services/apiClient';

export function useDoacoes() {
  const [doacoes, setDoacoes] = useState([]);
  const [doadores, setDoadores] = useState([]);
  const [enfermeiros, setEnfermeiros] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [loading, setLoading] = useState(true);   // carregamento da lista
  const [saving, setSaving] = useState(false);    // criação/edição em andamento
  const [deleting, setDeleting] = useState(false); // exclusão em andamento
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  /** (Re)carrega a lista de doações a partir da API. */
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await doacaoService.listar();
      setDoacoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar doações.');
      setDoacoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carrega os dados auxiliares dos selects (doadores, enfermeiros, unidades). */
  const carregarAuxiliares = useCallback(async () => {
    try {
      const [ds, es, us] = await Promise.all([
        doadorService.listar(),
        enfermeiroService.listar(),
        unidadeColetaService.listar(),
      ]);
      setDoadores(Array.isArray(ds) ? ds : []);
      setEnfermeiros(Array.isArray(es) ? es : []);
      setUnidades(Array.isArray(us) ? us : []);
    } catch {
      // Falha nos auxiliares não impede a listagem; os selects ficam vazios.
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarAuxiliares();
  }, [carregar, carregarAuxiliares]);

  /** Cria uma doação e recarrega a lista. Lança ApiError em caso de falha. */
  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await doacaoService.criar(form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Atualiza uma doação e recarrega a lista. Lança ApiError em caso de falha. */
  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await doacaoService.atualizar(id, form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Remove uma doação e recarrega a lista. Lança ApiError em caso de falha. */
  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await doacaoService.remover(id);
      await carregar();
    } finally {
      setDeleting(false);
    }
  }, [carregar]);

  return {
    doacoes, doadores, enfermeiros, unidades,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
