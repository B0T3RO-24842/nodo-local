"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LogoNodo } from "@/components/logo-nodo";
import {
  calcularPrecuenta,
  estadoDerivadoComanda,
  ETIQUETAS_ESTADO_MESA,
  ETIQUETAS_ESTADO_PEDIDO,
  formatearEuros,
  siguienteEstadoPedido,
} from "@/lib/comandas-engine";
import type {
  Comanda,
  ComandaSnapshot,
  Mesa,
  MozoSesion,
  PersonalPublico,
} from "@/types/comandas";

interface RespuestaApi {
  ok: boolean;
  error?: string;
  reintentarEn?: number;
  personal?: PersonalPublico[];
  token?: string;
  sesion?: MozoSesion;
  snapshot?: ComandaSnapshot;
  comanda?: Comanda;
  mesa?: Mesa;
}

interface Toast {
  tipo: "exito" | "error";
  titulo: string;
  detalle?: string;
}

const SALON_KEY = "nodo.salon.token.v1";
const PIN_MAX = 8;

function leerToken(): string | null {
  try {
    return window.sessionStorage.getItem(SALON_KEY);
  } catch {
    return null;
  }
}

function guardarToken(token: string): void {
  try {
    window.sessionStorage.setItem(SALON_KEY, token);
  } catch {
    // La sesión solo vivirá en memoria.
  }
}

function borrarToken(): void {
  try {
    window.sessionStorage.removeItem(SALON_KEY);
  } catch {
    // Sin acción.
  }
}

const CLASES_ESTADO_MESA: Record<Mesa["estado"], string> = {
  libre: "border-white/12 bg-white/[0.025] hover:border-white/25",
  ocupada: "border-lima-400/40 bg-lima-400/[0.08] hover:border-lima-400",
  por_limpiar: "border-brasa-400/40 bg-brasa-400/[0.08] hover:border-brasa-400",
  reservada: "border-cielo-400/40 bg-cielo-400/[0.08] hover:border-cielo-400",
};

const CLASES_ESTADO_PEDIDO: Record<string, string> = {
  pendiente: "border-white/15 text-hueso-300",
  cocina: "border-brasa-400/40 bg-brasa-400/10 text-brasa-300",
  listo: "border-cielo-400/40 bg-cielo-400/10 text-cielo-300",
  entregado: "border-lima-400/40 bg-lima-400/10 text-lima-300",
};

const COMENSALES = [1, 2, 3, 4, 5, 6];
const PROPINAS = [0, 5, 10, 15];

