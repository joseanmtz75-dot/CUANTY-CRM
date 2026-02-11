export const ESTATUSES = ['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Cerrado', 'Perdido', 'Descartado', 'Reactivar'];
export const ACTIVE_STATUSES = ['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Reactivar'];

export const STATUS_COLORS = {
  'Nuevo': '#3b82f6',
  'Contactado': '#f59e0b',
  'Sin respuesta': '#f97316',
  'Interesado': '#8b5cf6',
  'Negociando': '#6366f1',
  'Cerrado': '#10b981',
  'Perdido': '#ef4444',
  'Descartado': '#6b7280',
  'Reactivar': '#14b8a6',
};

export const TEMP_COLORS = {
  caliente: '#ef4444',
  tibio: '#f59e0b',
  frio: '#3b82f6',
  inactivo: '#9ca3af',
};

export const TEMP_LABELS = {
  caliente: 'Caliente',
  tibio: 'Tibio',
  frio: 'Frío',
  inactivo: 'Inactivo',
};

export const INTERACTION_TYPES = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'mensaje', label: 'Mensaje' },
  { value: 'nota', label: 'Nota' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Reunión' },
];

export const CALL_RESULTS = [
  { value: 'contestó', label: 'Contestó' },
  { value: 'no contestó', label: 'No contestó' },
  { value: 'buzón', label: 'Buzón' },
];

export const ORIGENES = ['Web', 'Referido', 'Redes Sociales', 'Llamada', 'Otro'];

export const ROLES = [
  { value: 'compras', label: 'Compras' },
  { value: 'direccion', label: 'Direccion' },
  { value: 'administracion', label: 'Administracion' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'otro', label: 'Otro' },
];

export function computeTemperatura(client) {
  const ultimo = client.ultimoContacto || client.createdAt;
  if (!ultimo) return 'frio';
  const dias = Math.floor((Date.now() - new Date(ultimo).getTime()) / (1000 * 60 * 60 * 24));
  if (['Interesado', 'Negociando'].includes(client.estatus) && dias <= 3) return 'caliente';
  if (dias <= 5) return 'tibio';
  return 'frio';
}

export const DISPOSITION_LABELS = {
  receptivo: 'Receptivo',
  dudoso: 'Dudoso',
  saturado: 'Saturado',
  frio: 'Frio',
  listo_para_decision: 'Listo para cierre',
  desconocido: 'Desconocido',
};

export const DISPOSITION_COLORS = {
  receptivo: '#10b981',
  listo_para_decision: '#8b5cf6',
  dudoso: '#f59e0b',
  desconocido: '#9ca3af',
  frio: '#3b82f6',
  saturado: '#ef4444',
};

export const OUTCOMES = [
  { value: 'respuesta', label: 'Respondio' },
  { value: 'silencio', label: 'Sin respuesta' },
  { value: 'avance', label: 'Avanzo' },
  { value: 'rechazo', label: 'Rechazo' },
];

export const OUTCOME_COLORS = {
  respuesta: '#10b981',
  avance: '#8b5cf6',
  silencio: '#f59e0b',
  rechazo: '#ef4444',
};

export const ACTION_LABELS = {
  contactar_hoy: 'Contactar hoy',
  esperar: 'Esperar',
  reactivar: 'Reactivar',
  cerrar: 'Cerrar',
  descartar: 'Descartar',
  completar_datos: 'Completar datos',
};

export const APPROACH_LABELS = {
  directo: 'Directo',
  suave: 'Suave',
  informativo: 'Informativo',
  reactivacion: 'Reactivacion',
};
