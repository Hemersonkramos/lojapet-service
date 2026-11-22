import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./repository/database.js";
import { segredoJwt } from "./security/auth.js";
import { INSTANCIA } from "./instancia.js";
async function main() {
  segredoJwt();
  await pool.query("SELECT 1");
  const server = app.listen(config.PORT, config.HOST, () =>
    console.log(`Loja [${INSTANCIA}]: http://${config.HOST}:${config.PORT}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () =>
      server.close(() => {
        void pool.end().then(() => process.exit(0));
      }),
    );
}
main().catch((error) => {
  console.error(
    "Falha ao iniciar. Confira o banco, JWT_SECRET e o .env:",
    error.code ?? error.message,
  );
  process.exit(1);
});
