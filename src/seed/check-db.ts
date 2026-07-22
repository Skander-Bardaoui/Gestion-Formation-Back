import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'gestion_formations',
  });
  await c.connect();

  console.log('=== CABINETS ===');
  const cabinets = await c.query("SELECT id, nom, email FROM users WHERE role = 'cabinet'");
  console.log(JSON.stringify(cabinets.rows, null, 2));

  console.log('\n=== SESSIONS COLUMNS ===');
  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='sessions' AND table_schema='public' ORDER BY ordinal_position");
  console.log(cols.rows.map(r => r.column_name).join(', '));

  console.log('\n=== ALL SESSIONS (first 10) ===');
  const sessions = await c.query('SELECT * FROM sessions LIMIT 10');
  console.log(JSON.stringify(sessions.rows, null, 2));

  console.log('\n=== EVALUATIONS (first 10, key fields) ===');
  const evals = await c.query('SELECT id, "sessionId", "noteObjectifClarte", "noteContenu", "noteUtilite", "noteDureeRythme", "noteConfortSalle", "noteEquipements", "noteSupports", "noteSatisfactionGlobale", note FROM evaluations LIMIT 10');
  console.log(JSON.stringify(evals.rows, null, 2));

  console.log('\n=== SESSION IDs IN EVALUATIONS ===');
  const sessionIds = await c.query('SELECT DISTINCT "sessionId" FROM evaluations');
  console.log(JSON.stringify(sessionIds.rows.map(r => r.sessionId)));

  console.log('\n=== FORMATIONS ===');
  const f = await c.query('SELECT id, titre, "cabinetId", "clonedFromCabinetId", "clonedFromCabinetName" FROM formation ORDER BY createdat');
  console.log(JSON.stringify(f.rows, null, 2));

  console.log('\n=== COUNT SUMMARY ===');
  const counts = await c.query(`
    SELECT (SELECT COUNT(*) FROM users WHERE role='cabinet') as cabinets,
           (SELECT COUNT(*) FROM sessions) as sessions,
           (SELECT COUNT(*) FROM sessions WHERE "cabinetId" IS NOT NULL) as cabinet_sessions,
           (SELECT COUNT(*) FROM evaluations) as evaluations
  `);
  console.log(JSON.stringify(counts.rows[0]));

  await c.end();
}

main().catch(console.error);
