import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

export function useColetasPorCidade() {
  const [campanhas, setCampanhas] = useState([]);
  const [ufId, setUfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get('/campanhas');
      setCampanhas(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar coletas por cidade.');
      setCampanhas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // UFs presentes nas campanhas
  const ufs = useMemo(() => {
    const seen = new Map();
    for (const c of campanhas) {
      const uf = c.unidadeColeta?.cidade?.uf;
      if (uf && !seen.has(uf.id)) seen.set(uf.id, uf);
    }
    return [...seen.values()].sort((a, b) => a.sigla.localeCompare(b.sigla));
  }, [campanhas]);

  // Agrupa campanhas por cidade, somando metas e coletados
  const coletas = useMemo(() => {
    const filtradas = ufId
      ? campanhas.filter(c => String(c.unidadeColeta?.cidade?.uf?.id) === String(ufId))
      : campanhas;

    const byCidade = new Map();
    for (const c of filtradas) {
      const cidade = c.unidadeColeta?.cidade;
      if (!cidade) continue;
      if (!byCidade.has(cidade.id)) {
        byCidade.set(cidade.id, {
          cidadeId: cidade.id,
          cidade: cidade.nome,
          uf: cidade.uf?.sigla || '',
          metaTotal: 0,
          coletadoTotal: 0,
        });
      }
      const row = byCidade.get(cidade.id);
      for (const item of c.itensCampanha || []) {
        row.metaTotal += item.metaColeta || 0;
        row.coletadoTotal += item.quantiaColetada || 0;
      }
    }

    return [...byCidade.values()]
      .map(r => ({
        ...r,
        atingida: r.metaTotal > 0 && r.coletadoTotal >= r.metaTotal,
        progresso: r.metaTotal > 0 ? Math.min(100, Math.round((r.coletadoTotal / r.metaTotal) * 100)) : 0,
      }))
      .sort((a, b) => b.coletadoTotal - a.coletadoTotal);
  }, [campanhas, ufId]);

  return {
    coletas, ufs,
    ufId, setUfId,
    loading, loadError, carregar,
  };
}
