// Composable que centraliza o estado e as operações de CRUD de Hospitais.
// Expõe estados de carregamento granulares (lista x ação) e atualiza
// automaticamente a interface após criar, editar ou excluir.
import { useState, useEffect, useCallback } from 'react';
import { hospitalService } from '../services/hospitalService';
import { cidadeService, ufService } from '../services/lookupService';
import { ApiError } from '../services/apiClient';

export function useHospitais() {
  const [hospitais, setHospitais] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [ufs, setUfs] = useState([]);

  const [loading, setLoading] = useState(true);    // carregamento da lista
  const [saving, setSaving] = useState(false);     // criação/edição em andamento
  const [deleting, setDeleting] = useState(false); // exclusão em andamento
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  /** (Re)carrega a lista de hospitais a partir da API. */
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await hospitalService.listar();
      setHospitais(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar hospitais.');
      setHospitais([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Carrega os dados auxiliares dos selects (cidades, ufs). */
  const carregarAuxiliares = useCallback(async () => {
    try {
      const [cs, us] = await Promise.all([
        cidadeService.listar(),
        ufService.listar(),
      ]);
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

  /** Cria um hospital e recarrega a lista. Lança ApiError em caso de falha. */
  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await hospitalService.criar(form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Atualiza um hospital e recarrega a lista. Lança ApiError em caso de falha. */
  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await hospitalService.atualizar(id, form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  /** Remove um hospital e recarrega a lista. Lança ApiError em caso de falha. */
  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await hospitalService.remover(id);
      await carregar();
    } finally {
      setDeleting(false);
    }
  }, [carregar]);

  return {
    hospitais, cidades, ufs,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
