import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Shared orphan list (same source as gazavirtualadoption.org/orphans/all).
 */
export function useOfficialOrphans({ limit, waitingOnly = false } = {}) {
  const [orphans, setOrphans] = useState([]);
  const [totals, setTotals] = useState({ totalOrphans: 0, totalWaiting: 0, totalSponsored: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.allOrphans();
      let list = res.orphans || [];
      if (waitingOnly) {
        const waiting = list.filter((o) => o.available);
        list = waiting.length ? waiting : list;
      }
      if (typeof limit === 'number') list = list.slice(0, limit);
      setOrphans(list);
      setTotals({
        totalOrphans: res.totalOrphans ?? list.length,
        totalWaiting: res.totalWaiting ?? 0,
        totalSponsored: res.totalSponsored ?? 0,
      });
    } catch (err) {
      setError(err.message || 'Could not load orphans');
    } finally {
      setLoading(false);
    }
  }, [limit, waitingOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return { orphans, totals, loading, error, reload: load };
}
