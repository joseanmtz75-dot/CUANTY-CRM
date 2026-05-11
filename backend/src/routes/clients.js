const { Router } = require('express');
const { formatName, formatPhone } = require('../helpers');
const { calcularProximoContacto, ESTATUS_SIN_SEGUIMIENTO } = require('../followup-rules');

function createClientsRouter(prisma) {
  const router = Router();

  // POST /clients
  router.post('/', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.nombre) data.nombre = formatName(data.nombre);
      if (data.telefono) {
        const normalized = formatPhone(data.telefono);
        if (!normalized) {
          return res.status(400).json({ error: 'Teléfono inválido. Debe ser un número mexicano de 10 dígitos.' });
        }
        data.telefono = normalized;
      }

      if (!data.proximoContacto) {
        const proximo = calcularProximoContacto(data.estatus || 'Nuevo');
        if (proximo) data.proximoContacto = proximo;
      }
      data.ultimoContacto = new Date();

      const client = await prisma.client.create({ data });
      res.json(client);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('telefono')) {
        res.status(400).json({ error: 'Este teléfono ya está registrado con otro cliente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  // POST /clients/bulk
  router.post('/bulk', async (req, res) => {
    try {
      const { clients } = req.body;
      if (!Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de clientes' });
      }

      const imported = [];
      const skipped = [];
      const errors = [];

      for (const c of clients) {
        try {
          const nombre = formatName(c.nombre);
          const telefono = formatPhone(c.telefono);

          if (!nombre || !telefono) {
            errors.push({ ...c, reason: 'Nombre y teléfono son requeridos' });
            continue;
          }

          const existing = await prisma.client.findUnique({ where: { telefono } });
          if (existing) {
            skipped.push({ ...c, reason: `Teléfono ${telefono} ya existe (${existing.nombre})` });
            continue;
          }

          const estatus = c.estatus || 'Nuevo';
          const proximoContacto = calcularProximoContacto(estatus);

          const created = await prisma.client.create({
            data: {
              nombre, telefono,
              email: c.email || '',
              empresa: c.empresa || '',
              estatus,
              origen: c.origen || 'Importación',
              rol: c.rol || 'compras',
              rolPersonalizado: c.rolPersonalizado || null,
              vendedor: c.vendedor || null,
              proximoContacto,
              ultimoContacto: new Date(),
            }
          });
          imported.push(created);
        } catch (err) {
          errors.push({ ...c, reason: err.message });
        }
      }

      res.json({ imported, skipped, errors });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /clients
  router.get('/', async (req, res) => {
    try {
      const {
        estatus,
        search,
        incluirDescartados,
        vendedor,
        disposition,
        clasificacion,
        clasificacionErp,
        rfc,
        diasSinCompraErpMin,
        diasSinCompraErpMax,
      } = req.query;
      const where = {};

      if (estatus) {
        where.estatus = estatus;
      } else if (incluirDescartados !== 'true') {
        where.estatus = { notIn: ['Descartado'] };
      }

      if (clasificacion) {
        where.clasificacion = clasificacion;
      }

      if (clasificacionErp) {
        where.clasificacionErp = clasificacionErp;
      }

      if (rfc) {
        where.rfc = { equals: rfc.trim(), mode: 'insensitive' };
      }

      const diasMin = diasSinCompraErpMin !== undefined ? parseInt(diasSinCompraErpMin, 10) : null;
      const diasMax = diasSinCompraErpMax !== undefined ? parseInt(diasSinCompraErpMax, 10) : null;
      if (Number.isFinite(diasMin) || Number.isFinite(diasMax)) {
        const now = Date.now();
        const ultimaCompraErp = {};
        if (Number.isFinite(diasMin)) {
          ultimaCompraErp.lte = new Date(now - diasMin * 86400000);
        }
        if (Number.isFinite(diasMax)) {
          ultimaCompraErp.gte = new Date(now - diasMax * 86400000);
        }
        where.ultimaCompraErp = ultimaCompraErp;
      }

      if (search) {
        where.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { telefono: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { empresa: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
          { productosFrecuentes: { contains: search, mode: 'insensitive' } },
          { productosFrecuentesErp: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Filter by vendedor
      if (vendedor === '__sin_asignar__') {
        where.OR = where.OR || undefined;
        where.AND = [
          ...(where.AND || []),
          { OR: [{ vendedor: null }, { vendedor: '' }] },
        ];
      } else if (vendedor) {
        where.vendedor = vendedor;
      }

      // Filter by disposition (via metrics relation)
      const metricsWhere = {};
      if (disposition) {
        metricsWhere.disposition = disposition;
        where.metrics = { is: metricsWhere };
      }

      const clients = await prisma.client.findMany({
        where,
        include: {
          metrics: {
            select: { disposition: true, priorityScore: true, recommendedAction: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /clients/bulk-assign
  router.put('/bulk-assign', async (req, res) => {
    try {
      const { vendedor, mode, clientIds, empresa } = req.body;
      if (!vendedor) return res.status(400).json({ error: 'Vendedor requerido' });

      switch (mode) {
        case 'empresa': {
          if (!empresa) return res.status(400).json({ error: 'Empresa requerida' });
          const count = await prisma.$executeRaw`
            UPDATE "Client" SET "vendedor" = ${vendedor}
            WHERE "empresa" = ${empresa} AND ("vendedor" IS NULL OR "vendedor" = '')
          `;
          return res.json({ updated: Number(count) });
        }
        case 'manual': {
          if (!Array.isArray(clientIds) || !clientIds.length)
            return res.status(400).json({ error: 'IDs requeridos' });
          const result = await prisma.client.updateMany({
            where: { id: { in: clientIds.map(Number) } },
            data: { vendedor },
          });
          return res.json({ updated: result.count });
        }
        case 'todos': {
          const count = await prisma.$executeRaw`
            UPDATE "Client" SET "vendedor" = ${vendedor}
            WHERE "vendedor" IS NULL OR "vendedor" = ''
          `;
          return res.json({ updated: Number(count) });
        }
        default:
          return res.status(400).json({ error: 'Modo inválido' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /clients/:id
  router.put('/:id', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.nombre) data.nombre = formatName(data.nombre);
      if (data.telefono) {
        const normalized = formatPhone(data.telefono);
        if (!normalized) {
          return res.status(400).json({ error: 'Teléfono inválido. Debe ser un número mexicano de 10 dígitos.' });
        }
        data.telefono = normalized;
      }

      if (data.estatus) {
        const current = await prisma.client.findUnique({ where: { id: parseInt(req.params.id) } });
        if (current && data.estatus !== current.estatus) {
          // Create StatusChange record
          await prisma.statusChange.create({
            data: {
              clientId: current.id,
              fromStatus: current.estatus,
              toStatus: data.estatus,
            },
          });

          if (!current.contactoManual) {
            const proximo = calcularProximoContacto(data.estatus);
            data.proximoContacto = proximo;
            data.contactoManual = false;
          }
        }
      }

      const client = await prisma.client.update({
        where: { id: parseInt(req.params.id) },
        data,
      });
      res.json(client);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('telefono')) {
        res.status(400).json({ error: 'Este teléfono ya está registrado con otro cliente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  // DELETE /clients/:id
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ message: 'Cliente eliminado' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createClientsRouter };
