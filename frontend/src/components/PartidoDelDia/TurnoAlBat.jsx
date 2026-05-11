import { useState, useEffect } from 'react';
import { buildWhatsAppUrl, contarOutcomes, tieneTelefono, HIT_SUBTYPE, inningNombre } from '../../utils/partidoEngine';
import { CLASIFICACION_ERP_COLORS, diasDesdeFecha } from '../../utils/constants';
import { deleteClient, bulkAssignClients, getVendedores } from '../../api/clients';
import ExpedientePanel from './ExpedientePanel';

function ErpBadge({ value }) {
  if (!value) return null;
  const cls = value === 'ALTO' ? 'alto' : value === 'MEDIO' ? 'medio' : 'bajo';
  return <span className={`pd-erp-badge ${cls}`}>ERP · {value}</span>;
}

function ultimaInteraccionTexto(c) {
  if (c.ultimoContacto) {
    const dias = diasDesdeFecha(c.ultimoContacto);
    return `Último contacto hace ${dias}d`;
  }
  return 'Sin interacciones previas registradas';
}

function sugerenciaTexto(c) {
  if (c.nextActionNote) return c.nextActionNote;
  if (c.recommendedReasoning) return c.recommendedReasoning;
  if (c.razonSeleccion) return c.razonSeleccion;
  return 'Saluda y abre conversación. Registra el outcome al terminar.';
}

function BalkPanel({ client, onClose, onResolved }) {
  const [vendedores, setVendedores] = useState([]);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVendedores()
      .then(d => setVendedores((d.vendedores || []).filter(v => v.nombre !== client.vendedor)))
      .catch(() => setVendedores([]));
  }, [client.vendedor]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleReasignar = async () => {
    if (!target) { setError('Selecciona un vendedor'); return; }
    setBusy(true);
    setError('');
    try {
      await bulkAssignClients({ mode: 'manual', vendedor: target, clientIds: [client.clientId] });
      onResolved({ type: 'reasignar', target });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm(`Eliminar a "${client.nombre}" permanentemente? No se puede deshacer.`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteClient(client.clientId);
      onResolved({ type: 'eliminar' });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pd-overlay" onClick={onClose} />
      <aside className="pd-expediente">
        <div className="pd-exp-header" style={{ background: 'var(--pd-balk)' }}>
          <h3>Balk · Turno anulado</h3>
          <button className="pd-exp-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="pd-exp-body">
          <p style={{ fontSize: 13, color: 'var(--pd-ink-soft)', lineHeight: 1.5, margin: 0 }}>
            Un balk anula este turno sin registrar interacción. Elige qué hacer con {client.nombre}:
          </p>

          <div className="pd-balk-section">
            <h5>Reasignar a otro vendedor</h5>
            <select className="pd-exp-select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
              <option value="">— Selecciona vendedor —</option>
              {vendedores.map(v => <option key={v.id} value={v.nombre}>{v.nombre}</option>)}
            </select>
            <button className="pd-btn-save" disabled={busy || !target} onClick={handleReasignar}>
              {busy ? 'Reasignando…' : 'Reasignar y anular turno'}
            </button>
          </div>

          <div className="pd-balk-section">
            <h5>Eliminar permanentemente</h5>
            <p style={{ fontSize: 12, color: 'var(--pd-ink-mute)', lineHeight: 1.4, margin: 0 }}>
              Úsalo solo si los datos son incorrectos o el contacto no existe. Se borra del CRM y no se puede deshacer.
            </p>
            <button className="pd-btn-danger" disabled={busy} onClick={handleEliminar}>
              Eliminar contacto definitivamente
            </button>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
              {error}
            </div>
          )}

          <button className="pd-btn-cancel" onClick={onClose} style={{ alignSelf: 'center' }}>Cancelar balk</button>
        </div>
      </aside>
    </>
  );
}

