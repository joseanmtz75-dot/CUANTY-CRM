// Stage 4: Actionable recommendations

const {
  DISPOSITIONS,
  ACTIONS,
  APPROACHES,
  DIAS_SIN_COMPRA_REACTIVAR,
  DIAS_SIN_COMPRA_POSTVENTA,
  DIAS_PRIMERA_COMPRA_ONBOARDING,
} = require('./constants');

function diasEntre(fecha, ahora = new Date()) {
  if (!fecha) return null;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((ahora.getTime() - d.getTime()) / 86400000);
}

function generateRecommendations(client, metrics, disposition, priority) {
  const disp = disposition.disposition;
  const clasErp = client.clasificacionErp;
  const diasSinCompraErp = diasEntre(client.ultimaCompraErp);
  const diasDesdePrimeraCompra = diasEntre(client.primeraCompraErp);

  // === Reglas ERP (evaluadas PRIMERO, early return si matchea) ===

  // Regla A: ALTO sin compra en 12+ meses → reactivar urgente
  if (clasErp === 'ALTO' && diasSinCompraErp !== null && diasSinCompraErp > DIAS_SIN_COMPRA_REACTIVAR) {
    const meses = Math.round(diasSinCompraErp / 30);
    return [{
      action: ACTIONS.REACTIVAR,
      approach: APPROACHES.REACTIVACION,
      channel: metrics.canalPreferido,
      reasoning: `Cliente ALTO sin compra en ${meses} meses. Riesgo alto de pérdida ante competencia. Reactivar urgente.`,
      priority: 95,
    }];
  }

  // Regla B: ALTO + Cerrado + +90d sin compra → postventa proactiva
  if (clasErp === 'ALTO' && client.estatus === 'Cerrado' && diasSinCompraErp !== null && diasSinCompraErp > DIAS_SIN_COMPRA_POSTVENTA) {
    return [{
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: `Cliente VIP cerrado hace ${diasSinCompraErp} días. Buen momento para postventa: refacciones, módulos, mantenimiento.`,
      priority: 80,
    }];
  }

  // Regla C: Primera compra reciente + estatus Nuevo → onboarding
  if (
    diasDesdePrimeraCompra !== null &&
    diasDesdePrimeraCompra <= DIAS_PRIMERA_COMPRA_ONBOARDING &&
    diasDesdePrimeraCompra >= 0 &&
    client.estatus === 'Nuevo'
  ) {
    return [{
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.INFORMATIVO,
      channel: metrics.canalPreferido || 'WhatsApp',
      reasoning: `Primera compra hace ${diasDesdePrimeraCompra} días. Ventana ideal para construir relación y vender complementos.`,
      priority: 75,
    }];
  }

  // === Lógica original (disposición + estatus) ===

  const recs = [];

  if (disp === DISPOSITIONS.RECEPTIVO && client.estatus === 'Negociando') {
    recs.push({
      action: ACTIONS.CERRAR,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente receptivo en negociación activa, momento ideal para cerrar',
      priority: 95,
    });
  } else if (disp === DISPOSITIONS.LISTO_PARA_DECISION) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente listo para tomar decisión, hay avances y buena respuesta',
      priority: 90,
    });
  } else if (disp === DISPOSITIONS.RECEPTIVO) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente receptivo con buena tasa de respuesta',
      priority: 80,
    });
  } else if (disp === DISPOSITIONS.DUDOSO && metrics.diasSinContacto >= 10) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.SUAVE,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente con señales mixtas — preguntar por estado de su proyecto u operación',
      priority: 60,
    });
  } else if (disp === DISPOSITIONS.DUDOSO) {
    recs.push({
      action: ACTIONS.ESPERAR,
      approach: APPROACHES.SUAVE,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente con señales mixtas y contacto reciente — esperar, puede estar en proceso interno',
      priority: 30,
    });
  } else if (disp === DISPOSITIONS.SATURADO) {
    recs.push({
      action: ACTIONS.ESPERAR,
      approach: null,
      channel: null,
      reasoning: 'Cliente saturado con muchos contactos recientes y sin respuesta, dar espacio',
      priority: 10,
    });
  } else if (disp === DISPOSITIONS.FRIO && metrics.totalInteractions > 5) {
    recs.push({
      action: ACTIONS.REACTIVAR,
      approach: APPROACHES.REACTIVACION,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente frío con historial — archivar temporalmente y recontactar en próximo ciclo de proyectos',
      priority: 20,
    });
  } else if (disp === DISPOSITIONS.FRIO) {
    recs.push({
      action: ACTIONS.REACTIVAR,
      approach: APPROACHES.SUAVE,
      channel: metrics.canalPreferido,
      reasoning: 'Cliente frío con pocas interacciones — preguntar por estado de su proyecto u operación',
      priority: 40,
    });
  } else if (disp === DISPOSITIONS.DESCONOCIDO) {
    recs.push({
      action: ACTIONS.CONTACTAR_HOY,
      approach: APPROACHES.DIRECTO,
      channel: metrics.canalPreferido || 'WhatsApp',
      reasoning: 'Cliente nuevo sin datos suficientes — contactar para entender proyecto o necesidad actual',
      priority: 65,
    });
  }

  if (!client.email && !client.empresa) {
    recs.push({
      action: ACTIONS.COMPLETAR_DATOS,
      approach: APPROACHES.INFORMATIVO,
      channel: null,
      reasoning: 'Faltan email y empresa, completar datos para mejor seguimiento',
      priority: 25,
    });
  }

  recs.sort((a, b) => b.priority - a.priority);
  return recs;
}

module.exports = { generateRecommendations };
