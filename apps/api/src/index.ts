import "dotenv/config";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = buildApp();
const server = app.listen(env.PORT, env.HOST, () => {
  console.info(`API listening on http://${env.HOST}:${env.PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
