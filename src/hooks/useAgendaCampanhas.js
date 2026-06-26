import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { ufService, cidadeService } from '../services/lookupService';

export function useAgendaCampanhas() {
  const [agenda, setAgenda] = useState([]);

  // Dados auxiliares para os selects (carregados uma vez)
  const [ufs, setUfs] = useState([]);
  const [todasCidades, setTodasCidades] = useState([]);
  const [todasUnidades, setTodasUnidades] = useState([]);

  // Filtros (enviados como query params ao backend)
  const [ufId, setUfIdRaw] = useState('');
  const [cidadeId, setCidadeIdRaw] = useState('');
  const [unidadeColetaId, setUnidadeColetaId] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Carga única dos selects (UFs, Cidades, Unidades de Coleta)
  useEffect(() => {
    Promise.all([
      ufService.listar(),
      cidadeService.listar(),
      apiClient.get('/unidades-coleta'),
    ]).then(([us, cs, unis]) => {
      setUfs(Array.isArray(us) ? us : []);
      setTodasCidades(Array.isArray(cs) ? cs : []);
      setTodasUnidades(Array.isArray(unis) ? unis : []);
    }).catch(() => {});
  }, []);

  // Re-busca do backend toda vez que um filtro mudar
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (ufId) params.set('ufId', ufId);
      if (cidadeId) params.set('cidadeId', cidadeId);
      if (unidadeColetaId) params.set('unidadeColetaId', unidadeColetaId);
      const qs = params.toString();
      const data = await apiClient.get(`/campanhas/agenda${qs ? `?${qs}` : ''}`);
      setAgenda(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar agenda de campanhas.');
      setAgenda([]);
    } finally {
      setLoading(false);
    }
  }, [ufId, cidadeId, unidadeColetaId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Cascata client-side apenas para os selects dos filtros
  const cidades = useMemo(() =>
    ufId
      ? todasCidades.filter(c => String(c.uf?.id ?? c.ufId) === String(ufId))
      : todasCidades,
    [todasCidades, ufId]
  );

  const unidades = useMemo(() =>
    cidadeId
      ? todasUnidades.filter(u => String(u.cidade?.id ?? u.cidadeId) === String(cidadeId))
      : todasUnidades,
    [todasUnidades, cidadeId]
  );

  // Trocar UF limpa cidade e unidade
  const setUfId = useCallback((val) => {
    setUfIdRaw(val);
    setCidadeIdRaw('');
    setUnidadeColetaId('');
  }, []);

  // Trocar cidade limpa unidade
  const setCidadeId = useCallback((val) => {
    setCidadeIdRaw(val);
    setUnidadeColetaId('');
  }, []);

  return {
    agenda, ufs, cidades, unidades,
    ufId, setUfId,
    cidadeId, setCidadeId,
    unidadeColetaId, setUnidadeColetaId,
    loading, loadError, carregar,
  };
}
