import { app } from './app.js';
import { env } from './config/env.js';
import { verifyDatabaseConnection } from './config/database.js';

async function startServer() {
  await verifyDatabaseConnection();

  app.listen(env.PORT, () => {
    console.log(`API server listening on http://localhost:${env.PORT}/api`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
