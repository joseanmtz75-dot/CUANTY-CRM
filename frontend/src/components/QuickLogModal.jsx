import { useState } from 'react';
import { logInteraction } from '../api/clients';
import { INTERACTION_TYPES, CALL_RESULTS, ESTATUSES, OUTCOMES, OUTCOME_COLORS } from '../utils/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function QuickLogModal({ client, defaultTipo, onClose, onSaved }) {
  const [tipo, setTipo] = useState(defaultTipo || 'llamada');
  const [contenido, setContenido] = useState('');
  const [resultado, setResultado] = useState('');
  const [nuevoEstatus, setNuevoEstatus] = useState('');
  const [proximoContacto, setProximoContacto] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contenido.trim()) {
      setError('Escribe que paso');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await logInteraction(client.id, {
        tipo,
        contenido: contenido.trim(),
        resultado: tipo === 'llamada' ? resultado || null : null,
        outcome: outcome || null,
        nuevoEstatus: nuevoEstatus || null,
        proximoContacto: proximoContacto || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar — {client.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-1.5">
              {INTERACTION_TYPES.map(t => (
                <Button
                  key={t.value}
                  type="button"
                  variant={tipo === t.value ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full h-7 text-xs"
                  onClick={() => setTipo(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {tipo === 'llamada' && (
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <div className="flex flex-wrap gap-1.5">
                {CALL_RESULTS.map(r => (
                  <Button
                    key={r.value}
                    type="button"
                    variant={resultado === r.value ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full h-7 text-xs"
                    onClick={() => setResultado(resultado === r.value ? '' : r.value)}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Que paso?</Label>
            <Textarea
              value={contenido}
              onChange={(e) => { setContenido(e.target.value); setError(''); }}
              placeholder="Describe brevemente la interaccion..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Resultado del contacto</Label>
            <div className="flex flex-wrap gap-1.5">
              {OUTCOMES.map(o => (
                <Button
                  key={o.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-7 text-xs"
                  style={outcome === o.value ? { backgroundColor: OUTCOME_COLORS[o.value], borderColor: OUTCOME_COLORS[o.value], color: 'white' } : {}}
                  onClick={() => setOutcome(outcome === o.value ? '' : o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Esto mejora las recomendaciones</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cambiar estatus (opcional)</Label>
              <select value={nuevoEstatus} onChange={(e) => setNuevoEstatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Sin cambio</option>
                {ESTATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Proximo contacto (opcional)</Label>
              <input type="date" value={proximoContacto} onChange={(e) => setProximoContacto(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
