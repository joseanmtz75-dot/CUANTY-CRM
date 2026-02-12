const { Router } = require('express');

function createVendedoresRouter(prisma) {
  const router = Router();

  // GET /vendedores - list all with client counts
  router.get('/', async (req, res) => {
    try {
      const vendedores = await prisma.vendedor.findMany({ orderBy: { nombre: 'asc' } });
      for (const v of vendedores) {
        v.clientCount = await prisma.client.count({ where: { vendedor: v.nombre } });
      }
      // Also count unassigned clients
      const sinAsignar = await prisma.client.count({
        where: { OR: [{ vendedor: null }, { vendedor: '' }] },
      });
      res.json({ vendedores, sinAsignar });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /vendedores - create vendedor
  router.post('/', async (req, res) => {
    try {
      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }
      const vendedor = await prisma.vendedor.create({ data: { nombre: nombre.trim() } });
      res.json(vendedor);
    } catch (error) {
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Ya existe un vendedor con ese nombre' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  // DELETE /vendedores/:id - delete vendedor
  router.delete('/:id', async (req, res) => {
    try {
      const vendedor = await prisma.vendedor.findUnique({ where: { id: parseInt(req.params.id) } });
      if (!vendedor) return res.status(404).json({ error: 'Vendedor no encontrado' });

      const clientCount = await prisma.client.count({ where: { vendedor: vendedor.nombre } });
      if (clientCount > 0) {
        return res.status(400).json({
          error: `No se puede eliminar: tiene ${clientCount} cliente${clientCount > 1 ? 's' : ''} asignado${clientCount > 1 ? 's' : ''}`,
        });
      }

      await prisma.vendedor.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ message: 'Vendedor eliminado' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createVendedoresRouter };
