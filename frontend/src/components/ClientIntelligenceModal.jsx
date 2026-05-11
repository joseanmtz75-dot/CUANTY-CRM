import { useState, useEffect } from 'react';
import { getClientIntelligence } from '../api/clients';
import {
  STATUS_COLORS,
  DISPOSITION_LABELS,
  DISPOSITION_COLORS,
  ACTION_LABELS,
  APPROACH_LABELS,
  CLASIFICACION_ERP_COLORS,
  diasDesdeFecha,
} from '../utils/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const FACTOR_COLORS = {
  urgencia: '#ff4d4f',
  receptividad: '#52c41a',
  momentum: '#faad14',
  valorEtapa: '#722ed1',
  frescura: '#1890ff',
  valorEconomico: '#16a34a',
};

const FACTOR_LABELS = {
  urgencia: 'Urgencia',
  receptividad: 'Receptividad',
  momentum: 'Momentum',
  valorEtapa: 'Valor etapa',
  frescura: 'Frescura',
  valorEconomico: 'Valor económico',
};

export default function ClientIntelligenceModal({ client, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientIntelligence(client.id)
      .then(setData)
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [client.id]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {client.nombre}
            <Badge className="text-white text-xs" style={{ backgroundColor: STATUS_COLORS[client.estatus] || '#8c8c8c' }}>
              {client.estatus}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && (
          <div className="space-y-5">
            {/* Disposition */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Disposicion</h4>
              <div className="flex items-center gap-3">
                <Badge
                  className="text-white text-sm px-3 py-1"
                  style={{ backgroundColor: DISPOSITION_COLORS[data.disposition?.disposition] || '#bfbfbf' }}
                >
                  {DISPOSITION_LABELS[data.disposition?.disposition] || data.disposition?.disposition || 'Desconocido'}
                </Badge>
                {data.disposition?.confidence != null && (
                  <span className="text-sm text-muted-foreground">
                    {Math.round(data.disposition.confidence * 100)}% confianza
                  </span>
                )}
              </div>
              {data.disposition?.signals?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {data.disposition.signals.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">-</span> {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            {/* ERP signal */}
            {client.ultimaCompraErp && (() => {
              const dias = diasDesdeFecha(client.ultimaCompraErp);
              const color = dias > 365 ? 'text-red-600' : dias > 180 ? 'text-amber-600' : 'text-muted-foreground';
              return (
                <div className="flex items-center gap-2 -mt-1">
                  {client.clasificacionErp && (
                    <Badge
                      className="text-white text-xs"
                      style={{ backgroundColor: CLASIFICACION_ERP_COLORS[client.clasificacionErp] || '#6b7280' }}
                    >
                      ERP·{client.clasificacionErp}
                    </Badge>
                  )}
                  <span className={`text-sm ${color}`}>Última compra real: hace {dias} días</span>
                </div>
              );
            })()}

            {/* Priority */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Prioridad</h4>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold">{data.priority?.score ?? '-'}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              {data.priority?.factors && Object.entries(data.priority.factors).map(([key, val]) => (
                <div className="flex items-center gap-3 py-1" key={key}>
                  <span className="w-24 text-right text-sm shrink-0">{FACTOR_LABELS[key] || key}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(val * 100, 100)}%`,
                        backgroundColor: FACTOR_COLORS[key] || '#1890ff',
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium">{Math.round(val * 100)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Recommendations */}
            {data.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Recomendaciones</h4>
                <div className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <div className="p-3 rounded-lg border-l-[3px] border-l-blue-500 bg-muted/30" key={i}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {ACTION_LABELS[rec.action] || rec.action}
                        </Badge>
                        {rec.approach && (
                          <Badge variant="outline" className="text-xs">
                            {APPROACH_LABELS[rec.approach] || rec.approach}
                          </Badge>
                        )}
                        {rec.channel && (
                          <span className="text-xs text-muted-foreground">via {rec.channel}</span>
                        )}
                      </div>
                      {rec.reasoning && (
                        <p className="text-sm text-muted-foreground mt-1">{rec.reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {data.statusChanges?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Historial de Estatus</h4>
                  <div className="space-y-2">
                    {data.statusChanges.map((change, i) => (
                      <div className="flex items-center gap-3 text-sm" key={i}>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(change.date || change.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span>{change.from || '?'} &rarr; {change.to || '?'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
