import { useState, useEffect, useRef } from 'react';
import { getAlerts } from '../api/clients';

function AlertSection({ titulo, items, onViewClient }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!items || items.length === 0) return null;
  return (
    <div className="alerta-section">
      <div className="alerta-section-title" onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer' }}>
        <span>{collapsed ? '▸' : '▾'}</span>
        {titulo}
        <span className="alerta-section-count">{items.length}</span>
      </div>
      {!collapsed && items.map((item, i) => (
        <div className="alerta-item" key={i}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="alerta-item-name">{item.clienteNombre}</span>
            <div className="alerta-item-msg">{item.mensaje}</div>
          </div>
          <button className="alerta-item-btn" onClick={() => onViewClient(item.clienteId, item.clienteNombre)}>
            Ver
          </button>
        </div>
      ))}
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
    <div className="alertas-wrapper" ref={wrapperRef}>
      <button className="alertas-btn" onClick={() => setOpen(!open)} title="Alertas">
        🔔
        {total > 0 && <span className="alertas-badge">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <div className="alertas-panel">
          <div className="alertas-panel-header">
            <strong>Alertas</strong>
            <span>{total} activa{total !== 1 ? 's' : ''}</span>
          </div>
          <div className="alertas-panel-body">
            {error ? (
              <div className="alertas-empty">{error}</div>
            ) : alerts && total > 0 ? (
              <>
                <AlertSection titulo="Sin contacto (+14 dias)" items={alerts.sinContacto} onViewClient={handleView} />
                <AlertSection titulo="Estancados en estatus" items={alerts.estancados} onViewClient={handleView} />
                <AlertSection titulo="Acciones sin atender" items={alerts.recsIgnoradas} onViewClient={handleView} />
                <AlertSection titulo="Contacto vencido" items={alerts.vencidos} onViewClient={handleView} />
              </>
            ) : (
              <div className="alertas-empty">Sin alertas activas</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
