import type {
  Comanda,
  ComandaItem,
  EstadoMesa,
  EstadoPedido,
  Mesa,
  MetricasSalon,
  Precuenta,
  TotalesComanda,
} from "@/types/comandas";

/**
 * Motor puro de salón. Los importes viven en céntimos y todas las funciones
 * devuelven nuevos objetos: no mutan la comanda original.
 */

const clamp = (valor: number, min: number, max: number) =>
  Math.min(max, Math.max(min, valor));

export function calcularTotales(
  items: ComandaItem[],
  propinaPct = 0,
  descuentoPct = 0
): TotalesComanda {
  const lineas = items.map((item) => ({
    itemId: item.id,
    nombre: item.nombre,
    cantidad: item.cantidad,
    total: Math.max(0, item.precioUnitario) * Math.max(0, item.cantidad),
    estado: item.estado,
  }));

  const subtotal = lineas.reduce((total, linea) => total + linea.total, 0);
  const descuento = Math.round(
    subtotal * (clamp(descuentoPct, 0, 100) / 100)
  );
  const base = subtotal - descuento;
  const propina = Math.round(base * (clamp(propinaPct, 0, 25) / 100));

  return {
    subtotal,
    descuento,
    propina,
    total: base + propina,
    lineas,
  };
}

/** Reparte céntimos sin perder ni inventar dinero. */
export function repartirCentimos(total: number, partes: number): number[] {
  const n = Math.max(1, Math.floor(partes));
  const importe = Math.max(0, Math.round(total));
  const base = Math.floor(importe / n);
  const resto = importe - base * n;
  return Array.from({ length: n }, (_, indice) => base + (indice < resto ? 1 : 0));
}

export function calcularPrecuenta(
  items: ComandaItem[],
  comensales = 1,
  propinaPct = 0,
  descuentoPct = 0
): Precuenta {
  const totales = calcularTotales(items, propinaPct, descuentoPct);
  const personas = clamp(Math.floor(comensales), 1, 20);
  return {
    ...totales,
    comensales: personas,
    porComensal: repartirCentimos(totales.total, personas),
  };
}

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ["cocina", "listo", "entregado"],
  cocina: ["listo", "entregado"],
  listo: ["entregado"],
  entregado: [],
};

export function puedeTransicionarPedido(
  actual: EstadoPedido,
  siguiente: EstadoPedido
): boolean {
  if (actual === siguiente) return true;
  return TRANSICIONES[actual].includes(siguiente);
}

export function siguienteEstadoPedido(estado: EstadoPedido): EstadoPedido | null {
  if (estado === "pendiente") return "cocina";
  if (estado === "cocina") return "listo";
  if (estado === "listo") return "entregado";
  return null;
}

export function estadoDerivadoComanda(items: ComandaItem[]): EstadoPedido {
  if (items.length === 0) return "pendiente";
  if (items.every((item) => item.estado === "entregado")) return "entregado";
  if (items.every((item) => item.estado === "listo" || item.estado === "entregado")) {
    return "listo";
  }
  if (items.some((item) => item.estado === "cocina")) return "cocina";
  return "pendiente";
}

export const ETIQUETAS_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  cocina: "En cocina",
  listo: "Listo",
  entregado: "Entregado",
};

export const ETIQUETAS_ESTADO_MESA: Record<EstadoMesa, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  por_limpiar: "Por limpiar",
  reservada: "Reservada",
};

export function calcularMetricasSalon(
  mesas: Mesa[],
  comandas: Comanda[]
): MetricasSalon {
  const abiertas = comandas.filter((comanda) => comanda.estado !== "cerrada");
  const ventaEnCurso = abiertas.reduce(
    (total, comanda) => total + calcularTotales(comanda.items).total,
    0
  );
  const platosEnCocina = abiertas.reduce(
    (total, comanda) =>
      total +
      comanda.items
        .filter((item) => item.estado === "cocina" || item.estado === "pendiente")
        .reduce((suma, item) => suma + item.cantidad, 0),
    0
  );

  return {
    mesasOcupadas: mesas.filter((mesa) => mesa.estado === "ocupada").length,
    comandasAbiertas: abiertas.length,
    ventaEnCurso,
    platosEnCocina,
  };
}

export function formatearEuros(centimos: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(centimos / 100);
}
