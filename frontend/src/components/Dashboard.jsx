import { useState, useEffect, useMemo } from 'react';
import { getClients, getTodayFollowUps } from '../api/clients';
import { ESTATUSES, STATUS_COLORS, DISPOSITION_LABELS, DISPOSITION_COLORS } from '../utils/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import SuggestionPanel from './SuggestionPanel';

export default function Dashboard({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [todayData, setTodayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getClients({ incluirDescartados: true }),
      getTodayFollowUps(),
    ]).then(([allClients, today]) => {
      setClients(allClients);
      setTodayData(today.clients);
    }).catch(() => setError('Error al cargar datos del dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const countByStatus = (estatus) => clients.filter(c => c.estatus === estatus).length;

  const paraHoy = todayData.length;
  const vencidos = todayData.filter(c => c.diasVencido > 0).length;

  const activeClients = useMemo(() => clients.filter(c => !['Cerrado', 'Perdido', 'Descartado'].includes(c.estatus)), [clients]);
  const dispCounts = useMemo(() => {
    const counts = {};
    for (const c of activeClients) {
      const d = c.metrics?.disposition || 'desconocido';
      counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [activeClients]);

  const topPriority = useMemo(() => [...activeClients]
    .filter(c => c.metrics?.priorityScore != null)
    .sort((a, b) => (b.metrics.priorityScore || 0) - (a.metrics.priorityScore || 0))
    .slice(0, 5), [activeClients]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card
          className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4 border-t-[#001529]"
          onClick={() => onNavigate('clients', null)}
        >
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{clients.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total Clientes</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4"
          style={{ borderTopColor: '#faad14' }}
          onClick={() => onNavigate('seguimiento', { type: 'seguimiento', value: 'hoy' })}
        >
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{paraHoy}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Para Hoy</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4"
          style={{ borderTopColor: '#ff4d4f' }}
          onClick={() => onNavigate('seguimiento', { type: 'seguimiento', value: 'vencidos' })}
        >
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{vencidos}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Vencidos</div>
          </CardContent>
        </Card>
        {ESTATUSES.filter(s => !['Descartado', 'Reactivar'].includes(s)).map(estatus => (
          <Card
            className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4"
            key={estatus}
            style={{ borderTopColor: STATUS_COLORS[estatus] }}
            onClick={() => onNavigate('clients', { type: 'estatus', value: estatus })}
          >
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{countByStatus(estatus)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{estatus}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Disposition */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Disposicion de Clientes Activos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(dispCounts)
            .filter(([, count]) => count > 0)
            .map(([key, count]) => (
              <Card
                className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4"
                key={key}
                style={{ borderTopColor: DISPOSITION_COLORS[key] || '#bfbfbf' }}
                onClick={() => onNavigate('clients', { type: 'disposition', value: key, label: DISPOSITION_LABELS[key] || key })}
              >
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <div className="text-3xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{DISPOSITION_LABELS[key] || key}</div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Top Priority */}
      {topPriority.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Top Prioridad</h3>
          <div className="space-y-2">
            {topPriority.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:bg-muted/50 transition-colors">
                <Badge className="bg-[#001529] text-white hover:bg-[#001529] text-xs font-bold px-2">
                  P{c.metrics.priorityScore}
                </Badge>
                <span className="font-medium">{c.nombre}</span>
                {c.metrics?.disposition && DISPOSITION_LABELS[c.metrics.disposition] && (
                  <Badge
                    variant="secondary"
                    className="text-white text-[10px]"
                    style={{ backgroundColor: DISPOSITION_COLORS[c.metrics.disposition] }}
                  >
                    {DISPOSITION_LABELS[c.metrics.disposition].substring(0, 3)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <SuggestionPanel onNavigate={onNavigate} />
    </div>
  );
}
