import { db, testDatabase } from './db.js';

try {
  const result = await testDatabase();
  console.log('PostgreSQL connection: OK');
  console.log(`Database: ${result.database_name}`);
  console.log(`User: ${result.username}`);
  console.log(`Server time: ${result.server_time}`);
  console.log(`SQL check: 1 + 1 = ${result.query_result}`);
} catch (error) {
  console.error('PostgreSQL connection: FAILED');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
