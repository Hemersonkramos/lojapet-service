export interface Cliente {
  id_cliente: number;
  nome: string;
  email: string | null;
  ativo: boolean | number;
  revision: number;
}
