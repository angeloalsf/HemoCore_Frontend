import { useState, useEffect, useCallback } from 'react';
import { tipoSanguineoService } from '../services/tipoSanguineoService';
import { ApiError } from '../services/apiClient';

export function useTiposSanguineos() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const busy = saving || deleting;

  const carregar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await tipoSanguineoService.listar();
      setTipos(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.toUserMessage() : 'Erro ao carregar tipos sanguíneos.');
      setTipos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const criar = useCallback(async (form) => {
    setSaving(true);
    try {
      await tipoSanguineoService.criar(form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  const atualizar = useCallback(async (id, form) => {
    setSaving(true);
    try {
      await tipoSanguineoService.atualizar(id, form);
      await carregar();
    } finally {
      setSaving(false);
    }
  }, [carregar]);

  const remover = useCallback(async (id) => {
    setDeleting(true);
    try {
      await tipoSanguineoService.remover(id);
      await carregar();
    } finally {
      setDeleting(false);
    }
  }, [carregar]);

  return {
    tipos,
    loading, saving, deleting, busy, loadError,
    carregar, criar, atualizar, remover,
  };
}
