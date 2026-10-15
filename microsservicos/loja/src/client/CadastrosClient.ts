import { config } from "../config.js";
import { AppError } from "../errors.js";
import { z } from "zod";
const clienteResponse = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  ativo: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
});
type CadastrosConfig = Pick<
  typeof config,
  | "CADASTROS_MODE"
  | "CADASTROS_URL"
  | "CADASTROS_CLIENTE_PATH"
  | "CADASTROS_TIMEOUT_MS"
>;
export class CadastrosClient {
  constructor(private settings: CadastrosConfig = config) {}
  async validarCliente(id: number): Promise<void> {
    if (this.settings.CADASTROS_MODE === "demo") {
      if (id !== 1)
        throw new AppError(
          404,
          "Modo demo: somente o cliente fictício 1 existe",
        );
      return;
    }
    const path = this.settings.CADASTROS_CLIENTE_PATH.replace(
      "{id}",
      String(id),
    );
    const signal = AbortSignal.timeout(this.settings.CADASTROS_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(
        this.settings.CADASTROS_URL.replace(/\/$/, "") +
          "/" +
          path.replace(/^\//, ""),
        { signal },
      );
    } catch {
      throw new AppError(
        503,
        "Serviço de Cadastros indisponível ou tempo limite excedido",
      );
    }
    console.info(
      `[HTTP síncrono] Cadastros: cliente ${id}, status ${response.status}`,
    );
    if (response.status === 404)
      throw new AppError(404, "Cliente não encontrado em Cadastros");
    if (!response.ok)
      throw new AppError(502, "Cadastros não conseguiu validar o cliente");
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (signal.aborted)
        throw new AppError(
          503,
          "Tempo limite excedido ao ler resposta de Cadastros",
        );
      throw new AppError(502, "Resposta inválida de Cadastros");
    }
    // Contrato esperado: { id: number, ativo?: boolean | 0 | 1 }.
    const cliente = clienteResponse.safeParse(data);
    if (!cliente.success || cliente.data.id !== id)
      throw new AppError(
        502,
        "Contrato de Cadastros inválido: esperado objeto com id do cliente",
      );
    if (cliente.data.ativo === false || cliente.data.ativo === 0)
      throw new AppError(409, "Cliente inativo");
  }
}
