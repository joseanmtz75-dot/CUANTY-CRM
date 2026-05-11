import { esClienteIncompleto, inningNombre } from '../../utils/partidoEngine';

const INNING_SUBS = [
  'Listos para decisión y cierres pendientes',
  'Interesados con buen ritmo',
  'VIPs sin comprar y dormientes',
];

function ErpBadge({ value }) {
  if (!value) return null;
  const cls = value === 'ALTO' ? 'alto' : value === 'MEDIO' ? 'medio' : 'bajo';
  return <span className={`pd-erp-badge ${cls}`}>{value}</span>;
}

function PlayerCard({ c, batNumber }) {
  const incomplete = esClienteIncompleto(c);
  return (
    <article className="pd-player-card">
      <div className="pd-player-header">
        <div className="pd-bat-number">{batNumber}</div>
        <div style={{ minWidth: 0 }}>
          <div className="pd-player-name">{c.nombre}</div>
          <div className="pd-player-company">{c.empresa || 'Sin empresa'}</div>
        </div>
      </div>
      <div className="pd-player-meta">
        <ErpBadge value={c.clasificacionErp} />
        <span className="pd-status-pill">{c.estatus}</span>
        {incomplete && <span className="pd-warn-badge" title="Datos incompletos">⚠ Datos incompletos</span>}
      </div>
      {(c.nextActionNote || c.razonSeleccion) && (
        <p className="pd-player-last">
          {c.nextActionNote || c.razonSeleccion}
        </p>
      )}
    </article>
  );
}

function Inning({ index, clientes, startBatNumber }) {
  return (
    <>
      <div className="pd-section-title">
        <span className="pd-inning-badge">{index + 1}° Inning</span>
        <h2>{inningNombre(index)}</h2>
        <span className="pd-section-sub">{INNING_SUBS[index]}</span>
      </div>
      {clientes.length === 0 ? (
        <div className="pd-section-empty">— Sin turnos este inning —</div>
      ) : (
        <div className="pd-cards-grid">
          {clientes.map((c, i) => (
            <PlayerCard key={c.clientId} c={c} batNumber={startBatNumber + i} />
          ))}
        </div>
      )}
    </>
  );
}

export default function Dugout({ innings, recordSemana, onIniciar, totalTurnos, loading, vendedorNombre, fecha }) {
  if (loading) {
    return <div className="pd-loader">CARGANDO LINEUP…</div>;
  }

  const lineupVacio = innings.every(g => g.length === 0);

  return (
    <div className="pd-fade-in">
      <div className="pd-record-label">Récord de la semana</div>
      <div className="pd-scoreboard">
        <div className="pd-sb-item">
          <span className="pd-sb-num hit">{recordSemana?.hits ?? 0}</span>
          <span className="pd-sb-label">Hits</span>
        </div>
        <div className="pd-sb-item">
          <span className="pd-sb-num out">{recordSemana?.outs ?? 0}</span>
          <span className="pd-sb-label">Outs</span>
        </div>
        <div className="pd-sb-item">
          <span className="pd-sb-num hr">{recordSemana?.homeruns ?? 0}</span>
          <span className="pd-sb-label">Home Runs</span>
        </div>
        <div className="pd-sb-item">
          <span className="pd-sb-num balk">{recordSemana?.balks ?? 0}</span>
          <span className="pd-sb-label">Balks</span>
        </div>
      </div>

      {lineupVacio ? (
        <div className="pd-empty-lineup" style={{ marginTop: 24 }}>
          <h3>No hay lineup para hoy</h3>
          <p>No tienes clientes pendientes de seguimiento. Revisa Clientes para agendar próximos contactos.</p>
        </div>
      ) : (
        <>
          <Inning index={0} clientes={innings[0]} startBatNumber={1} />
          <Inning index={1} clientes={innings[1]} startBatNumber={innings[0].length + 1} />
          <Inning index={2} clientes={innings[2]} startBatNumber={innings[0].length + innings[1].length + 1} />

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button className="pd-btn-primary pd-btn-block" onClick={onIniciar}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 3L19 12L5 21V3Z" fill="currentColor" />
              </svg>
              Iniciar Partido
            </button>
            <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(245, 245, 240, 0.5)', letterSpacing: '0.05em' }}>
              {totalTurnos} turnos · {innings.filter(g => g.length > 0).length} innings · {fecha}
            </div>
            <div className="pd-dugout-context">
              El orden mejora cada vez que registras un outcome en tus turnos.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
