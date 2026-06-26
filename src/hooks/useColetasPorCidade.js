import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { ufService } from '../services/lookupService';

export function useColetasPorCidade() {
  const [rawData, setRawData] = useState([]);
  const [ufs, setUfs] = useState([]);
  const [ufId, setUfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Carga única dos UFs para o select
  useEffect(() => {
    ufService.listar()
      .then(us => setUfs(Array.isArray(us) ? us : []))
      .catch(() => {});
  }, []);

  // Re-busca do backend toda vez que ufId mudar (filtragem server-side)
  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = ufId ? `?ufId=${ufId}` : '';
      const data = await apiClient.get(`/campanhas/coletas-por-cidade${qs}`);
      setRawData(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar coletas por cidade.');
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [ufId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Normaliza a resposta do backend:
  // O CampanhaRepository pode retornar dados já agregados por cidade
  // ({ cidade, uf, metaTotal/metaColeta, coletadoTotal/quantiaColetada })
  // ou objetos Campanha completos — ambos os casos são tratados aqui.
  const coletas = useMemo(() => {
    if (!rawData.length) return [];

    const primeiro = rawData[0];

    // Shape já agregado pelo Repository (ex.: { cidade, uf, metaTotal, coletadoTotal })
    const jaAgregado =
      ('metaTotal' in primeiro || 'coletadoTotal' in primeiro || 'metaColeta' in primeiro) &&
      !('itensCampanha' in primeiro);

    if (jaAgregado) {
      return rawData.map(r => {
        const meta = r.metaTotal ?? r.metaColeta ?? 0;
        const coletado = r.coletadoTotal ?? r.quantiaColetada ?? 0;
        return {
          cidadeId: r.cidadeId ?? r.cidade?.id ?? r.cidade,
          cidade: r.cidade?.nome ?? r.cidade ?? '—',
          uf: r.uf?.sigla ?? r.uf ?? '',
          metaTotal: meta,
          coletadoTotal: coletado,
          atingida: meta > 0 && coletado >= meta,
          progresso: meta > 0 ? Math.min(100, Math.round((coletado / meta) * 100)) : 0,
        };
      }).sort((a, b) => b.coletadoTotal - a.coletadoTotal);
    }

    // Shape de Campanha completa — agrupa por cidade client-side
    const byCidade = new Map();
    for (const c of rawData) {
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
  }, [rawData]);

  return {
    coletas, ufs,
    ufId, setUfId,
    loading, loadError, carregar,
  };
}