export default function TurnoAlBat({
  cliente,
  inningActual,
  turnoEnInning,
  totalEnInning,
  totalTurnos,
  resultados,
  onOutcome,
  onClientUpdated,
}) {
  const [expedienteOpen, setExpedienteOpen] = useState(false);
  const [balkOpen, setBalkOpen] = useState(false);
  const [hitMenu, setHitMenu] = useState(false);
  const [flying, setFlying] = useState(null); // null | 'fly' | 'fly-hr'

  // Reset estado interno cuando cambia el cliente
  useEffect(() => {
    setExpedienteOpen(false);
    setBalkOpen(false);
    setHitMenu(false);
    setFlying(null);
  }, [cliente.clientId]);

  const counts = contarOutcomes(resultados);
  const waUrl = buildWhatsAppUrl(cliente);
  const tieneTel = tieneTelefono(cliente);

  const handleOutcome = (outcome, opts) => {
    if (flying) return;
    const flyClass = outcome === 'homerun' ? 'fly-hr' : 'fly';
    setFlying(flyClass);
    setTimeout(() => {
      onOutcome(outcome, opts);
    }, 380);
  };

  const handleHit = () => {
    setHitMenu(true);
  };

  const handleHitSubtype = (subtype) => {
    setHitMenu(false);
    handleOutcome(subtype === HIT_SUBTYPE.EXTRA ? 'hit_extra' : 'hit_simple');
  };

  const handleBalkResolved = (result) => {
    setBalkOpen(false);
    onOutcome('balk', { resolution: result });
  };

  const handleExpedienteSaved = (updated) => {
    setExpedienteOpen(false);
    onClientUpdated && onClientUpdated(updated);
  };

  return (
    <div className="pd-turno-grid pd-fade-in">
      <div className="pd-mini-scoreboard">
        <div className="pd-mini-position">
          Inning <strong>{inningActual + 1}°</strong> · {inningNombre(inningActual)} · Turno <strong>{turnoEnInning + 1}</strong> de <strong>{totalEnInning}</strong>
        </div>
        <div className="pd-mini-stats">
          <div className="pd-mini-stat"><span className="pd-mini-stat-num">{counts.hit}</span><span className="pd-mini-stat-label">H</span></div>
          <div className="pd-mini-stat"><span className="pd-mini-stat-num">{counts.out}</span><span className="pd-mini-stat-label">O</span></div>
          <div className="pd-mini-stat"><span className="pd-mini-stat-num">{counts.homerun}</span><span className="pd-mini-stat-label">HR</span></div>
          <div className="pd-mini-stat"><span className="pd-mini-stat-num">{counts.balk}</span><span className="pd-mini-stat-label">BB</span></div>
        </div>
      </div>

      <article className={`pd-bat-card ${flying === 'fly' ? 'flying-out' : ''} ${flying === 'fly-hr' ? 'flying-out-hr' : ''}`}>
        <div className="pd-bat-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="pd-bat-name">{cliente.nombre}</h2>
            <div className="pd-bat-company">
              {cliente.empresa || 'Sin empresa'}
              {cliente.rfc ? ` · ${cliente.rfc}` : ''}
            </div>
          </div>
          <div className="pd-bat-badges">
            <ErpBadge value={cliente.clasificacionErp} />
            <span className="pd-status-pill">{cliente.estatus}</span>
          </div>
        </div>

        <div className="pd-bat-section">
          <div className="pd-bat-section-label">
            Última interacción {cliente.ultimoContacto ? `· hace ${diasDesdeFecha(cliente.ultimoContacto)}d` : ''}
          </div>
          <p className="pd-bat-last">{ultimaInteraccionTexto(cliente)}</p>
        </div>

        <div className="pd-bat-section">
          <div className="pd-bat-section-label">Sugerencia del motor</div>
          <p className="pd-bat-suggestion">{sugerenciaTexto(cliente)}</p>
        </div>

        <div className="pd-bat-actions">
          {tieneTel ? (
            <a className="pd-btn-whatsapp" href={waUrl} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.2-.3-.3-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.4 1.3 4.9L2 22l5.3-1.3c1.5.8 3.1 1.3 4.7 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
              </svg>
              <span>
                WhatsApp a {cliente.nombre.split(' ')[0]}
                <small>Mensaje pre-llenado según estatus + producto</small>
              </span>
            </a>
          ) : (
            <button
              className="pd-btn-whatsapp disabled"
              onClick={() => setExpedienteOpen(true)}
              type="button"
              title="Sin teléfono — abre el expediente para completar datos"
            >
              <span style={{ textAlign: 'left' }}>
                Sin teléfono registrado
                <small>Completar datos en el expediente</small>
              </span>
            </button>
          )}

          {!hitMenu ? (
            <div className="pd-outcome-grid">
              <button className="pd-outcome-btn hit" onClick={handleHit} disabled={!!flying} title="Cliente respondió o avanzó">
                <span className="pd-outcome-letter">H</span>
                <span className="pd-outcome-name">Hit</span>
              </button>
              <button className="pd-outcome-btn out" onClick={() => handleOutcome('out')} disabled={!!flying} title="Sin respuesta">
                <span className="pd-outcome-letter">O</span>
                <span className="pd-outcome-name">Out</span>
              </button>
              <button className="pd-outcome-btn homerun" onClick={() => handleOutcome('homerun')} disabled={!!flying} title="Cierre o avance importante">
                <span className="pd-outcome-letter">HR</span>
                <span className="pd-outcome-name">Home Run</span>
              </button>
              <button className="pd-outcome-btn balk" onClick={() => setBalkOpen(true)} disabled={!!flying} title="Contacto inválido o reasignar">
                <span className="pd-outcome-letter">BB</span>
                <span className="pd-outcome-name">Balk</span>
              </button>
            </div>
          ) : (
            <div className="pd-hit-subselect">
              <button onClick={() => handleHitSubtype(HIT_SUBTYPE.SIMPLE)}>
                Hit simple<br /><small>respuesta · sin avance claro</small>
              </button>
              <button className="primary" onClick={() => handleHitSubtype(HIT_SUBTYPE.EXTRA)}>
                Hit extra base<br /><small>avance positivo</small>
              </button>
              <button onClick={() => setHitMenu(false)} style={{ flex: 'none', background: 'transparent', border: 'none', color: 'var(--pd-ink-mute)' }}>
                cancelar
              </button>
            </div>
          )}

          <button className="pd-ver-expediente" onClick={() => setExpedienteOpen(true)} type="button">
            {tieneTel ? 'Ver expediente completo →' : 'Completar datos del cliente →'}
          </button>
        </div>
      </article>

      {expedienteOpen && (
        <ExpedientePanel
          client={cliente}
          onClose={() => setExpedienteOpen(false)}
          onSaved={handleExpedienteSaved}
        />
      )}

      {balkOpen && (
        <BalkPanel
          client={cliente}
          onClose={() => setBalkOpen(false)}
          onResolved={handleBalkResolved}
        />
      )}
    </div>
  );
}
