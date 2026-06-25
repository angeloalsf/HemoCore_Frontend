import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, ApiError } from '../services/apiClient';

export function useAgendaCampanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [ufId, setUfIdRaw] = useState('');
  const [cidadeId, setCidadeIdRaw] = useState('');
  const [unidadeColetaId, setUnidadeColetaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get('/campanhas');
      setCampanhas(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar agenda de campanhas.');
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

  // Cidades filtradas pela UF selecionada
  const cidades = useMemo(() => {
    const seen = new Map();
    for (const c of campanhas) {
      const cidade = c.unidadeColeta?.cidade;
      const uf = cidade?.uf;
      if (ufId && String(uf?.id) !== String(ufId)) continue;
      if (cidade && !seen.has(cidade.id)) seen.set(cidade.id, cidade);
    }
    return [...seen.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [campanhas, ufId]);

  // Unidades filtradas pela UF e cidade selecionadas
  const unidades = useMemo(() => {
    const seen = new Map();
    for (const c of campanhas) {
      const unidade = c.unidadeColeta;
      const cidade = unidade?.cidade;
      const uf = cidade?.uf;
      if (ufId && String(uf?.id) !== String(ufId)) continue;
      if (cidadeId && String(cidade?.id) !== String(cidadeId)) continue;
      if (unidade && !seen.has(unidade.id)) seen.set(unidade.id, unidade);
    }
    return [...seen.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [campanhas, ufId, cidadeId]);

  // Campanhas filtradas com ordenação por data
  const agenda = useMemo(() => campanhas
    .filter(c => {
      const uf = c.unidadeColeta?.cidade?.uf;
      const cidade = c.unidadeColeta?.cidade;
      const unidade = c.unidadeColeta;
      if (ufId && String(uf?.id) !== String(ufId)) return false;
      if (cidadeId && String(cidade?.id) !== String(cidadeId)) return false;
      if (unidadeColetaId && String(unidade?.id) !== String(unidadeColetaId)) return false;
      return true;
    })
    .sort((a, b) => (a.data || '').localeCompare(b.data || '')),
  [campanhas, ufId, cidadeId, unidadeColetaId]);

  // Filtros em cascata: trocar UF limpa cidade e unidade
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
