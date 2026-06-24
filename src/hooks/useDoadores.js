// Composable que centraliza o estado e as operações de CRUD de Doadores.
// Expõe estados de carregamento granulares (lista x ação) e atualiza
// automaticamente a interface após criar, editar ou excluir.
import { useState, useEffect, useCallback } from 'react';
import { doadorService } from '../services/doadorService';
import {
  tipoSanguineoService,
  cidadeService,
  ufService,
} from '../services/lookupService';
import { ApiError } from '../services/apiClient';

export function useDoadores() {
  const [doadores, setDoadores] = useState([]);
  const [tiposSanguineos, setTiposSanguineos] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [ufs, setUfs] = useState([]);

  const [loading, setLoading] = useState(true);   // carregamento da lista
  const [saving, setSaving] = useState(false);    // criação/edição em andamento
  const [deleting, setDeleting] = useState(false); // exclusão em andamento
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  /** (Re)carrega a lista de doadores a partir da API. */
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await doadorService.listar();
      setDoadores(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar doadores.');
      setDoadores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carrega os dados auxiliares dos selects (tipos sanguíneos, cidades, ufs). */
  const carregarAuxiliares = useCallback(async () => {
    try {
      const [ts, cs, us] = await Promise.all([
        tipoSanguineoService.listar(),
        cidadeService.listar(),
        ufService.listar(),
      ]);
      setTiposSanguineos(Array.isArray(ts) ? ts : []);
      setCidades(Array.isArray(cs) ? cs : []);
      setUfs(Array.isArray(us) ? us : []);
    } catch {
      // Falha nos auxiliares não impede a listagem; os selects ficam vazios.
    }
  }, []);

  useEffect(() => {
    carregar();
    carregarAuxiliares();
  }, [carregar, carregarAuxiliares]);

  /** Cria um doador e recarrega a lista. Lança ApiError em caso de falha. */
  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await doadorService.criar(form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Atualiza um doador e recarrega a lista. Lança ApiError em caso de falha. */
  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await doadorService.atualizar(id, form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Remove um doador e recarrega a lista. Lança ApiError em caso de falha. */
  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await doadorService.remover(id);
      await carregar();
    } finally {
      setDeleting(false);
    }
  }, [carregar]);

  return {
    doadores, tiposSanguineos, cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
