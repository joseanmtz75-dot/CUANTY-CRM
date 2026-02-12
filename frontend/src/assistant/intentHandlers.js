import { getClients, getTodayFollowUps, getSuggestions } from '../api/clients';

const STATUSES = ['Nuevo', 'Contactado', 'Negociando', 'Cerrado', 'Perdido'];

const handlers = {
  async ayuda() {
    return {
      text: "Puedo ayudarte con lo siguiente:",
      items: [
        { label: "buscar [nombre]", detail: "Buscar info de un cliente" },
        { label: "seguimiento", detail: "Ver seguimientos de hoy" },
        { label: "vencidos", detail: "Ver seguimientos vencidos" },
        { label: "sugerencias", detail: "Ver todas las sugerencias" },
        { label: "listos para cierre", detail: "Clientes listos para cerrar" },
        { label: "en riesgo", detail: "Clientes en riesgo" },
        { label: "datos incompletos", detail: "Clientes con datos faltantes" },
        { label: "cuantos en [estatus]", detail: "Contar por estatus" },
        { label: "cuantos clientes", detail: "Estadisticas generales" },
      ],
      hint: "Escribe cualquiera de estos comandos o haz click en las opciones.",
      options: ["Seguimiento", "Vencidos", "Sugerencias", "Estadisticas"],
    };
  },

  async buscar_cliente({ search }) {
    try {
      const clients = await getClients({ search });
      if (!clients.length) {
        return {
          text: `No encontre clientes con "${search}".`,
          hint: "Intenta con otro nombre o revisa la lista de clientes.",
          options: ["Seguimiento", "Estadisticas"],
        };
      }
      if (clients.length === 1) {
        const c = clients[0];
        return {
          text: c.nombre,
          items: [
            { label: "Telefono", detail: c.telefono },
            c.email ? { label: "Email", detail: c.email } : null,
            c.empresa ? { label: "Empresa", detail: c.empresa } : null,
            { label: "Estatus", detail: c.estatus },
            c.origen ? { label: "Origen", detail: c.origen } : null,
          ].filter(Boolean),
          options: ["Seguimiento", "Estadisticas"],
        };
      }
      const items = clients.slice(0, 5).map(
        c => ({ label: c.nombre, detail: `${c.estatus}${c.empresa ? ` (${c.empresa})` : ''}` })
      );
      return {
        text: `Encontre ${clients.length} cliente${clients.length > 1 ? 's' : ''}:`,
        items,
        hint: clients.length > 5 ? "Usa la busqueda en Clientes para ver todos." : undefined,
        options: ["Seguimiento", "Estadisticas"],
      };
    } catch {
      return { text: "Error al buscar clientes. Intenta de nuevo." };
    }
  },

  async seguimiento_hoy() {
    try {
      const data = await getTodayFollowUps();
      const all = data.clients || [];
      if (!all.length) {
        return {
          text: "No tienes seguimientos pendientes para hoy. Buen trabajo!",
          options: ["Vencidos", "Sugerencias"],
        };
      }
      const overdue = all.filter(c => c.diasVencido > 0).length;
      let title = `Tienes ${all.length} seguimientos para hoy.`;
      if (overdue > 0) title += ` (${overdue} vencidos)`;
      const items = all.slice(0, 5).map(
        c => ({ label: c.nombre, detail: `${c.estatus}${c.empresa ? ` (${c.empresa})` : ''}` })
      );
      return {
        text: title,
        items,
        hint: all.length > 5
          ? `...y ${all.length - 5} mas. Ve a Seguimiento para ver el detalle.`
          : "Ve a la seccion Seguimiento para ver el detalle.",
        options: ["Vencidos", "Sugerencias"],
      };
    } catch {
      return { text: "Error al consultar seguimientos." };
    }
  },

  async vencidos() {
    try {
      const data = await getTodayFollowUps();
      const overdue = (data.clients || []).filter(c => c.diasVencido > 0);
      if (!overdue.length) {
        return {
          text: "No tienes seguimientos vencidos. Todo al dia!",
          options: ["Seguimiento", "Sugerencias"],
        };
      }
      const items = overdue.slice(0, 5).map(
        c => ({ label: c.nombre, detail: `${c.estatus}${c.empresa ? ` (${c.empresa})` : ''}` })
      );
      return {
        text: `Tienes ${overdue.length} seguimiento${overdue.length > 1 ? 's' : ''} vencido${overdue.length > 1 ? 's' : ''}.`,
        items,
        hint: overdue.length > 5
          ? `...y ${overdue.length - 5} mas. Ve a Seguimiento para atenderlos.`
          : "Ve a la seccion Seguimiento para atenderlos.",
        options: ["Seguimiento", "Sugerencias"],
      };
    } catch {
      return { text: "Error al consultar seguimientos vencidos." };
    }
  },

  async sugerencias() {
    try {
      const data = await getSuggestions();
      const items = [];
      if (data.readyToClose?.length) {
        items.push({ label: "Listos para cierre", detail: `${data.readyToClose.length} clientes` });
      }
      if (data.atRisk?.length) {
        items.push({ label: "En riesgo", detail: `${data.atRisk.length} clientes` });
      }
      if (data.incompleteData?.length) {
        items.push({ label: "Datos incompletos", detail: `${data.incompleteData.length} clientes` });
      }
      if (data.newNoContact?.length) {
        items.push({ label: "Nuevos sin contactar", detail: `${data.newNoContact.length} clientes` });
      }
      if (!items.length) {
        return { text: "No hay sugerencias por el momento.", options: ["Seguimiento", "Estadisticas"] };
      }
      return {
        text: "Resumen de sugerencias:",
        items,
        hint: "Pregunta por cada categoria para ver el detalle.",
        options: ["Listos para cierre", "En riesgo", "Datos incompletos"],
      };
    } catch {
      return { text: "Error al consultar sugerencias." };
    }
  },

  async listos_para_cierre() {
    try {
      const data = await getSuggestions();
      const list = data.readyToClose || [];
      if (!list.length) {
        return {
          text: "No hay clientes listos para cierre en este momento.",
          options: ["Sugerencias", "Estadisticas"],
        };
      }
      const items = list.slice(0, 5).map(
        c => ({ label: c.nombre, detail: c.empresa || c.estatus })
      );
      return {
        text: `${list.length} cliente${list.length > 1 ? 's' : ''} listo${list.length > 1 ? 's' : ''} para cierre:`,
        items,
        hint: list.length > 5 ? `...y ${list.length - 5} mas.` : undefined,
        options: ["Sugerencias", "Estadisticas"],
      };
    } catch {
      return { text: "Error al consultar clientes listos para cierre." };
    }
  },

  async en_riesgo() {
    try {
      const data = await getSuggestions();
      const list = data.atRisk || [];
      if (!list.length) {
        return {
          text: "No hay clientes en riesgo. Todo bien!",
          options: ["Sugerencias", "Estadisticas"],
        };
      }
      const items = list.slice(0, 5).map(
        c => ({ label: c.nombre, detail: c.reason || c.estatus })
      );
      return {
        text: `${list.length} cliente${list.length > 1 ? 's' : ''} en riesgo:`,
        items,
        hint: list.length > 5
          ? `...y ${list.length - 5} mas. Ve a Clientes para revisar su situacion.`
          : "Ve a Clientes para revisar su situacion.",
        options: ["Sugerencias", "Estadisticas"],
      };
    } catch {
      return { text: "Error al consultar clientes en riesgo." };
    }
  },

  async datos_incompletos() {
    try {
      const data = await getSuggestions();
      const list = data.incompleteData || [];
      if (!list.length) {
        return {
          text: "Todos los clientes tienen sus datos completos.",
          options: ["Sugerencias", "Estadisticas"],
        };
      }
      const items = list.slice(0, 5).map(c => {
        const missing = [];
        if (!c.email) missing.push('email');
        if (!c.empresa) missing.push('empresa');
        if (!c.origen) missing.push('origen');
        return { label: c.nombre, detail: `Falta: ${missing.join(', ') || 'datos'}` };
      });
      return {
        text: `${list.length} cliente${list.length > 1 ? 's' : ''} con datos incompletos:`,
        items,
        hint: list.length > 5 ? `...y ${list.length - 5} mas.` : undefined,
        options: ["Sugerencias", "Estadisticas"],
      };
    } catch {
      return { text: "Error al consultar datos incompletos." };
    }
  },

  async clientes_por_estatus({ estatus }) {
    try {
      if (!STATUSES.includes(estatus)) {
        return {
          text: `Estatus "${estatus}" no reconocido.`,
          hint: `Los estatus validos son: ${STATUSES.join(', ')}.`,
          options: ["Seguimiento", "Sugerencias"],
        };
      }
      const clients = await getClients({ estatus });
      if (!clients.length) {
        return {
          text: `No hay clientes con estatus "${estatus}".`,
          options: ["Seguimiento", "Sugerencias"],
        };
      }
      const items = clients.slice(0, 5).map(
        c => ({ label: c.nombre, detail: c.empresa || estatus })
      );
      return {
        text: `${clients.length} cliente${clients.length > 1 ? 's' : ''} en "${estatus}":`,
        items,
        hint: clients.length > 5 ? `...y ${clients.length - 5} mas.` : undefined,
        options: ["Seguimiento", "Sugerencias"],
      };
    } catch {
      return { text: "Error al consultar clientes por estatus." };
    }
  },

  async estadisticas() {
    try {
      const clients = await getClients({ incluirDescartados: true });
      const total = clients.length;
      const byStatus = {};
      for (const s of STATUSES) byStatus[s] = 0;
      for (const c of clients) {
        byStatus[c.estatus] = (byStatus[c.estatus] || 0) + 1;
      }
      const items = STATUSES.map(s => ({ label: s, detail: `${byStatus[s]} clientes` }));
      return {
        text: `Total de clientes: ${total}`,
        items,
        options: ["Seguimiento", "Sugerencias"],
      };
    } catch {
      return { text: "Error al consultar estadisticas." };
    }
  },

  async unknown() {
    return {
      text: "No entendi tu pregunta.",
      hint: "Prueba con alguna de estas opciones:",
      options: ["Seguimiento", "Vencidos", "Sugerencias", "Estadisticas"],
    };
  },
};

export async function handleIntent(intent, params) {
  const handler = handlers[intent] || handlers.unknown;
  return handler(params);
}
