import { useState, useEffect, useMemo } from 'react';
import { getClients, getSuggestions, createClient, updateClient, deleteClient } from '../api/clients';
import { ACTIVE_STATUSES, computeTemperatura } from '../utils/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Upload, X, Search } from 'lucide-react';
import ClientRow from './ClientRow';
import ClientForm from './ClientForm';
import ImportModal from './ImportModal';
import InteractionHistory from './InteractionHistory';
import ClientIntelligenceModal from './ClientIntelligenceModal';

const FILTER_ESTATUSES = ['Todos', ...ACTIVE_STATUSES, 'Cerrado', 'Perdido'];

export default function ClientTable({ initialFilter, onClearFilter }) {
  const [clients, setClients] = useState([]);
  const [filtro, setFiltro] = useState(initialFilter?.type === 'search' ? 'Todos' : (initialFilter?.value || 'Todos'));
  const [search, setSearch] = useState(initialFilter?.type === 'search' ? initialFilter.value : '');
  const [showDescartados, setShowDescartados] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [historyClient, setHistoryClient] = useState(null);
  const [intelligenceClient, setIntelligenceClient] = useState(null);
  const [sortBy, setSortBy] = useState('fecha');
  const [clasificacionFilter, setClasificacionFilter] = useState('');
  const [error, setError] = useState(null);

  const sortedClients = useMemo(() => {
    if (sortBy === 'prioridad') {
      return [...clients].sort((a, b) => (b.metrics?.priorityScore || 0) - (a.metrics?.priorityScore || 0));
    }
    return clients;
  }, [clients, sortBy]);

  const fetchClients = () => {
    setLoading(true);
    setError(null);

    const handleError = () => {
      setClients([]);
      setError('Error al cargar clientes. Verifica tu conexion.');
    };

    if (initialFilter?.type === 'temperatura') {
      getClients({ incluirDescartados: false })
        .then(all => {
          const filtered = all.filter(c =>
            !['Cerrado', 'Perdido', 'Descartado'].includes(c.estatus) &&
            computeTemperatura(c) === initialFilter.value
          );
          setClients(filtered);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
      return;
    }

    if (initialFilter?.type === 'sugerencia') {
      getSuggestions()
        .then(data => setClients(data[initialFilter.value] || []))
        .catch(handleError)
        .finally(() => setLoading(false));
      return;
    }

    if (initialFilter?.type === 'disposition') {
      getClients({ incluirDescartados: false, disposition: initialFilter.value })
        .then(setClients)
        .catch(handleError)
        .finally(() => setLoading(false));
      return;
    }

    if (initialFilter?.type === 'vendedor') {
      getClients({ incluirDescartados: false, vendedor: initialFilter.value })
        .then(setClients)
        .catch(handleError)
        .finally(() => setLoading(false));
      return;
    }

    const filters = {};
    if (filtro !== 'Todos') filters.estatus = filtro;
    if (search.trim()) filters.search = search.trim();
    if (showDescartados) filters.incluirDescartados = true;
    if (clasificacionFilter) filters.clasificacion = clasificacionFilter;
    getClients(filters)
      .then(setClients)
      .catch(handleError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, [filtro, showDescartados, initialFilter, clasificacionFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSave = async (data) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
      } else {
        await createClient(data);
      }
      setShowForm(false);
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (client) => {
    if (!confirm(`Eliminar a "${client.nombre}"?`)) return;
    try {
      await deleteClient(client.id);
      fetchClients();
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleNew = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            type="text"
            placeholder="Buscar por nombre, telefono, email o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={clasificacionFilter}
          onChange={(e) => setClasificacionFilter(e.target.value)}
        >
          <option value="">Clasificacion</option>
          <option value="ALTO">ALTO</option>
          <option value="MEDIO">MEDIO</option>
          <option value="BAJO">BAJO</option>
        </select>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="fecha">Fecha</option>
          <option value="prioridad">Prioridad</option>
        </select>
      </div>

      {/* Active filter chip */}
      {initialFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            Filtro: {initialFilter.label || initialFilter.value}
            <button onClick={() => { onClearFilter(); setFiltro('Todos'); }}><X className="h-3 w-3" /></button>
          </Badge>
          <span className="text-xs text-muted-foreground">{clients.length} resultado{clients.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_ESTATUSES.map(s => (
          <Button
            key={s}
            variant={filtro === s ? 'default' : 'outline'}
            size="sm"
            className="rounded-full h-7 text-xs"
            onClick={() => { setFiltro(s); if (onClearFilter) onClearFilter(); }}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Descartados toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showDescartados"
          className="rounded"
          checked={showDescartados}
          onChange={(e) => setShowDescartados(e.target.checked)}
        />
        <label className="text-sm text-muted-foreground" htmlFor="showDescartados">Mostrar descartados</label>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3 flex items-center gap-2">
          {error}
          <Button variant="outline" size="sm" onClick={fetchClients}>Reintentar</Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : clients.length === 0 && !error ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron clientes.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%]">Nombre</TableHead>
                  <TableHead className="w-[12%]">Telefono</TableHead>
                  <TableHead className="w-[14%]">Empresa</TableHead>
                  <TableHead className="w-[16%]">Estatus</TableHead>
                  <TableHead className="w-[14%]">Prox. Contacto</TableHead>
                  <TableHead className="w-[10%]">Ult. Contacto</TableHead>
                  <TableHead className="w-[16%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map(client => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onHistory={setHistoryClient}
                    onIntelligence={setIntelligenceClient}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {showForm && (
        <ClientForm
          client={editingClient}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingClient(null); }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchClients}
        />
      )}

      {historyClient && (
        <InteractionHistory
          client={historyClient}
          onClose={() => setHistoryClient(null)}
        />
      )}

      {intelligenceClient && (
        <ClientIntelligenceModal
          client={intelligenceClient}
          onClose={() => setIntelligenceClient(null)}
        />
      )}
    </div>
  );
}
