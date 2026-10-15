import { ClienteRepository, type IClienteRepository } from "../repository/ClienteRepository.js";
import { clienteEvento } from "../dto/ClienteEvento.js";
import { AppError } from "../errors.js";
export class ClienteService {
  constructor(private repository: IClienteRepository = new ClienteRepository()) {}
  async receber(payload: unknown) { await this.repository.aplicar(clienteEvento.parse(payload)); }
  async validarCliente(id: number): Promise<void> {
    const cliente = await this.repository.buscar(id);
    if (!cliente) throw new AppError(409, "Cliente ainda não sincronizado. Aguarde o evento de Cadastros e tente novamente.");
    if (!cliente.ativo) throw new AppError(409, "Cliente inativo");
  }
}
