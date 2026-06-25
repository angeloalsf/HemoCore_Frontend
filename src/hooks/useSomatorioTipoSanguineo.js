// Composable do relatório "Somatório por Tipo Sanguíneo em Doações".
// Consulta a API (GET /doacoes/somatorio-por-tipo-sanguineo) com filtro de
// período (dataInicio/dataFim aplicados no SQL do backend) e expõe os estados
// de carregamento/erro, seguindo o mesmo padrão de useDoadoresAtivos.
import { useState, useEffect, useCallback } from 'react';
import { relatorioService } from '../services/relatorioService';
import { ApiError } from '../services/apiClient';

export function useSomatorioTipoSanguineo() {
  const [itens, setItens] = useState([]);

  // Filtro de período (datas ISO YYYY-MM-DD, '' = sem limite). Aplicado no
  // servidor: o SQL usa `d.data >= :dataInicio` e `d.data <= :dataFim`.
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [loading, setLoading] = useState(true);   // consulta em andamento
  const [loadError, setLoadError] = useState(null);

  /** (Re)carrega o somatório aplicando o período atual via API. */
  const carregar = useCallback(async (filtros) => {
    const periodo = filtros !== undefined ? filtros : { dataInicio, dataFim };
    setLoading(true);
    setLoadError(null);
    try {
      const data = await relatorioService.somatorioPorTipoSanguineo(periodo);
      setItens(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar o somatório por tipo sanguíneo.');
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  // Auto-atualiza sempre que o período mudar.
  useEffect(() => { carregar(); }, [carregar]);

  return {
    itens,
    dataInicio, setDataInicio,
    dataFim, setDataFim,
    loading, loadError,
    carregar,
  };
}
