// Follow-up rules engine — Distribuidora GASPAR (SICOM)
// Intervalos calibrados para venta B2B de equipos electronicos para estaciones de gas

const DIAS_POR_ESTATUS = {
  'Nuevo': 3,
  'Contactado': 5,
  'Sin respuesta': 7,
  'Interesado': 3,
  'Negociando': 2,
  'Reactivar': 7,
  'Cerrado': 90,       // Postventa: refacciones, modulos, nueva necesidad
  'Perdido': null,
  'Descartado': null,
};

const ESTATUS_SIN_SEGUIMIENTO = ['Perdido', 'Descartado'];

function calcularProximoContacto(estatus, desde = new Date()) {
  const dias = DIAS_POR_ESTATUS[estatus];
  if (dias == null) return null;
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

function diasDesde(fecha) {
  if (!fecha) return Infinity;
  const ahora = new Date();
  const diff = ahora.getTime() - new Date(fecha).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calcularTemperatura(client) {
  if (ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) return 'inactivo';

  // Cerrado con seguimiento de postventa se marca tibio (relacion activa)
  if (client.estatus === 'Cerrado') return 'tibio';

  const dias = diasDesde(client.ultimoContacto || client.createdAt);

  if (['Interesado', 'Negociando'].includes(client.estatus) && dias <= 7) return 'caliente';
  if (dias <= 14) return 'tibio';
  if (dias > 30) return 'frio';
  return 'tibio';
}

function generarSugerencias(client) {
  const sugerencias = [];
  const ahora = new Date();

  // Seguimiento vencido
  if (client.proximoContacto && new Date(client.proximoContacto) < ahora && !ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus)) {
    const diasVencido = diasDesde(client.proximoContacto);
    sugerencias.push({ tipo: 'vencido', prioridad: 'alta', mensaje: `Seguimiento vencido hace ${diasVencido} día${diasVencido !== 1 ? 's' : ''}` });
  }

  // Cliente nuevo sin contactar > 3 días
  if (client.estatus === 'Nuevo' && diasDesde(client.createdAt) > 3 && !client.ultimoContacto) {
    sugerencias.push({ tipo: 'nuevo_sin_contactar', prioridad: 'alta', mensaje: 'Cliente nuevo sin contactar — identificar proyecto o necesidad' });
  }

  // Sin contacto > 14 días (B2B: ciclos largos son normales)
  const diasSinContacto = diasDesde(client.ultimoContacto || client.createdAt);
  if (diasSinContacto > 14 && !ESTATUS_SIN_SEGUIMIENTO.includes(client.estatus) && client.estatus !== 'Cerrado') {
    sugerencias.push({ tipo: 'sin_contacto', prioridad: 'media', mensaje: `Sin contacto hace ${diasSinContacto} días` });
  }

  // Sin respuesta > 45 días → sugerir archivar (NO descartar)
  if (client.estatus === 'Sin respuesta' && diasSinContacto > 45) {
    sugerencias.push({ tipo: 'considerar_archivar', prioridad: 'baja', mensaje: 'Sin respuesta hace más de 45 días — considerar archivar y recontactar en próximo trimestre' });
  }

  // Negociando activo → sugerir cerrar
  if (client.estatus === 'Negociando' && diasSinContacto <= 7) {
    sugerencias.push({ tipo: 'cerrar', prioridad: 'alta', mensaje: 'Cotización activa en negociación — dar seguimiento para cerrar' });
  }

  // Postventa: Cerrado con seguimiento programado
  if (client.estatus === 'Cerrado') {
    const diasDesdeCierre = diasDesde(client.ultimoContacto || client.createdAt);
    if (diasDesdeCierre >= 80) {
      sugerencias.push({ tipo: 'postventa', prioridad: 'media', mensaje: 'Seguimiento de postventa — verificar satisfacción y necesidades de refacciones o módulos' });
    }
  }

  // Datos incompletos
  if (!client.email && !client.empresa) {
    sugerencias.push({ tipo: 'datos_incompletos', prioridad: 'baja', mensaje: 'Faltan email y empresa' });
  }

  return sugerencias;
}

module.exports = {
  calcularProximoContacto,
  calcularTemperatura,
  generarSugerencias,
  diasDesde,
  ESTATUS_SIN_SEGUIMIENTO,
  DIAS_POR_ESTATUS,
};
