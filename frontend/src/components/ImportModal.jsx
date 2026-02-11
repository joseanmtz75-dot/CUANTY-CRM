import { useState, useRef } from 'react';
import { parseFile } from '../utils/fileParser';
import { bulkImportClients } from '../api/clients';

const ACCEPTED = '.xlsx,.xls,.csv,.vcf';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImportModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  // Step 2 state
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(new Set());

  // Step 3 state
  const [results, setResults] = useState(null);

  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const handleFile = async (file) => {
    setError('');

    if (file.size > MAX_SIZE) {
      setError('El archivo excede el límite de 5MB');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'vcf'].includes(ext)) {
      setError('Formato no soportado. Usa archivos .xlsx, .csv o .vcf');
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const result = await parseFile(file);
      setClients(result.clients);
      setSelected(new Set(result.clients.map((_, i) => i)));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('dropzone-active');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current?.classList.add('dropzone-active');
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove('dropzone-active');
  };

  const toggleSelect = (index) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map((_, i) => i)));
    }
  };

  const removeClient = (index) => {
    setClients(prev => prev.filter((_, i) => i !== index));
    setSelected(prev => {
      const next = new Set();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = clients.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const res = await bulkImportClients(toImport);
      setResults(res);
      setStep(3);
    } catch (err) {
      setError('Error al importar: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-large">
        <div className="modal-header">
          <h3>
            {step === 1 && 'Importar Clientes'}
            {step === 2 && 'Vista Previa'}
            {step === 3 && 'Resultados de Importación'}
          </h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="import-error">{error}</div>}

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="import-step">
            <div
              ref={dropRef}
              className="dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <p>Procesando archivo...</p>
              ) : (
                <>
                  <div className="dropzone-icon">&#128206;</div>
                  <p className="dropzone-text">
                    Arrastra tu archivo aquí o <span className="dropzone-link">selecciona uno</span>
                  </p>
                  <p className="dropzone-hint">Excel (.xlsx, .xls), CSV (.csv) o Contactos (.vcf) — Máx 5MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              style={{ display: 'none' }}
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 2 && (
          <div className="import-step">
            <div className="import-toolbar">
              <div className="import-info">
                <strong>{clients.length}</strong> contactos encontrados
                {' · '}
                <strong>{selected.size}</strong> seleccionados
                <span className="import-filename">({fileName})</span>
              </div>
              <div className="import-actions">
                <button className="btn btn-sm btn-secondary" onClick={toggleAll}>
                  {selected.size === clients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>
            </div>

            <div className="import-preview">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Empresa</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={i} className={!selected.has(i) ? 'row-disabled' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleSelect(i)}
                        />
                      </td>
                      <td>{c.nombre}</td>
                      <td>{c.telefono}</td>
                      <td>{c.email}</td>
                      <td>{c.empresa}</td>
                      <td>
                        <button className="btn-remove" onClick={() => removeClient(i)} title="Eliminar">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => { setStep(1); setClients([]); setError(''); }}>
                Volver
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={selected.size === 0 || loading}
              >
                {loading ? 'Importando...' : `Importar ${selected.size} contacto${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 3 && results && (
          <div className="import-step">
            <div className="result-summary">
              <div className="result-card result-success">
                <span className="result-number">{results.imported.length}</span>
                <span className="result-label">Importados</span>
              </div>
              <div className="result-card result-warning">
                <span className="result-number">{results.skipped.length}</span>
                <span className="result-label">Omitidos</span>
              </div>
              <div className="result-card result-error">
                <span className="result-number">{results.errors.length}</span>
                <span className="result-label">Errores</span>
              </div>
            </div>

            {results.skipped.length > 0 && (
              <div className="result-section">
                <h4>Omitidos (duplicados)</h4>
                <ul className="result-list">
                  {results.skipped.map((s, i) => (
                    <li key={i}>
                      <strong>{s.nombre || 'Sin nombre'}</strong> — <span className="result-reason">{s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length > 0 && (
              <div className="result-section">
                <h4>Errores</h4>
                <ul className="result-list">
                  {results.errors.map((e, i) => (
                    <li key={i}>
                      <strong>{e.nombre || 'Sin nombre'}</strong> — <span className="result-reason">{e.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleFinish}>
                Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
