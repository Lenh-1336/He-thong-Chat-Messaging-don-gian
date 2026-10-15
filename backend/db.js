import 'dotenv/config';
import { Pool } from 'pg';

const sslMode = (process.env.PGSSLMODE || 'disable').toLowerCase();
const ssl = sslMode === 'disable'
  ? false
  : { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' };

export const db = new Pool(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl, max: Number(process.env.PGPOOL_MAX) || 10 }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'chat_messaging_alenh',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      ssl,
      max: Number(process.env.PGPOOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

db.on('connect', () => {
  console.log(`PostgreSQL connected: ${process.env.PGDATABASE || 'DATABASE_URL'}`);
});

db.on('error', error => {
  console.error('PostgreSQL pool error:', error.message);
});

export async function testDatabase() {
  const { rows } = await db.query(`
    SELECT current_database() AS database_name,
           current_user AS username,
           NOW() AS server_time,
           1 + 1 AS query_result
  `);
  return rows[0];
}
