import { useState, useEffect } from 'react';
import { getClients, bulkAssignClients } from '../api/clients';

const TABS = [
  { key: 'empresa', label: 'Por empresa' },
  { key: 'manual', label: 'Selección manual' },
  { key: 'todos', label: 'Todos sin asignar' },
];

export default function BulkAssignModal({ vendedorNombre, onClose, onSuccess }) {
  const [tab, setTab] = useState('empresa');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // empresa tab
  const [selectedEmpresa, setSelectedEmpresa] = useState('');

  // manual tab
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    getClients({ incluirDescartados: true })
      .then(all => {
        const sinAsignar = all.filter(c => !c.vendedor);
        setClients(sinAsignar);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const empresas = [...new Set(clients.map(c => c.empresa).filter(Boolean))].sort();

  const clientsOfEmpresa = selectedEmpresa
    ? clients.filter(c => c.empresa === selectedEmpresa)
    : [];

  const toggleAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map(c => c.id)));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Asignación completada</h3>
            <button className="btn-close" onClick={onClose}>&times;</button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '1.1rem', margin: '1.5rem 0' }}>
            Se asignaron <strong>{result}</strong> clientes a <strong>{vendedorNombre}</strong>
          </p>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={() => { onSuccess(); onClose(); }}>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3>Asignar clientes a: {vendedorNombre}</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="bulk-assign-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`bulk-assign-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="import-step" style={{ minHeight: 180, marginTop: '1rem' }}>
          {loading ? (
            <p className="loading">Cargando clientes...</p>
          ) : clients.length === 0 ? (
            <p className="empty">No hay clientes sin asignar</p>
          ) : (
            <>
              {tab === 'empresa' && (
                <div>
                  <div className="form-group">
                    <label>Empresa</label>
                    <select
                      value={selectedEmpresa}
                      onChange={e => setSelectedEmpresa(e.target.value)}
                    >
                      <option value="">-- Seleccionar empresa --</option>
                      {empresas.map(emp => {
                        const count = clients.filter(c => c.empresa === emp).length;
                        return (
                          <option key={emp} value={emp}>
                            {emp} ({count} cliente{count !== 1 ? 's' : ''})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {selectedEmpresa && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      Se asignarán <strong>{clientsOfEmpresa.length}</strong> cliente{clientsOfEmpresa.length !== 1 ? 's' : ''} de <strong>{selectedEmpresa}</strong> a <strong>{vendedorNombre}</strong>
                    </p>
                  )}
                </div>
              )}

              {tab === 'manual' && (
                <div>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                    </span>
                    <button className="btn btn-sm btn-secondary" onClick={toggleAll}>
                      {selected.size === clients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="bulk-assign-clients">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          <th>Nombre</th>
                          <th>Teléfono</th>
                          <th>Empresa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map(c => (
                          <tr key={c.id} onClick={() => toggleOne(c.id)} style={{ cursor: 'pointer' }}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected.has(c.id)}
                                onChange={() => toggleOne(c.id)}
                              />
                            </td>
                            <td>{c.nombre}</td>
                            <td>{c.telefono}</td>
                            <td>{c.empresa || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'todos' && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Se asignarán <strong>{clients.length}</strong> cliente{clients.length !== 1 ? 's' : ''} sin asignar a <strong>{vendedorNombre}</strong>
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>
                    Esta acción no se puede deshacer fácilmente.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={!canSubmit()}
          >
            {submitting ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}
