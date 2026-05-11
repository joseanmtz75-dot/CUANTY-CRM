// Partido del Día — lógica de innings, outcomes y plantillas WhatsApp.
// Funciones puras, sin estado React. Estado vive en index.jsx del módulo.

const VENDEDOR_FIRMA = 'José de SOLAC';
const MAX_POR_INNING = 5;

// ============================================================
// Distribución del lineup en innings
// ============================================================
// Inning 1: Negociando OR disposicion=listo_para_decision
// Inning 2: Interesado OR disposicion=receptivo
// Inning 3: resto (Reactivar, Contactado, Nuevo, Sin respuesta)
// Cap por inning: 5; overflow al siguiente inning.
// Si un inning queda vacío, se preserva como [] (el orquestador lo salta al avanzar).
export function distribuirEnInnings(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return [[], [], []];

  const bucket1 = [];
  const bucket2 = [];
  const bucket3 = [];

  for (const c of lista) {
    if (c.estatus === 'Negociando' || c.disposicion === 'listo_para_decision') {
      bucket1.push(c);
    } else if (c.estatus === 'Interesado' || c.disposicion === 'receptivo') {
      bucket2.push(c);
    } else {
      bucket3.push(c);
    }
  }

  // Aplicar cap por inning, overflow al siguiente
  const inning1 = bucket1.slice(0, MAX_POR_INNING);
  const overflow1 = bucket1.slice(MAX_POR_INNING);
  const inning2 = [...bucket2, ...overflow1].slice(0, MAX_POR_INNING);
  const overflow2 = [...bucket2, ...overflow1].slice(MAX_POR_INNING);
  const inning3 = [...bucket3, ...overflow2].slice(0, MAX_POR_INNING);

  return [inning1, inning2, inning3];
}

// ============================================================
// Detección de cliente con datos incompletos
// ============================================================
export function esClienteIncompleto(c) {
  const sinTelefono = !c.telefono || c.telefono.trim() === '';
  const sinEmpresa = !c.empresa || c.empresa.trim() === '';
  const sinErp = !c.clasificacionErp;
  return sinTelefono || (sinEmpresa && sinErp);
}

export function tieneTelefono(c) {
  return Boolean(c.telefono && c.telefono.trim());
}

// ============================================================
// WhatsApp helpers
// ============================================================
function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 13) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function primerNombre(nombreCompleto) {
  if (!nombreCompleto) return '';
  return nombreCompleto.trim().split(/\s+/)[0];
}

function primerProducto(c) {
  const raw = c.productosFrecuentesErp || c.productosFrecuentes || '';
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim();
  return first || null;
}

export function buildWhatsAppMessage(c) {
  if (c.nextActionNote && c.nextActionNote.trim()) {
    return c.nextActionNote.trim();
  }

  const saludo = getGreeting();
  const nombre = primerNombre(c.nombre);
  const producto = primerProducto(c);
  const empresa = c.empresa || 'su empresa';

  switch (c.estatus) {
    case 'Nuevo':
    case 'Contactado':
      return `${saludo}, ${nombre}. Le escribe ${VENDEDOR_FIRMA}. Una pregunta, ¿siguen operando con ${producto || 'equipos de gas LP'}?`;
    case 'Interesado':
      return `${saludo}, ${nombre}. ¿Pudo revisar lo que platicamos?`;
    case 'Negociando':
      return `${saludo}, ${nombre}. ¿Cómo va la cotización que le mandé?`;
    case 'Reactivar':
      return `${saludo}, ${nombre}. Retomo contacto, ¿sigue en ${empresa}?`;
    case 'Sin respuesta':
      return `${saludo}, ${nombre}. Le escribe ${VENDEDOR_FIRMA}. Quería confirmar si recibió mi mensaje anterior.`;
    default:
      return `${saludo}, ${nombre}. Le escribe ${VENDEDOR_FIRMA}.`;
  }
}

export function buildWhatsAppUrl(c) {
  if (!tieneTelefono(c)) return null;
  let digits = String(c.telefono).replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (digits.length === 10) digits = '52' + digits;
  if (!digits) return null;
  const text = encodeURIComponent(buildWhatsAppMessage(c));
  return `https://wa.me/${digits}?text=${text}`;
}

// ============================================================
// Outcome → payload de Interaction
// ============================================================
// El backend (POST /clients/:id/interactions) acepta:
//   tipo, contenido, resultado?, outcome?, nuevoEstatus?, proximoContacto?

export const HIT_SUBTYPE = {
  SIMPLE: 'simple',
  EXTRA: 'extra',
};

export function mapOutcomeToPayload(outcome, c, opts = {}) {
  const canal = c.canal || 'WhatsApp';
  const tipo = canal === 'llamada' ? 'llamada' : 'mensaje';

  switch (outcome) {
    case 'hit_simple':
      return {
        tipo,
        contenido: opts.nota || 'Cliente respondió al contacto',
        outcome: 'respuesta',
      };
    case 'hit_extra':
      return {
        tipo,
        contenido: opts.nota || 'Avance positivo en la conversación',
        outcome: 'avance',
      };
    case 'out':
      return {
        tipo,
        contenido: opts.nota || 'Sin respuesta al contacto',
        outcome: 'silencio',
        resultado: tipo === 'llamada' ? 'no contestó' : null,
      };
    case 'homerun': {
      const nuevoEstatus = homerunNuevoEstatus(c.estatus);
      return {
        tipo,
        contenido: opts.nota || 'Cierre o avance importante',
        outcome: 'avance',
        nuevoEstatus,
      };
    }
    default:
      return null;
  }
}

