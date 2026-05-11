require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { runErpSync } = require('./sync-erp');

(async () => {
  console.log('=== test-sync-erp (apply=false) ===\n');
  const t0 = Date.now();
  try {
    const result = await runErpSync({ apply: false });
    const ms = Date.now() - t0;

    console.log('SUMMARY:');
    console.log(JSON.stringify(result.summary, null, 2));
    console.log();

    console.log(`would_update (${result.would_update.length}) — primeros 3:`);
    console.log(JSON.stringify(result.would_update.slice(0, 3), null, 2));
    console.log();

    console.log(`would_create (${result.would_create.length}) — primeros 3:`);
    console.log(JSON.stringify(result.would_create.slice(0, 3), null, 2));
    console.log();

    console.log(`would_review_manually (${result.would_review_manually.length}) — primeros 3:`);
    console.log(JSON.stringify(result.would_review_manually.slice(0, 3), null, 2));
    console.log();

    console.log(`Tiempo: ${ms}ms`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();
