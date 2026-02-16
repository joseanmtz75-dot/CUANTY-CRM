import { useState, useEffect } from 'react';
import { getMiDia } from '../api/clients';

const STATUS_COLORS = {
  Nuevo: '#1890ff',
  Contactado: '#13c2c2',
  'Sin respuesta': '#faad14',
  Interesado: '#52c41a',
  Negociando: '#722ed1',
  Reactivar: '#fa8c16',
  Cerrado: '#389e0d',
  Perdido: '#ff4d4f',
  Descartado: '#8c8c8c',
};

function MiDia({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMiDia()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando Mi Dia...</div>;
  if (error) return <div className="loading">Error: {error}</div>;
  if (!data) return null;

  const { tareasDeHoy, enRiesgo, accionRecomendada, resumenSemana } = data;

  return (
    <div className="mi-dia">
      <h2>Mi Dia</h2>

      {/* Resumen Semanal */}
      <div className="mi-dia-resumen">
        <div className="resumen-card">
          <span className="resumen-number">{resumenSemana.interaccionesCount}</span>
          <span className="resumen-label">Interacciones esta semana</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-number">{resumenSemana.avanzaron}</span>
          <span className="resumen-label">Avances de estatus</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-number">{resumenSemana.interesados}</span>
          <span className="resumen-label">Clientes receptivos</span>
        </div>
      </div>

      {/* Grid principal */}
      <div className="mi-dia-grid">
        {/* Tareas de Hoy */}
        <section className="mi-dia-section">
          <h3>Tareas de Hoy ({tareasDeHoy.length})</h3>
          {tareasDeHoy.length === 0 ? (
            <p className="mi-dia-empty">No hay tareas pendientes para hoy</p>
          ) : (
            <div className="mi-dia-list">
              {tareasDeHoy.map((c) => (
                <div
                  key={c.id}
                  className="mi-dia-item"
                  onClick={() => onNavigate('seguimiento')}
                >
                  <div className="mi-dia-item-header">
                    <span className="priority-badge" title="Prioridad">
                      {c.priorityScore}
                    </span>
                    <strong>{c.nombre}</strong>
                    <span
                      className="status-badge status-badge-sm"
                      style={{ background: STATUS_COLORS[c.estatus] || '#8c8c8c' }}
                    >
                      {c.estatus}
                    </span>
                  </div>
                  {c.empresa && <span className="mi-dia-item-empresa">{c.empresa}</span>}
                  {c.recommendedAction && (
                    <span className="mi-dia-item-action">{c.recommendedAction}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* En Riesgo */}
        <section className="mi-dia-section mi-dia-riesgo">
          <h3>En Riesgo ({enRiesgo.length})</h3>
          {enRiesgo.length === 0 ? (
            <p className="mi-dia-empty">No hay clientes en riesgo</p>
          ) : (
            <div className="mi-dia-list">
              {enRiesgo.map((c) => (
                <div
                  key={c.id}
                  className="mi-dia-item"
                  onClick={() => onNavigate('seguimiento')}
                >
                  <div className="mi-dia-item-header">
                    <strong>{c.nombre}</strong>
                    <span
                      className="status-badge status-badge-sm"
                      style={{ background: STATUS_COLORS[c.estatus] || '#8c8c8c' }}
                    >
                      {c.estatus}
                    </span>
                  </div>
                  {c.empresa && <span className="mi-dia-item-empresa">{c.empresa}</span>}
                  <span className="riesgo-badge">{c.razonRiesgo}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Acciones Recomendadas */}
        <section className="mi-dia-section">
          <h3>Accion Recomendada ({accionRecomendada.length})</h3>
          {accionRecomendada.length === 0 ? (
            <p className="mi-dia-empty">No hay acciones pendientes</p>
          ) : (
            <div className="mi-dia-list">
              {accionRecomendada.map((r) => (
                <div
                  key={r.id}
                  className="mi-dia-item"
                  onClick={() => onNavigate('seguimiento')}
                >
                  <div className="mi-dia-item-header">
                    <span className="priority-badge" title="Prioridad">
                      {r.priorityScore}
                    </span>
                    <strong>{r.nombre}</strong>
                  </div>
                  {r.empresa && <span className="mi-dia-item-empresa">{r.empresa}</span>}
                  <span className="accion-badge">{r.recommendedAction}</span>
                  {r.recommendedApproach && (
                    <span className="mi-dia-item-approach">{r.recommendedApproach}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default MiDia;
