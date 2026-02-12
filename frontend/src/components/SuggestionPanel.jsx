import { useState, useEffect } from 'react';
import { getSuggestions } from '../api/clients';
import { DISPOSITION_LABELS, DISPOSITION_COLORS } from '../utils/constants';

const SECTIONS = [
  { key: 'altaPrioridad', title: 'Alta prioridad', icon: '^', color: '#faad14', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'altaPrioridad', label: 'Alta prioridad' } } },
  { key: 'listosParaCierre', title: 'Listos para cierre', icon: '$', color: '#722ed1', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'listosParaCierre', label: 'Listos para cierre' } } },
  { key: 'enRiesgo', title: 'En riesgo', icon: '!', color: '#ff4d4f', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'enRiesgo', label: 'En riesgo' } } },
  { key: 'vencidos', title: 'Seguimientos vencidos', icon: '!', color: '#cf1322', nav: { view: 'seguimiento', filter: { type: 'seguimiento', value: 'vencidos' } } },
  { key: 'nuevosSinContactar', title: 'Nuevos sin contactar', icon: '+', color: '#1890ff', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'nuevosSinContactar', label: 'Nuevos sin contactar' } } },
  { key: 'sinContacto7dias', title: 'Sin contacto > 7 días', icon: '~', color: '#faad14', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'sinContacto7dias', label: 'Sin contacto > 7 días' } } },
  { key: 'considerarDescartar', title: 'Considerar descartar', icon: '-', color: '#8c8c8c', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'considerarDescartar', label: 'Considerar descartar' } } },
  { key: 'datosIncompletos', title: 'Datos incompletos', icon: '?', color: '#722ed1', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'datosIncompletos', label: 'Datos incompletos' } } },
];

export default function SuggestionPanel({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuggestions()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Cargando sugerencias...</p>;
  if (!data) return null;

  const hasAnything = SECTIONS.some(s => data[s.key]?.length > 0);
  if (!hasAnything) return null;

  return (
    <div className="suggestion-panel">
      <h3>Sugerencias</h3>
      <div className="suggestion-sections">
        {SECTIONS.map(section => {
          const items = data[section.key] || [];
          if (items.length === 0) return null;
          return (
            <div
              key={section.key}
              className={`suggestion-section${onNavigate ? ' suggestion-section-clickable' : ''}`}
              onClick={() => onNavigate && onNavigate(section.nav.view, section.nav.filter)}
            >
              <div className="suggestion-section-header">
                <span className="suggestion-section-icon" style={{ color: section.color }}>{section.icon}</span>
                <span className="suggestion-section-title">{section.title}</span>
                <span className="suggestion-section-count">{items.length}</span>
                {onNavigate && <span className="suggestion-section-link">Ver todos &rarr;</span>}
              </div>
              <ul className="suggestion-client-list">
                {items.slice(0, 5).map(c => (
                  <li key={c.id}>
                    {c.metrics?.priorityScore != null && (
                      <span className="priority-badge-sm">{c.metrics.priorityScore}</span>
                    )}
                    <strong>{c.nombre}</strong>
                    {c.metrics?.disposition && DISPOSITION_LABELS[c.metrics.disposition] && (
                      <span
                        className="disposition-badge-sm"
                        style={{ backgroundColor: DISPOSITION_COLORS[c.metrics.disposition] }}
                      >
                        {DISPOSITION_LABELS[c.metrics.disposition].substring(0, 3)}
                      </span>
                    )}
                    {c.empresa && <span style={{ color: '#bfbfbf' }}> — {c.empresa}</span>}
                  </li>
                ))}
                {items.length > 5 && (
                  <li style={{ color: '#bfbfbf', fontStyle: 'italic' }}>
                    y {items.length - 5} más...
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
