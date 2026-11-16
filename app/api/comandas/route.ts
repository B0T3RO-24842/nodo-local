import { NextRequest, NextResponse } from "next/server";

import { puedeTransicionarPedido } from "@/lib/comandas-engine";
import { ipDe, leerCuerpo, respuesta } from "@/lib/http";
import {
  actualizarEstadoItem,
  actualizarEstadoMesa,
  agregarItemsComanda,
  autenticarMozo,
  cerrarComanda,
  comprobarBloqueoLogin,
  construirSnapshot,
  crearComanda,
  crearSesionMozo,
  limpiarFallosLogin,
  listarPersonal,
  obtenerComanda,
  registrarFalloLogin,
  revocarSesionMozo,
  validarSesionMozo,
} from "@/lib/server/store";
import {
  autorizarPropietario,
  origenPermitido,
  tokenValido,
  validarActualizarItem,
  validarAgregarItems,
  validarCerrarComanda,
  validarCrearComanda,
  validarEstadoMesa,
  validarLoginMozo,
} from "@/lib/seguridad";
import type { MozoSesion } from "@/types/comandas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESION_HEADER = "x-sesion-operativa";

function sesionDe(req: NextRequest): {
  token: string | null;
  sesion: MozoSesion | null;
} {
  const token = req.headers.get(SESION_HEADER);
  if (!tokenValido(token)) return { token: null, sesion: null };
  return { token, sesion: validarSesionMozo(token) };
}

