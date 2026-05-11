import { useEffect, useState } from 'react';
import { updateClient, getInteractions, getVendedores } from '../../api/clients';
import { ESTATUSES, ROLES, formatMxn } from '../../utils/constants';
import { formatName, formatPhone } from '../../utils/formatters';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function diasDesde(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function ExpedientePanel({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: client.nombre || '',
    telefono: client.telefono || '',
    email: client.email || '',
    empresa: client.empresa || '',
    rfc: client.rfc || '',
    rol: client.rol || 'compras',
    rolPersonalizado: client.rolPersonalizado || '',
    estatus: client.estatus || 'Nuevo',
    vendedor: client.vendedor || '',
    nextActionNote: client.nextActionNote || '',
    notas: client.notas || '',
    proximoContacto: client.proximoContacto ? client.proximoContacto.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [interactions, setInteractions] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    getInteractions(client.clientId, 1)
      .then(d => setInteractions((d.interactions || d || []).slice(0, 5)))
      .catch(() => setInteractions([]));
    getVendedores()
      .then(d => setVendedores(d.vendedores || []))
      .catch(() => setVendedores([]));
  }, [client.clientId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    const telNormalizado = form.telefono ? formatPhone(form.telefono) : null;
    if (form.telefono && !telNormalizado) {
      setError('Teléfono inválido — debe ser un número mexicano de 10 dígitos');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      nombre: formatName(form.nombre),
      email: form.email.trim() || null,
      empresa: form.empresa.trim() || null,
      rfc: form.rfc ? form.rfc.trim().toUpperCase() : null,
      rol: form.rol,
      rolPersonalizado: form.rol === 'otro' ? (form.rolPersonalizado.trim() || null) : null,
      estatus: form.estatus,
      vendedor: form.vendedor || null,
      nextActionNote: form.nextActionNote || null,
      notas: form.notas || null,
    };
    if (telNormalizado) payload.telefono = telNormalizado;
    if (form.proximoContacto) {
      payload.proximoContacto = new Date(form.proximoContacto).toISOString();
      payload.contactoManual = true;
    }
    try {
      const updated = await updateClient(client.clientId, payload);
      onSaved && onSaved(updated);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const diasUltimaCompra = diasDesde(client.ultimaCompraErp);

  return (
    <>
      <div className="pd-overlay" onClick={onClose} />
      <aside className="pd-expediente" role="dialog" aria-modal="true">
        <div className="pd-exp-header">
          <h3>Expediente · {form.nombre || client.nombre}</h3>
          <button className="pd-exp-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="pd-exp-body">
          <section className="pd-exp-section">
            <h4>Datos básicos (editables)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre completo *"
                className="pd-exp-input"
              />
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="+52 33 1234 5678"
                className="pd-exp-input"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@empresa.mx"
                className="pd-exp-input"
              />
              <input
                name="empresa"
                value={form.empresa}
                onChange={handleChange}
                placeholder="Nombre de la empresa"
                className="pd-exp-input"
              />
              <input
                name="rfc"
                value={form.rfc}
                onChange={handleChange}
                placeholder="RFC"
                style={{ textTransform: 'uppercase' }}
                className="pd-exp-input"
              />
            </div>
          </section>

          <section className="pd-exp-section">
            <h4>Rol en la empresa</h4>
            <select name="rol" value={form.rol} onChange={handleChange} className="pd-exp-select">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {form.rol === 'otro' && (
              <input
                name="rolPersonalizado"
                value={form.rolPersonalizado}
                onChange={handleChange}
                placeholder="Especificar rol (ej: Logística, Almacén…)"
                className="pd-exp-input"
                style={{ marginTop: 6 }}
              />
            )}
          </section>

          {(client.clasificacionErp || client.totalComprasErp || client.productosFrecuentesErp) && (
            <section className="pd-exp-section">
              <h4>Historia ERP (solo lectura)</h4>
              {client.clasificacionErp && (
                <div className="pd-exp-row"><strong>Clasificación</strong><span>{client.clasificacionErp}</span></div>
              )}
              {client.totalComprasErp != null && (
                <div className="pd-exp-row"><strong>Compras lifetime</strong><span>{formatMxn(client.totalComprasErp)}</span></div>
              )}
              {client.ultimaCompraErp && (
                <div className="pd-exp-row">
                  <strong>Última compra</strong>
                  <span>{formatDate(client.ultimaCompraErp)}{diasUltimaCompra != null ? ` · hace ${diasUltimaCompra}d` : ''}</span>
                </div>
              )}
              {client.productosFrecuentesErp && (
                <div className="pd-exp-row"><strong>Productos</strong><span style={{ maxWidth: '60%' }}>{client.productosFrecuentesErp}</span></div>
              )}
            </section>
          )}

          <section className="pd-exp-section">
            <h4>Estatus</h4>
            <select name="estatus" value={form.estatus} onChange={handleChange} className="pd-exp-select">
              {ESTATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </section>

          <section className="pd-exp-section">
            <h4>Vendedor</h4>
            <select name="vendedor" value={form.vendedor} onChange={handleChange} className="pd-exp-select">
              <option value="">— Sin asignar —</option>
              {vendedores.map(v => <option key={v.id} value={v.nombre}>{v.nombre}</option>)}
            </select>
          </section>

          <section className="pd-exp-section">
            <h4>Próxima acción</h4>
            <textarea
              name="nextActionNote"
              rows={2}
              value={form.nextActionNote}
              onChange={handleChange}
              placeholder="Qué hacer en el próximo contacto"
              className="pd-exp-textarea"
            />
          </section>

          <section className="pd-exp-section">
            <h4>Próximo contacto</h4>
            <input
              type="date"
              name="proximoContacto"
              value={form.proximoContacto}
              onChange={handleChange}
              className="pd-exp-input"
            />
          </section>

          <section className="pd-exp-section">
            <h4>Notas generales</h4>
            <textarea
              name="notas"
              rows={4}
              value={form.notas}
              onChange={handleChange}
              placeholder="Notas generales del cliente"
              className="pd-exp-textarea"
            />
          </section>

          {interactions.length > 0 && (
            <section className="pd-exp-section">
              <h4>Últimas interacciones</h4>
              <div className="pd-interactions-list">
                {interactions.map(it => (
                  <div className="pd-interaction-item" key={it.id}>
                    <div className="pd-interaction-meta">
                      {it.tipo} · {formatDate(it.createdAt)}
                      {it.outcome ? ` · ${it.outcome}` : ''}
                    </div>
                    <div className="pd-interaction-text">{it.contenido}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div className="pd-exp-actions">
            <button className="pd-btn-cancel" onClick={onClose} type="button">Cancelar</button>
            <button className="pd-btn-save" onClick={handleSave} disabled={saving} type="button">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
