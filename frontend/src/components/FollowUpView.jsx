import { useState, useEffect } from 'react';
import { getTodayFollowUps } from '../api/clients';
import { STATUS_COLORS, TEMP_COLORS, TEMP_LABELS, DISPOSITION_LABELS, DISPOSITION_COLORS, ACTION_LABELS, APPROACH_LABELS } from '../utils/constants';
import QuickLogModal from './QuickLogModal';
import ClientIntelligenceModal from './ClientIntelligenceModal';

export default function FollowUpView({ initialFilter, onClearFilter }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [quickLogType, setQuickLogType] = useState(null);
  const [activeFilter, setActiveFilter] = useState(initialFilter?.value || null);
  const [intelligenceClient, setIntelligenceClient] = useState(null);

  const fetchData = () => {
    setLoading(true);
    getTodayFollowUps()
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const vencidos = clients.filter(c => c.diasVencido > 0);
  const nuevos = clients.filter(c => c.estatus === 'Nuevo' && !c.ultimaInteraccion);
  const paraHoy = clients.length;

  const displayedClients = activeFilter === 'vencidos'
    ? clients.filter(c => c.diasVencido > 0)
    : clients;

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

  if (loading) return <p className="loading">Cargando seguimientos...</p>;

  return (
    <div className="followup-view">
      <h2>Seguimiento del Día</h2>

      <div className="followup-summary">
        <div className="summary-item">
          <span className="summary-number">{paraHoy}</span>
          <span className="summary-label">Para hoy</span>
        </div>
        <div className="summary-item summary-overdue">
          <span className="summary-number">{vencidos.length}</span>
          <span className="summary-label">Vencidos</span>
        </div>
        <div className="summary-item summary-new">
          <span className="summary-number">{nuevos.length}</span>
          <span className="summary-label">Nuevos sin contactar</span>
        </div>
      </div>

      {activeFilter && (
        <div className="active-filter-bar">
          <span className="filter-chip">
            {filterLabels[activeFilter] || activeFilter}
            <button className="filter-chip-clear" onClick={clearFilter}>&times;</button>
          </span>
          <span className="filter-result-count">{displayedClients.length} resultado{displayedClients.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {displayedClients.length === 0 ? (
        <div className="followup-empty">
          <p>No hay seguimientos {activeFilter ? `${filterLabels[activeFilter]?.toLowerCase() || activeFilter}` : 'pendientes para hoy'}.</p>
        </div>
      ) : (
        <div className="followup-list">
          {displayedClients.map(client => (
            <div
              key={client.id}
              className={`followup-card ${client.diasVencido > 0 ? 'followup-card-overdue' : ''}`}
              style={{ borderLeftColor: client.disposition?.disposition ? (DISPOSITION_COLORS[client.disposition.disposition] || TEMP_COLORS[client.temperatura]) : TEMP_COLORS[client.temperatura] }}
            >
              <div className="followup-card-header">
                <div className="followup-card-info">
                  <div className="followup-card-name">
                    {client.disposition?.disposition && DISPOSITION_LABELS[client.disposition.disposition] ? (
                      <span
                        className="disposition-badge"
                        style={{ backgroundColor: DISPOSITION_COLORS[client.disposition.disposition] }}
                        onClick={() => setIntelligenceClient(client)}
                      >
                        {DISPOSITION_LABELS[client.disposition.disposition]}
                      </span>
                    ) : (
                      <span className="temp-dot" style={{ backgroundColor: TEMP_COLORS[client.temperatura] }} title={TEMP_LABELS[client.temperatura]} />
                    )}
                    <strong>{client.nombre}</strong>
                    {client.empresa && <span className="followup-empresa">{client.empresa}</span>}
                  </div>
                  <div className="followup-card-meta">
                    <span className="status-badge status-badge-sm" style={{ backgroundColor: STATUS_COLORS[client.estatus] || '#6b7280' }}>
                      {client.estatus}
                    </span>
                    {client.diasVencido > 0 && (
                      <span className="overdue-badge">VENCIDO {client.diasVencido}d</span>
                    )}
                    {client.priority?.score != null && (
                      <span
                        className="priority-badge"
                        onClick={() => setIntelligenceClient(client)}
                      >
                        P{client.priority.score}
                      </span>
                    )}
                    <span className="followup-dias">
                      {client.diasSinContacto === 0 ? 'Hoy' : `Hace ${client.diasSinContacto}d`}
                    </span>
                  </div>
                </div>
                <div className="followup-card-phone">{client.telefono}</div>
              </div>

              {client.ultimaInteraccion && (
                <div className="followup-last-interaction">
                  <span className="interaction-type-badge">{client.ultimaInteraccion.tipo}</span>
                  <span className="interaction-preview">
                    {client.ultimaInteraccion.contenido.length > 80
                      ? client.ultimaInteraccion.contenido.substring(0, 80) + '...'
                      : client.ultimaInteraccion.contenido}
                  </span>
                </div>
              )}

              {client.recommendations?.length > 0 && (
                <div className="followup-recommendation">
                  <span className="recommendation-action-label">
                    {ACTION_LABELS[client.recommendations[0].action] || client.recommendations[0].action}
                  </span>
                  {client.recommendations[0].approach && (
                    <span className="recommendation-approach">
                      {APPROACH_LABELS[client.recommendations[0].approach] || client.recommendations[0].approach}
                    </span>
                  )}
                  {client.recommendations[0].channel && (
                    <span className="recommendation-channel">via {client.recommendations[0].channel}</span>
                  )}
                  {client.recommendations[0].reasoning && (
                    <p className="recommendation-reasoning">{client.recommendations[0].reasoning}</p>
                  )}
                </div>
              )}

              {client.sugerencias?.length > 0 && (
                <div className="followup-suggestions">
                  {client.sugerencias.slice(0, 2).map((s, i) => (
                    <span key={i} className={`suggestion-chip suggestion-${s.prioridad}`}>
                      {s.mensaje}
                    </span>
                  ))}
                </div>
              )}

              <div className="followup-actions">
                <button className="btn btn-sm btn-action" onClick={() => openQuickLog(client, 'llamada')}>Llamé</button>
                <button className="btn btn-sm btn-action" onClick={() => openQuickLog(client, 'mensaje')}>Mensaje</button>
                <button className="btn btn-sm btn-action" onClick={() => openQuickLog(client, 'nota')}>Nota</button>
                <button className="btn btn-sm btn-action-secondary" onClick={() => openQuickLog(client, null)}>Registrar...</button>
              </div>
            </div>
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
