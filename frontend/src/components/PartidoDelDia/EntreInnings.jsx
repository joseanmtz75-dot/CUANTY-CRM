import { inningNombre, contarOutcomes, OUTCOME_LABELS } from '../../utils/partidoEngine';

function classForOutcome(outcome) {
  if (outcome === 'hit_simple' || outcome === 'hit_extra') return 'hit';
  if (outcome === 'out') return 'out';
  if (outcome === 'homerun') return 'homerun';
  return 'balk';
}

export default function EntreInnings({ inningCerrado, resultadosInning, siguienteInningIndex, onSiguiente }) {
  const counts = contarOutcomes(resultadosInning);

  return (
    <div className="pd-entre pd-fade-in">
      <div className="pd-entre-banner">
        <small>Cerraste el</small>
        {inningCerrado + 1}° Inning · {inningNombre(inningCerrado)}
      </div>

      <div className="pd-scoreboard" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <div className="pd-sb-item"><span className="pd-sb-num hit">{counts.hit}</span><span className="pd-sb-label">Hits</span></div>
        <div className="pd-sb-item"><span className="pd-sb-num out">{counts.out}</span><span className="pd-sb-label">Outs</span></div>
        <div className="pd-sb-item"><span className="pd-sb-num hr">{counts.homerun}</span><span className="pd-sb-label">Home Runs</span></div>
        <div className="pd-sb-item"><span className="pd-sb-num balk">{counts.balk}</span><span className="pd-sb-label">Balks</span></div>
      </div>

      {resultadosInning.length > 0 && (
        <div className="pd-recap-grid">
          {resultadosInning.map((r, i) => (
            <article key={i} className={`pd-recap-card ${classForOutcome(r.outcome)}`}>
              <div className="pd-recap-result">{OUTCOME_LABELS[r.outcome] || r.outcome}</div>
              <div className="pd-recap-name">{r.cliente?.nombre || `Turno ${i + 1}`}</div>
              <div className="pd-recap-company">
                {r.cliente?.empresa || ''}
                {r.detalle ? ` · ${r.detalle}` : ''}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="pd-pause-msg">
        Buen inning. Tómate 2 minutos si necesitas un break, luego seguimos con el {siguienteInningIndex + 1}°.
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="pd-btn-primary" onClick={onSiguiente}>
          Siguiente Inning →
        </button>
      </div>
    </div>
  );
}
