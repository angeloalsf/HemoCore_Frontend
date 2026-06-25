// Composable que centraliza o estado e as operações de CRUD de Cidades.
// Expõe estados de carregamento granulares (lista x ação) e atualiza
// automaticamente a interface após criar, editar ou excluir.
import { useState, useEffect, useCallback } from 'react';
import { cidadeService } from '../services/cidadeService';
import { ufService } from '../services/lookupService';
import { ApiError } from '../services/apiClient';

export function useCidades() {
  const [cidades, setCidades] = useState([]);
  const [ufs, setUfs] = useState([]);

  const [loading, setLoading] = useState(true);    // carregamento da lista
  const [saving, setSaving] = useState(false);     // criação/edição em andamento
  const [deleting, setDeleting] = useState(false); // exclusão em andamento
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  /** (Re)carrega a lista de cidades a partir da API. */
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await cidadeService.listar();
      setCidades(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar cidades.');
      setCidades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carrega os dados auxiliares do select de UF. */
  const carregarAuxiliares = useCallback(async () => {
    try {
      const us = await ufService.listar();
      setUfs(Array.isArray(us) ? us : []);
    } catch {
      // Falha nos auxiliares não impede a listagem; o select de UF fica vazio.
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarAuxiliares();
  }, [carregar, carregarAuxiliares]);

  /** Cria uma cidade e recarrega a lista. Lança ApiError em caso de falha. */
  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await cidadeService.criar(form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Atualiza uma cidade e recarrega a lista. Lança ApiError em caso de falha. */
  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await cidadeService.atualizar(id, form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Remove uma cidade e recarrega a lista. Lança ApiError em caso de falha. */
  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await cidadeService.remover(id);
      await carregar();
    } finally {
      setDeleting(false);
    }
  }, [carregar]);

  return {
    cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
