import { memo } from 'react';
import { STATUS_COLORS, TEMP_COLORS, TEMP_LABELS, DISPOSITION_LABELS, DISPOSITION_COLORS, ROLES, computeTemperatura } from '../utils/constants';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function getDateClass(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target < today) return 'overdue';
  if (target.getTime() === today.getTime()) return 'today';
  return 'future';
}

function formatShortDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getRolBadgeLabel(client) {
  if (!client.rol || client.rol === 'compras') return null;
  if (client.rol === 'otro') {
    return client.rolPersonalizado ? client.rolPersonalizado.substring(0, 3).toUpperCase() : 'OTR';
  }
  const found = ROLES.find(r => r.value === client.rol);
  return found ? found.label.substring(0, 3).toUpperCase() : client.rol.substring(0, 3).toUpperCase();
}

function toWhatsAppUrl(telefono) {
  if (!telefono) return null;
  let digits = telefono.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.length === 10) digits = '52' + digits;
  return `https://wa.me/${digits}`;
}

function ClientRow({ client, onEdit, onDelete, onHistory, onIntelligence }) {
  const temp = computeTemperatura(client);
  const disp = client.metrics?.disposition;
  const rolLabel = getRolBadgeLabel(client);

  const dateClass = client.proximoContacto ? getDateClass(client.proximoContacto) : null;

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        {client.nombre}
        {rolLabel && (
          <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 font-bold">{rolLabel}</Badge>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {client.telefono ? (
          <a
            href={toWhatsAppUrl(client.telefono)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 hover:underline"
          >
            {client.telefono}
          </a>
        ) : '-'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{client.empresa || '-'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          {disp && DISPOSITION_LABELS[disp] ? (
            <Badge
              className="text-white text-[10px] cursor-pointer"
              style={{ backgroundColor: DISPOSITION_COLORS[disp] }}
              title={DISPOSITION_LABELS[disp]}
              onClick={() => onIntelligence && onIntelligence(client)}
            >
              {DISPOSITION_LABELS[disp].substring(0, 3)}
            </Badge>
          ) : (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: TEMP_COLORS[temp] }}
              title={TEMP_LABELS[temp]}
            />
          )}
          <Badge className="text-white text-[10px]" style={{ backgroundColor: STATUS_COLORS[client.estatus] || '#8c8c8c' }}>
            {client.estatus}
          </Badge>
          {client.metrics?.priorityScore != null && (
            <Badge
              variant="secondary"
              className="text-[10px] cursor-pointer"
              onClick={() => onIntelligence && onIntelligence(client)}
            >
              {client.metrics.priorityScore}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {!client.proximoContacto ? (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Sin fecha</Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`text-sm ${dateClass === 'overdue' ? 'text-red-600 font-medium' : dateClass === 'today' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
              {formatShortDate(client.proximoContacto)}
            </span>
            {dateClass === 'overdue' && <Badge variant="destructive" className="text-[9px] px-1">Vencido</Badge>}
            {dateClass === 'today' && <Badge className="bg-blue-500 text-white text-[9px] px-1">Hoy</Badge>}
          </div>
        )}
        {client.nextActionNote && (
          <span className="text-xs cursor-help" title={client.nextActionNote}>📋</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatShortDate(client.ultimoContacto)}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onEdit(client)}>Editar</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => onHistory(client)}>Historial</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => onDelete(client)}>Eliminar</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default memo(ClientRow);
