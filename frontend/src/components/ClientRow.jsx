import { memo } from 'react';
import { STATUS_COLORS, TEMP_COLORS, TEMP_LABELS, DISPOSITION_LABELS, DISPOSITION_COLORS, ROLES, computeTemperatura } from '../utils/constants';

function getDateClass(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target < today) return 'date-overdue';
  if (target.getTime() === today.getTime()) return 'date-today';
  return 'date-future';
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

function ClientRow({ client, onEdit, onDelete, onHistory, onIntelligence }) {
  const temp = computeTemperatura(client);
  const disp = client.metrics?.disposition;
  const rolLabel = getRolBadgeLabel(client);

  return (
    <tr>
      <td>
        {client.nombre}
        {rolLabel && <span className="rol-badge">{rolLabel}</span>}
      </td>
      <td>{client.telefono}</td>
      <td>{client.empresa || '-'}</td>
      <td>
        {disp && DISPOSITION_LABELS[disp] ? (
          <span
            className="disposition-badge-sm"
            style={{ backgroundColor: DISPOSITION_COLORS[disp], marginRight: 6 }}
            title={DISPOSITION_LABELS[disp]}
            onClick={() => onIntelligence && onIntelligence(client)}
          >
            {DISPOSITION_LABELS[disp].substring(0, 3)}
          </span>
        ) : (
          <span className="temp-dot" style={{ backgroundColor: TEMP_COLORS[temp], marginRight: 6 }} title={TEMP_LABELS[temp]} />
        )}
        <span
          className="status-badge"
          style={{ backgroundColor: STATUS_COLORS[client.estatus] || '#8c8c8c' }}
        >
          {client.estatus}
        </span>
        {client.metrics?.priorityScore != null && (
          <span
            className="priority-badge-sm"
            onClick={() => onIntelligence && onIntelligence(client)}
          >
            {client.metrics.priorityScore}
          </span>
        )}
      </td>
      <td className={`proximo-cell ${!client.proximoContacto ? 'no-date' : ''}`}>
        {!client.proximoContacto ? (
          <span className="badge-warning" title="Sin fecha de proximo contacto">Sin fecha</span>
        ) : (() => {
          const dateClass = getDateClass(client.proximoContacto);
          return (
            <>
              <span className={dateClass}>{formatShortDate(client.proximoContacto)}</span>
              {dateClass === 'date-overdue' && (
                <span className="badge-vencido">Vencido</span>
              )}
              {dateClass === 'date-today' && (
                <span className="badge-hoy">Hoy</span>
              )}
            </>
          );
        })()}
        {client.nextActionNote && (
          <span className="action-note-indicator" title={client.nextActionNote}>📋</span>
        )}
      </td>
      <td>{formatShortDate(client.ultimoContacto)}</td>
      <td className="actions-cell">
        <button className="btn btn-sm btn-edit" onClick={() => onEdit(client)}>Editar</button>
        <button className="btn btn-sm btn-history" onClick={() => onHistory(client)}>Historial</button>
        <button className="btn btn-sm btn-delete" onClick={() => onDelete(client)}>Eliminar</button>
      </td>
    </tr>
  );
}

export default memo(ClientRow);
