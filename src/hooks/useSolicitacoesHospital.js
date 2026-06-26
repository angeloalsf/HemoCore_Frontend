import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

export function useSolicitacoesHospital() {
  const [solicitacoes, setSolicitacoes] = useState({ tipo: 'flat', rows: [] });
  const [hospitais, setHospitais] = useState([]);
  const [hospitalId, setHospitalId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    apiClient.get('/hospitais')
      .then(data => setHospitais(Array.isArray(data) ? [...data].sort((a, b) => a.nome.localeCompare(b.nome)) : []))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let data;
      if (hospitalId) {
        const params = new URLSearchParams();
        if (dataInicio) params.set('inicio', dataInicio);
        if (dataFim) params.set('termino', dataFim);
        const query = params.toString() ? `?${params}` : '';
        data = await apiClient.get(`/solicitacoes/por-hospital/${hospitalId}${query}`);
        setSolicitacoes({ tipo: 'flat', rows: Array.isArray(data) ? data : [] });
      } else {
        data = await apiClient.get('/solicitacoes');
        setSolicitacoes({ tipo: 'nested', rows: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar solicitações.');
      setSolicitacoes({ tipo: 'flat', rows: [] });
    } finally {
      setLoading(false);
    }
  }, [hospitalId, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  const itens = useMemo(() => {
    const rows = solicitacoes.tipo === 'flat'
      ? solicitacoes.rows.map((sol) => ({
          hospital: sol.hospital ?? '',
          tipoSanguineo: sol.tiposanguineo ?? '',
          quantidade: Number(sol.quantia) || 0,
          data: sol.datasolicitacao ?? '',
        }))
      : solicitacoes.rows.flatMap((sol) => {
          if (sol.status !== 'FINALIZADA') return [];
          if (dataInicio && sol.data < dataInicio) return [];
          if (dataFim && sol.data > dataFim) return [];
          return (sol.itensSolicitacao || []).map((item) => {
            const ts = item.tipoSanguineo;
            return {
              hospital: sol.hospital?.nome ?? '',
              tipoSanguineo: ts ? `${ts.grupoABO}${ts.fatorRH ? '+' : '-'}` : '',
              quantidade: Number(item.quantidade) || 0,
              data: sol.data ?? '',
            };
          });
        });
    return rows.sort((a, b) => b.data.localeCompare(a.data));
  }, [solicitacoes, dataInicio, dataFim]);

  return {
    itens, hospitais,
    hospitalId, setHospitalId,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError, carregar,
  };
}