/**
 * GET /api/comandas
 * Sin sesión: lista mínima de personal para el selector de acceso.
 * Con sesión: snapshot operativo. Nunca se devuelven hashes ni PINs.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const cabecera = req.headers.get(SESION_HEADER);
    if (!cabecera) {
      return respuesta({ ok: true, personal: listarPersonal() });
    }

    const { sesion } = sesionDe(req);
    if (!sesion) {
      return respuesta({ ok: false, error: "Sesión no válida o caducada." }, 401);
    }

    return respuesta({ ok: true, snapshot: construirSnapshot(sesion) });
  } catch (error) {
    console.error("[comandas:GET]", error);
    return respuesta({ ok: false, error: "No pudimos cargar el salón." }, 500);
  }
}

/**
 * POST /api/comandas
 *  - login
 *  - logout
 *  - crear-comanda
 *  - agregar-items
 *
 * El rol y el mozoId salen siempre de la sesión opaca emitida tras validar el
 * PIN. Un cliente no puede inyectarlos en el body.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!origenPermitido(req)) {
    return respuesta({ ok: false, error: "Origen no permitido." }, 403);
  }

  const cuerpo = await leerCuerpo(req);
  if (!cuerpo || typeof cuerpo.action !== "string") {
    return respuesta({ ok: false, error: "Acción no válida." }, 400);
  }

  try {
    if (cuerpo.action === "login") {
      const validado = validarLoginMozo(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);

      const ip = ipDe(req);
      // Sin IP: rotar x-forwarded-for no debe dar intentos de PIN ilimitados.
      const claveMozo = `login:${validado.valor.mozoId}`;
      const claveIp = `login-ip:${ip}`;
      const bloqueoMozo = comprobarBloqueoLogin(claveMozo);
      const bloqueoIp = comprobarBloqueoLogin(claveIp);
      if (bloqueoMozo.bloqueado || bloqueoIp.bloqueado) {
        return respuesta(
          {
            ok: false,
            error: "Demasiados intentos. Acceso bloqueado temporalmente.",
            reintentarEn: Math.max(
              bloqueoMozo.reintentarEn,
              bloqueoIp.reintentarEn
            ),
          },
          429
        );
      }

      const mozo = autenticarMozo(validado.valor.mozoId, validado.valor.pin);
      if (!mozo) {
        registrarFalloLogin(claveMozo);
        registrarFalloLogin(claveIp);
        return respuesta({ ok: false, error: "PIN incorrecto." }, 401);
      }

      limpiarFallosLogin(claveMozo);
      limpiarFallosLogin(claveIp);
      const { token, sesion } = crearSesionMozo(mozo);
      return respuesta({
        ok: true,
        token,
        sesion,
        snapshot: construirSnapshot(sesion),
      });
    }

    const { token, sesion } = sesionDe(req);
    if (!sesion || !token) {
      return respuesta({ ok: false, error: "Sesión no válida o caducada." }, 401);
    }

    if (cuerpo.action === "logout") {
      revocarSesionMozo(token);
      return respuesta({ ok: true });
    }

    if (cuerpo.action === "crear-comanda") {
      const validado = validarCrearComanda(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);

      const resultado = crearComanda(
        validado.valor.mesaId,
        sesion.mozoId,
        validado.valor.items
      );
      if (!resultado.ok) {
        return respuesta(
          { ok: false, error: resultado.error },
          resultado.estado ?? 400
        );
      }

      return respuesta(
        {
          ok: true,
          comanda: resultado.valor,
          snapshot: construirSnapshot(sesion),
        },
        201
      );
    }

    if (cuerpo.action === "agregar-items") {
      const validado = validarAgregarItems(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);

      const comanda = obtenerComanda(validado.valor.comandaId);
      if (!comanda) {
        return respuesta({ ok: false, error: "Comanda no encontrada." }, 404);
      }
      if (!autorizarPropietario(sesion, comanda.mozoId)) {
        return respuesta(
          { ok: false, error: "No tienes permisos sobre esta comanda." },
          403
        );
      }

      const resultado = agregarItemsComanda(
        comanda.id,
        validado.valor.items
      );
      if (!resultado.ok) {
        return respuesta(
          { ok: false, error: resultado.error },
          resultado.estado ?? 400
        );
      }

      return respuesta({
        ok: true,
        comanda: resultado.valor,
        snapshot: construirSnapshot(sesion),
      });
    }

    return respuesta({ ok: false, error: "Acción no reconocida." }, 400);
  } catch (error) {
    console.error("[comandas:POST]", error);
    return respuesta(
      { ok: false, error: "No pudimos completar la operación." },
      500
    );
  }
}

/**
 * PATCH /api/comandas
 *  - actualizar-item
 *  - cerrar-comanda
 *  - actualizar-mesa
 *
 * Verificación estricta: sesión válida + propiedad de la comanda o rol
 * supervisor/admin. El id de la mesa o comanda nunca concede acceso por sí solo.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!origenPermitido(req)) {
    return respuesta({ ok: false, error: "Origen no permitido." }, 403);
  }

  const cuerpo = await leerCuerpo(req);
  if (!cuerpo || typeof cuerpo.action !== "string") {
    return respuesta({ ok: false, error: "Acción no válida." }, 400);
  }

  const { sesion } = sesionDe(req);
  if (!sesion) {
    return respuesta({ ok: false, error: "Sesión no válida o caducada." }, 401);
  }

  try {
    if (cuerpo.action === "actualizar-item") {
      const validado = validarActualizarItem(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);

      const comanda = obtenerComanda(validado.valor.comandaId);
      if (!comanda) {
        return respuesta({ ok: false, error: "Comanda no encontrada." }, 404);
      }
      if (!autorizarPropietario(sesion, comanda.mozoId)) {
        return respuesta(
          { ok: false, error: "No tienes permisos sobre esta comanda." },
          403
        );
      }

      const item = comanda.items.find(
        (linea) => linea.id === validado.valor.itemId
      );
      if (!item) {
        return respuesta(
          { ok: false, error: "Línea de comanda no encontrada." },
          404
        );
      }
      if (!puedeTransicionarPedido(item.estado, validado.valor.estado)) {
        return respuesta(
          {
            ok: false,
            error: `No se puede pasar de "${item.estado}" a "${validado.valor.estado}".`,
          },
          409
        );
      }

      const resultado = actualizarEstadoItem(
        comanda.id,
        item.id,
        validado.valor.estado
      );
      if (!resultado.ok) {
        return respuesta(
          { ok: false, error: resultado.error },
          resultado.estado ?? 400
        );
      }

      return respuesta({
        ok: true,
        comanda: resultado.valor,
        snapshot: construirSnapshot(sesion),
      });
    }

    if (cuerpo.action === "cerrar-comanda") {
      const validado = validarCerrarComanda(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);

      const comanda = obtenerComanda(validado.valor.comandaId);
      if (!comanda) {
        return respuesta({ ok: false, error: "Comanda no encontrada." }, 404);
      }
      if (!autorizarPropietario(sesion, comanda.mozoId)) {
        return respuesta(
          { ok: false, error: "No tienes permisos sobre esta comanda." },
          403
        );
      }
      if (comanda.items.some((item) => item.estado !== "entregado")) {
        return respuesta(
          {
            ok: false,
            error: "Marca todos los platos como entregados antes de cobrar.",
          },
          409
        );
      }

      const resultado = cerrarComanda(
        comanda.id,
        validado.valor.propinaPct
      );
      if (!resultado.ok) {
        return respuesta(
          { ok: false, error: resultado.error },
          resultado.estado ?? 400
        );
      }

      return respuesta({
        ok: true,
        comanda: resultado.valor,
        snapshot: construirSnapshot(sesion),
      });
    }

    if (cuerpo.action === "actualizar-mesa") {
      const validado = validarEstadoMesa(cuerpo);
      if (!validado.ok) return respuesta({ ok: false, error: validado.error }, 422);

      const resultado = actualizarEstadoMesa(
        validado.valor.mesaId,
        validado.valor.estado
      );
      if (!resultado.ok) {
        return respuesta(
          { ok: false, error: resultado.error },
          resultado.estado ?? 400
        );
      }

      return respuesta({
        ok: true,
        mesa: resultado.valor,
        snapshot: construirSnapshot(sesion),
      });
    }

    return respuesta({ ok: false, error: "Acción no reconocida." }, 400);
  } catch (error) {
    console.error("[comandas:PATCH]", error);
    return respuesta(
      { ok: false, error: "No pudimos actualizar el salón." },
      500
    );
  }
}
