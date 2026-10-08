import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./repository/database.js";
async function main() {
  await pool.query("SELECT 1");
  if (config.CADASTROS_MODE === "demo")
    console.warn(
      "DEMONSTRAÇÃO: cliente fictício 1; não há chamada real a Cadastros.",
    );
  const server = app.listen(config.PORT, "127.0.0.1", () =>
    console.log(`Loja: http://localhost:${config.PORT}`),
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
    "Falha ao iniciar. Confira o MySQL e o .env:",
    error.code ?? error.message,
  );
  process.exit(1);
});
