/** Dominio de la carta digital y de sus analíticas de consumo. */

export type FiltroDietario =
  | "vegano"
  | "vegetariano"
  | "sin-gluten"
  | "sin-lactosa"
  | "picante";

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  acento: string;
}

export interface Producto {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  /** Precio en céntimos. */
  precio: number;
  filtros: FiltroDietario[];
  alergenos: string[];
  disponible: boolean;
  destacado: boolean;
  tiempoPrepMin: number;
  acento: string;
}

export interface PedidoItem {
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  notas?: string;
}

export interface Pedido {
  id: string;
  sesionId: string;
  items: PedidoItem[];
  subtotal: number;
  creadoEn: string;
  estado: "pendiente" | "compartido";
}

export type EventoAnalitica =
  | "vista_carta"
  | "vista_producto"
  | "filtro"
  | "add_carrito"
  | "pedido_enviado";

export interface AnaliticaMesa {
  id: string;
  /** Puede no existir si la carta se abre sin mesa física (modo QR público). */
  mesaId?: string;
  /** UUID opaco generado en el dispositivo; nunca un ID secuencial. */
  sesionId: string;
  evento: EventoAnalitica;
  productoId?: string;
  categoriaId?: string;
  valor?: number;
  creadoEn: string;
}

export interface ResumenAnalitica {
  sesionId: string;
  eventos: number;
  productosVistos: number;
  anadidos: number;
  filtrosUsados: string[];
  actualizadoEn: string;
}
