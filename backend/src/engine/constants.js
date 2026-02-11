// Engine constants: enums, weights, thresholds

const DISPOSITIONS = {
  RECEPTIVO: 'receptivo',
  DUDOSO: 'dudoso',
  SATURADO: 'saturado',
  FRIO: 'frio',
  LISTO_PARA_DECISION: 'listo_para_decision',
  DESCONOCIDO: 'desconocido',
};

const ACTIONS = {
  CONTACTAR_HOY: 'contactar_hoy',
  ESPERAR: 'esperar',
  REACTIVAR: 'reactivar',
  CERRAR: 'cerrar',
  DESCARTAR: 'descartar',
  COMPLETAR_DATOS: 'completar_datos',
};

const APPROACHES = {
  DIRECTO: 'directo',
  SUAVE: 'suave',
  INFORMATIVO: 'informativo',
  REACTIVACION: 'reactivacion',
};

const OUTCOMES = {
  RESPUESTA: 'respuesta',
  SILENCIO: 'silencio',
  AVANCE: 'avance',
  RECHAZO: 'rechazo',
};

// Priority formula weights (must sum to 1.0)
// B2B equipos: la etapa (Negociando, Interesado) domina la prioridad
const PRIORITY_WEIGHTS = {
  urgencia: 0.15,
  receptividad: 0.20,
  momentum: 0.15,
  valorEtapa: 0.35,
  frescura: 0.15,
};

// Disposition score mapping for priority calculation
const DISPOSITION_SCORES = {
  [DISPOSITIONS.RECEPTIVO]: 100,
  [DISPOSITIONS.LISTO_PARA_DECISION]: 90,
  [DISPOSITIONS.DUDOSO]: 50,
  [DISPOSITIONS.DESCONOCIDO]: 40,
  [DISPOSITIONS.FRIO]: 20,
  [DISPOSITIONS.SATURADO]: 10,
};

// Stage value mapping for priority
// B2B: Negociando y Reactivar (cliente existente) valen mas; Nuevo sin proyecto vale menos
const STAGE_VALUES = {
  'Negociando': 100,
  'Interesado': 85,
  'Reactivar': 70,
  'Contactado': 50,
  'Nuevo': 40,
  'Sin respuesta': 35,
};

// Disposition thresholds — B2B equipos (ciclos largos, inactividad normal)
const THRESHOLDS = {
  receptivo: {
    minResponseRate: 0.6,
    maxDiasSinContacto: 10,
  },
  listoParaDecision: {
    minResponseRate: 0.5,
  },
  dudoso: {
    minResponseRate: 0.3,
    maxResponseRate: 0.6,
  },
  saturado: {
    minInteracciones7d: 5,
    silenciosRecientes: 2,
  },
  frio: {
    minDiasSinContacto: 30,
    maxResponseRate: 0.15,
  },
  desconocido: {
    maxInteractions: 2,
  },
};

const ESTATUS_ACTIVOS = ['Nuevo', 'Contactado', 'Sin respuesta', 'Interesado', 'Negociando', 'Reactivar'];

const DAILY_PLAN_CONFIG = {
  defaultLimit: 20,
  minLimit: 5,
  maxLimit: 50,
  weights: { priority: 0.70, actionability: 0.30 },
  slotAllocation: {
    mustContact: 0.40,
    highValue: 0.30,
    maintenance: 0.30,
  },
  actionabilityPoints: {
    overdue: 30,
    veryOverdue: 50,
    veryOverdueThreshold: 3,
    actionableRec: 20,
    goodDisposition: 20,
    completeData: 10,
  },
};

module.exports = {
  DISPOSITIONS,
  ACTIONS,
  APPROACHES,
  OUTCOMES,
  PRIORITY_WEIGHTS,
  DISPOSITION_SCORES,
  STAGE_VALUES,
  THRESHOLDS,
  ESTATUS_ACTIVOS,
  DAILY_PLAN_CONFIG,
};
