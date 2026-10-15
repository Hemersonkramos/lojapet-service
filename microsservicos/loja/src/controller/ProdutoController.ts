import type { Request, Response } from "express";
import { ProdutoService } from "../service/ProdutoService.js";
import { idSchema, produtoRequest } from "../dto/contracts.js";
export class ProdutoController {
  constructor(private service = new ProdutoService()) {}
  listar = async (_req: Request, res: Response) => {
    res.json(await this.service.listar());
  };
  buscar = async (req: Request, res: Response) => {
    res.json(await this.service.buscar(idSchema.parse(req.params.id)));
  };
  criar = async (req: Request, res: Response) => {
    res
      .status(201)
      .json(await this.service.criar(produtoRequest.parse(req.body)));
  };
  atualizar = async (req: Request, res: Response) => {
    res.json(
      await this.service.atualizar(
        idSchema.parse(req.params.id),
        produtoRequest.parse(req.body),
      ),
    );
  };
}
