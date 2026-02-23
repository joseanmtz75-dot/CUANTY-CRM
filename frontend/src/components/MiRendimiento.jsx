import { useState, useEffect } from 'react';
import { getRendimiento } from '../api/clients';
import { STATUS_COLORS } from '../utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

function MiRendimiento() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRendimiento()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (error) return <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">Error: {error}</div>;
  if (!data) return null;

  const { semana, mes, pipeline } = data;
  const maxCount = Math.max(...pipeline.porEstatus.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Weekly */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Ultima Semana</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{semana.interacciones}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Interacciones</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-indigo-500">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{semana.clientesContactados}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Clientes contactados</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-green-500">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{semana.avancesEstatus}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Avances de estatus</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Ultimo Mes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{mes.interacciones}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Interacciones</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{mes.tasaRespuesta}%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Tasa de respuesta</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-green-500">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold text-green-600">{mes.ganados}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Ganados</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-red-500">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold text-red-600">{mes.perdidos}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Perdidos</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipeline.porEstatus
            .sort((a, b) => b.count - a.count)
            .map((s) => (
              <div key={s.estatus} className="flex items-center gap-3">
                <span className="w-28 text-right text-sm shrink-0">{s.estatus}</span>
                <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      backgroundColor: STATUS_COLORS[s.estatus] || '#8c8c8c',
                    }}
                  />
                </div>
                <span className="w-10 text-right font-bold text-sm">{s.count}</span>
              </div>
            ))}
          <Separator />
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-sm">Interesados / Receptivos</span>
            <span className="font-bold text-lg">{pipeline.interesados}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MiRendimiento;
