"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { LogoNodo } from "@/components/logo-nodo";
import { calcularDistanciaMetros } from "@/lib/wallet-engine";
import type {
  PaseWallet,
  RecompensaTarjeta,
  RegistroClienteInput,
  TarjetaHidratada,
} from "@/types/fidelizacion";

interface Acceso {
  tarjetaId: string;
  pase: string;
}

interface RespuestaApi {
  ok: boolean;
  error?: string;
  tarjeta?: TarjetaHidratada;
  pase?: string;
  paseWallet?: PaseWallet;
  recompensa?: RecompensaTarjeta | null;
  duplicado?: boolean;
}

interface Formulario {
  nombre: string;
  email: string;
  telefono: string;
  consentimientoMarketing: boolean;
}

interface Toast {
  tipo: "exito" | "error" | "premio";
  titulo: string;
  detalle?: string;
}

type FaseGeo =
  | { fase: "inactiva" }
  | { fase: "consultando" }
  | { fase: "dentro"; distancia: number }
  | { fase: "fuera"; distancia: number }
  | { fase: "error"; mensaje: string };

const STORAGE_KEY = "nodo.tarjeta.v1";
const FORMULARIO_INICIAL: Formulario = {
  nombre: "",
  email: "",
  telefono: "",
  consentimientoMarketing: true,
};

const NIVELES = {
  semilla: "Semilla",
  raiz: "Raíz",
  brote: "Brote",
  bosque: "Bosque",
} as const;

function leerAcceso(): Acceso | null {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return null;
    const datos = JSON.parse(bruto) as Partial<Acceso>;
    if (typeof datos.tarjetaId !== "string" || typeof datos.pase !== "string") {
      return null;
    }
    return { tarjetaId: datos.tarjetaId, pase: datos.pase };
  } catch {
    return null;
  }
}

function guardarAcceso(acceso: Acceso): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(acceso));
  } catch {
    // El modo privado puede bloquear localStorage; la sesión sigue en memoria.
  }
}

function borrarAcceso(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin acción.
  }
}

