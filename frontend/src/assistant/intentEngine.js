/**
 * Intent Engine — rule-based pattern matching for CRM assistant
 */

function normalizeInput(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[?!¿¡.,;:]/g, '');     // remove punctuation
}

// Ordered from most specific to least specific — first match wins
const INTENT_DEFINITIONS = [
  {
    intent: 'ayuda',
    patterns: [
      /^ayuda$/,
      /^help$/,
      /que puedo preguntar/,
      /que sabes hacer/,
      /comandos/,
      /como funciona/,
    ],
  },
  {
    intent: 'listos_para_cierre',
    patterns: [
      /listos? para cierre/,
      /quien(es)? cerrar/,
      /por cerrar/,
      /clientes? para cerrar/,
    ],
  },
  {
    intent: 'en_riesgo',
    patterns: [
      /en riesgo/,
      /en peligro/,
      /clientes? en riesgo/,
      /quien(es)? en riesgo/,
    ],
  },
  {
    intent: 'datos_incompletos',
    patterns: [
      /datos? incompletos?/,
      /sin email/,
      /sin correo/,
      /faltan datos/,
      /informacion incompleta/,
    ],
  },
  {
    intent: 'vencidos',
    patterns: [
      /vencidos/,
      /cuantos vencidos/,
      /seguimientos? vencidos?/,
      /atrasados/,
    ],
  },
  {
    intent: 'seguimiento_hoy',
    patterns: [
      /seguimiento/,
      /a quien contactar/,
      /contactar hoy/,
      /pendientes? de hoy/,
      /que tengo para hoy/,
      /agenda de hoy/,
    ],
  },
  {
    intent: 'sugerencias',
    patterns: [
      /sugerencias/,
      /que hacer$/,
      /que me recomiendas/,
      /recomendaciones/,
    ],
  },
  {
    intent: 'estadisticas',
    patterns: [
      /cuantos clientes/,
      /total de clientes/,
      /resumen general/,
      /estadisticas/,
      /^resumen$/,
    ],
  },
  {
    intent: 'clientes_por_estatus',
    patterns: [
      /cuantos en (\w+)/,
      /clientes (\w+)s?$/,
      /clientes en (\w+)/,
    ],
    extractParams: (match) => {
      const raw = match[1];
      const map = {
        nuevo: 'Nuevo', nuevos: 'Nuevo',
        contactado: 'Contactado', contactados: 'Contactado',
        negociacion: 'Negociando', negociando: 'Negociando',
        cerrado: 'Cerrado', cerrados: 'Cerrado',
        perdido: 'Perdido', perdidos: 'Perdido',
      };
      return { estatus: map[raw] || raw };
    },
  },
  {
    intent: 'buscar_cliente',
    patterns: [
      /buscar (.+)/,
      /busca (.+)/,
      /info(?:rmacion)? de (.+)/,
      /quien es (.+)/,
      /datos de (.+)/,
      /cliente (.+)/,
    ],
    extractParams: (match) => ({ search: match[1].trim() }),
  },
];

export function resolveIntent(rawInput) {
  const text = normalizeInput(rawInput);
  if (!text) return { intent: 'unknown', params: {} };

  for (const def of INTENT_DEFINITIONS) {
    for (const pattern of def.patterns) {
      const match = text.match(pattern);
      if (match) {
        const params = def.extractParams ? def.extractParams(match) : {};
        return { intent: def.intent, params };
      }
    }
  }

  return { intent: 'unknown', params: {} };
}
