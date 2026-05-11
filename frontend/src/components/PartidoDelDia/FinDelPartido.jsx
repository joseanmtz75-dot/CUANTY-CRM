import { contarOutcomes, clientesPendientesParaManana, topJugada, OUTCOME_LABELS, inningNombre } from '../../utils/partidoEngine';
import { formatMxn } from '../../utils/constants';

function flowDescription(top) {
  if (!top) return null;
  const c = top.cliente;
  if (top.outcome === 'homerun') {
    return `Home Run · estatus avanzó`;
  }
  return 'Hit con avance positivo';
}

export default function FinDelPartido({ lineup, resultados, balks, cambios = [], onCerrar }) {
  const counts = contarOutcomes(resultados);
  const pendientes = clientesPendientesParaManana(resultados, lineup);
  const top = topJugada(resultados, lineup);
  const totalTurnos = resultados.length + balks.length + cambios.length;

  return (
    <div className="pd-fin pd-fade-in">
      <div className="pd-fin-title">
        <small>Marcador Final</small>
        <h1>Jugaste {totalTurnos} Turno{totalTurnos !== 1 ? 's' : ''}</h1>
      </div>

      <div className="pd-final-scoreboard">
        <div className="pd-final-row">
          <div className="pd-final-stat">
            <span className="pd-final-stat-num hit">{counts.hit}</span>
            <span className="pd-final-stat-label">Hits</span>
          </div>
          <div className="pd-final-stat">
            <span className="pd-final-stat-num out">{counts.out}</span>
            <span className="pd-final-stat-label">Outs</span>
          </div>
          <div className="pd-final-stat">
            <span className="pd-final-stat-num hr">{counts.homerun}</span>
            <span className="pd-final-stat-label">Home Runs</span>
          </div>
          <div className="pd-final-stat">
            <span className="pd-final-stat-num balk">{balks.length}</span>
            <span className="pd-final-stat-label">Balks</span>
          </div>
        </div>
      </div>

      {top && (
        <div className="pd-top-play">
          <h3>Top jugada del día</h3>
          <div className="pd-top-play-name">{top.cliente.nombre}</div>
          <div className="pd-top-play-detail">
            {top.cliente.empresa || 'Sin empresa'}
            {top.cliente.clasificacionErp ? ` · ERP·${top.cliente.clasificacionErp}` : ''}
            {top.cliente.totalComprasErp ? ` · ${formatMxn(top.cliente.totalComprasErp)}` : ''}
          </div>
          <div className="pd-top-play-flow">
            {flowDescription(top)}
          </div>
        </div>
      )}

      {cambios.length > 0 && (
        <div className="pd-pendientes" style={{ borderColor: 'var(--pd-grass)' }}>
          <h3>Reclasificaciones <span style={{ background: 'var(--pd-grass)' }}>{cambios.length}</span></h3>
          {cambios.map((cb, i) => (
            <div className="pd-pendiente-row" key={i}>
              <div>
                <strong>{cb.cliente?.nombre}</strong>
                <div style={{ fontSize: 11, color: 'var(--pd-ink-mute)', marginTop: 2 }}>
                  {cb.cliente?.empresa || 'Sin empresa'} · clasificado como <em>{cb.rolNuevo}{cb.rolPersonalizado ? ` (${cb.rolPersonalizado})` : ''}</em>
                </div>
              </div>
              <span>
                {cb.type === 'sustitucion' && 'Sustituido'}
                {cb.type === 'crear' && 'Nuevo creado'}
                {cb.type === 'skip' && 'Sin sustituto'}
              </span>
            </div>
          ))}
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="pd-pendientes">
          <h3>Para mañana <span>{pendientes.length} out{pendientes.length !== 1 ? 's' : ''}</span></h3>
          {pendientes.map(c => (
            <div className="pd-pendiente-row" key={c.clientId}>
              <div>
                <strong>{c.nombre}</strong>
                <div style={{ fontSize: 11, color: 'var(--pd-ink-mute)', marginTop: 2 }}>
                  {c.empresa || 'Sin empresa'} · {c.estatus}
                </div>
              </div>
              <span>Vuelve al lineup</span>
            </div>
          ))}
        </div>
      )}

      <button className="pd-btn-primary pd-btn-block" onClick={onCerrar}>
        Cerrar partido
      </button>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'rgba(245, 245, 240, 0.5)', letterSpacing: '0.05em' }}>
        Tus stats quedan registrados en Rendimiento
      </div>
    </div>
  );
}
