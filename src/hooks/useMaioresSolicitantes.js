import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { tipoSanguineoService } from '../services/lookupService';

export function useMaioresSolicitantes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [tiposSanguineos, setTiposSanguineos] = useState([]);
  const [tipoSanguineoId, setTipoSanguineoId] = useState('');
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

  // Tipos sanguíneos para o filtro (falha silenciosa)
  useEffect(() => {
    tipoSanguineoService.listar()
      .then(ts => setTiposSanguineos(Array.isArray(ts) ? ts : []))
      .catch(() => {});
  }, []);

  // Agrupa por (hospital, tipoSanguineo) somando quantidades
  const solicitantes = useMemo(() => {
    const byKey = new Map();
    for (const sol of solicitacoes) {
      if (dataInicio && sol.data < dataInicio) continue;
      if (dataFim && sol.data > dataFim) continue;
      for (const item of sol.itensSolicitacao || []) {
        const ts = item.tipoSanguineo;
        if (tipoSanguineoId && String(ts?.id) !== String(tipoSanguineoId)) continue;
        const key = `${sol.hospital?.id}-${ts?.id}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            hospital: sol.hospital?.nome || '',
            cnpj: sol.hospital?.cnpj || '',
            tipoSanguineo: ts ? `${ts.grupoABO}${ts.fatorRH ? '+' : '-'}` : '',
            quantidade: 0,
          });
        }
        byKey.get(key).quantidade += item.quantidade || 0;
      }
    }
    return [...byKey.values()].sort((a, b) => b.quantidade - a.quantidade);
  }, [solicitacoes, tipoSanguineoId, dataInicio, dataFim]);

  return {
    solicitantes, tiposSanguineos,
    tipoSanguineoId, setTipoSanguineoId,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError, carregar,
  };
}
