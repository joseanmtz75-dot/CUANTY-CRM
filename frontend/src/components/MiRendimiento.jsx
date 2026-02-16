import { useState, useEffect } from 'react';
import { getRendimiento } from '../api/clients';
import { STATUS_COLORS } from '../utils/constants';

function MiRendimiento() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRendimiento()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando Rendimiento...</div>;
  if (error) return <div className="loading">Error: {error}</div>;
  if (!data) return null;

  const { semana, mes, pipeline } = data;

  const maxCount = Math.max(...pipeline.porEstatus.map((s) => s.count), 1);

  return (
    <div className="rendimiento">
      <h2>Mi Rendimiento</h2>

      {/* Resumen Semanal */}
      <h3 className="rendimiento-section-title">Ultima Semana</h3>
      <div className="mi-dia-resumen">
        <div className="resumen-card">
          <span className="resumen-number">{semana.interacciones}</span>
          <span className="resumen-label">Interacciones</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-number">{semana.clientesContactados}</span>
          <span className="resumen-label">Clientes contactados</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-number">{semana.avancesEstatus}</span>
          <span className="resumen-label">Avances de estatus</span>
        </div>
      </div>

      {/* Resumen Mensual */}
      <h3 className="rendimiento-section-title">Ultimo Mes</h3>
      <div className="rendimiento-cards-4">
        <div className="resumen-card">
          <span className="resumen-number">{mes.interacciones}</span>
          <span className="resumen-label">Interacciones</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-number">{mes.tasaRespuesta}%</span>
          <span className="resumen-label">Tasa de respuesta</span>
        </div>
        <div className="resumen-card" style={{ borderTopColor: 'var(--color-success)' }}>
          <span className="resumen-number" style={{ color: 'var(--color-success)' }}>{mes.ganados}</span>
          <span className="resumen-label">Ganados</span>
        </div>
        <div className="resumen-card" style={{ borderTopColor: 'var(--color-error)' }}>
          <span className="resumen-number" style={{ color: 'var(--color-error)' }}>{mes.perdidos}</span>
          <span className="resumen-label">Perdidos</span>
        </div>
      </div>

      {/* Pipeline */}
      <h3 className="rendimiento-section-title">Pipeline Actual</h3>
      <div className="mi-dia-section">
        {pipeline.porEstatus
          .sort((a, b) => b.count - a.count)
          .map((s) => (
            <div key={s.estatus} className="rendimiento-bar-row">
              <span className="rendimiento-bar-label">{s.estatus}</span>
              <div className="rendimiento-bar-bg">
                <div
                  className="rendimiento-bar-fill"
                  style={{
                    width: `${(s.count / maxCount) * 100}%`,
                    background: STATUS_COLORS[s.estatus] || '#8c8c8c',
                  }}
                />
              </div>
              <span className="rendimiento-bar-count">{s.count}</span>
            </div>
          ))}
        <div className="rendimiento-bar-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-split)' }}>
          <span className="rendimiento-bar-label" style={{ fontWeight: 600 }}>Interesados / Receptivos</span>
          <span className="rendimiento-bar-count" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{pipeline.interesados}</span>
        </div>
      </div>
    </div>
  );
}

export default MiRendimiento;
