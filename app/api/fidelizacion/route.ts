import { NextRequest, NextResponse } from "next/server";

import {
  construirPaseWallet,
  PREMIOS_CICLO,
} from "@/lib/wallet-engine";
import { ipDe, leerCuerpo, respuesta } from "@/lib/http";
import {
  canjearRecompensa,
  consumirCuota,
  crearClienteYTarjeta,
  hidratarTarjeta,
  obtenerTarjetaInterna,
  sellarTarjeta,
  validarPaseTarjeta,
} from "@/lib/server/store";
import {
  esUUID,
  origenPermitido,
  tokenValido,
  validarAccesoPase,
  validarCanje,
  validarRegistroCliente,
  validarSello,
} from "@/lib/seguridad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fidelizacion?tarjetaId=<uuid>
 * Cabecera obligatoria: x-pase-cliente: <token opaco>
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const tarjetaId = req.nextUrl.searchParams.get("tarjetaId");
    const pase = req.headers.get("x-pase-cliente");

    if (!esUUID(tarjetaId) || !tokenValido(pase)) {
      return respuesta({ ok: false, error: "Acceso a la tarjeta no válido." }, 400);
    }

    const tarjeta = obtenerTarjetaInterna(tarjetaId);
    if (!tarjeta) {
      return respuesta({ ok: false, error: "Tarjeta no encontrada." }, 404);
    }
    if (!validarPaseTarjeta(tarjeta, pase)) {
      return respuesta({ ok: false, error: "Pase no autorizado." }, 401);
    }
    // Tras validar el pase: quien solo conoce el tarjetaId no puede bloquear al titular.
    if (!consumirCuota(`fidelizacion:get:${tarjetaId}`, 90, 60_000)) {
      return respuesta(
        { ok: false, error: "Demasiadas consultas. Espera un momento." },
        429
      );
    }

    return respuesta({ ok: true, tarjeta: hidratarTarjeta(tarjeta) });
  } catch (error) {
    console.error("[fidelizacion:GET]", error);
    return respuesta({ ok: false, error: "No pudimos cargar la tarjeta." }, 500);
  }
}

/**
 * POST /api/fidelizacion
 * Acciones:
 *  - registrar: crea cliente + tarjeta y entrega un pase de un solo titular.
 *  - sellar: suma un sello calculado en servidor (nunca desde el cliente).
 *  - canjear: consume una recompensa disponible.
 *  - wallet: construye el payload del pase Wallet.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!origenPermitido(req)) {
    return respuesta({ ok: false, error: "Origen no permitido." }, 403);
  }

  const cuerpo = await leerCuerpo(req);
  if (!cuerpo || typeof cuerpo.action !== "string") {
    return respuesta({ ok: false, error: "Acción no válida." }, 400);
  }

  const accion = cuerpo.action;

  try {
    if (accion === "registrar") {
      if (!consumirCuota(`fidelizacion:registro:${ipDe(req)}`, 8, 60_000)) {
        return respuesta(
          { ok: false, error: "Demasiados registros. Inténtalo más tarde." },
          429
        );
      }
      const validado = validarRegistroCliente(cuerpo);
      if (!validado.ok) {
        return respuesta({ ok: false, error: validado.error }, 422);
      }
      const { tarjeta, pase } = crearClienteYTarjeta(validado.valor);
      return respuesta({ ok: true, tarjeta, pase }, 201);
    }

    if (accion === "sellar") {
      const validado = validarSello(cuerpo);
      if (!validado.ok) {
        return respuesta({ ok: false, error: validado.error }, 422);
      }
      const { tarjetaId, pase, origen, idempotencia } = validado.valor;
      const tarjeta = obtenerTarjetaInterna(tarjetaId);
      if (!tarjeta) {
        return respuesta({ ok: false, error: "Tarjeta no encontrada." }, 404);
      }
      if (!validarPaseTarjeta(tarjeta, pase)) {
        return respuesta({ ok: false, error: "Pase no autorizado." }, 401);
      }
      // El titular se sella a sí mismo: sin este tope, sellos y premios infinitos.
      // shortcut: 1 sello/12 h por tarjeta; para producción real, que lo valide el personal (sesión de mozo o QR firmado en caja).
      if (!consumirCuota(`fidelizacion:sello:${tarjetaId}`, 1, 12 * 60 * 60_000)) {
        return respuesta(
          { ok: false, error: "Ya sumaste el sello de esta visita." },
          429
        );
      }

      const resultado = sellarTarjeta(tarjeta, origen, idempotencia);
      return respuesta({
        ok: true,
        tarjeta: resultado.hidratada,
        recompensa: resultado.recompensa ?? null,
        duplicado: resultado.duplicado,
      });
    }

    if (accion === "canjear") {
      const validado = validarCanje(cuerpo);
      if (!validado.ok) {
        return respuesta({ ok: false, error: validado.error }, 422);
      }
      const { tarjetaId, pase, recompensaId } = validado.valor;
      const tarjeta = obtenerTarjetaInterna(tarjetaId);
      if (!tarjeta) {
        return respuesta({ ok: false, error: "Tarjeta no encontrada." }, 404);
      }
      if (!validarPaseTarjeta(tarjeta, pase)) {
        return respuesta({ ok: false, error: "Pase no autorizado." }, 401);
      }

      const canje = canjearRecompensa(tarjeta, recompensaId);
      if (!canje.ok) {
        return respuesta({ ok: false, error: canje.error }, canje.estado ?? 409);
      }
      return respuesta({
        ok: true,
        tarjeta: hidratarTarjeta(tarjeta),
        recompensa: canje.valor,
      });
    }

    if (accion === "wallet") {
      const validado = validarAccesoPase(cuerpo);
      if (!validado.ok) {
        return respuesta({ ok: false, error: validado.error }, 422);
      }
      const { tarjetaId, pase } = validado.valor;
      const tarjeta = obtenerTarjetaInterna(tarjetaId);
      if (!tarjeta) {
        return respuesta({ ok: false, error: "Tarjeta no encontrada." }, 404);
      }
      if (!validarPaseTarjeta(tarjeta, pase)) {
        return respuesta({ ok: false, error: "Pase no autorizado." }, 401);
      }
      const hidratada = hidratarTarjeta(tarjeta);
      const paseWallet = construirPaseWallet(
        hidratada.tarjeta,
        hidratada.cliente,
        PREMIOS_CICLO,
        req.nextUrl.origin
      );
      return respuesta({ ok: true, paseWallet });
    }

    return respuesta({ ok: false, error: "Acción no reconocida." }, 400);
  } catch (error) {
    console.error("[fidelizacion:POST]", error);
    return respuesta(
      { ok: false, error: "No pudimos completar la operación." },
      500
    );
  }
}
