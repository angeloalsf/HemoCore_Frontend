// Composable do relatório "Doadores Ativos".
// Centraliza a consulta à API (filtro por tipo sanguíneo via servidor),
// os estados de carregamento/erro e a auto-atualização ao trocar o filtro.
import { useState, useEffect, useCallback } from 'react';
import { relatorioService } from '../services/relatorioService';
import { tipoSanguineoService } from '../services/lookupService';
import { ApiError } from '../services/apiClient';

export function useDoadoresAtivos() {
  const [doadores, setDoadores] = useState([]);
  const [tiposSanguineos, setTiposSanguineos] = useState([]);

  // Filtro por tipo sanguíneo (id do tipo, '' = todos). É o único filtro da tela.
  const [tipoSanguineo, setTipoSanguineo] = useState('');

  const [loading, setLoading] = useState(true);   // consulta em andamento
  const [loadError, setLoadError] = useState(null);

  /** (Re)carrega os doadores ativos aplicando o filtro atual via API. */
  const carregar = useCallback(async (filtroTipo) => {
    const tipo = filtroTipo !== undefined ? filtroTipo : tipoSanguineo;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await relatorioService.doadoresAtivos({ tipoSanguineo: tipo });
      setDoadores(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar doadores ativos.');
      setDoadores([]);
    } finally {
      setLoading(false);
    }
  }, [tipoSanguineo]);

  /** Carrega os tipos sanguíneos para o seletor de filtro. */
  const carregarTiposSanguineos = useCallback(async () => {
    try {
      const ts = await tipoSanguineoService.listar();
      setTiposSanguineos(Array.isArray(ts) ? ts : []);
    } catch {
      // Falha no auxiliar não impede a listagem; o seletor fica só com "Todos".
    }
  }, []);

  // Carga inicial dos tipos sanguíneos (uma vez).
  useEffect(() => { carregarTiposSanguineos(); }, [carregarTiposSanguineos]);

  // Auto-atualiza a lista sempre que o filtro de tipo sanguíneo mudar.
  useEffect(() => { carregar(tipoSanguineo); }, [tipoSanguineo, carregar]);

  return {
    doadores, tiposSanguineos,
    tipoSanguineo, setTipoSanguineo,
    loading, loadError,
    carregar,
  };
}
