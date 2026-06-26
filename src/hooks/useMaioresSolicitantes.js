import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { tipoSanguineoService } from '../services/lookupService';

export function useMaioresSolicitantes() {
  const [dados, setDados] = useState({ tipo: 'flat', rows: [] });
  const [tiposSanguineos, setTiposSanguineos] = useState([]);
  const [tipoSanguineoId, setTipoSanguineoId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    tipoSanguineoService.listar()
      .then(ts => setTiposSanguineos(Array.isArray(ts) ? ts : []))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (tipoSanguineoId) {
        const params = new URLSearchParams();
        if (dataInicio) params.set('inicio', dataInicio);
        if (dataFim) params.set('termino', dataFim);
        const query = params.toString() ? `?${params}` : '';
        const data = await apiClient.get(`/solicitacoes/maiores-solicitantes-por-tipo-sanguineo/${tipoSanguineoId}${query}`);
        setDados({ tipo: 'flat', rows: Array.isArray(data) ? data : [] });
      } else {
        const data = await apiClient.get('/solicitacoes');
        setDados({ tipo: 'nested', rows: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar solicitações.');
      setDados({ tipo: 'flat', rows: [] });
    } finally {
      setLoading(false);
    }
  }, [tipoSanguineoId, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  const solicitantes = useMemo(() => {
    if (dados.tipo === 'flat') {
      return dados.rows.map((d) => ({
        hospital: d.hospital ?? '',
        cnpj: d.cnpj ?? '',
        tipoSanguineo: d.tiposanguineo ?? '',
        quantidade: Number(d.quantidade) || 0,
      })).sort((a, b) => b.quantidade - a.quantidade);
    }

    const byKey = new Map();
    for (const sol of dados.rows) {
      if (dataInicio && sol.data < dataInicio) continue;
      if (dataFim && sol.data > dataFim) continue;
      for (const item of sol.itensSolicitacao || []) {
        const ts = item.tipoSanguineo;
        const key = `${sol.hospital?.id}-${ts?.id}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            hospital: sol.hospital?.nome ?? '',
            cnpj: sol.hospital?.cnpj ?? '',
            tipoSanguineo: ts ? `${ts.grupoABO}${ts.fatorRH ? '+' : '-'}` : '',
            quantidade: 0,
          });
        }
        byKey.get(key).quantidade += Number(item.quantidade) || 0;
      }
    }
    return [...byKey.values()].sort((a, b) => b.quantidade - a.quantidade);
  }, [dados, dataInicio, dataFim]);

  return {
    solicitantes, tiposSanguineos,
    tipoSanguineoId, setTipoSanguineoId,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError, carregar,
  };
}
