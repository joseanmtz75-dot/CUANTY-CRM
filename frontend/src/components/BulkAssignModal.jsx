import { useState, useEffect } from 'react';
import { getClients, bulkAssignClients } from '../api/clients';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Check } from 'lucide-react';

export default function BulkAssignModal({ vendedorNombre, onClose, onSuccess }) {
  const [tab, setTab] = useState('empresa');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => {
    getClients({ incluirDescartados: true })
      .then(all => {
        const sinAsignar = all.filter(c => !c.vendedor);
        setClients(sinAsignar);
      })
      .catch(() => { setClients([]); setError('Error al cargar clientes.'); })
      .finally(() => setLoading(false));
  }, []);

  const empresas = [...new Set(clients.map(c => c.empresa).filter(Boolean))].sort();
  const clientsOfEmpresa = selectedEmpresa ? clients.filter(c => c.empresa === selectedEmpresa) : [];

  const toggleAll = () => {
    if (selected.size === clients.length) setSelected(new Set());
    else setSelected(new Set(clients.map(c => c.id)));
  };

  const toggleOne = (id) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleAssign = async () => {
    setSubmitting(true);
    try {
      let payload = { vendedor: vendedorNombre };
      if (tab === 'empresa') {
        if (!selectedEmpresa) return;
        payload = { ...payload, mode: 'empresa', empresa: selectedEmpresa };
      } else if (tab === 'manual') {
        if (selected.size === 0) return;
        payload = { ...payload, mode: 'manual', clientIds: [...selected] };
      } else {
        payload = { ...payload, mode: 'todos' };
      }
      const res = await bulkAssignClients(payload);
      setResult(res.updated);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al asignar');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (submitting) return false;
    if (tab === 'empresa') return !!selectedEmpresa;
    if (tab === 'manual') return selected.size > 0;
    return clients.length > 0;
  };

  if (result !== null) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignacion completada</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <Check className="h-12 w-12 mx-auto text-green-600 mb-3" />
            <p className="text-lg">
              Se asignaron <strong>{result}</strong> clientes a <strong>{vendedorNombre}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => { onSuccess(); onClose(); }}>Aceptar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Asignar clientes a: {vendedorNombre}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="empresa" className="flex-1">Por empresa</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Seleccion manual</TabsTrigger>
            <TabsTrigger value="todos" className="flex-1">Todos sin asignar</TabsTrigger>
          </TabsList>

          <div className="mt-4 min-h-[180px]">
            {error ? (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>
            ) : loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay clientes sin asignar</p>
            ) : (
              <>
                <TabsContent value="empresa" className="mt-0">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Empresa</Label>
                      <select value={selectedEmpresa} onChange={e => setSelectedEmpresa(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">-- Seleccionar empresa --</option>
                        {empresas.map(emp => {
                          const count = clients.filter(c => c.empresa === emp).length;
                          return <option key={emp} value={emp}>{emp} ({count} cliente{count !== 1 ? 's' : ''})</option>;
                        })}
                      </select>
                    </div>
                    {selectedEmpresa && (
                      <p className="text-sm text-muted-foreground">
                        Se asignaran <strong>{clientsOfEmpresa.length}</strong> cliente{clientsOfEmpresa.length !== 1 ? 's' : ''} de <strong>{selectedEmpresa}</strong> a <strong>{vendedorNombre}</strong>
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selected.size === clients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Telefono</TableHead>
                          <TableHead>Empresa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map(c => (
                          <TableRow key={c.id} className="cursor-pointer" onClick={() => toggleOne(c.id)}>
                            <TableCell><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} /></TableCell>
                            <TableCell className="font-medium">{c.nombre}</TableCell>
                            <TableCell>{c.telefono}</TableCell>
                            <TableCell>{c.empresa || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="todos" className="mt-0">
                  <div className="text-center py-6">
                    <p className="text-sm mb-1">
                      Se asignaran <strong>{clients.length}</strong> cliente{clients.length !== 1 ? 's' : ''} sin asignar a <strong>{vendedorNombre}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">Esta accion no se puede deshacer facilmente.</p>
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!canSubmit()}>
            {submitting ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
