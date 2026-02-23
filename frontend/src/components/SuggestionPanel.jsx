import { useState, useEffect } from 'react';
import { getSuggestions } from '../api/clients';
import { DISPOSITION_LABELS, DISPOSITION_COLORS } from '../utils/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';

const SECTIONS = [
  { key: 'altaPrioridad', title: 'Alta prioridad', icon: '^', color: '#faad14', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'altaPrioridad', label: 'Alta prioridad' } } },
  { key: 'listosParaCierre', title: 'Listos para cierre', icon: '$', color: '#722ed1', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'listosParaCierre', label: 'Listos para cierre' } } },
  { key: 'enRiesgo', title: 'En riesgo', icon: '!', color: '#ff4d4f', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'enRiesgo', label: 'En riesgo' } } },
  { key: 'vencidos', title: 'Seguimientos vencidos', icon: '!', color: '#cf1322', nav: { view: 'seguimiento', filter: { type: 'seguimiento', value: 'vencidos' } } },
  { key: 'nuevosSinContactar', title: 'Nuevos sin contactar', icon: '+', color: '#1890ff', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'nuevosSinContactar', label: 'Nuevos sin contactar' } } },
  { key: 'sinContacto7dias', title: 'Sin contacto > 7 dias', icon: '~', color: '#faad14', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'sinContacto7dias', label: 'Sin contacto > 7 dias' } } },
  { key: 'considerarDescartar', title: 'Considerar descartar', icon: '-', color: '#8c8c8c', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'considerarDescartar', label: 'Considerar descartar' } } },
  { key: 'datosIncompletos', title: 'Datos incompletos', icon: '?', color: '#722ed1', nav: { view: 'clients', filter: { type: 'sugerencia', value: 'datosIncompletos', label: 'Datos incompletos' } } },
];

export default function SuggestionPanel({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSuggestions()
      .then(setData)
      .catch(() => { setData(null); setError('Error al cargar sugerencias.'); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-32 rounded-xl" />;
  if (error) return <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>;
  if (!data) return null;

  const hasAnything = SECTIONS.some(s => data[s.key]?.length > 0);
  if (!hasAnything) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Sugerencias</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SECTIONS.map(section => {
          const items = data[section.key] || [];
          if (items.length === 0) return null;
          return (
            <Card
              key={section.key}
              className={`transition-all ${onNavigate ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''}`}
              onClick={() => onNavigate && onNavigate(section.nav.view, section.nav.filter)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold" style={{ color: section.color }}>{section.icon}</span>
                  <span className="text-sm font-medium flex-1">{section.title}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  {onNavigate && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <ul className="space-y-1">
                  {items.slice(0, 5).map(c => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      {c.metrics?.priorityScore != null && (
                        <Badge variant="secondary" className="text-[10px] px-1">{c.metrics.priorityScore}</Badge>
                      )}
                      <span className="font-medium">{c.nombre}</span>
                      {c.metrics?.disposition && DISPOSITION_LABELS[c.metrics.disposition] && (
                        <Badge
                          className="text-white text-[9px] px-1"
                          style={{ backgroundColor: DISPOSITION_COLORS[c.metrics.disposition] }}
                        >
                          {DISPOSITION_LABELS[c.metrics.disposition].substring(0, 3)}
                        </Badge>
                      )}
                      {c.empresa && <span className="text-xs text-muted-foreground truncate">{c.empresa}</span>}
                    </li>
                  ))}
                  {items.length > 5 && (
                    <li className="text-xs text-muted-foreground italic">y {items.length - 5} mas...</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
