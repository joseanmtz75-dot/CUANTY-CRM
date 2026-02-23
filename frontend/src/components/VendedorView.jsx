import { useState, useEffect } from 'react';
import { getVendedores, createVendedor, deleteVendedor } from '../api/clients';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, X, UserPlus, Trash2 } from 'lucide-react';
import BulkAssignModal from './BulkAssignModal';

export default function VendedorView({ onNavigate }) {
  const [data, setData] = useState({ vendedores: [], sinAsignar: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getVendedores()
      .then(setData)
      .catch(() => { setData({ vendedores: [], sinAsignar: 0 }); setError('Error al cargar vendedores.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await createVendedor(nombre.trim());
      setNombre('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear vendedor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vendedor) => {
    if (!confirm(`Eliminar vendedor "${vendedor.nombre}"?`)) return;
    try {
      await deleteVendedor(vendedor.id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar vendedor');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 flex items-center gap-2">
          {error}
          <Button variant="outline" size="sm" onClick={fetchData}>Reintentar</Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancelar</> : <><Plus className="h-4 w-4 mr-2" />Nuevo Vendedor</>}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            className="flex-1 h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            type="text"
            placeholder="Nombre del vendedor"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Agregar'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4 border-t-gray-400"
          onClick={() => onNavigate('clients', { type: 'vendedor', value: '__sin_asignar__', label: 'Sin asignar' })}
        >
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-3xl font-bold">{data.sinAsignar}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Sin asignar</div>
          </CardContent>
        </Card>

        {data.vendedores.map(v => (
          <Card
            className="cursor-pointer hover:-translate-y-0.5 transition-all border-t-4 border-t-[#001529] relative group"
            key={v.id}
            onClick={() => onNavigate('clients', { type: 'vendedor', value: v.nombre, label: v.nombre })}
          >
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Asignar clientes"
                onClick={(e) => { e.stopPropagation(); setAssignTarget(v.nombre); }}
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Eliminar vendedor"
                onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-3xl font-bold">{v.clientCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{v.nombre}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignTarget && (
        <BulkAssignModal
          vendedorNombre={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
