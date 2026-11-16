import { NextRequest, NextResponse } from "next/server";

/** Helpers compartidos por las rutas de app/api. nosniff ya va global en next.config. */
export function respuesta(cuerpo: Record<string, unknown>, estado = 200): NextResponse {
  return NextResponse.json(cuerpo, {
    status: estado,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function leerCuerpo(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const datos: unknown = await req.json();
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;
    return datos as Record<string, unknown>;
  } catch {
    return null;
  }
}

// shortcut: x-forwarded-for solo es fiable tras un proxy que lo reescribe (Vercel, Nginx); no usar como única clave de seguridad.
export function ipDe(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}
