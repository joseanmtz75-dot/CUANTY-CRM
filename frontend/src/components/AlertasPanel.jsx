import { useState, useEffect, useRef } from 'react';
import { getAlerts } from '../api/clients';
import { Bell, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

function AlertSection({ titulo, items, onViewClient }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!items || items.length === 0) return null;
  return (
    <div className="border-b last:border-0">
      <button
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        <span className="flex-1 text-left">{titulo}</span>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </button>
      {!collapsed && (
        <div className="px-4 pb-2 space-y-1.5">
          {items.map((item, i) => (
            <div className="flex items-start gap-2 py-1.5 text-sm" key={i}>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{item.clienteNombre}</span>
                <div className="text-xs text-muted-foreground truncate">{item.mensaje}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 px-2 text-xs"
                onClick={() => onViewClient(item.clienteId, item.clienteNombre)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Ver
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AlertasPanel({ onViewClient }) {
  const [alerts, setAlerts] = useState(null);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const [error, setError] = useState(null);

  const fetchAlerts = () => {
    setError(null);
    getAlerts()
      .then(data => {
        setAlerts(data.alerts);
        setTotal(data.total);
      })
      .catch(() => setError('Error al cargar alertas'));
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleView = (clienteId, clienteNombre) => {
    setOpen(false);
    onViewClient(clienteId, clienteNombre);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        title="Alertas"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="font-semibold text-sm">Alertas</span>
            <span className="text-xs text-muted-foreground">{total} activa{total !== 1 ? 's' : ''}</span>
          </div>
          <ScrollArea className="max-h-[400px]">
            {error ? (
              <div className="p-4 text-sm text-muted-foreground text-center">{error}</div>
            ) : alerts && total > 0 ? (
              <>
                <AlertSection titulo="Sin contacto (+14 dias)" items={alerts.sinContacto} onViewClient={handleView} />
                <AlertSection titulo="Estancados en estatus" items={alerts.estancados} onViewClient={handleView} />
                <AlertSection titulo="Acciones sin atender" items={alerts.recsIgnoradas} onViewClient={handleView} />
                <AlertSection titulo="Contacto vencido" items={alerts.vencidos} onViewClient={handleView} />
              </>
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">Sin alertas activas</div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
