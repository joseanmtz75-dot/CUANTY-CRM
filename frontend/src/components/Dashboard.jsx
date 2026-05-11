import { useState, useEffect, useMemo } from 'react';
import { getOverview, getTodayFollowUps } from '../api/clients';
import { ESTATUSES, STATUS_COLORS, DISPOSITION_LABELS, DISPOSITION_COLORS, CLASIFICACION_ERP_COLORS, formatMxn } from '../utils/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Wrench, Sparkles, DollarSign } from 'lucide-react';
import SuggestionPanel from './SuggestionPanel';

export default function Dashboard({ onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [todayData, setTodayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getOverview(),
      getTodayFollowUps(),
    ]).then(([ov, today]) => {
      setOverview(ov);
      setTodayData(today.clients);
    }).catch(() => setError('Error al cargar datos del dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const paraHoy = todayData.length;
  const vencidos = useMemo(() => todayData.filter(c => c.diasVencido > 0).length, [todayData]);

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

  if (!overview) return null;

  const { totalClientes, porEstatus, porDisposition, porClasificacionErp, altosEnRiesgo, postventaPendiente, onboardingActivo, totalComprasErpAcum, topPriority } = overview;
  const countByStatus = (estatus) => porEstatus[estatus] || 0;

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
            <div className="text-3xl font-bold">{totalClientes}</div>
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
        {ESTATUSES.filter(s => s !== 'Descartado').map(estatus => (
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

      {/* ERP Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Señales del ERP
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-emerald-600">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <DollarSign className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-2xl font-bold">{formatMxn(totalComprasErpAcum).replace(' MXN', '')}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Compras ERP acumulado</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4 border-t-red-600"
            onClick={() => onNavigate('clients', { type: 'altosEnRiesgo', label: 'ALTOs en riesgo' })}
          >
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold">{altosEnRiesgo}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">ALTOs en riesgo</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">sin compra +12m</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4 border-t-amber-600"
            onClick={() => onNavigate('clients', { type: 'postventaPendiente', label: 'Postventa pendiente' })}
          >
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Wrench className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <div className="text-2xl font-bold">{postventaPendiente}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Postventa pendiente</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">ALTO Cerrado +90d</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-cyan-600">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Sparkles className="h-4 w-4 text-cyan-600 mx-auto mb-1" />
              <div className="text-2xl font-bold">{onboardingActivo}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Onboarding activo</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">primera compra -60d</div>
            </CardContent>
          </Card>
        </div>
        {Object.keys(porClasificacionErp).length > 0 && (
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>Clasificación ERP:</span>
            {['ALTO', 'MEDIO', 'BAJO'].map(k => (
              porClasificacionErp[k] ? (
                <Badge
                  key={k}
                  className="text-white"
                  style={{ backgroundColor: CLASIFICACION_ERP_COLORS[k] }}
                >
                  {k}: {porClasificacionErp[k]}
                </Badge>
              ) : null
            ))}
          </div>
        )}
      </div>

      {/* Disposition */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Disposicion de Clientes Activos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(porDisposition)
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
      {topPriority?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Top Prioridad</h3>
          <div className="space-y-2">
            {topPriority.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:bg-muted/50 transition-colors">
                <Badge className="bg-[#001529] text-white hover:bg-[#001529] text-xs font-bold px-2">
                  P{c.priorityScore}
                </Badge>
                <span className="font-medium">{c.nombre}</span>
                {c.clasificacionErp && (
                  <Badge
                    className="text-white text-[10px]"
                    style={{ backgroundColor: CLASIFICACION_ERP_COLORS[c.clasificacionErp] }}
                  >
                    ERP·{c.clasificacionErp}
                  </Badge>
                )}
                {c.disposition && DISPOSITION_LABELS[c.disposition] && (
                  <Badge
                    variant="secondary"
                    className="text-white text-[10px]"
                    style={{ backgroundColor: DISPOSITION_COLORS[c.disposition] }}
                  >
                    {DISPOSITION_LABELS[c.disposition].substring(0, 3)}
                  </Badge>
                )}
                {c.empresa && (
                  <span className="text-xs text-muted-foreground ml-auto">{c.empresa}</span>
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
