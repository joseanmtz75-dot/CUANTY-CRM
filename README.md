# CRM Cuanty

CRM B2B a medida para Distribuidora GASPAR / SOLAC (equipos SICOM Gas-PAR para estaciones de gas LP en México). Stack: Node 20 + Express 5 + Prisma 7 + Neon PostgreSQL · React 19 + Vite 7 + Tailwind 4. Deploy en Vercel.

> Para el contexto completo del proyecto (arquitectura, modelo de datos, motor de inteligencia, reglas de negocio, gaps conocidos) ver **[CLAUDE.md](CLAUDE.md)**.

## Desarrollo local

```bash
npm install
npm run dev   # arranca backend en :3001 y frontend en :5173
```

Configurar `backend/.env` (plantilla en `backend/.env.example`). Variables requeridas:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Postgres del CRM (Neon en prod). |
| `DEEPSEEK_API_KEY` | API key para el chat asistente. |
| `ERP_DATABASE_URL` | Postgres del ERP externo en Supabase, **solo lectura**. Usar el transaction pooler (puerto 6543). |
| `CRON_SECRET` | Bearer token que valida el handler `/api/cron/sync-erp`. |
| `PORT` | Opcional, default 3000. |

## Sync ERP → CRM (cron diario)

Un GitHub Action corre todos los días a las **3:00 am hora MX (9:00 am UTC)** y le pega a `POST /api/cron/sync-erp?apply=true` del CRM en Vercel. El handler:

1. Conecta a `ERP_DATABASE_URL` con `pg.Pool` (max 2).
2. Agrega facturas por cliente del ERP (histórico + ventana 12 meses).
3. Matchea cada fila ERP contra `Client` del CRM por: **teléfono → RFC → email → nombre comercial**.
4. Aplica updates en transacción Prisma, crea clientes nuevos cuando `facturas_12m >= 3` y el teléfono normaliza a +52 XX XXXX XXXX, deja el resto para revisión manual.
5. Recomputa `ClientMetrics` de los Client afectados (motor de inteligencia: disposición + prioridad + recomendaciones).

Código relevante:
- Job: [backend/src/jobs/sync-erp.js](backend/src/jobs/sync-erp.js)
- Handler Vercel: [api/cron/sync-erp.js](api/cron/sync-erp.js)
- Workflow GitHub Actions: [.github/workflows/sync-erp.yml](.github/workflows/sync-erp.yml)
- Test local: `cd backend && node src/jobs/test-sync-erp.js` (corre con `apply=false`, no escribe nada).

### Disparar manualmente

GitHub → **Actions** → **Sync ERP → CRM** → **Run workflow** → selecciona branch `master` → **Run workflow**.

El step "Parse summary" deja un resumen visible en el Summary del run (tabla con `applied / updated / created / recomputed / recompute_errors`).

### Ver logs históricos

GitHub → **Actions** → filtro por workflow **Sync ERP → CRM**. Cada run guarda la respuesta JSON cruda del CRM en la sección "Raw response" del primer step.

### Secrets requeridos en GitHub

GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor esperado |
|---|---|
| `CRM_URL` | `https://cuanty-crm.vercel.app` (sin barra final). |
| `CRON_SECRET` | El **mismo valor** que esté seteado como env var `CRON_SECRET` en Vercel del CRM y en `backend/.env` local. Si rotas el secret, hay que actualizarlo en los tres lugares. |

## Operación

### Checklist de go-live

1. **Vercel del CRM** → Settings → Environment Variables → scope **Production**:
   - `ERP_DATABASE_URL` = connection string del ERP en Supabase (transaction pooler, puerto 6543, `sslmode=require`).
   - `CRON_SECRET` = valor random (`openssl rand -hex 32`). Guárdalo, lo vas a reusar.
   - Después de agregarlas, **re-deployar** (Deployments → último deployment → ⋯ → Redeploy) para que la función serverless las recoja. Las env vars no se aplican retroactivamente.
2. **GitHub** → Settings → Secrets and variables → Actions:
   - `CRM_URL` = `https://cuanty-crm.vercel.app`.
   - `CRON_SECRET` = mismo valor que pusiste en Vercel.
3. **Disparar workflow manual** (`workflow_dispatch`) una vez: GitHub → Actions → Sync ERP → CRM → Run workflow. Esperar a que termine.
4. **Validar la respuesta**: el Summary del run debe mostrar `applied: true` y `updated > 0` (o `created > 0` si entran clientes nuevos). Si `recompute_errors > 0`, el step falla y hay que investigar antes de habilitar el cron.
5. **Solo si la corrida manual fue exitosa**, dejar correr el cron automático del siguiente día. No hay que hacer nada extra — el cron ya está activo por el `schedule:` del workflow, simplemente verificar al día siguiente.

### Verificación post go-live (día siguiente)

- **GitHub Actions**: confirmar que el run automático de las ~9am UTC quedó en verde. Si no apareció, revisar que el repo tenga actividad en los últimos 60 días (GitHub pausa workflows en repos inactivos).
- **Datos del CRM**: los Client ya enriquecidos siguen con su `clasificacionErp`, `totalComprasErp`, `ultimaCompraErp`. Cualquier fila ERP nueva con teléfono válido entre el último apply y hoy debe aparecer también (vía `would_create` o como update si fue matcheada).
- **Mi Día**: si algún cliente cruzó un umbral (ej. ALTO con +365 días sin compra), debe aparecer la recomendación nueva "reactivar urgente, p95" en la vista. Si un VIP cerrado cumple 90+ días sin compra, debe aparecer la postventa proactiva.

### Rollback / pausa del cron

- **Pausar temporalmente**: GitHub → Actions → Sync ERP → CRM → ⋯ → **Disable workflow**.
- **Rollback de un sync particular**: el job es idempotente para *updates* (sobreescribe `totalComprasErp/ultimaCompraErp/clasificacionErp`), pero los `would_create` insertan filas nuevas. Para revertir un día específico, identifica los Client con `origen='ERP-Sync'` y `createdAt >= fecha_del_run` y bórralos / archívalos.
