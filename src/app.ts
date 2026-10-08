import express from "express";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ProdutoController } from "./controller/ProdutoController.js";
import { PedidoController } from "./controller/PedidoController.js";
import { AppError } from "./errors.js";
import { config } from "./config.js";
export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_req, res) =>
  res.json({
    servico: "loja",
    status: "ok",
    cadastros_mode: config.CADASTROS_MODE,
  }),
);
const produtos = new ProdutoController();
const pedidos = new PedidoController();
app.get("/produtos", produtos.listar);
app.get("/produtos/:id", produtos.buscar);
app.post("/produtos", produtos.criar);
app.put("/produtos/:id", produtos.atualizar);
app.get("/pedidos", pedidos.listar);
app.get("/pedidos/:id", pedidos.buscar);
app.post("/pedidos", pedidos.criar);
app.patch("/pedidos/:id/status", pedidos.status);
app.post("/pedidos/:id/pagamentos", pedidos.pagamento);
app.patch("/pedidos/:id/pagamentos/:pagamentoId/confirmar", pedidos.confirmar);
app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada" }));
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res
      .status(400)
      .json({
        erro: "Dados inválidos",
        detalhes: error.issues.map((i) => ({
          campo: i.path.join("."),
          mensagem: i.message,
        })),
      });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ erro: error.message });
    return;
  }
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ erro: "JSON inválido" });
    return;
  }
  if (error.type === "entity.too.large") {
    res.status(413).json({ erro: "Corpo da requisição muito grande" });
    return;
  }
  if (
    error.code === "ER_LOCK_DEADLOCK" ||
    error.code === "ER_LOCK_WAIT_TIMEOUT"
  ) {
    res.status(409).json({ erro: "Conflito de operações; tente novamente" });
    return;
  }
  if (error.code === "ER_DUP_ENTRY") {
    res.status(409).json({ erro: "Registro duplicado" });
    return;
  }
  console.error("Erro interno:", error.code ?? error.name);
  res.status(500).json({ erro: "Erro interno do serviço" });
};
app.use(errorHandler);
