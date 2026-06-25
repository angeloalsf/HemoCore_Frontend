import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

export function useSolicitacoesHospital() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [hospitalId, setHospitalId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get('/solicitacoes');
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar solicitações.');
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Extrai hospitais únicos presentes nas solicitações
  const hospitais = useMemo(() => {
    const seen = new Map();
    for (const sol of solicitacoes) {
      const h = sol.hospital;
      if (h && !seen.has(h.id)) seen.set(h.id, h);
    }
    return [...seen.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [solicitacoes]);

  // Expande itens de cada solicitação, aplicando filtros de hospital e período
  const itens = useMemo(() => {
    const rows = [];
    for (const sol of solicitacoes) {
      if (hospitalId && String(sol.hospital?.id) !== String(hospitalId)) continue;
      if (dataInicio && sol.data < dataInicio) continue;
      if (dataFim && sol.data > dataFim) continue;
      for (const item of sol.itensSolicitacao || []) {
        const ts = item.tipoSanguineo;
        rows.push({
          hospital: sol.hospital?.nome || '',
          tipoSanguineo: ts ? `${ts.grupoABO}${ts.fatorRH ? '+' : '-'}` : '',
          quantidade: item.quantidade || 0,
          data: sol.data || '',
        });
      }
    }
    return rows.sort((a, b) => b.data.localeCompare(a.data));
  }, [solicitacoes, hospitalId, dataInicio, dataFim]);

  return {
    itens, hospitais,
    hospitalId, setHospitalId,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError, carregar,
  };
}
