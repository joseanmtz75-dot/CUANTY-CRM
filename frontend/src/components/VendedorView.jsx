import { useState, useEffect } from 'react';
import { getVendedores, createVendedor, deleteVendedor } from '../api/clients';
import BulkAssignModal from './BulkAssignModal';

export default function VendedorView({ onNavigate }) {
  const [data, setData] = useState({ vendedores: [], sinAsignar: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  const fetchData = () => {
    setLoading(true);
    getVendedores()
      .then(setData)
      .catch(() => setData({ vendedores: [], sinAsignar: 0 }))
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

  if (loading) return <p className="loading">Cargando vendedores...</p>;

  return (
    <div className="dashboard">
      <div className="table-header">
        <h2>Vendedores</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Vendedor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          <input
            className="search-input"
            type="text"
            placeholder="Nombre del vendedor"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
      )}

      <div className="stats-grid">
        <div
          className="stat-card stat-card-clickable"
          style={{ borderTopColor: '#bfbfbf' }}
          onClick={() => onNavigate('clients', { type: 'vendedor', value: '__sin_asignar__', label: 'Sin asignar' })}
        >
          <span className="stat-number">{data.sinAsignar}</span>
          <span className="stat-label">Sin asignar</span>
        </div>

        {data.vendedores.map(v => (
          <div
            className="stat-card stat-card-clickable"
            key={v.id}
            style={{ borderTopColor: 'var(--color-brand)', position: 'relative' }}
            onClick={() => onNavigate('clients', { type: 'vendedor', value: v.nombre, label: v.nombre })}
          >
            <button
              className="vendedor-assign-btn"
              title="Asignar clientes"
              onClick={(e) => { e.stopPropagation(); setAssignTarget(v.nombre); }}
            >
              +
            </button>
            <button
              className="vendedor-delete-btn"
              title="Eliminar vendedor"
              onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
            >
              &times;
            </button>
            <span className="stat-number">{v.clientCount}</span>
            <span className="stat-label">{v.nombre}</span>
          </div>
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
