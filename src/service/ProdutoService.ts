import {
  ProdutoRepository,
  type IProdutoRepository,
} from "../repository/ProdutoRepository.js";
import { produtoResponse, type ProdutoRequest } from "../dto/contracts.js";
import { AppError } from "../errors.js";
export class ProdutoService {
  constructor(
    private repository: IProdutoRepository = new ProdutoRepository(),
  ) {}
  async listar() {
    return (await this.repository.listar()).map(produtoResponse);
  }
  async buscar(id: number) {
    const p = await this.repository.buscar(id);
    if (!p) throw new AppError(404, "Produto não encontrado");
    return produtoResponse(p);
  }
  async criar(d: ProdutoRequest) {
    return this.buscar(await this.repository.criar(d));
  }
  async atualizar(id: number, d: ProdutoRequest) {
    await this.buscar(id);
    await this.repository.atualizar(id, d);
    return this.buscar(id);
  }
}
