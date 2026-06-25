// Composable que centraliza o estado e as operações de CRUD de Solicitações.
// Expõe estados de carregamento granulares (lista x ação) e atualiza
// automaticamente a interface após criar, editar ou excluir.
import { useState, useEffect, useCallback } from 'react';
import { solicitacaoService } from '../services/solicitacaoService';
import { hospitalService } from '../services/hospitalService';
import { tipoSanguineoService } from '../services/lookupService';
import { ApiError } from '../services/apiClient';

export function useSolicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [hospitais, setHospitais] = useState([]);
  const [tiposSanguineos, setTiposSanguineos] = useState([]);

  const [loading, setLoading] = useState(true);    // carregamento da lista
  const [saving, setSaving] = useState(false);     // criação/edição em andamento
  const [deleting, setDeleting] = useState(false); // exclusão em andamento
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  /** (Re)carrega a lista de solicitações a partir da API. */
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await solicitacaoService.listar();
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar solicitações.');
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carrega os dados auxiliares dos selects (hospitais, tipos sanguíneos). */
  const carregarAuxiliares = useCallback(async () => {
    try {
      const [hs, ts] = await Promise.all([
        hospitalService.listar(),
        tipoSanguineoService.listar(),
      ]);
      setHospitais(Array.isArray(hs) ? hs : []);
      setTiposSanguineos(Array.isArray(ts) ? ts : []);
    } catch {
      // Falha nos auxiliares não impede a listagem; os selects ficam vazios.
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarAuxiliares();
  }, [carregar, carregarAuxiliares]);

  /** Cria uma solicitação e recarrega lista + tipos (estoque). Lança ApiError em caso de falha. */
  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await solicitacaoService.criar(form);
      await Promise.all([carregar(), carregarAuxiliares()]);
    } finally {
      setSaving(false);
    }
  }, [carregar, carregarAuxiliares]);

  /** Atualiza uma solicitação e recarrega lista + tipos (estoque). Lança ApiError em caso de falha. */
  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await solicitacaoService.atualizar(id, form);
      await Promise.all([carregar(), carregarAuxiliares()]);
    } finally {
      setSaving(false);
    }
  }, [carregar, carregarAuxiliares]);

  /** Remove uma solicitação e recarrega lista + tipos (estoque devolvido). Lança ApiError em caso de falha. */
  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await solicitacaoService.remover(id);
      await Promise.all([carregar(), carregarAuxiliares()]);
    } finally {
      setDeleting(false);
    }
  }, [carregar, carregarAuxiliares]);

  return {
    solicitacoes, hospitais, tiposSanguineos,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