export function ComandasApp() {
  const [personal, setPersonal] = useState<PersonalPublico[]>([]);
  const [mozoSeleccionado, setMozoSeleccionado] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [accediendo, setAccediendo] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [inicializado, setInicializado] = useState(false);
  const [sesion, setSesion] = useState<MozoSesion | null>(null);
  const [snapshot, setSnapshot] = useState<ComandaSnapshot | null>(null);
  const [cargandoSalon, setCargandoSalon] = useState(true);

  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [comensales, setComensales] = useState(2);
  const [propina, setPropina] = useState(0);
  const [accionActiva, setAccionActiva] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const guardado = leerToken();
    if (guardado) setToken(guardado);
    setInicializado(true);
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/comandas", { cache: "no-store" })
      .then(async (res) => {
        const datos = (await res.json()) as RespuestaApi;
        if (!res.ok || !datos.ok || !datos.personal) {
          throw new Error(datos.error ?? "No pudimos cargar el personal.");
        }
        return datos.personal;
      })
      .then((listado) => {
        if (!cancelado) setPersonal(listado);
      })
      .catch(() => {
        if (!cancelado) {
          setErrorAcceso("No pudimos cargar el personal. Recarga la página.");
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!mozoSeleccionado && personal.length > 0) {
      setMozoSeleccionado(personal[0].id);
    }
  }, [mozoSeleccionado, personal]);

  const cargarSalon = useCallback(
    async (mostrarCargando: boolean) => {
      if (!token) return;
      if (mostrarCargando) setCargandoSalon(true);
      try {
        const res = await fetch("/api/comandas", {
          headers: { "x-sesion-operativa": token },
          cache: "no-store",
        });
        const datos = (await res.json()) as RespuestaApi;
        if (res.status === 401) {
          borrarToken();
          setToken(null);
          setSesion(null);
          setSnapshot(null);
          setToast({
            tipo: "error",
            titulo: "Sesión cerrada",
            detalle: "Vuelve a entrar con tu PIN.",
          });
          return;
        }
        if (!res.ok || !datos.ok || !datos.snapshot) {
          throw new Error(datos.error ?? "No pudimos actualizar el salón.");
        }
        setSnapshot(datos.snapshot);
        setSesion(datos.snapshot.sesion);
      } catch (error) {
        setToast({
          tipo: "error",
          titulo: "No pudimos refrescar",
          detalle:
            error instanceof Error ? error.message : "Reintenta en unos segundos.",
        });
      } finally {
        if (mostrarCargando) setCargandoSalon(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setCargandoSalon(false);
      return;
    }

    let cancelado = false;
    const primera = true;
    void cargarSalon(primera);
    const intervalo = window.setInterval(() => {
      if (!cancelado) void cargarSalon(false);
    }, 15_000);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [cargarSalon, token]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(temporizador);
  }, [toast]);

  useEffect(() => {
    setDraft({});
    setBusquedaProducto("");
    setComensales(2);
    setPropina(0);
  }, [mesaSeleccionadaId]);

  const mesaSeleccionada = useMemo(
    () => snapshot?.mesas.find((mesa) => mesa.id === mesaSeleccionadaId) ?? null,
    [mesaSeleccionadaId, snapshot]
  );

  const comandaSeleccionada = useMemo(() => {
    if (!snapshot || !mesaSeleccionada?.comandaActivaId) return null;
    return (
      snapshot.comandas.find(
        (comanda) => comanda.id === mesaSeleccionada.comandaActivaId
      ) ?? null
    );
  }, [mesaSeleccionada, snapshot]);

  const puedeOperar = useMemo(() => {
    if (!sesion || !comandaSeleccionada) return true;
    if (sesion.rol === "mozo") {
      return comandaSeleccionada.mozoId === sesion.mozoId;
    }
    return true;
  }, [comandaSeleccionada, sesion]);

  const productosCatalogo = snapshot?.carta.productos ?? [];

  const productosFiltradosCatalogo = useMemo(() => {
    const termino = busquedaProducto.trim().toLowerCase();
    return productosCatalogo.filter((producto) =>
      termino.length === 0
        ? true
        : producto.nombre.toLowerCase().includes(termino) ||
            producto.descripcion.toLowerCase().includes(termino)
    );
  }, [busquedaProducto, productosCatalogo]);

  const lineasDraft = useMemo(
    () =>
      Object.entries(draft).flatMap(([productoId, cantidad]) => {
        const producto = productosCatalogo.find((item) => item.id === productoId);
        return producto ? [{ producto, cantidad }] : [];
      }),
    [draft, productosCatalogo]
  );

  const totalDraft = lineasDraft.reduce(
    (total, linea) => total + linea.producto.precio * linea.cantidad,
    0
  );

  const zonas = useMemo(() => {
    if (!snapshot) return [];
    const mapa = new Map<string, Mesa[]>();
    for (const mesa of snapshot.mesas) {
      const actual = mapa.get(mesa.zona) ?? [];
      actual.push(mesa);
      mapa.set(mesa.zona, actual);
    }
    return [...mapa.entries()];
  }, [snapshot]);

  const precuenta = useMemo(() => {
    if (!comandaSeleccionada) return null;
    return calcularPrecuenta(
      comandaSeleccionada.items,
      comensales,
      propina
    );
  }, [comandaSeleccionada, comensales, propina]);

  async function iniciarSesion() {
    if (!mozoSeleccionado) {
      setErrorAcceso("Selecciona una persona del equipo.");
      return;
    }
    if (pin.length < 4) {
      setErrorAcceso("Introduce al menos 4 dígitos.");
      return;
    }

    setAccediendo(true);
    setErrorAcceso(null);
    try {
      const res = await fetch("/api/comandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          mozoId: mozoSeleccionado,
          pin,
        }),
      });
      const datos = (await res.json()) as RespuestaApi;
      if (!res.ok || !datos.ok || !datos.token || !datos.snapshot) {
        throw new Error(
          datos.error ??
            (datos.reintentarEn
              ? `Demasiados intentos. Espera ${datos.reintentarEn}s.`
              : "No pudimos validar el acceso.")
        );
      }

      guardarToken(datos.token);
      setToken(datos.token);
      setSesion(datos.snapshot.sesion);
      setSnapshot(datos.snapshot);
      setPin("");
      setMesaSeleccionadaId(null);
      setToast({
        tipo: "exito",
        titulo: `Hola, ${datos.snapshot.sesion.nombre.split(" ")[0]}`,
        detalle: "Sesión operativa activa durante 8 horas.",
      });
    } catch (error) {
      setErrorAcceso(
        error instanceof Error ? error.message : "No pudimos validar el acceso."
      );
    } finally {
      setAccediendo(false);
    }
  }

  async function cerrarSesion() {
    if (!token) return;
    try {
      await fetch("/api/comandas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sesion-operativa": token,
        },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Cerramos localmente aunque la red falle.
    } finally {
      borrarToken();
      setToken(null);
      setSesion(null);
      setSnapshot(null);
      setMesaSeleccionadaId(null);
      setDraft({});
      setToast({
        tipo: "exito",
        titulo: "Sesión cerrada",
        detalle: "El token ha sido revocado en servidor.",
      });
    }
  }

  async function enviar(
    metodo: "POST" | "PATCH",
    cuerpo: Record<string, unknown>
  ): Promise<RespuestaApi> {
    if (!token) throw new Error("Sesión no válida.");
    const res = await fetch("/api/comandas", {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        "x-sesion-operativa": token,
      },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await res.json()) as RespuestaApi;
    if (!res.ok || !datos.ok) {
      throw new Error(datos.error ?? "No pudimos completar la operación.");
    }
    if (datos.snapshot) setSnapshot(datos.snapshot);
    return datos;
  }

  async function crearComanda(mesa: Mesa) {
    if (lineasDraft.length === 0) {
      setToast({
        tipo: "error",
        titulo: "Selecciona productos",
        detalle: "Añade al menos un plato para abrir la mesa.",
      });
      return;
    }
    setAccionActiva("crear");
    try {
      await enviar("POST", {
        action: "crear-comanda",
        mesaId: mesa.id,
        items: lineasDraft.map((linea) => ({
          productoId: linea.producto.id,
          cantidad: linea.cantidad,
        })),
      });
      setDraft({});
      setToast({
        tipo: "exito",
        titulo: `${mesa.nombre} abierta`,
        detalle: "La comanda ya está en el snapshot del salón.",
      });
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos abrir la mesa",
        detalle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAccionActiva(null);
    }
  }

  async function agregarItems(comanda: Comanda) {
    if (lineasDraft.length === 0) return;
    setAccionActiva("agregar");
    try {
      await enviar("POST", {
        action: "agregar-items",
        comandaId: comanda.id,
        items: lineasDraft.map((linea) => ({
          productoId: linea.producto.id,
          cantidad: linea.cantidad,
        })),
      });
      setDraft({});
      setToast({
        tipo: "exito",
        titulo: "Líneas añadidas",
        detalle: "Los nuevos platos entran como pendientes.",
      });
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos añadir líneas",
        detalle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAccionActiva(null);
    }
  }

  async function actualizarItem(comanda: Comanda, itemId: string, estado: string) {
    setAccionActiva(`item:${itemId}`);
    try {
      await enviar("PATCH", {
        action: "actualizar-item",
        comandaId: comanda.id,
        itemId,
        estado,
      });
      setToast({
        tipo: "exito",
        titulo: "Estado actualizado",
        detalle: `La línea pasa a ${ETIQUETAS_ESTADO_PEDIDO[estado as keyof typeof ETIQUETAS_ESTADO_PEDIDO]}.`,
      });
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "Transición no permitida",
        detalle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAccionActiva(null);
    }
  }

  async function cerrarComanda(comanda: Comanda) {
    setAccionActiva("cerrar");
    try {
      await enviar("PATCH", {
        action: "cerrar-comanda",
        comandaId: comanda.id,
        propinaPct: propina,
        comensales,
      });
      setToast({
        tipo: "exito",
        titulo: "Comanda cobrada",
        detalle: "La mesa pasa a por limpiar.",
      });
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos cerrar",
        detalle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAccionActiva(null);
    }
  }

  async function cambiarEstadoMesa(mesa: Mesa, estado: "libre" | "reservada") {
    setAccionActiva(`mesa:${mesa.id}`);
    try {
      await enviar("PATCH", {
        action: "actualizar-mesa",
        mesaId: mesa.id,
        estado,
      });
      setToast({
        tipo: "exito",
        titulo: "Mesa actualizada",
        detalle: `Ahora está ${ETIQUETAS_ESTADO_MESA[estado].toLowerCase()}.`,
      });
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos actualizar la mesa",
        detalle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAccionActiva(null);
    }
  }

  if (!inicializado) {
    return (
      <div className="grid min-h-screen place-items-center bg-tinta-950">
        <LogoNodo className="animate-pulse" />
      </div>
    );
  }

  if (!sesion || !snapshot) {
    return (
      <div className="grid min-h-screen bg-tinta-950 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="grain relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 75% 18%, rgba(210,255,63,0.11) 0%, transparent 58%), radial-gradient(ellipse 50% 45% at 12% 84%, rgba(255,116,70,0.11) 0%, transparent 62%), linear-gradient(180deg,#080907,#0a0c08)",
            }}
          />
          <div aria-hidden="true" className="malla absolute inset-0 opacity-45" />

          <div className="relative z-10">
            <LogoNodo />
            <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.24em] text-hueso-400">
              Casa Norte · Módulo 04
            </p>
            <h1 className="mt-5 text-[clamp(3rem,6.5vw,6.5rem)] font-extrabold leading-[0.86] tracking-[-0.07em]">
              El salón,
              <br />
              <span className="text-lima-400">bajo control.</span>
            </h1>
            <p className="mt-7 max-w-md text-sm leading-relaxed text-hueso-200/60 sm:text-base">
              Comandas, cocina y cuentas en una consola rápida. El acceso por PIN
              genera una sesión opaca; el servidor decide qué puedes tocar.
            </p>

            <div className="mt-10 grid max-w-lg gap-2.5">
              {[
                ["UUID", "IDs opacos en mesas y comandas"],
                ["scrypt", "PIN con sal y pepper de entorno"],
                ["Anti-IDOR", "Propiedad comprobada en cada mutación"],
                ["Rate limit", "Bloqueo temporal tras 5 fallos"],
              ].map(([titulo, detalle]) => (
                <div
                  key={titulo}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5"
                >
                  <span className="rounded-full bg-lima-400 px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-tinta-950">
                    {titulo}
                  </span>
                  <span className="text-[11px] text-hueso-200/65">{detalle}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-5 border-t border-white/10 pt-6 font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-400">
            <span>Next.js 16</span>
            <span>TypeScript</span>
            <span>Backend first</span>
            <span className="text-lima-300">Demo PIN 2468 / 1357</span>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <LogoNodo />
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-400">
                Salón OS
              </span>
            </div>

            <div className="panel relative overflow-hidden p-6 sm:p-8">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-lima-400/[0.08] blur-3xl"
              />
              <p className="label-mono text-lima-300">Acceso personal</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.055em]">
                Entra con tu PIN.
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-hueso-200/55">
                Selecciona tu nombre y teclea el PIN. Nunca guardamos el código:
                solo el token de sesión en este navegador.
              </p>

              {personal.length === 0 ? (
                <div className="mt-7 space-y-2.5" aria-label="Cargando personal">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-2xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : (
                <form
                  className="mt-7 space-y-5"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    void iniciarSesion();
                  }}
                >
                  <div className="space-y-2">
                    {personal.map((persona) => {
                      const activo = persona.id === mozoSeleccionado;
                      return (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={() => {
                            setMozoSeleccionado(persona.id);
                            setPin("");
                            setErrorAcceso(null);
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                            activo
                              ? "border-lima-400/50 bg-lima-400/[0.08]"
                              : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 place-items-center rounded-full font-mono text-[10px] font-semibold ${
                              activo
                                ? "bg-lima-400 text-tinta-950"
                                : "border border-white/15 text-hueso-300"
                            }`}
                          >
                            {persona.iniciales}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-medium">
                              {persona.nombre}
                            </span>
                            <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
                              {persona.rol}
                            </span>
                          </span>
                          {activo && (
                            <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <p className="label-mono mb-2 text-hueso-400">PIN</p>
                    <div className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-tinta-950/60">
                      {Array.from({ length: PIN_MAX }).map((_, indice) => (
                        <span
                          key={indice}
                          className={`h-2.5 w-2.5 rounded-full transition-all ${
                            indice < pin.length ? "bg-lima-400" : "bg-white/12"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
                      <button
                        key={digito}
                        type="button"
                        onClick={() =>
                          setPin((actual) =>
                            actual.length < PIN_MAX ? actual + digito : actual
                          )
                        }
                        className="grid h-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.025] text-lg font-semibold transition hover:border-white/25 hover:bg-white/[0.06]"
                      >
                        {digito}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPin("")}
                      className="grid h-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.025] font-mono text-[8px] uppercase tracking-[0.12em] text-hueso-400 transition hover:border-brasa-400/40 hover:text-brasa-300"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPin((actual) =>
                          actual.length < PIN_MAX ? actual + "0" : actual
                        )
                      }
                      className="grid h-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.025] text-lg font-semibold transition hover:border-white/25 hover:bg-white/[0.06]"
                    >
                      0
                    </button>
                    <button
                      type="submit"
                      disabled={accediendo || pin.length < 4}
                      className="grid h-12 place-items-center rounded-2xl bg-lima-400 text-sm font-semibold text-tinta-950 transition hover:bg-lima-300 disabled:opacity-40"
                    >
                      {accediendo ? "…" : "Entrar"}
                    </button>
                  </div>

                  {errorAcceso && (
                    <p
                      role="alert"
                      className="rounded-xl border border-brasa-400/30 bg-brasa-400/10 px-3 py-2.5 text-xs text-brasa-300"
                    >
                      {errorAcceso}
                    </p>
                  )}

                  <p className="text-center font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
                    Demo · Ana 2468 · Leo 1357
                  </p>
                </form>
              )}
            </div>

            <Link
              href="/"
              className="mt-5 block text-center text-[11px] text-hueso-400 transition hover:text-lima-300"
            >
              ← Volver al ecosistema
            </Link>
          </div>
        </section>

        {toast && <ToastVivo toast={toast} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tinta-950">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-tinta-950/80 backdrop-blur-2xl">
        <div className="contenedor flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoNodo />
            <span className="hidden h-4 w-px bg-white/15 sm:block" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold leading-none">
                Casa Norte · Salón OS
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-400">
                Snapshot vivo · refresco 15 s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-full border border-white/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-300 md:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lima-400" />
              {snapshot.metricas.comandasAbiertas} comandas abiertas
            </span>
            <span className="flex items-center gap-2.5 rounded-full border border-lime-400/25 bg-lima-400/[0.07] px-2.5 py-1.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-lima-400 font-mono text-[8px] font-bold text-tinta-950">
                {sesion.nombre.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden text-[11px] font-medium sm:block">
                {sesion.nombre}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-lime-300">
                {sesion.rol}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-sm transition hover:border-brasa-400/50 hover:text-brasa-300"
              aria-label="Cerrar sesión"
            >
              ×
            </button>
          </div>
        </div>
      </header>

      <main className="contenedor pb-16 pt-7">
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            [snapshot.metricas.mesasOcupadas, "Mesas ocupadas"],
            [snapshot.metricas.comandasAbiertas, "Comandas abiertas"],
            [formatearEuros(snapshot.metricas.ventaEnCurso), "Venta en curso"],
            [snapshot.metricas.platosEnCocina, "Platos en cocina"],
          ].map(([valor, etiqueta]) => (
            <div
              key={etiqueta}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
            >
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
                {etiqueta}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.05em] sm:text-2xl">
                {valor}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          {/* MAPA */}
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="label-mono text-lima-300">Mapa de sala</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                  {snapshot.mesas.length} mesas conectadas
                </h2>
              </div>
              {cargandoSalon ? (
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
                  Sincronizando…
                </span>
              ) : (
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-lime-300">
                  Actualizado
                </span>
              )}
            </div>

            <div className="scrollbar-fino max-h-[68vh] overflow-y-auto p-4">
              {zonas.map(([zona, mesas]) => (
                <div key={zona} className="mb-5 last:mb-1">
                  <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-400">
                    {zona} · {mesas.length}
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {mesas.map((mesa) => {
                      const comanda = snapshot.comandas.find(
                        (item) => item.id === mesa.comandaActivaId
                      );
                      const platos = comanda?.items.reduce(
                        (total, item) => total + item.cantidad,
                        0
                      );
                      const seleccionada = mesa.id === mesaSeleccionadaId;

                      return (
                        <button
                          key={mesa.id}
                          type="button"
                          onClick={() => setMesaSeleccionadaId(mesa.id)}
                          className={`rounded-2xl border p-3.5 text-left transition-all ${CLASES_ESTADO_MESA[mesa.estado]} ${
                            seleccionada ? "ring-1 ring-lima-400" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold tracking-[-0.03em]">
                              {mesa.nombre}
                            </span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-hueso-400">
                              {mesa.capacidad}p
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-hueso-300">
                              {ETIQUETAS_ESTADO_MESA[mesa.estado]}
                            </span>
                            {comanda ? (
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-hueso-200">
                                {platos} ·{" "}
                                {ETIQUETAS_ESTADO_PEDIDO[
                                  estadoDerivadoComanda(comanda.items)
                                ]}
                              </span>
                            ) : (
                              <span className="h-1 w-1 rounded-full bg-current opacity-30" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DETALLE */}
          <section>
            {!mesaSeleccionada ? (
              <div className="panel grid min-h-[26rem] place-items-center p-8 text-center">
                <div className="max-w-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-lg">
                    ⌖
                  </span>
                  <h2 className="mt-5 text-2xl font-semibold tracking-[-0.045em]">
                    Elige una mesa para operar.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-hueso-200/55">
                    El mapa muestra el estado en vivo. Las mutaciones se validan
                    contra tu sesión; un ID de mesa no abre nada por sí solo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 font-mono text-[9px]">
                          {mesaSeleccionada.codigo}
                        </span>
                        <div>
                          <h2 className="text-2xl font-semibold tracking-[-0.05em]">
                            {mesaSeleccionada.nombre}
                          </h2>
                          <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
                            {mesaSeleccionada.zona} · {mesaSeleccionada.capacidad} comensales
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mesaSeleccionada.estado === "por_limpiar" && (
                        <button
                          type="button"
                          onClick={() =>
                            void cambiarEstadoMesa(mesaSeleccionada, "libre")
                          }
                          disabled={accionActiva === `mesa:${mesaSeleccionada.id}`}
                          className="btn-lima min-h-9 px-3.5 text-[11px]"
                        >
                          {accionActiva === `mesa:${mesaSeleccionada.id}`
                            ? "Actualizando…"
                            : "Marcar libre"}
                        </button>
                      )}
                      {mesaSeleccionada.estado === "libre" && (
                        <button
                          type="button"
                          onClick={() =>
                            void cambiarEstadoMesa(mesaSeleccionada, "reservada")
                          }
                          disabled={accionActiva === `mesa:${mesaSeleccionada.id}`}
                          className="btn-ghost min-h-9 px-3.5 text-[11px]"
                        >
                          Reservar
                        </button>
                      )}
                      <span className="rounded-full border border-white/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-300">
                        {ETIQUETAS_ESTADO_MESA[mesaSeleccionada.estado]}
                      </span>
                    </div>
                  </div>

                  {comandaSeleccionada ? (
                    <div className="mt-6">
                      {!puedeOperar && (
                        <div className="mb-4 rounded-xl border border-brasa-400/30 bg-brasa-400/10 px-3 py-2.5 text-[11px] text-brasa-300">
                          Esta comanda pertenece a otro mozo. Solo un supervisor
                          puede modificarla.
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                        <div>
                          <p className="label-mono text-hueso-400">Comanda activa</p>
                          <p className="mt-1 font-mono text-[11px] tracking-wider text-hueso-200">
                            #{comandaSeleccionada.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-300">
                          {ETIQUETAS_ESTADO_PEDIDO[
                            estadoDerivadoComanda(comandaSeleccionada.items)
                          ]}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {comandaSeleccionada.items.map((item) => {
                          const siguiente = siguienteEstadoPedido(item.estado);
                          return (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    {item.cantidad} × {item.nombre}
                                  </p>
                                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-hueso-400">
                                    {formatearEuros(item.precioUnitario)} ·{" "}
                                    {item.productoId}
                                  </p>
                                  {item.notas && (
                                    <p className="mt-1 text-[11px] text-brasa-300">
                                      {item.notas}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.12em] ${
                                    CLASES_ESTADO_PEDIDO[item.estado]
                                  }`}
                                >
                                  {ETIQUETAS_ESTADO_PEDIDO[item.estado]}
                                </span>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold">
                                  {formatearEuros(
                                    item.precioUnitario * item.cantidad
                                  )}
                                </span>
                                {siguiente ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void actualizarItem(
                                        comandaSeleccionada,
                                        item.id,
                                        siguiente
                                      )
                                    }
                                    disabled={
                                      !puedeOperar ||
                                      accionActiva === `item:${item.id}`
                                    }
                                    className="btn-ghost min-h-8 px-3 text-[10px]"
                                  >
                                    {accionActiva === `item:${item.id}`
                                      ? "Enviando…"
                                      : `Pasar a ${
                                          ETIQUETAS_ESTADO_PEDIDO[siguiente]
                                        }`}
                                    <span aria-hidden="true">→</span>
                                  </button>
                                ) : (
                                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-lime-300">
                                    Listo en mesa
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-white/10 pt-5">
                      <p className="label-mono text-hueso-400">Abrir mesa</p>
                      <p className="mt-2 text-sm text-hueso-200/60">
                        {mesaSeleccionada.estado === "por_limpiar"
                          ? "Marca la mesa como libre para poder abrir una nueva comanda."
                          : "Selecciona los platos y envía la primera comanda a cocina."}
                      </p>
                    </div>
                  )}
                </div>

                {/* CATÁLOGO */}
                {(mesaSeleccionada.estado === "libre" ||
                  mesaSeleccionada.estado === "reservada" ||
                  comandaSeleccionada) &&
                  mesaSeleccionada.estado !== "por_limpiar" && (
                    <div className="panel overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
                        <div>
                          <p className="label-mono text-cielo-300">
                            {comandaSeleccionada ? "Añadir líneas" : "Nueva comanda"}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                            Carta de Casa Norte
                          </h3>
                        </div>
                        <label className="relative block w-full sm:w-56">
                          <span className="sr-only">Buscar producto</span>
                          <input
                            className="input min-h-9 rounded-full py-2 text-[11px]"
                            placeholder="Buscar plato"
                            value={busquedaProducto}
                            onChange={(evento) =>
                              setBusquedaProducto(evento.target.value)
                            }
                            maxLength={60}
                          />
                        </label>
                      </div>

                      <div className="scrollbar-fino max-h-72 overflow-y-auto p-3">
                        {productosFiltradosCatalogo.map((producto) => {
                          const cantidad = draft[producto.id] ?? 0;
                          return (
                            <div
                              key={producto.id}
                              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-white/[0.03]"
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: producto.acento }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {producto.nombre}
                                </p>
                                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-hueso-400">
                                  {producto.categoriaId}
                                </p>
                              </div>
                              <span className="shrink-0 font-mono text-[10px] text-hueso-300">
                                {formatearEuros(producto.precio)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft((actual) => ({
                                    ...actual,
                                    [producto.id]: (actual[producto.id] ?? 0) + 1,
                                  }))
                                }
                                disabled={!puedeOperar && Boolean(comandaSeleccionada)}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/12 text-sm transition hover:bg-lima-400 hover:text-tinta-950 disabled:opacity-30"
                                aria-label={`Añadir ${producto.nombre}`}
                              >
                                +
                              </button>
                              {cantidad > 0 && (
                                <span className="w-4 shrink-0 text-center font-mono text-[10px] text-lime-300">
                                  {cantidad}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {lineasDraft.length > 0 && (
                        <div className="border-t border-white/10 p-4">
                          <div className="scrollbar-fino mb-3 flex gap-2 overflow-x-auto pb-1">
                            {lineasDraft.map((linea) => (
                              <div
                                key={linea.producto.id}
                                className="flex shrink-0 items-center gap-2 rounded-full border border-white/12 px-2.5 py-1.5 text-[10px]"
                              >
                                <span>
                                  {linea.cantidad} × {linea.producto.nombre}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft((actual) => {
                                      const copia = { ...actual };
                                      delete copia[linea.producto.id];
                                      return copia;
                                    })
                                  }
                                  className="text-hueso-400 transition hover:text-brasa-300"
                                  aria-label={`Quitar ${linea.producto.nombre}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
                                Borrador
                              </p>
                              <p className="mt-1 text-xl font-semibold tracking-[-0.04em]">
                                {formatearEuros(totalDraft)}
                              </p>
                            </div>
                            {comandaSeleccionada ? (
                              <button
                                type="button"
                                onClick={() => void agregarItems(comandaSeleccionada)}
                                disabled={
                                  !puedeOperar || accionActiva === "agregar"
                                }
                                className="btn-lima"
                              >
                                {accionActiva === "agregar"
                                  ? "Añadiendo…"
                                  : "Añadir a la comanda"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void crearComanda(mesaSeleccionada)}
                                disabled={accionActiva === "crear"}
                                className="btn-lima"
                              >
                                {accionActiva === "crear"
                                  ? "Abriendo…"
                                  : "Abrir mesa y enviar"}
                                <span aria-hidden="true">→</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* PRECUENTA */}
                {comandaSeleccionada && precuenta && (
                  <div className="panel p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="label-mono text-brasa-300">Precuenta</p>
                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                          Divide la cuenta con precisión.
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
                          Total
                        </p>
                        <p className="text-2xl font-semibold tracking-[-0.05em]">
                          {formatearEuros(precuenta.total)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="label-mono mb-2 text-hueso-400">Comensales</p>
                        <div className="flex flex-wrap gap-1.5">
                          {COMENSALES.map((numero) => (
                            <button
                              key={numero}
                              type="button"
                              onClick={() => setComensales(numero)}
                              className={`h-8 w-8 rounded-full border text-[11px] font-semibold transition ${
                                comensales === numero
                                  ? "border-lime-400 bg-lime-400 text-tinta-950"
                                  : "border-white/12 text-hueso-300 hover:border-white/25"
                              }`}
                            >
                              {numero}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="label-mono mb-2 text-hueso-400">Propina</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PROPINAS.map((porcentaje) => (
                            <button
                              key={porcentaje}
                              type="button"
                              onClick={() => setPropina(porcentaje)}
                              className={`h-8 rounded-full border px-3 font-mono text-[10px] transition ${
                                propina === porcentaje
                                  ? "border-brasa-400 bg-brasa-400 text-tinta-950"
                                  : "border-white/12 text-hueso-300 hover:border-white/25"
                              }`}
                            >
                              {porcentaje}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 divide-y divide-white/[0.07] border-y border-white/10 py-2">
                      {precuenta.lineas.map((linea) => (
                        <div
                          key={linea.itemId}
                          className="flex items-center justify-between gap-3 py-2.5 text-xs"
                        >
                          <span className="text-hueso-200/70">
                            {linea.cantidad} × {linea.nombre}
                          </span>
                          <span className="font-medium">
                            {formatearEuros(linea.total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-hueso-300">
                        <span>Subtotal</span>
                        <span>{formatearEuros(precuenta.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-hueso-300">
                        <span>Propina {propina}%</span>
                        <span>{formatearEuros(precuenta.propina)}</span>
                      </div>
                    </div>

                    {precuenta.comensales > 1 && (
                      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                        <p className="label-mono text-hueso-400">
                          División entre {precuenta.comensales} comensales
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {precuenta.porComensal.map((importe, indice) => (
                            <span
                              key={indice}
                              className="rounded-full border border-white/12 px-2.5 py-1.5 font-mono text-[10px]"
                            >
                              {indice + 1} · {formatearEuros(importe)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void cerrarComanda(comandaSeleccionada)}
                      disabled={
                        !puedeOperar ||
                        accionActiva === "cerrar" ||
                        comandaSeleccionada.items.some(
                          (item) => item.estado !== "entregado"
                        )
                      }
                      className="btn-hueso mt-5 w-full"
                    >
                      {accionActiva === "cerrar"
                        ? "Cerrando…"
                        : "Cerrar y cobrar comanda"}
                    </button>
                    {comandaSeleccionada.items.some(
                      (item) => item.estado !== "entregado"
                    ) && (
                      <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
                        Marca todos los platos como entregados para cobrar
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="mt-14 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <LogoNodo />
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
            Sesión {sesion.expiraEn.slice(11, 16)} · Token opaco · 8 h
          </p>
          <Link
            href="/"
            className="text-xs text-hueso-300 transition hover:text-lime-300"
          >
            Volver al ecosistema →
          </Link>
        </footer>
      </main>

      {toast && <ToastVivo toast={toast} />}
    </div>
  );
}

function ToastVivo({ toast }: { toast: Toast }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-[90] w-[min(92vw,24rem)] -translate-x-1/2 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
        toast.tipo === "error"
          ? "border-brasa-400/40 bg-[#1c0f0a]/95"
          : "border-white/15 bg-tinta-800/95"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${
            toast.tipo === "error"
              ? "bg-brasa-400 text-tinta-950"
              : "bg-lime-400 text-tinta-950"
          }`}
        >
          {toast.tipo === "error" ? "!" : "✓"}
        </span>
        <div>
          <p className="text-sm font-semibold">{toast.titulo}</p>
          {toast.detalle && (
            <p className="mt-0.5 text-xs leading-relaxed text-hueso-300/70">
              {toast.detalle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
