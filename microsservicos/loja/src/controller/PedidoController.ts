import type { Request, Response } from "express";
import { PedidoService } from "../service/PedidoService.js";
import {
  idSchema,
  pedidoRequest,
  statusRequest,
  pagamentoRequest,
} from "../dto/contracts.js";
export class PedidoController {
  constructor(private service = new PedidoService()) {}
  listar = async (req: Request, res: Response) => {
    res.json(await this.service.listar(idSchema.parse(req.query.clienteId)));
  };
  buscar = async (req: Request, res: Response) => {
    res.json(await this.service.buscar(idSchema.parse(req.params.id)));
  };
  criar = async (req: Request, res: Response) => {
    res
      .status(201)
      .json(await this.service.criar(pedidoRequest.parse(req.body)));
  };
  status = async (req: Request, res: Response) => {
    res.json(
      await this.service.mudarStatus(
        idSchema.parse(req.params.id),
        statusRequest.parse(req.body).status,
      ),
    );
  };
  pagamento = async (req: Request, res: Response) => {
    res
      .status(201)
      .json(
        await this.service.registrarPagamento(
          idSchema.parse(req.params.id),
          pagamentoRequest.parse(req.body).forma,
        ),
      );
  };
  confirmar = async (req: Request, res: Response) => {
    res.json(
      await this.service.confirmarPagamento(
        idSchema.parse(req.params.id),
        idSchema.parse(req.params.pagamentoId),
      ),
    );
  };
}
