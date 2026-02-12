import { useState, useEffect } from 'react';
import { getClients, getTodayFollowUps } from '../api/clients';
import { ESTATUSES, STATUS_COLORS, TEMP_COLORS, TEMP_LABELS, computeTemperatura, DISPOSITION_LABELS, DISPOSITION_COLORS } from '../utils/constants';
import SuggestionPanel from './SuggestionPanel';

export default function Dashboard({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [todayData, setTodayData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getClients({ incluirDescartados: true }).catch(() => []),
      getTodayFollowUps().catch(() => ({ clients: [], totalCount: 0 })),
    ]).then(([allClients, today]) => {
      setClients(allClients);
      setTodayData(today.clients);
    }).finally(() => setLoading(false));
  }, []);

  const countByStatus = (estatus) => clients.filter(c => c.estatus === estatus).length;

  // Follow-up stats
  const paraHoy = todayData.length;
  const vencidos = todayData.filter(c => c.diasVencido > 0).length;

  // Disposition distribution
  const activeClients = clients.filter(c => !['Cerrado', 'Perdido', 'Descartado'].includes(c.estatus));
  const dispCounts = {};
  for (const c of activeClients) {
    const d = c.metrics?.disposition || 'desconocido';
    dispCounts[d] = (dispCounts[d] || 0) + 1;
  }

  // Top priority clients
  const topPriority = [...activeClients]
    .filter(c => c.metrics?.priorityScore != null)
    .sort((a, b) => (b.metrics.priorityScore || 0) - (a.metrics.priorityScore || 0))
    .slice(0, 5);

  if (loading) return <p className="loading">Cargando estadisticas...</p>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      {/* Follow-up stats */}
      <div className="stats-grid">
        <div className="stat-card stat-total stat-card-clickable" onClick={() => onNavigate('clients', null)}>
          <span className="stat-number">{clients.length}</span>
          <span className="stat-label">Total Clientes</span>
        </div>
        <div className="stat-card stat-card-clickable" style={{ borderTopColor: '#faad14' }} onClick={() => onNavigate('seguimiento', { type: 'seguimiento', value: 'hoy' })}>
          <span className="stat-number">{paraHoy}</span>
          <span className="stat-label">Para Hoy</span>
        </div>
        <div className="stat-card stat-card-clickable" style={{ borderTopColor: '#ff4d4f' }} onClick={() => onNavigate('seguimiento', { type: 'seguimiento', value: 'vencidos' })}>
          <span className="stat-number">{vencidos}</span>
          <span className="stat-label">Vencidos</span>
        </div>
        {ESTATUSES.filter(s => !['Descartado', 'Reactivar'].includes(s)).map(estatus => (
          <div
            className="stat-card stat-card-clickable"
            key={estatus}
            style={{ borderTopColor: STATUS_COLORS[estatus] }}
            onClick={() => onNavigate('clients', { type: 'estatus', value: estatus })}
          >
            <span className="stat-number">{countByStatus(estatus)}</span>
            <span className="stat-label">{estatus}</span>
          </div>
        ))}
      </div>

      {/* Disposition distribution */}
      <div className="dashboard-section">
        <h3>Disposicion de Clientes Activos</h3>
        <div className="stats-grid">
          {Object.entries(dispCounts)
            .filter(([, count]) => count > 0)
            .map(([key, count]) => (
              <div
                className="stat-card stat-card-clickable"
                key={key}
                style={{ borderTopColor: DISPOSITION_COLORS[key] || '#bfbfbf' }}
                onClick={() => onNavigate('clients', { type: 'disposition', value: key, label: DISPOSITION_LABELS[key] || key })}
              >
                <span className="stat-number">{count}</span>
                <span className="stat-label">{DISPOSITION_LABELS[key] || key}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top Priority */}
      {topPriority.length > 0 && (
        <div className="dashboard-section">
          <h3>Top Prioridad</h3>
          <div className="top-priority-list">
            {topPriority.map(c => (
              <div className="top-priority-item" key={c.id}>
                <span className="priority-badge">P{c.metrics.priorityScore}</span>
                <strong>{c.nombre}</strong>
                {c.metrics?.disposition && DISPOSITION_LABELS[c.metrics.disposition] && (
                  <span
                    className="disposition-badge-sm"
                    style={{ backgroundColor: DISPOSITION_COLORS[c.metrics.disposition] }}
                  >
                    {DISPOSITION_LABELS[c.metrics.disposition].substring(0, 3)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <SuggestionPanel onNavigate={onNavigate} />
    </div>
  );
}
