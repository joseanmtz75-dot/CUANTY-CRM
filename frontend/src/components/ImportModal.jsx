import { useState, useRef } from 'react';
import { parseFile } from '../utils/fileParser';
import { bulkImportClients } from '../api/clients';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Check, AlertTriangle, XCircle } from 'lucide-react';

const ACCEPTED = '.xlsx,.xls,.csv,.vcf';
const MAX_SIZE = 5 * 1024 * 1024;

export default function ImportModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file) => {
    setError('');
    if (file.size > MAX_SIZE) { setError('El archivo excede el limite de 5MB'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'vcf'].includes(ext)) { setError('Formato no soportado. Usa archivos .xlsx, .csv o .vcf'); return; }
    setLoading(true);
    setFileName(file.name);
    try {
      const result = await parseFile(file);
      setClients(result.clients);
      setSelected(new Set(result.clients.map((_, i) => i)));
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); };
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => { setDragActive(false); };

  const toggleSelect = (index) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  };
  const toggleAll = () => {
    if (selected.size === clients.length) setSelected(new Set());
    else setSelected(new Set(clients.map((_, i) => i)));
  };
  const removeClient = (index) => {
    setClients(prev => prev.filter((_, i) => i !== index));
    setSelected(prev => { const next = new Set(); for (const i of prev) { if (i < index) next.add(i); else if (i > index) next.add(i - 1); } return next; });
  };

  const handleImport = async () => {
    const toImport = clients.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;
    setLoading(true); setError('');
    try { const res = await bulkImportClients(toImport); setResults(res); setStep(3); }
    catch (err) { setError('Error al importar: ' + (err.response?.data?.error || err.message)); }
    finally { setLoading(false); }
  };

  const handleFinish = () => { onSuccess(); onClose(); };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[900px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Importar Clientes'}
            {step === 2 && 'Vista Previa'}
            {step === 3 && 'Resultados de Importacion'}
          </DialogTitle>
        </DialogHeader>

        {error && <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

        {/* STEP 1 */}
        {step === 1 && (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {loading ? (
              <p className="text-muted-foreground">Procesando archivo...</p>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm">Arrastra tu archivo aqui o <span className="text-primary font-medium cursor-pointer">selecciona uno</span></p>
                <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx, .xls), CSV (.csv) o Contactos (.vcf) — Max 5MB</p>
              </>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />

        {/* STEP 2 */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <strong>{clients.length}</strong> contactos encontrados · <strong>{selected.size}</strong> seleccionados
                <span className="text-muted-foreground ml-1">({fileName})</span>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selected.size === clients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c, i) => (
                    <TableRow key={i} className={!selected.has(i) ? 'opacity-40' : ''}>
                      <TableCell><input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} /></TableCell>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell>{c.telefono}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.empresa}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeClient(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => { setStep(1); setClients([]); setError(''); }}>Volver</Button>
              <Button onClick={handleImport} disabled={selected.size === 0 || loading}>
                {loading ? 'Importando...' : `Importar ${selected.size} contacto${selected.size !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-t-4 border-t-green-500">
                <CardContent className="pt-3 pb-2 px-4 text-center">
                  <Check className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold text-green-600">{results.imported.length}</div>
                  <div className="text-xs text-muted-foreground">Importados</div>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-amber-500">
                <CardContent className="pt-3 pb-2 px-4 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                  <div className="text-2xl font-bold text-amber-600">{results.skipped.length}</div>
                  <div className="text-xs text-muted-foreground">Omitidos</div>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-red-500">
                <CardContent className="pt-3 pb-2 px-4 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Errores</div>
                </CardContent>
              </Card>
            </div>

            {results.skipped.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Omitidos (duplicados)</h4>
                <ul className="space-y-1 text-sm">
                  {results.skipped.map((s, i) => (
                    <li key={i}><strong>{s.nombre || 'Sin nombre'}</strong> — <span className="text-muted-foreground">{s.reason}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Errores</h4>
                <ul className="space-y-1 text-sm">
                  {results.errors.map((e, i) => (
                    <li key={i}><strong>{e.nombre || 'Sin nombre'}</strong> — <span className="text-muted-foreground">{e.reason}</span></li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleFinish}>Finalizar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