export function TarjetaCliente() {
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [tarjeta, setTarjeta] = useState<TarjetaHidratada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [sellando, setSellando] = useState(false);
  const [canjeando, setCanjeando] = useState<string | null>(null);
  const [generandoWallet, setGenerandoWallet] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_INICIAL);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [paseWallet, setPaseWallet] = useState<PaseWallet | null>(null);
  const [geo, setGeo] = useState<FaseGeo>({ fase: "inactiva" });

  useEffect(() => {
    let cancelado = false;
    const guardado = leerAcceso();
    if (!guardado) {
      setCargando(false);
      return;
    }

    setAcceso(guardado);
    fetch(
      `/api/fidelizacion?tarjetaId=${encodeURIComponent(guardado.tarjetaId)}`,
      {
        headers: { "x-pase-cliente": guardado.pase },
        cache: "no-store",
      }
    )
      .then(async (res) => {
        const datos = (await res.json()) as RespuestaApi;
        if (!res.ok || !datos.ok || !datos.tarjeta) {
          throw new Error(datos.error ?? "No pudimos abrir tu tarjeta.");
        }
        return datos.tarjeta;
      })
      .then((cargada) => {
        if (!cancelado) setTarjeta(cargada);
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        borrarAcceso();
        setAcceso(null);
        setToast({
          tipo: "error",
          titulo: "Vuelve a activar tu tarjeta",
          detalle:
            error instanceof Error
              ? error.message
              : "El pase guardado ya no es válido.",
        });
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const temporizador = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(temporizador);
  }, [toast]);

  useEffect(() => {
    if (!paseWallet) return;
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setPaseWallet(null);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [paseWallet]);

  function actualizarCampo<K extends keyof Formulario>(
    campo: K,
    valor: Formulario[K]
  ) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function registrar(datos: RegistroClienteInput) {
    setRegistrando(true);
    setErrorFormulario(null);
    try {
      const res = await fetch("/api/fidelizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registrar", ...datos }),
      });
      const respuesta = (await res.json()) as RespuestaApi;
      if (!res.ok || !respuesta.ok || !respuesta.tarjeta || !respuesta.pase) {
        throw new Error(respuesta.error ?? "No pudimos crear tu tarjeta.");
      }

      const nuevoAcceso = {
        tarjetaId: respuesta.tarjeta.tarjeta.id,
        pase: respuesta.pase,
      };
      guardarAcceso(nuevoAcceso);
      setAcceso(nuevoAcceso);
      setTarjeta(respuesta.tarjeta);
      setFormulario(FORMULARIO_INICIAL);
      setToast({
        tipo: "exito",
        titulo: "Tarjeta activada",
        detalle: "Tu primer sello te espera en la próxima visita.",
      });
    } catch (error) {
      setErrorFormulario(
        error instanceof Error ? error.message : "No pudimos crear tu tarjeta."
      );
    } finally {
      setRegistrando(false);
    }
  }

  function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void registrar({
      nombre: formulario.nombre,
      email: formulario.email,
      telefono: formulario.telefono || undefined,
      consentimientoMarketing: formulario.consentimientoMarketing,
    });
  }

  function probarDemo() {
    const sufijo = crypto.randomUUID().slice(0, 8);
    void registrar({
      nombre: "Marta Solís",
      email: `marta.${sufijo}@demo.nodo`,
      telefono: "+34 600 123 456",
      consentimientoMarketing: true,
    });
  }

  async function sellarVisita() {
    if (!acceso || !tarjeta) {
      setToast({
        tipo: "error",
        titulo: "Activa tu tarjeta",
        detalle: "Necesitas una tarjeta para sumar sellos.",
      });
      return;
    }

    setSellando(true);
    try {
      const res = await fetch("/api/fidelizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sellar",
          tarjetaId: acceso.tarjetaId,
          pase: acceso.pase,
          origen: "compra",
          idempotencia: crypto.randomUUID(),
        }),
      });
      const respuesta = (await res.json()) as RespuestaApi;
      if (!res.ok || !respuesta.ok || !respuesta.tarjeta) {
        throw new Error(respuesta.error ?? "No pudimos sumar el sello.");
      }
      setTarjeta(respuesta.tarjeta);

      if (respuesta.recompensa) {
        setToast({
          tipo: "premio",
          titulo: "¡Premio desbloqueado!",
          detalle: respuesta.recompensa.titulo,
        });
      } else {
        setToast({
          tipo: "exito",
          titulo: "Sello sumado",
          detalle: `${respuesta.tarjeta.tarjeta.saldoSellos} de ${respuesta.tarjeta.resumen.metaSellos} sellos.`,
        });
      }
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos sellar",
        detalle:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
      });
    } finally {
      setSellando(false);
    }
  }

  async function canjear(recompensaId: string) {
    if (!acceso) return;
    setCanjeando(recompensaId);
    try {
      const res = await fetch("/api/fidelizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "canjear",
          tarjetaId: acceso.tarjetaId,
          pase: acceso.pase,
          recompensaId,
        }),
      });
      const respuesta = (await res.json()) as RespuestaApi;
      if (!res.ok || !respuesta.ok || !respuesta.tarjeta) {
        throw new Error(respuesta.error ?? "No pudimos canjear el premio.");
      }
      setTarjeta(respuesta.tarjeta);
      setToast({
        tipo: "exito",
        titulo: "Premio canjeado",
        detalle: "Muestra el código al equipo en tu próxima visita.",
      });
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos canjear",
        detalle:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
      });
    } finally {
      setCanjeando(null);
    }
  }

  async function abrirWallet() {
    if (!acceso) {
      setToast({
        tipo: "error",
        titulo: "Activa tu tarjeta",
        detalle: "El pase Wallet se genera desde tu tarjeta activa.",
      });
      return;
    }

    setGenerandoWallet(true);
    try {
      const res = await fetch("/api/fidelizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wallet",
          tarjetaId: acceso.tarjetaId,
          pase: acceso.pase,
        }),
      });
      const respuesta = (await res.json()) as RespuestaApi;
      if (!res.ok || !respuesta.ok || !respuesta.paseWallet) {
        throw new Error(respuesta.error ?? "No pudimos generar el pase.");
      }
      setPaseWallet(respuesta.paseWallet);
    } catch (error) {
      setToast({
        tipo: "error",
        titulo: "No pudimos generar el pase",
        detalle:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
      });
    } finally {
      setGenerandoWallet(false);
    }
  }

  function comprobarGeocerca() {
    if (!tarjeta) {
      setToast({
        tipo: "error",
        titulo: "Activa tu tarjeta",
        detalle: "La geocerca se calcula sobre el local.",
      });
      return;
    }
    if (!navigator.geolocation) {
      setGeo({
        fase: "error",
        mensaje: "Este navegador no permite geolocalización.",
      });
      return;
    }

    setGeo({ fase: "consultando" });
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const distancia = calcularDistanciaMetros(
          {
            lat: posicion.coords.latitude,
            lng: posicion.coords.longitude,
          },
          tarjeta.geocerca
        );
        setGeo({
          fase: distancia <= tarjeta.geocerca.radioMetros ? "dentro" : "fuera",
          distancia,
        });
      },
      () => {
        setGeo({
          fase: "error",
          mensaje:
            "No pudimos leer tu ubicación. Revisa los permisos del navegador.",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 }
    );
  }

  function descargarPase() {
    if (!paseWallet) return;
    const blob = new Blob([JSON.stringify(paseWallet, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "pase-nodo-wallet.json";
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const recompensasDisponibles =
    tarjeta?.tarjeta.recompensas.filter(
      (recompensa) => recompensa.estado === "disponible"
    ) ?? [];
  const recompensasCanjeadas =
    tarjeta?.tarjeta.recompensas.filter(
      (recompensa) => recompensa.estado === "canjeada"
    ) ?? [];

  return (
    <div className="grain relative min-h-screen overflow-hidden bg-tinta-950">
      <div
        aria-hidden="true"
        className="fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 82% 10%, rgba(210,255,63,0.12) 0%, transparent 62%), radial-gradient(ellipse 50% 45% at 8% 86%, rgba(255,116,70,0.10) 0%, transparent 65%), linear-gradient(180deg, #080907, #0a0c08 60%, #080907)",
        }}
      />
      <div aria-hidden="true" className="malla fixed inset-0 opacity-40" />
      <div
        aria-hidden="true"
        className="fixed -right-48 top-32 h-[34rem] w-[34rem] rounded-full border border-white/[0.06]"
      />

      <header className="relative z-30">
        <div className="contenedor flex items-center justify-between py-5">
          <LogoNodo />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-xs text-hueso-300 transition hover:text-lima-300 sm:block"
            >
              ← Volver al ecosistema
            </Link>
            <span className="rounded-full border border-white/12 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-hueso-300">
              Casa Norte · Madrid
            </span>
          </div>
        </div>
      </header>

      <main className="contenedor relative z-10 pb-24 pt-8 sm:pt-12">
        <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
          <section>
            <div className="mb-9">
              <p className="kicker mb-6">NODO Club · Tarjeta digital</p>
              <h1 className="text-[clamp(2.7rem,6.4vw,6.2rem)] font-extrabold leading-[0.88] tracking-[-0.07em]">
                La noche
                <br />
                que <span className="text-lima-400">vuelve.</span>
              </h1>
              <p className="mt-6 max-w-lg text-balance text-sm leading-relaxed text-hueso-200/65 sm:text-base">
                Ocho sellos, un premio. Tu tarjeta vive en el móvil, entiende
                cuándo estás cerca y guarda cada visita sin que tengas que
                recordarla.
              </p>
            </div>

            <TarjetaVisual
              tarjeta={tarjeta}
              cargando={cargando}
              sellando={sellando}
              onSellar={() => void sellarVisita()}
              onWallet={() => void abrirWallet()}
              generandoWallet={generandoWallet}
            />

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {[
                ["08", "sellos", "hasta el premio"],
                ["180", "metros", "de geocerca"],
                ["01", "pase", "Apple / Google"],
              ].map(([valor, titulo, detalle]) => (
                <div
                  key={titulo}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 sm:p-4"
                >
                  <p className="text-xl font-semibold tracking-[-0.05em] text-hueso-100 sm:text-2xl">
                    {valor}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-hueso-200">
                    {titulo}
                  </p>
                  <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-hueso-400">
                    {detalle}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel relative overflow-hidden p-5 sm:p-7">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-lima-400/[0.08] blur-3xl"
            />

            {cargando ? (
              <div className="space-y-4" aria-label="Cargando tarjeta">
                <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-3/4 animate-pulse rounded-xl bg-white/10" />
                <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
                <div className="h-11 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
            ) : !tarjeta ? (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-mono text-lima-300">Activa tu tarjeta</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.045em]">
                      Empieza a sellar.
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-hueso-200/55">
                      Sin apps. Sin contraseñas. Tu pase se guarda en este
                      dispositivo y se valida en el servidor.
                    </p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-lima-400/30 bg-lima-400/[0.08] text-lima-300">
                    ✳
                  </span>
                </div>

                <form className="mt-6 space-y-3" onSubmit={enviarFormulario}>
                  <div>
                    <label className="mb-1.5 block text-xs text-hueso-300" htmlFor="nombre">
                      Nombre
                    </label>
                    <input
                      id="nombre"
                      className="input"
                      autoComplete="given-name"
                      value={formulario.nombre}
                      onChange={(e) => actualizarCampo("nombre", e.target.value)}
                      placeholder="Marta Solís"
                      required
                      minLength={2}
                      maxLength={80}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-hueso-300" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="input"
                      autoComplete="email"
                      value={formulario.email}
                      onChange={(e) => actualizarCampo("email", e.target.value)}
                      placeholder="marta@correo.com"
                      required
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-hueso-300" htmlFor="telefono">
                      Teléfono <span className="text-hueso-400">(opcional)</span>
                    </label>
                    <input
                      id="telefono"
                      type="tel"
                      className="input"
                      autoComplete="tel"
                      value={formulario.telefono}
                      onChange={(e) => actualizarCampo("telefono", e.target.value)}
                      placeholder="+34 600 000 000"
                      maxLength={20}
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-[11px] leading-relaxed text-hueso-300">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-lima-400"
                      checked={formulario.consentimientoMarketing}
                      onChange={(e) =>
                        actualizarCampo(
                          "consentimientoMarketing",
                          e.target.checked
                        )
                      }
                    />
                    <span>
                      Quiero recibir novedades de Casa Norte. Puedo darme de baja
                      cuando quiera.
                    </span>
                  </label>

                  {errorFormulario && (
                    <p
                      role="alert"
                      className="rounded-xl border border-brasa-400/30 bg-brasa-400/10 px-3 py-2.5 text-xs text-brasa-300"
                    >
                      {errorFormulario}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={registrando}
                    className="btn-lima w-full"
                  >
                    {registrando ? "Activando…" : "Activar mi tarjeta"}
                    <span aria-hidden="true">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={probarDemo}
                    disabled={registrando}
                    className="w-full text-center text-[11px] text-hueso-400 underline decoration-white/20 underline-offset-4 transition hover:text-lima-300 disabled:opacity-40"
                  >
                    Probar con una identidad de demo
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-mono text-lima-300">Tu progreso</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.045em]">
                      {tarjeta.resumen.sellosRestantes === 0
                        ? "Premio listo para canjear."
                        : `Faltan ${tarjeta.resumen.sellosRestantes} ${
                            tarjeta.resumen.sellosRestantes === 1
                              ? "sello"
                              : "sellos"
                          }.`}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-hueso-200/55">
                      Hola, {tarjeta.cliente.nombre.split(" ")[0]}. Cada visita
                      cuenta. El próximo premio se desbloquea al completar la
                      tarjeta.
                    </p>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-lima-400/20 bg-lima-400/[0.08] font-mono text-[10px] text-lima-300">
                    {tarjeta.tarjeta.saldoSellos}/{tarjeta.resumen.metaSellos}
                  </span>
                </div>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lima-400 to-cielo-400 transition-all duration-700"
                    style={{ width: `${tarjeta.resumen.porcentaje}%` }}
                  />
                </div>

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={() => void sellarVisita()}
                    disabled={sellando || tarjeta.tarjeta.estado !== "activa"}
                    className="btn-lima w-full"
                  >
                    {sellando ? "Sellando…" : "Sellar visita demo"}
                    <span aria-hidden="true">＋</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void abrirWallet()}
                    disabled={generandoWallet}
                    className="btn-ghost w-full"
                  >
                    {generandoWallet ? "Preparando pase…" : "Añadir a Wallet"}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>

                <div className="my-6 h-px bg-white/10" />

                <div className="flex items-center justify-between gap-3">
                  <p className="label-mono text-hueso-400">
                    Recompensas
                  </p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-lima-300">
                    {recompensasDisponibles.length} disponibles
                  </span>
                </div>

                {tarjeta.tarjeta.recompensas.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/12 p-5 text-center">
                    <p className="text-sm text-hueso-200/65">
                      Aún no hay premios. Completa los ocho sellos para abrir el
                      primero.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {[...recompensasDisponibles, ...recompensasCanjeadas].map(
                      (recompensa) => (
                        <div
                          key={recompensa.id}
                          className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold tracking-tight">
                                {recompensa.titulo}
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-hueso-300/60">
                                {recompensa.descripcion}
                              </p>
                            </div>
                            {recompensa.estado === "disponible" ? (
                              <span className="shrink-0 rounded-full bg-lima-400 px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-wider text-tinta-950">
                                Listo
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider text-hueso-400">
                                Canjeado
                              </span>
                            )}
                          </div>

                          {recompensa.estado === "disponible" ? (
                            <button
                              type="button"
                              onClick={() => void canjear(recompensa.id)}
                              disabled={canjeando === recompensa.id}
                              className="mt-3 text-[11px] font-semibold text-lima-300 underline decoration-lima-400/30 underline-offset-4 transition hover:text-lima-200 disabled:opacity-40"
                            >
                              {canjeando === recompensa.id
                                ? "Canjeando…"
                                : "Canjear ahora"}
                            </button>
                          ) : (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-tinta-950/40 px-3 py-2">
                              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-hueso-400">
                                Código
                              </span>
                              <span className="font-mono text-[10px] tracking-wider text-hueso-200/50 line-through">
                                {recompensa.codigo}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
              <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
              Sellos y premios calculados en servidor
            </div>
          </aside>
        </div>

        {/* GEOCERCA + WALLET + SEGURIDAD */}
        <section className="mt-16 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <article className="panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-mono text-cielo-300">Geolocalización pasiva</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
                  La tarjeta sabe cuándo estás cerca.
                </h2>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cielo-400/30 bg-cielo-400/10 text-sm text-cielo-300">
                ◎
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-hueso-200/55">
              El pase Wallet incluye la coordenada de Casa Norte y despierta en
              la pantalla de bloqueo al entrar en la geocerca de{" "}
              {tarjeta?.geocerca.radioMetros ?? 180} m.
            </p>

            <div className="mt-4 rounded-xl border border-white/[0.08] bg-tinta-950/40 p-3">
              {geo.fase === "inactiva" && (
                <p className="text-[11px] text-hueso-300/60">
                  Comprueba tu distancia al local. Solo se consulta cuando
                  pulsas el botón.
                </p>
              )}
              {geo.fase === "consultando" && (
                <p className="text-[11px] text-hueso-300/60">
                  Consultando tu ubicación…
                </p>
              )}
              {geo.fase === "dentro" && (
                <p className="text-[11px] text-lima-300">
                  Estás a {geo.distancia} m. Dentro de la geocerca.
                </p>
              )}
              {geo.fase === "fuera" && (
                <p className="text-[11px] text-hueso-200/70">
                  Estás a {geo.distancia} m del local. La geocerca es de{" "}
                  {tarjeta?.geocerca.radioMetros ?? 180} m.
                </p>
              )}
              {geo.fase === "error" && (
                <p className="text-[11px] text-brasa-300">{geo.mensaje}</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={comprobarGeocerca}
                disabled={geo.fase === "consultando" || !tarjeta}
                className="btn-ghost min-h-9 px-3.5 text-[11px]"
              >
                {geo.fase === "consultando" ? "Comprobando…" : "Comprobar cercanía"}
              </button>
              <a
                href="https://maps.google.com/?q=40.42645,-3.70462"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-hueso-400 underline decoration-white/20 underline-offset-4 transition hover:text-hueso-200"
              >
                Cómo llegar
              </a>
            </div>
          </article>

          <article className="panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-mono text-brasa-300">Wallet-ready</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
                  Un pase. Dos plataformas.
                </h2>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brasa-400/30 bg-brasa-400/10 text-sm text-brasa-300">
                ▣
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-hueso-200/55">
              Generamos el payload con campos de pase, código QR y ubicaciones.
              La firma final se conecta con el certificado de Apple y las
              credenciales de Google Wallet del comercio.
            </p>
            <div className="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-tinta-950/40 p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-hueso-400">
              <div className="flex justify-between gap-3">
                <span>storeCard</span>
                <span className="text-hueso-200/70">
                  {tarjeta ? `${tarjeta.tarjeta.saldoSellos}/${tarjeta.resumen.metaSellos}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>locations</span>
                <span className="text-hueso-200/70">
                  {tarjeta?.geocerca.lat.toFixed(4) ?? "40.4264"} /{" "}
                  {tarjeta?.geocerca.lng.toFixed(4) ?? "-3.7046"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>signature</span>
                <span className="text-brasa-300">pending</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void abrirWallet()}
              disabled={generandoWallet || !tarjeta}
              className="btn-ghost mt-4 min-h-9 px-3.5 text-[11px]"
            >
              {generandoWallet ? "Generando…" : "Ver payload del pase"}
            </button>
          </article>

          <article className="panel p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-mono text-hueso-300">Seguridad de la tarjeta</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
                  El saldo no viaja desde tu móvil.
                </h2>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-sm">
                ⛨
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-hueso-200/55">
              El cliente nunca envía puntos ni premios. Solo presenta su pase
              opaco; el servidor valida la propiedad, aplica el sello y decide si
              desbloquea una recompensa.
            </p>
            <div className="mt-4 grid gap-2">
              {[
                "Pase opaco guardado como hash",
                "Sellos con idempotencia",
                "Premios de un solo uso",
              ].map((texto) => (
                <div
                  key={texto}
                  className="flex items-center gap-2.5 text-[11px] text-hueso-300/70"
                >
                  <span className="h-1 w-1 rounded-full bg-lima-400" />
                  {texto}
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className="mt-16 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <LogoNodo />
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-400">
            NODO Club · Demo ejecutable · Los datos viven en memoria
          </p>
          <Link
            href="/carta"
            className="text-xs text-hueso-300 transition hover:text-lima-300"
          >
            Ir a la carta →
          </Link>
        </footer>
      </main>

      {/* TOAST */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 left-1/2 z-[70] w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
            toast.tipo === "error"
              ? "border-brasa-400/40 bg-[#1b0f0a]/95"
              : toast.tipo === "premio"
                ? "border-lima-400/40 bg-[#11150a]/95"
                : "border-white/15 bg-tinta-800/95"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${
                toast.tipo === "error"
                  ? "bg-brasa-400 text-tinta-950"
                  : "bg-lima-400 text-tinta-950"
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
      )}

      {/* MODAL WALLET */}
      {paseWallet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-titulo"
          className="fixed inset-0 z-[80] grid place-items-center bg-tinta-950/80 p-4 backdrop-blur-md"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) setPaseWallet(null);
          }}
        >
          <div className="panel max-h-[90svh] w-full max-w-xl overflow-y-auto p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-mono text-brasa-300">Pase Wallet preparado</p>
                <h2
                  id="wallet-titulo"
                  className="mt-2 text-2xl font-semibold tracking-[-0.045em]"
                >
                  {paseWallet.storeCard.secondaryFields[0]?.value}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPaseWallet(null)}
                aria-label="Cerrar pase Wallet"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-hueso-300 transition hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-tinta-950 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-lima-300">
                  {paseWallet.logoText}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
                  {paseWallet.serialNumber}
                </span>
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
                {paseWallet.storeCard.primaryFields[0]?.value}
              </p>
              <p className="mt-1 text-xs text-hueso-300/60">
                {paseWallet.storeCard.primaryFields[0]?.label} ·{" "}
                {paseWallet.storeCard.secondaryFields[1]?.value}
              </p>
              <div className="mt-5 h-12 rounded-lg bg-[repeating-linear-gradient(90deg,#f4f1e7_0,#f4f1e7_2px,transparent_2px,transparent_5px)] opacity-80" />
              <p className="mt-2 break-all font-mono text-[8px] uppercase tracking-[0.13em] text-hueso-400">
                {paseWallet.barcode.message}
              </p>
            </div>

            <div className="mt-4 grid gap-2 text-[11px] text-hueso-300/65 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
                  Ubicación
                </p>
                <p className="mt-1">{paseWallet.locations[0]?.relevantText}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
                  Formato
                </p>
                <p className="mt-1">
                  JSON Wallet · firma PKPass pendiente de credenciales
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={descargarPase}
                className="btn-lima"
              >
                Descargar payload
                <span aria-hidden="true">↓</span>
              </button>
              <button
                type="button"
                onClick={() => setPaseWallet(null)}
                className="btn-ghost"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-hueso-400">
              Este JSON contiene la estructura del pase y el código QR. Para
              emitir un .pkpass real hay que firmarlo con el certificado Apple
              del comercio; para Google Wallet, se convierte en JWT con la cuenta
              de servicio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaVisual({
  tarjeta,
  cargando,
  sellando,
  onSellar,
  onWallet,
  generandoWallet,
}: {
  tarjeta: TarjetaHidratada | null;
  cargando: boolean;
  sellando: boolean;
  onSellar: () => void;
  onWallet: () => void;
  generandoWallet: boolean;
}) {
  const meta = tarjeta?.resumen.metaSellos ?? 8;
  const saldo = tarjeta?.tarjeta.saldoSellos ?? 0;
  const nombre = tarjeta?.cliente.nombre ?? "Tu nombre";
  const serial = tarjeta?.tarjeta.serialNumber ?? "NODO · PENDIENTE";
  const nivel = tarjeta
    ? NIVELES[tarjeta.tarjeta.nivel]
    : "Semilla";
  const premio = tarjeta?.premios[0];

  return (
    <div className="perspectiva relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[3rem] bg-lima-400/[0.06] blur-3xl"
      />
      <div className="group relative overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(135deg,#171d0e_0%,#0b0d08_42%,#1a2410_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] transition-transform duration-700 hover:-translate-y-1 sm:p-7">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-28 h-72 w-72 rounded-full border border-lima-400/15"
        />
        <div
          aria-hidden="true"
          className="absolute -right-10 top-16 h-36 w-36 rounded-full bg-lima-400/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(115deg, transparent 25%, rgba(244,241,231,0.12) 46%, transparent 62%)",
          }}
        />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-hueso-100/40">
                <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
              </span>
              <span className="text-[13px] font-bold tracking-[-0.06em]">
                NODO<span className="text-lima-400">.</span> CLUB
              </span>
            </div>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-400">
              Casa Norte · Madrid
            </p>
          </div>
          <span className="rounded-full border border-lima-400/25 bg-lima-400/[0.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-lima-300">
            {nivel}
          </span>
        </div>

        <div className="relative z-10 mt-10 flex items-end justify-between gap-4 sm:mt-14">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-hueso-400">
              Socia / socio
            </p>
            <p className="mt-1.5 max-w-[13ch] text-2xl font-semibold leading-none tracking-[-0.05em] sm:text-3xl">
              {cargando ? "Cargando…" : nombre}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-hueso-400">
              Sellos
            </p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-[-0.06em] sm:text-4xl">
              {saldo}
              <span className="text-base font-normal text-hueso-400">/{meta}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-7 grid grid-cols-4 gap-2.5 sm:gap-3">
          {Array.from({ length: meta }).map((_, indice) => {
            const lleno = indice < saldo;
            return (
              <div
                key={indice}
                className={`grid aspect-square place-items-center rounded-full border text-[10px] font-semibold transition-all duration-500 ${
                  lleno
                    ? "border-lima-400 bg-lima-400 text-tinta-950 shadow-[0_0_22px_rgba(210,255,63,0.18)]"
                    : "border-white/15 bg-white/[0.025] text-white/20"
                }`}
              >
                {lleno ? "✳" : String(indice + 1).padStart(2, "0")}
              </div>
            );
          })}
        </div>

        <div className="relative z-10 mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
              Próxima recompensa
            </p>
            <p className="mt-1 text-[11px] font-medium text-hueso-200/80">
              {premio?.nombre ?? "Postre de la casa"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-hueso-400">
              {serial}
            </p>
            <div className="mt-1.5 flex justify-end gap-0.5 opacity-40">
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3].map((alto, indice) => (
                <span
                  key={indice}
                  className="w-[2px] bg-hueso-100"
                  style={{ height: `${6 + alto * 2}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {tarjeta && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3">
          <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
            <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
            Pase vinculado a {tarjeta.cliente.email}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSellar}
              disabled={sellando}
              className="min-h-8 rounded-full bg-lima-400 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-tinta-950 transition hover:bg-lima-300 disabled:opacity-50"
            >
              {sellando ? "…" : "+ Sello demo"}
            </button>
            <button
              type="button"
              onClick={onWallet}
              disabled={generandoWallet}
              className="min-h-8 rounded-full border border-white/15 px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-hueso-300 transition hover:border-white/30 disabled:opacity-50"
            >
              {generandoWallet ? "…" : "Wallet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
