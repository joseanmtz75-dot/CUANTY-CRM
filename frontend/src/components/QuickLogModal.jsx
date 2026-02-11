import { useState } from 'react';
import { logInteraction } from '../api/clients';
import { INTERACTION_TYPES, CALL_RESULTS, ESTATUSES, OUTCOMES, OUTCOME_COLORS } from '../utils/constants';

export default function QuickLogModal({ client, defaultTipo, onClose, onSaved }) {
  const [tipo, setTipo] = useState(defaultTipo || 'llamada');
  const [contenido, setContenido] = useState('');
  const [resultado, setResultado] = useState('');
  const [nuevoEstatus, setNuevoEstatus] = useState('');
  const [proximoContacto, setProximoContacto] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contenido.trim()) {
      setError('Escribe qué pasó');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await logInteraction(client.id, {
        tipo,
        contenido: contenido.trim(),
        resultado: tipo === 'llamada' ? resultado || null : null,
        outcome: outcome || null,
        nuevoEstatus: nuevoEstatus || null,
        proximoContacto: proximoContacto || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal quicklog-modal">
        <h3>Registrar — {client.nombre}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo</label>
            <div className="pill-group">
              {INTERACTION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className={`pill ${tipo === t.value ? 'pill-active' : ''}`}
                  onClick={() => setTipo(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'llamada' && (
            <div className="form-group">
              <label>Resultado</label>
              <div className="pill-group">
                {CALL_RESULTS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    className={`pill ${resultado === r.value ? 'pill-active' : ''}`}
                    onClick={() => setResultado(resultado === r.value ? '' : r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>¿Qué pasó?</label>
            <textarea
              className="quicklog-textarea"
              value={contenido}
              onChange={(e) => { setContenido(e.target.value); setError(''); }}
              placeholder="Describe brevemente la interacción..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Resultado del contacto</label>
            <div className="pill-group">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`pill-outcome ${outcome === o.value ? 'pill-outcome-active' : ''}`}
                  style={outcome === o.value ? { backgroundColor: OUTCOME_COLORS[o.value], borderColor: OUTCOME_COLORS[o.value] } : {}}
                  onClick={() => setOutcome(outcome === o.value ? '' : o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="outcome-hint">Esto mejora las recomendaciones</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cambiar estatus (opcional)</label>
              <select value={nuevoEstatus} onChange={(e) => setNuevoEstatus(e.target.value)}>
                <option value="">Sin cambio</option>
                {ESTATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Próximo contacto (opcional)</label>
              <input
                type="date"
                value={proximoContacto}
                onChange={(e) => setProximoContacto(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {error && <div className="quicklog-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
