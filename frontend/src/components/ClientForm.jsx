import { useState, useEffect } from 'react';
import { formatName, formatPhone } from '../utils/formatters';
import { ESTATUSES, ORIGENES, ROLES } from '../utils/constants';

const emptyForm = {
  nombre: '',
  telefono: '',
  email: '',
  empresa: '',
  estatus: 'Nuevo',
  origen: '',
  rol: 'compras',
  rolPersonalizado: '',
  notas: '',
  proximoContacto: '',
};

export default function ClientForm({ client, onSave, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (client) {
      setForm({
        nombre: client.nombre || '',
        telefono: client.telefono || '',
        email: client.email || '',
        empresa: client.empresa || '',
        estatus: client.estatus || 'Nuevo',
        origen: client.origen || '',
        rol: client.rol || 'compras',
        rolPersonalizado: client.rolPersonalizado || '',
        notas: client.notas || '',
        proximoContacto: client.proximoContacto ? client.proximoContacto.split('T')[0] : '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [client]);

  const validate = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (!form.telefono.trim()) errs.telefono = 'El telefono es requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = {
      ...form,
      nombre: formatName(form.nombre),
      telefono: formatPhone(form.telefono),
      rolPersonalizado: form.rol === 'otro' ? form.rolPersonalizado : null,
    };
    if (data.proximoContacto) {
      data.proximoContacto = new Date(data.proximoContacto).toISOString();
      data.contactoManual = true;
    } else {
      delete data.proximoContacto;
    }
    onSave(data);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre *</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Nombre del cliente"
            />
            {errors.nombre && <span className="field-error">{errors.nombre}</span>}
          </div>

          <div className="form-group">
            <label>Telefono *</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="Telefono"
            />
            {errors.telefono && <span className="field-error">{errors.telefono}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="form-group">
            <label>Empresa</label>
            <input
              name="empresa"
              value={form.empresa}
              onChange={handleChange}
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rol en empresa</label>
              <select name="rol" value={form.rol} onChange={handleChange}>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {form.rol === 'otro' && (
              <div className="form-group">
                <label>Especificar rol</label>
                <input
                  name="rolPersonalizado"
                  value={form.rolPersonalizado}
                  onChange={handleChange}
                  placeholder="Ej: Logistica, Almacen..."
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estatus</label>
              <select name="estatus" value={form.estatus} onChange={handleChange}>
                {ESTATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Origen</label>
              <select name="origen" value={form.origen} onChange={handleChange}>
                <option value="">-- Seleccionar --</option>
                {ORIGENES.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Proximo contacto</label>
            <input
              name="proximoContacto"
              type="date"
              value={form.proximoContacto}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              placeholder="Notas generales del cliente..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {client ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
