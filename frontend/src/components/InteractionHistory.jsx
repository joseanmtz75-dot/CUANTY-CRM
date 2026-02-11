import { useState, useEffect } from 'react';
import { getInteractions } from '../api/clients';

const TYPE_ICONS = {
  llamada: 'T',
  mensaje: 'M',
  nota: 'N',
  email: '@',
  reunion: 'R',
};

export default function InteractionHistory({ client, onClose }) {
  const [data, setData] = useState({ interactions: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchPage = (page) => {
    setLoading(true);
    getInteractions(client.id, page)
      .then(setData)
      .catch(() => setData({ interactions: [], total: 0, page: 1, totalPages: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPage(1); }, [client.id]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal history-modal">
        <div className="modal-header">
          <h3>Historial — {client.nombre}</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <p className="loading">Cargando historial...</p>
        ) : data.interactions.length === 0 ? (
          <p className="history-empty">No hay interacciones registradas.</p>
        ) : (
          <>
            <div className="history-list">
              {data.interactions.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">{TYPE_ICONS[item.tipo] || '?'}</div>
                  <div className="history-content">
                    <div className="history-meta">
                      <span className="history-type">{item.tipo}</span>
                      {item.resultado && <span className="history-result">{item.resultado}</span>}
                      <span className="history-date">{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="history-text">{item.contenido}</div>
                  </div>
                </div>
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="history-pagination">
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={data.page <= 1}
                  onClick={() => fetchPage(data.page - 1)}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.82rem', color: '#6b7280', alignSelf: 'center' }}>
                  {data.page} / {data.totalPages}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={data.page >= data.totalPages}
                  onClick={() => fetchPage(data.page + 1)}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