export function homerunNuevoEstatus(estatusActual) {
  if (estatusActual === 'Negociando') return 'Cerrado';
  if (estatusActual === 'Interesado') return 'Negociando';
  if (estatusActual === 'Contactado') return 'Interesado';
  return null;
}

// ============================================================
// Scoreboard helpers
// ============================================================
export function contarOutcomes(resultados) {
  const counts = { hit: 0, out: 0, homerun: 0, balk: 0 };
  for (const r of resultados) {
    if (r.outcome === 'hit_simple' || r.outcome === 'hit_extra') counts.hit++;
    else if (r.outcome === 'out') counts.out++;
    else if (r.outcome === 'homerun') counts.homerun++;
    else if (r.outcome === 'balk') counts.balk++;
  }
  return counts;
}

export function resultadosDeInning(resultados, indiceInning) {
  return resultados.filter(r => r.inning === indiceInning);
}

export function clientesPendientesParaManana(resultados, lineup) {
  // Outs vuelven al lineup mañana
  const outClientIds = new Set(
    resultados.filter(r => r.outcome === 'out').map(r => r.clienteId)
  );
  return lineup.filter(c => outClientIds.has(c.clientId));
}

export function topJugada(resultados, lineup) {
  // El home run más reciente; si no hay, el primer hit extra
  const hrs = resultados.filter(r => r.outcome === 'homerun');
  if (hrs.length > 0) {
    const top = hrs[0];
    const cliente = lineup.find(c => c.clientId === top.clienteId);
    return cliente ? { cliente, outcome: 'homerun', detalle: top.detalle } : null;
  }
  const extras = resultados.filter(r => r.outcome === 'hit_extra');
  if (extras.length > 0) {
    const top = extras[0];
    const cliente = lineup.find(c => c.clientId === top.clienteId);
    return cliente ? { cliente, outcome: 'hit_extra', detalle: top.detalle } : null;
  }
  return null;
}

// ============================================================
// Avance de turno
// ============================================================
// Devuelve { fase, inningActual, turnoEnInning } después de registrar un outcome.
// Reglas:
// - Si quedan más turnos en el inning actual, avanza turno.
// - Si terminó el inning Y hay innings con clientes después, va a 'entre_innings'.
// - Si terminó el inning Y los siguientes están vacíos, fase='fin'.
export function calcularSiguienteFase({ innings, inningActual, turnoEnInning }) {
  const inningActualClientes = innings[inningActual] || [];
  const haySiguienteEnInning = turnoEnInning + 1 < inningActualClientes.length;

  if (haySiguienteEnInning) {
    return { fase: 'turno', inningActual, turnoEnInning: turnoEnInning + 1 };
  }

  // Terminamos este inning. Buscar el siguiente con clientes.
  let next = inningActual + 1;
  while (next < innings.length && (!innings[next] || innings[next].length === 0)) {
    next++;
  }

  if (next >= innings.length) {
    return { fase: 'fin', inningActual, turnoEnInning };
  }

  return { fase: 'entre_innings', inningActual, turnoEnInning, siguienteInning: next };
}

export function arrancarInning(state, indiceInning) {
  return { ...state, fase: 'turno', inningActual: indiceInning, turnoEnInning: 0 };
}

// ============================================================
// Labels para UI
// ============================================================
export const OUTCOME_LABELS = {
  hit_simple: 'Hit',
  hit_extra: 'Hit extra',
  out: 'Out',
  homerun: 'Home Run',
  balk: 'Balk',
};

export const INNING_NOMBRES = ['Cierres pendientes', 'Receptivos', 'Reactivaciones'];

export function inningNombre(indice) {
  return INNING_NOMBRES[indice] || `Inning ${indice + 1}`;
}

// ============================================================
// Récord semanal en localStorage
// ============================================================
function getWeekKey(date = new Date()) {
  const onejan = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - onejan) / 86400000);
  const week = Math.ceil((dayOfYear + onejan.getDay() + 1) / 7);
  return `partido-week-${date.getFullYear()}-W${week}`;
}

const EMPTY_RECORD = { hits: 0, outs: 0, homeruns: 0, balks: 0 };

export function loadRecordSemana() {
  try {
    const raw = localStorage.getItem(getWeekKey());
    if (!raw) return { ...EMPTY_RECORD };
    const parsed = JSON.parse(raw);
    return { ...EMPTY_RECORD, ...parsed };
  } catch {
    return { ...EMPTY_RECORD };
  }
}

export function appendToRecordSemana(resultados) {
  const current = loadRecordSemana();
  const counts = contarOutcomes(resultados);
  const updated = {
    hits: current.hits + counts.hit,
    outs: current.outs + counts.out,
    homeruns: current.homeruns + counts.homerun,
    balks: current.balks + counts.balk,
  };
  try {
    localStorage.setItem(getWeekKey(), JSON.stringify(updated));
  } catch { /* ignore quota */ }
  return updated;
}
