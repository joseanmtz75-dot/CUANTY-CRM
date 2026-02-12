/**
 * One-time migration script: SQLite (dev.db) → Neon PostgreSQL
 *
 * Usage:
 *   node scripts/migrate-to-neon.js
 *
 * Reads all data from local dev.db and inserts into Neon PostgreSQL.
 * Preserves IDs and resets sequences after insert.
 */

const Database = require("better-sqlite3");
const { Pool } = require("pg");
const path = require("path");

const NEON_URL = process.env.DATABASE_URL;
if (!NEON_URL || NEON_URL.includes("dev.db")) {
  console.error("ERROR: DATABASE_URL must be set to your Neon PostgreSQL connection string.");
  console.error("Current value:", NEON_URL || "(not set)");
  process.exit(1);
}

const DB_PATH = path.join(__dirname, "..", "dev.db");

async function migrate() {
  // Open SQLite
  const sqlite = new Database(DB_PATH, { readonly: true });
  console.log(`Opened SQLite: ${DB_PATH}\n`);

  // Connect to Neon
  const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Migrate Client
    const clients = sqlite.prepare("SELECT * FROM Client").all();
    console.log(`Found ${clients.length} clients in SQLite`);

    for (const c of clients) {
      await client.query(
        `INSERT INTO "Client" (id, nombre, telefono, email, empresa, estatus, origen, rol, "rolPersonalizado", notas, "proximoContacto", "ultimoContacto", "contactoManual", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          c.id, c.nombre, c.telefono, c.email, c.empresa, c.estatus, c.origen,
          c.rol || "compras", c.rolPersonalizado, c.notas,
          c.proximoContacto ? new Date(c.proximoContacto) : null,
          c.ultimoContacto ? new Date(c.ultimoContacto) : null,
          Boolean(c.contactoManual),
          new Date(c.createdAt),
        ]
      );
    }
    console.log(`  → Inserted ${clients.length} clients`);

    // 2. Migrate Interaction
    const interactions = sqlite.prepare("SELECT * FROM Interaction").all();
    console.log(`Found ${interactions.length} interactions in SQLite`);

    for (const i of interactions) {
      await client.query(
        `INSERT INTO "Interaction" (id, "clientId", tipo, contenido, resultado, outcome, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [i.id, i.clientId, i.tipo, i.contenido, i.resultado, i.outcome, new Date(i.createdAt)]
      );
    }
    console.log(`  → Inserted ${interactions.length} interactions`);

    // 3. Migrate ClientMetrics
    const metrics = sqlite.prepare("SELECT * FROM ClientMetrics").all();
    console.log(`Found ${metrics.length} client metrics in SQLite`);

    for (const m of metrics) {
      await client.query(
        `INSERT INTO "ClientMetrics" (
          id, "clientId",
          "totalInteractions", "interaccionesUltimos7", "interaccionesUltimos30",
          respuestas, silencios, avances, rechazos,
          "responseRate", "avgResponseTimeDays", "canalPreferido",
          "diasEnEstatusActual", "cambiosEstatus",
          "priorityScore", "engagementScore",
          disposition, "dispositionConfidence",
          "recommendedAction", "recommendedApproach", "recommendedChannel", "recommendedReasoning",
          "computedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        ON CONFLICT (id) DO NOTHING`,
        [
          m.id, m.clientId,
          m.totalInteractions, m.interaccionesUltimos7, m.interaccionesUltimos30,
          m.respuestas, m.silencios, m.avances, m.rechazos,
          m.responseRate, m.avgResponseTimeDays, m.canalPreferido,
          m.diasEnEstatusActual, m.cambiosEstatus,
          m.priorityScore, m.engagementScore,
          m.disposition, m.dispositionConfidence,
          m.recommendedAction, m.recommendedApproach, m.recommendedChannel, m.recommendedReasoning,
          new Date(m.computedAt),
        ]
      );
    }
    console.log(`  → Inserted ${metrics.length} client metrics`);

    // 4. Migrate StatusChange
    const statusChanges = sqlite.prepare("SELECT * FROM StatusChange").all();
    console.log(`Found ${statusChanges.length} status changes in SQLite`);

    for (const s of statusChanges) {
      await client.query(
        `INSERT INTO "StatusChange" (id, "clientId", "fromStatus", "toStatus", "createdAt")
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.clientId, s.fromStatus, s.toStatus, new Date(s.createdAt)]
      );
    }
    console.log(`  → Inserted ${statusChanges.length} status changes`);

    // 5. Migrate RecommendationLog
    const recommendations = sqlite.prepare("SELECT * FROM RecommendationLog").all();
    console.log(`Found ${recommendations.length} recommendation logs in SQLite`);

    for (const r of recommendations) {
      await client.query(
        `INSERT INTO "RecommendationLog" (id, "clientId", "recommendedAction", "recommendedApproach", "priorityScore", disposition, "wasActedUpon", "interactionId", "createdAt", "resolvedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.clientId, r.recommendedAction, r.recommendedApproach,
          r.priorityScore, r.disposition,
          r.wasActedUpon != null ? Boolean(r.wasActedUpon) : null,
          r.interactionId,
          new Date(r.createdAt),
          r.resolvedAt ? new Date(r.resolvedAt) : null,
        ]
      );
    }
    console.log(`  → Inserted ${recommendations.length} recommendation logs`);

    // 6. Reset PostgreSQL sequences so new auto-increment IDs start after max existing ID
    const tables = ["Client", "Interaction", "ClientMetrics", "StatusChange", "RecommendationLog"];
    for (const table of tables) {
      const seqName = `${table}_id_seq`;
      const res = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${table}"`);
      const maxId = res.rows[0].max_id;
      if (maxId > 0) {
        await client.query(`ALTER SEQUENCE "${seqName}" RESTART WITH ${maxId + 1}`);
        console.log(`  → Reset sequence "${seqName}" to ${maxId + 1}`);
      }
    }

    await client.query("COMMIT");
    console.log("\nMigration completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nMigration FAILED — rolled back. Error:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

migrate().catch(() => process.exit(1));
