// Composable que centraliza o estado e as operações de CRUD de Campanhas.
// Expõe estados de carregamento granulares (lista x ação) e atualiza
// automaticamente a interface após criar, editar ou excluir.
import { useState, useEffect, useCallback } from 'react';
import { campanhaService } from '../services/campanhaService';
import { unidadeColetaService } from '../services/unidadeColetaService';
import { tipoSanguineoService } from '../services/lookupService';
import { ApiError } from '../services/apiClient';

export function useCampanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [tiposSanguineos, setTiposSanguineos] = useState([]);

  const [loading, setLoading] = useState(true);    // carregamento da lista
  const [saving, setSaving] = useState(false);     // criação/edição em andamento
  const [deleting, setDeleting] = useState(false); // exclusão em andamento
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  /** (Re)carrega a lista de campanhas a partir da API. */
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await campanhaService.listar();
      setCampanhas(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar campanhas.');
      setCampanhas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carrega os dados auxiliares dos selects (unidades de coleta, tipos sanguíneos). */
  const carregarAuxiliares = useCallback(async () => {
    try {
      const [us, ts] = await Promise.all([
        unidadeColetaService.listar(),
        tipoSanguineoService.listar(),
      ]);
      setUnidades(Array.isArray(us) ? us : []);
      setTiposSanguineos(Array.isArray(ts) ? ts : []);
    } catch {
      // Falha nos auxiliares não impede a listagem; os selects ficam vazios.
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarAuxiliares();
  }, [carregar, carregarAuxiliares]);

  /** Cria uma campanha e recarrega a lista. Lança ApiError em caso de falha. */
  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await campanhaService.criar(form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Atualiza uma campanha e recarrega a lista. Lança ApiError em caso de falha. */
  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await campanhaService.atualizar(id, form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Remove uma campanha e recarrega a lista. Lança ApiError em caso de falha. */
  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await campanhaService.remover(id);
      await carregar();
    } finally {
      setDeleting(false);
    }
  }, [carregar]);

  return {
    campanhas, unidades, tiposSanguineos,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
