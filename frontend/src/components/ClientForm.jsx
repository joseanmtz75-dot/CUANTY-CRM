import { useState, useEffect } from 'react';
import { formatName, formatPhone } from '../utils/formatters';
import { ESTATUSES, ORIGENES, ROLES } from '../utils/constants';
import { getVendedores } from '../api/clients';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const emptyForm = {
  nombre: '',
  telefono: '',
  email: '',
  empresa: '',
  vendedor: '',
  estatus: 'Nuevo',
  origen: '',
  rol: 'compras',
  rolPersonalizado: '',
  notas: '',
  nextActionNote: '',
  proximoContacto: '',
};

export default function ClientForm({ client, onSave, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [vendedores, setVendedores] = useState([]);
  const [vendedorError, setVendedorError] = useState(null);

  useEffect(() => {
    getVendedores()
      .then(data => setVendedores(data.vendedores || []))
      .catch(() => { setVendedores([]); setVendedorError('No se pudieron cargar vendedores'); });
  }, []);

  useEffect(() => {
    if (client) {
      setForm({
        nombre: client.nombre || '',
        telefono: client.telefono || '',
        email: client.email || '',
        empresa: client.empresa || '',
        vendedor: client.vendedor || '',
        estatus: client.estatus || 'Nuevo',
        origen: client.origen || '',
        rol: client.rol || 'compras',
        rolPersonalizado: client.rolPersonalizado || '',
        notas: client.notas || '',
        nextActionNote: client.nextActionNote || '',
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
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del cliente"
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Telefono *</Label>
            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Telefono"
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com"
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <input name="empresa" value={form.empresa} onChange={handleChange} placeholder="Nombre de la empresa"
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="space-y-1.5">
            <Label>Vendedor</Label>
            <select name="vendedor" value={form.vendedor} onChange={handleChange}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">-- Sin asignar --</option>
              {vendedores.map(v => <option key={v.id} value={v.nombre}>{v.nombre}</option>)}
            </select>
            {vendedorError && <p className="text-xs text-destructive">{vendedorError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rol en empresa</Label>
              <select name="rol" value={form.rol} onChange={handleChange}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.rol === 'otro' && (
              <div className="space-y-1.5">
                <Label>Especificar rol</Label>
                <input name="rolPersonalizado" value={form.rolPersonalizado} onChange={handleChange} placeholder="Ej: Logistica, Almacen..."
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estatus</Label>
              <select name="estatus" value={form.estatus} onChange={handleChange}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {ESTATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <select name="origen" value={form.origen} onChange={handleChange}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">-- Seleccionar --</option>
                {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Proximo contacto</Label>
            <input name="proximoContacto" type="date" value={form.proximoContacto} onChange={handleChange}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="space-y-1.5">
            <Label>Nota de proxima accion</Label>
            <Textarea name="nextActionNote" value={form.nextActionNote} onChange={handleChange}
              placeholder="Que hacer en el proximo contacto?" rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea name="notas" value={form.notas} onChange={handleChange}
              placeholder="Notas generales del cliente..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit">{client ? 'Guardar Cambios' : 'Crear Cliente'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
