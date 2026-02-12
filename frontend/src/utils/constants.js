export const ESTATUSES = ['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Cerrado', 'Perdido', 'Descartado', 'Reactivar'];
export const ACTIVE_STATUSES = ['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Reactivar'];

export const STATUS_COLORS = {
  'Nuevo': '#1890ff',
  'Contactado': '#faad14',
  'Sin respuesta': '#fa8c16',
  'Interesado': '#722ed1',
  'Negociando': '#2f54eb',
  'Cerrado': '#52c41a',
  'Perdido': '#ff4d4f',
  'Descartado': '#8c8c8c',
  'Reactivar': '#13c2c2',
};

export const TEMP_COLORS = {
  caliente: '#ff4d4f',
  tibio: '#faad14',
  frio: '#1890ff',
  inactivo: '#bfbfbf',
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
  receptivo: '#52c41a',
  listo_para_decision: '#722ed1',
  dudoso: '#faad14',
  desconocido: '#bfbfbf',
  frio: '#1890ff',
  saturado: '#ff4d4f',
};

export const OUTCOMES = [
  { value: 'respuesta', label: 'Respondio' },
  { value: 'silencio', label: 'Sin respuesta' },
  { value: 'avance', label: 'Avanzo' },
  { value: 'rechazo', label: 'Rechazo' },
];

export const OUTCOME_COLORS = {
  respuesta: '#52c41a',
  avance: '#722ed1',
  silencio: '#faad14',
  rechazo: '#ff4d4f',
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
