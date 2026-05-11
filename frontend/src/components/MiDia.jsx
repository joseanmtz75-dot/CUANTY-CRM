import { useState, useEffect } from 'react';
import { getMiDia, markRecommendationActed } from '../api/clients';
import { STATUS_COLORS, CLASIFICACION_ERP_COLORS, diasDesdeFecha } from '../utils/constants';
import { toWhatsAppUrl } from '../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, ClipboardCheck, Eye, Check } from 'lucide-react';
import QuickLogModal from './QuickLogModal';
import ClientIntelligenceModal from './ClientIntelligenceModal';

function MiDia({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intelligenceClient, setIntelligenceClient] = useState(null);
  const [quickLogClient, setQuickLogClient] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  const fetchData = () => {
    setLoading(true);
    getMiDia()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleMarkActed = async (rec) => {
    if (markingId) return;
    setMarkingId(rec.id);
    try {
      await markRecommendationActed(rec.id);
      fetchData();
    } catch (err) {
      alert('Error al marcar: ' + (err.response?.data?.error || err.message));
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (error) return <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">Error: {error}</div>;
  if (!data) return null;

  const { tareasDeHoy, enRiesgo, accionRecomendada, resumenSemana } = data;

  return (
    <div className="space-y-6">
      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-blue-500">
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{resumenSemana.interaccionesCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Interacciones esta semana</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500">
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{resumenSemana.avanzaron}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Avances de estatus</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-purple-500">
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{resumenSemana.interesados}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Clientes receptivos</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tasks Today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tareas de Hoy ({tareasDeHoy.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {tareasDeHoy.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay tareas pendientes para hoy</p>
            ) : (
              <div className="space-y-2">
                {tareasDeHoy.map((c) => {
                  const waUrl = toWhatsAppUrl(c.telefono);
                  const diasCompra = c.ultimaCompraErp ? diasDesdeFecha(c.ultimaCompraErp) : null;
                  const diasCompraColor = diasCompra == null ? '' : diasCompra > 365 ? 'text-red-600' : diasCompra > 180 ? 'text-amber-600' : 'text-muted-foreground';
                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border-l-[3px] border-l-blue-500 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => setIntelligenceClient(c)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-[#001529] text-white hover:bg-[#001529] text-xs font-bold px-1.5">
                          {c.priorityScore}
                        </Badge>
                        <span className="font-medium text-sm">{c.nombre}</span>
                        {c.clasificacionErp && (
                          <Badge
                            className="text-white text-[10px]"
                            style={{ backgroundColor: CLASIFICACION_ERP_COLORS[c.clasificacionErp] || '#6b7280' }}
                            title={`Clasificacion ERP (12m): ${c.clasificacionErp}`}
                          >
                            ERP·{c.clasificacionErp}
                          </Badge>
                        )}
                        <Badge
                          className="text-white text-[10px] ml-auto"
                          style={{ backgroundColor: STATUS_COLORS[c.estatus] || '#8c8c8c' }}
                        >
                          {c.estatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {c.empresa && <span className="text-xs text-muted-foreground">{c.empresa}</span>}
                        {diasCompra != null && (
                          <span className={`text-xs ${diasCompraColor}`}>· compra hace {diasCompra}d</span>
                        )}
                      </div>
                      {c.recommendedAction && (
                        <span className="text-xs text-blue-600 font-medium mt-1 block">{c.recommendedAction}</span>
                      )}
                      <div className="flex gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {waUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] border-green-600 text-green-700 hover:bg-green-50"
                            asChild
                          >
                            <a href={waUrl} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              WhatsApp
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px]"
                          onClick={() => setQuickLogClient(c)}
                        >
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Registrar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* At Risk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">En Riesgo ({enRiesgo.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {enRiesgo.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay clientes en riesgo</p>
            ) : (
              <div className="space-y-2">
                {enRiesgo.map((c) => {
                  const waUrl = toWhatsAppUrl(c.telefono);
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border-l-[3px] bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors ${c.altoEnRiesgoErp ? 'border-l-red-700' : 'border-l-red-500'}`}
                      onClick={() => setIntelligenceClient(c)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.nombre}</span>
                        {c.clasificacionErp && (
                          <Badge
                            className="text-white text-[10px]"
                            style={{ backgroundColor: CLASIFICACION_ERP_COLORS[c.clasificacionErp] || '#6b7280' }}
                          >
                            ERP·{c.clasificacionErp}
                          </Badge>
                        )}
                        <Badge
                          className="text-white text-[10px] ml-auto"
                          style={{ backgroundColor: STATUS_COLORS[c.estatus] || '#8c8c8c' }}
                        >
                          {c.estatus}
                        </Badge>
                      </div>
                      {c.empresa && <span className="text-xs text-muted-foreground mt-1 block">{c.empresa}</span>}
                      <Badge variant={c.altoEnRiesgoErp ? 'destructive' : 'secondary'} className="text-[10px] mt-1">{c.razonRiesgo}</Badge>
                      <div className="flex gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {waUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] border-green-600 text-green-700 hover:bg-green-50"
                            asChild
                          >
                            <a href={waUrl} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              WhatsApp
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px]"
                          onClick={() => setQuickLogClient(c)}
                        >
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Registrar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accion Recomendada ({accionRecomendada.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {accionRecomendada.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay acciones pendientes</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {accionRecomendada.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border-l-[3px] border-l-amber-500 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => setIntelligenceClient({ id: r.clientId, nombre: r.nombre, estatus: r.estatus, empresa: r.empresa })}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#001529] text-white hover:bg-[#001529] text-xs font-bold px-1.5">
                        {r.priorityScore}
                      </Badge>
                      <span className="font-medium text-sm">{r.nombre}</span>
                    </div>
                    {r.empresa && <span className="text-xs text-muted-foreground mt-1 block">{r.empresa}</span>}
                    <span className="text-xs text-amber-600 font-medium mt-1 block">{r.recommendedAction}</span>
                    {r.recommendedApproach && (
                      <span className="text-xs text-muted-foreground block">{r.recommendedApproach}</span>
                    )}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleMarkActed(r)}
                        disabled={markingId === r.id}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {markingId === r.id ? 'Guardando…' : 'Acción tomada'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {intelligenceClient && (
        <ClientIntelligenceModal
          client={intelligenceClient}
          onClose={() => setIntelligenceClient(null)}
        />
      )}

      {quickLogClient && (
        <QuickLogModal
          client={quickLogClient}
          onClose={() => setQuickLogClient(null)}
          onSaved={() => { setQuickLogClient(null); fetchData(); }}
        />
      )}
    </div>
  );
}

export default MiDia;
