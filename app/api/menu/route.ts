import { NextRequest, NextResponse } from "next/server";

import { PRODUCTOS_POR_ID } from "@/lib/carta-data";
import { leerCuerpo, respuesta } from "@/lib/http";
import {
  consumirCuota,
  guardarPedidoCarta,
  obtenerCarta,
  registrarAnalitica,
} from "@/lib/server/store";
import {
  origenPermitido,
  validarEventoCarta,
  validarPedidoCarta,
} from "@/lib/seguridad";
import type { PedidoItem } from "@/types/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return respuesta({ ok: true, carta: obtenerCarta() });
  } catch (error) {
    console.error("[menu:GET]", error);
    return respuesta({ ok: false, error: "No pudimos cargar la carta." }, 500);
  }
}

/**
 * POST /api/menu
 *  - evento: analítica de consumo anónima, validada y limitada por sesión.
 *  - pedido: compartir una selección con el equipo. Los precios se resuelven
 *    siempre contra el catálogo del servidor, nunca contra el cliente.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!origenPermitido(req)) {
    return respuesta({ ok: false, error: "Origen no permitido." }, 403);
  }

  const cuerpo = await leerCuerpo(req);
  if (!cuerpo) return respuesta({ ok: false, error: "Petición no válida." }, 400);

  const accion = cuerpo.action;

  try {
    if (accion === "evento") {
      const validado = validarEventoCarta(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);
      if (
        !consumirCuota(`menu:evento:${validado.valor.sesionId}`, 120, 60_000)
      ) {
        return respuesta({ ok: false, error: "Límite de eventos alcanzado." }, 429);
      }
      const resumen = registrarAnalitica(validado.valor);
      return respuesta({ ok: true, resumen });
    }

    if (accion === "pedido") {
      const validado = validarPedidoCarta(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);
      if (!consumirCuota(`menu:pedido:${validado.valor.sesionId}`, 6, 60_000)) {
        return respuesta(
          { ok: false, error: "Has compartido demasiadas selecciones." },
          429
        );
      }

      const items: PedidoItem[] = [];
      for (const entrada of validado.valor.items) {
        const producto = PRODUCTOS_POR_ID.get(entrada.productoId);
        if (!producto || !producto.disponible) {
          return respuesta(
            { ok: false, error: "Uno de los productos ya no está disponible." },
            422
          );
        }
        items.push({
          productoId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precio,
          cantidad: entrada.cantidad,
          notas: entrada.notas,
        });
      }

      const pedido = guardarPedidoCarta(validado.valor.sesionId, items);
      const resumen = registrarAnalitica({
        sesionId: validado.valor.sesionId,
        evento: "pedido_enviado",
        valor: Math.min(100_000, pedido.subtotal),
      });
      return respuesta({ ok: true, pedido, resumen }, 201);
    }

    return respuesta({ ok: false, error: "Acción no reconocida." }, 400);
  } catch (error) {
    console.error("[menu:POST]", error);
    return respuesta({ ok: false, error: "No pudimos registrar la acción." }, 500);
  }
}
