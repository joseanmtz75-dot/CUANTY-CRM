import { useState, useEffect } from 'react';
import { getClients, getSuggestions, createClient, updateClient, deleteClient } from '../api/clients';
import { ACTIVE_STATUSES, computeTemperatura } from '../utils/constants';
import ClientRow from './ClientRow';
import ClientForm from './ClientForm';
import ImportModal from './ImportModal';
import InteractionHistory from './InteractionHistory';
import ClientIntelligenceModal from './ClientIntelligenceModal';

const FILTER_ESTATUSES = ['Todos', ...ACTIVE_STATUSES, 'Cerrado', 'Perdido'];

export default function ClientTable({ initialFilter, onClearFilter }) {
  const [clients, setClients] = useState([]);
  const [filtro, setFiltro] = useState(initialFilter?.value || 'Todos');
  const [search, setSearch] = useState('');
  const [showDescartados, setShowDescartados] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [historyClient, setHistoryClient] = useState(null);
  const [intelligenceClient, setIntelligenceClient] = useState(null);
  const [sortBy, setSortBy] = useState('fecha');

  const fetchClients = () => {
    setLoading(true);

    // Special fetch for temperatura filter
    if (initialFilter?.type === 'temperatura') {
      getClients({ incluirDescartados: false })
        .then(all => {
          const filtered = all.filter(c =>
            !['Cerrado', 'Perdido', 'Descartado'].includes(c.estatus) &&
            computeTemperatura(c) === initialFilter.value
          );
          setClients(filtered);
        })
        .catch(() => setClients([]))
        .finally(() => setLoading(false));
      return;
    }

    // Special fetch for sugerencia filter
    if (initialFilter?.type === 'sugerencia') {
      getSuggestions()
        .then(data => setClients(data[initialFilter.value] || []))
        .catch(() => setClients([]))
        .finally(() => setLoading(false));
      return;
    }

    // Special fetch for disposition filter
    if (initialFilter?.type === 'disposition') {
      getClients({ incluirDescartados: false })
        .then(all => {
          const filtered = all.filter(c => c.metrics?.disposition === initialFilter.value);
          setClients(filtered);
        })
        .catch(() => setClients([]))
        .finally(() => setLoading(false));
      return;
    }

    const filters = {};
    if (filtro !== 'Todos') filters.estatus = filtro;
    if (search.trim()) filters.search = search.trim();
    if (showDescartados) filters.incluirDescartados = true;
    getClients(filters)
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, [filtro, showDescartados, initialFilter]);

  // Debounced search
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
    <div className="client-table-container">
      <div className="table-header">
        <h2>Clientes</h2>
        <div className="table-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            Importar
          </button>
          <button className="btn btn-primary" onClick={handleNew}>
            + Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="search-bar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          className="search-input"
          type="text"
          placeholder="Buscar por nombre, telefono, email o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="fecha">Fecha</option>
          <option value="prioridad">Prioridad</option>
        </select>
      </div>

      {initialFilter && (
        <div className="active-filter-bar">
          <span className="filter-chip">
            Filtro: {initialFilter.label || initialFilter.value}
            <button className="filter-chip-clear" onClick={() => { onClearFilter(); setFiltro('Todos'); }}>&times;</button>
          </span>
          <span className="filter-result-count">{clients.length} resultado{clients.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="filters">
        {FILTER_ESTATUSES.map(s => (
          <button
            key={s}
            className={`btn btn-filter ${filtro === s ? 'active' : ''}`}
            onClick={() => { setFiltro(s); if (onClearFilter) onClearFilter(); }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="toggle-row">
        <input
          type="checkbox"
          id="showDescartados"
          checked={showDescartados}
          onChange={(e) => setShowDescartados(e.target.checked)}
        />
        <label className="toggle-label" htmlFor="showDescartados">Mostrar descartados</label>
      </div>

      {loading ? (
        <p className="loading">Cargando clientes...</p>
      ) : clients.length === 0 ? (
        <p className="empty">No se encontraron clientes.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Telefono</th>
                <th>Empresa</th>
                <th>Estatus</th>
                <th>Prox. Contacto</th>
                <th>Ult. Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...clients].sort((a, b) => {
                if (sortBy === 'prioridad') return (b.metrics?.priorityScore || 0) - (a.metrics?.priorityScore || 0);
                return 0;
              }).map(client => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onHistory={setHistoryClient}
                  onIntelligence={setIntelligenceClient}
                />
              ))}
            </tbody>
          </table>
        </div>
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
