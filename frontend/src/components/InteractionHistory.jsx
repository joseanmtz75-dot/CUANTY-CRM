import { useState, useEffect } from 'react';
import { getInteractions } from '../api/clients';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_ICONS = {
  llamada: 'T',
  mensaje: 'M',
  nota: 'N',
  email: '@',
  reunion: 'R',
};

export default function InteractionHistory({ client, onClose }) {
  const [data, setData] = useState({ interactions: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPage = (page) => {
    setLoading(true);
    setError(null);
    getInteractions(client.id, page)
      .then(setData)
      .catch(() => { setData({ interactions: [], total: 0, page: 1, totalPages: 0 }); setError('Error al cargar historial.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPage(1); }, [client.id]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Historial — {client.nombre}</DialogTitle>
        </DialogHeader>

        {error && <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : data.interactions.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay interacciones registradas.</p>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {data.interactions.map((item) => (
                  <div key={item.id} className="flex gap-3 py-3 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {TYPE_ICONS[item.tipo] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{item.tipo}</Badge>
                        {item.resultado && <Badge variant="outline" className="text-[10px]">{item.resultado}</Badge>}
                        <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-1">{item.contenido}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => fetchPage(data.page - 1)}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{data.page} / {data.totalPages}</span>
                <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => fetchPage(data.page + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
