import { useState, useEffect } from 'react';
import { formatName, formatPhone } from '../utils/formatters';
import {
  ESTATUSES,
  ORIGENES,
  ROLES,
  CLASIFICACION_ERP_COLORS,
  diasDesdeFecha,
  formatMxn,
} from '../utils/constants';
import { getVendedores } from '../api/clients';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const emptyForm = {
  nombre: '',
  telefono: '',
  email: '',
  empresa: '',
  rfc: '',
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
        rfc: client.rfc || '',
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
      rfc: form.rfc ? form.rfc.trim().toUpperCase() : null,
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
            <Label>RFC</Label>
            <input name="rfc" value={form.rfc} onChange={handleChange} placeholder="Ej: ABC123456789"
              className="w-full h-9 px-3 rounded-md border bg-background text-sm uppercase focus:outline-none focus:ring-1 focus:ring-ring" />
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

          {client?.clasificacion && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <Label className="text-muted-foreground text-xs">Datos PDF Analyzer</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className="text-white"
                  style={{ backgroundColor: CLASIFICACION_ERP_COLORS[client.clasificacion] || '#6b7280' }}
                >
                  {client.clasificacion}
                </Badge>
                {client.totalDocumentosPdf != null && (
                  <span className="text-xs text-muted-foreground">{client.totalDocumentosPdf} docs</span>
                )}
                {client.totalComprasPdf != null && (
                  <span className="text-xs text-muted-foreground">{formatMxn(client.totalComprasPdf)}</span>
                )}
              </div>
              {client.productosFrecuentes && (
                <p className="text-xs text-muted-foreground">Productos: {client.productosFrecuentes}</p>
              )}
            </div>
          )}

          {client && ((client.totalComprasErp && client.totalComprasErp > 0) || client.rfc) && (
            <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
              <Label className="text-muted-foreground text-xs">Datos del ERP (en vivo)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {client.clasificacionErp && (
                  <Badge
                    className="text-white"
                    style={{ backgroundColor: CLASIFICACION_ERP_COLORS[client.clasificacionErp] || '#6b7280' }}
                  >
                    {client.clasificacionErp}
                  </Badge>
                )}
                {client.totalComprasErp != null && client.totalComprasErp > 0 && (
                  <span className="text-xs text-muted-foreground">{formatMxn(client.totalComprasErp)} lifetime</span>
                )}
                {client.ultimaCompraErp && (() => {
                  const dias = diasDesdeFecha(client.ultimaCompraErp);
                  const color = dias > 365 ? 'text-red-600' : dias > 180 ? 'text-amber-600' : 'text-muted-foreground';
                  return (
                    <span className={`text-xs ${color}`}>
                      Última compra: hace {dias} días
                    </span>
                  );
                })()}
              </div>
              {client.primeraCompraErp && (
                <p className="text-xs text-muted-foreground">
                  Primera compra: {new Date(client.primeraCompraErp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
              {client.productosFrecuentesErp && (
                <p className="text-xs text-muted-foreground">Categorías 12m: {client.productosFrecuentesErp}</p>
              )}
              {client.rfc && !client.clasificacionErp && !client.totalComprasErp && (
                <p className="text-xs text-muted-foreground">RFC registrado, sin sincronización ERP todavía.</p>
              )}
            </div>
          )}

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
