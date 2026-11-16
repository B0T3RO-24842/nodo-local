/** Dominio del sistema operativo de salón. */

import type { Categoria, Producto } from "@/types/menu";

export type EstadoPedido = "pendiente" | "cocina" | "listo" | "entregado";

export type EstadoComanda = "abierta" | "por_cobrar" | "cerrada";

export type EstadoMesa = "libre" | "ocupada" | "por_limpiar" | "reservada";

export type RolOperativo = "mozo" | "supervisor" | "admin";

export interface Mesa {
  id: string;
  codigo: string;
  nombre: string;
  zona: string;
  capacidad: number;
  estado: EstadoMesa;
  mozoAsignadoId?: string;
  comandaActivaId?: string;
  actualizadaEn: string;
}

export interface ComandaItem {
  id: string;
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  notas?: string;
  estado: EstadoPedido;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Comanda {
  id: string;
  mesaId: string;
  mozoId: string;
  items: ComandaItem[];
  estado: EstadoComanda;
  creadaEn: string;
  actualizadaEn: string;
  cerradaEn?: string;
  totalCobrado?: number;
}

export interface Mozo {
  id: string;
  nombre: string;
  iniciales: string;
  rol: RolOperativo;
  activo: boolean;
}

export interface MozoSesion {
  id: string;
  mozoId: string;
  nombre: string;
  rol: RolOperativo;
  creadaEn: string;
  expiraEn: string;
}

export interface PersonalPublico {
  id: string;
  nombre: string;
  iniciales: string;
  rol: RolOperativo;
}

/** Importes en céntimos. */
export interface TotalesComanda {
  subtotal: number;
  descuento: number;
  propina: number;
  total: number;
  lineas: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    total: number;
    estado: EstadoPedido;
  }>;
}

export interface Precuenta extends TotalesComanda {
  comensales: number;
  porComensal: number[];
}

export interface MetricasSalon {
  mesasOcupadas: number;
  comandasAbiertas: number;
  ventaEnCurso: number;
  platosEnCocina: number;
}

export interface ComandaSnapshot {
  sesion: MozoSesion;
  mesas: Mesa[];
  comandas: Comanda[];
  carta: {
    categorias: Categoria[];
    productos: Producto[];
  };
  metricas: MetricasSalon;
}
