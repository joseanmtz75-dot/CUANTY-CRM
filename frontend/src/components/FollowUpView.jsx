import { useState, useEffect, useMemo } from 'react';
import { getTodayFollowUps } from '../api/clients';
import { STATUS_COLORS, TEMP_COLORS, TEMP_LABELS, DISPOSITION_LABELS, DISPOSITION_COLORS, ACTION_LABELS, APPROACH_LABELS, CLASIFICACION_ERP_COLORS, diasDesdeFecha } from '../utils/constants';
import { toWhatsAppUrl } from '../utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, MessageCircle } from 'lucide-react';
import QuickLogModal from './QuickLogModal';
import ClientIntelligenceModal from './ClientIntelligenceModal';

export default function FollowUpView({ initialFilter, onClearFilter }) {
  const [clients, setClients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [quickLogType, setQuickLogType] = useState(null);
  const [activeFilter, setActiveFilter] = useState(initialFilter?.value || null);
  const [intelligenceClient, setIntelligenceClient] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getTodayFollowUps()
      .then(data => {
        setClients(data.clients);
        setTotalCount(data.totalCount);
      })
      .catch(() => { setClients([]); setTotalCount(0); setError('Error al cargar seguimientos.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const vencidos = useMemo(() => clients.filter(c => c.diasVencido > 0), [clients]);
  const nuevos = useMemo(() => clients.filter(c => c.estatus === 'Nuevo' && !c.ultimaInteraccion), [clients]);
  const paraHoy = clients.length;

  const displayedClients = useMemo(() =>
    activeFilter === 'vencidos' ? clients.filter(c => c.diasVencido > 0) : clients,
    [clients, activeFilter]
  );

  const clearFilter = () => {
    setActiveFilter(null);
    if (onClearFilter) onClearFilter();
  };

  const filterLabels = { vencidos: 'Vencidos', hoy: 'Para Hoy' };

  const openQuickLog = (client, tipo) => {
    setSelectedClient(client);
    setQuickLogType(tipo || null);
  };

  const handleLogSaved = () => {
    setSelectedClient(null);
    setQuickLogType(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 flex-1 rounded-xl" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 flex items-center gap-2">
          {error}
          <Button variant="outline" size="sm" onClick={fetchData}>Reintentar</Button>
        </div>
      )}

      {/* Summary */}
      <div className="flex gap-4">
        <Card className="flex-1 text-center border-t-4 border-t-blue-500">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="text-2xl font-bold">{paraHoy}</div>
            <div className="text-xs text-muted-foreground">Para hoy</div>
          </CardContent>
        </Card>
        <Card className="flex-1 text-center border-t-4 border-t-red-500">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="text-2xl font-bold text-red-600">{vencidos.length}</div>
            <div className="text-xs text-muted-foreground">Vencidos</div>
          </CardContent>
        </Card>
        <Card className="flex-1 text-center border-t-4 border-t-cyan-500">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="text-2xl font-bold">{nuevos.length}</div>
            <div className="text-xs text-muted-foreground">Nuevos sin contactar</div>
          </CardContent>
        </Card>
      </div>

      {totalCount > clients.length && (
        <p className="text-xs text-muted-foreground">Mostrando {clients.length} de {totalCount} clientes (max. 25 por dia)</p>
      )}

      {activeFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {filterLabels[activeFilter] || activeFilter}
            <button onClick={clearFilter}><X className="h-3 w-3" /></button>
          </Badge>
          <span className="text-xs text-muted-foreground">{displayedClients.length} resultado{displayedClients.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {displayedClients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay seguimientos {activeFilter ? `${filterLabels[activeFilter]?.toLowerCase() || activeFilter}` : 'pendientes para hoy'}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedClients.map(client => (
            <Card
              key={client.id}
              className={`border-l-4 transition-all hover:shadow-md ${client.diasVencido > 0 ? 'bg-amber-50/50' : ''}`}
              style={{ borderLeftColor: client.disposition?.disposition ? (DISPOSITION_COLORS[client.disposition.disposition] || TEMP_COLORS[client.temperatura]) : TEMP_COLORS[client.temperatura] }}
            >
              <CardContent className="py-3 px-4 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {client.disposition?.disposition && DISPOSITION_LABELS[client.disposition.disposition] ? (
                        <Badge
                          className="text-white text-[10px] cursor-pointer"
                          style={{ backgroundColor: DISPOSITION_COLORS[client.disposition.disposition] }}
                          onClick={() => setIntelligenceClient(client)}
                        >
                          {DISPOSITION_LABELS[client.disposition.disposition]}
                        </Badge>
                      ) : (
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TEMP_COLORS[client.temperatura] }} title={TEMP_LABELS[client.temperatura]} />
                      )}
                      <span className="font-semibold text-sm">{client.nombre}</span>
                      {client.empresa && <span className="text-xs text-muted-foreground">({client.empresa})</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="text-white text-[10px]" style={{ backgroundColor: STATUS_COLORS[client.estatus] || '#8c8c8c' }}>
                        {client.estatus}
                      </Badge>
                      {client.clasificacionErp && (
                        <Badge
                          className="text-white text-[10px]"
                          style={{ backgroundColor: CLASIFICACION_ERP_COLORS[client.clasificacionErp] || '#6b7280' }}
                          title={`Clasificacion ERP (12m): ${client.clasificacionErp}`}
                        >
                          ERP·{client.clasificacionErp}
                        </Badge>
                      )}
                      {client.diasVencido > 0 && (
                        <Badge variant="destructive" className="text-[10px]">VENCIDO {client.diasVencido}d</Badge>
                      )}
                      {client.priority?.score != null && (
                        <Badge
                          className="bg-[#001529] text-white hover:bg-[#001529] text-[10px] cursor-pointer"
                          onClick={() => setIntelligenceClient(client)}
                        >
                          P{client.priority.score}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {client.diasSinContacto === 0 ? 'Hoy' : `Hace ${client.diasSinContacto}d`}
                      </span>
                      {client.ultimaCompraErp && (() => {
                        const dias = diasDesdeFecha(client.ultimaCompraErp);
                        const color = dias > 365 ? 'text-red-600' : dias > 180 ? 'text-amber-600' : 'text-muted-foreground';
                        return (
                          <span className={`text-xs ${color}`} title={`Última compra ERP: ${new Date(client.ultimaCompraErp).toLocaleDateString('es-MX')}`}>
                            · compra hace {dias}d
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">{client.telefono}</span>
                </div>

                {/* Last interaction */}
                {client.ultimaInteraccion && (
                  <div className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px] shrink-0">{client.ultimaInteraccion.tipo}</Badge>
                    <span className="text-muted-foreground line-clamp-1">
                      {client.ultimaInteraccion.contenido.length > 80
                        ? client.ultimaInteraccion.contenido.substring(0, 80) + '...'
                        : client.ultimaInteraccion.contenido}
                    </span>
                  </div>
                )}

                {/* Recommendations */}
                {client.recommendations?.length > 0 && (
                  <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {ACTION_LABELS[client.recommendations[0].action] || client.recommendations[0].action}
                      </Badge>
                      {client.recommendations[0].approach && (
                        <Badge variant="outline" className="text-[10px]">
                          {APPROACH_LABELS[client.recommendations[0].approach] || client.recommendations[0].approach}
                        </Badge>
                      )}
                      {client.recommendations[0].channel && (
                        <span className="text-[10px] text-muted-foreground">via {client.recommendations[0].channel}</span>
                      )}
                    </div>
                    {client.recommendations[0].reasoning && (
                      <p className="text-xs text-muted-foreground">{client.recommendations[0].reasoning}</p>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {client.sugerencias?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {client.sugerencias.slice(0, 2).map((s, i) => (
                      <Badge
                        key={i}
                        variant={s.prioridad === 'alta' ? 'destructive' : s.prioridad === 'media' ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {s.mensaje}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  {toWhatsAppUrl(client.telefono) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-green-600 text-green-700 hover:bg-green-50"
                      asChild
                    >
                      <a href={toWhatsAppUrl(client.telefono)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button size="sm" className="h-7 text-xs" onClick={() => openQuickLog(client, 'llamada')}>Llame</Button>
                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => openQuickLog(client, 'mensaje')}>Mensaje</Button>
                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => openQuickLog(client, 'nota')}>Nota</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openQuickLog(client, null)}>Registrar...</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedClient && (
        <QuickLogModal
          client={selectedClient}
          defaultTipo={quickLogType}
          onClose={() => { setSelectedClient(null); setQuickLogType(null); }}
          onSaved={handleLogSaved}
        />
      )}

      {intelligenceClient && (
        <ClientIntelligenceModal
          client={intelligenceClient}
          onClose={() => setIntelligenceClient(null)}
        />
      )}
    </div>
  );
}
