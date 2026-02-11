import { useState, useEffect } from 'react';
import { getClientIntelligence } from '../api/clients';
import {
  STATUS_COLORS,
  DISPOSITION_LABELS,
  DISPOSITION_COLORS,
  ACTION_LABELS,
  APPROACH_LABELS,
} from '../utils/constants';

const FACTOR_COLORS = {
  urgencia: '#ef4444',
  receptividad: '#10b981',
  momentum: '#f59e0b',
  valorEtapa: '#8b5cf6',
  frescura: '#3b82f6',
};

const FACTOR_LABELS = {
  urgencia: 'Urgencia',
  receptividad: 'Receptividad',
  momentum: 'Momentum',
  valorEtapa: 'Valor etapa',
  frescura: 'Frescura',
};

export default function ClientIntelligenceModal({ client, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientIntelligence(client.id)
      .then(setData)
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [client.id]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal intel-modal">
        <div className="modal-header">
          <h3>
            {client.nombre}
            <span
              className="status-badge"
              style={{ backgroundColor: STATUS_COLORS[client.estatus] || '#6b7280', marginLeft: 8, fontSize: '0.75rem' }}
            >
              {client.estatus}
            </span>
          </h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {loading && <p className="loading">Cargando analisis...</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        {data && (
          <>
            {/* Disposition */}
            <div className="intel-section">
              <h4>Disposicion</h4>
              <span
                className="intel-disposition-badge"
                style={{ backgroundColor: DISPOSITION_COLORS[data.disposition?.disposition] || '#9ca3af' }}
              >
                {DISPOSITION_LABELS[data.disposition?.disposition] || data.disposition?.disposition || 'Desconocido'}
              </span>
              {data.disposition?.confidence != null && (
                <span className="intel-confidence">
                  {Math.round(data.disposition.confidence * 100)}% confianza
                </span>
              )}
              {data.disposition?.signals?.length > 0 && (
                <ul className="intel-signals">
                  {data.disposition.signals.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Priority */}
            <div className="intel-section">
              <h4>Prioridad</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span className="intel-score-number">{data.priority?.score ?? '-'}</span>
                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>/100</span>
              </div>
              {data.priority?.factors && Object.entries(data.priority.factors).map(([key, val]) => (
                <div className="intel-factor-row" key={key}>
                  <span>{FACTOR_LABELS[key] || key}</span>
                  <div className="intel-factor-bar-bg">
                    <div
                      className="intel-factor-bar"
                      style={{
                        width: `${Math.min(val * 100, 100)}%`,
                        backgroundColor: FACTOR_COLORS[key] || '#3b82f6',
                      }}
                    />
                  </div>
                  <span className="intel-factor-value">{Math.round(val * 100)}</span>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {data.recommendations?.length > 0 && (
              <div className="intel-section">
                <h4>Recomendaciones</h4>
                {data.recommendations.map((rec, i) => (
                  <div className="intel-rec-card" key={i}>
                    <span className="recommendation-action-label">
                      {ACTION_LABELS[rec.action] || rec.action}
                    </span>
                    {rec.approach && (
                      <span className="recommendation-approach">
                        {APPROACH_LABELS[rec.approach] || rec.approach}
                      </span>
                    )}
                    {rec.channel && (
                      <span className="recommendation-channel">via {rec.channel}</span>
                    )}
                    {rec.reasoning && (
                      <p className="recommendation-reasoning">{rec.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Status Timeline */}
            {data.statusChanges?.length > 0 && (
              <div className="intel-section">
                <h4>Historial de Estatus</h4>
                <div className="intel-timeline">
                  {data.statusChanges.map((change, i) => (
                    <div className="intel-timeline-item" key={i}>
                      <span className="intel-timeline-date">
                        {new Date(change.date || change.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="intel-timeline-change">
                        {' '}{change.from || '?'} &rarr; {change.to || '?'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
