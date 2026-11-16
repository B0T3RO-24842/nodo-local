"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LogoNodo } from "@/components/logo-nodo";
import { formatearEuros } from "@/lib/comandas-engine";
import type {
  Categoria,
  EventoAnalitica,
  FiltroDietario,
  Pedido,
  Producto,
  ResumenAnalitica,
} from "@/types/menu";

interface Carta {
  categorias: Categoria[];
  productos: Producto[];
}

interface RespuestaApi {
  ok: boolean;
  error?: string;
  carta?: Carta;
  resumen?: ResumenAnalitica;
  pedido?: Pedido;
}

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
}

interface Toast {
  titulo: string;
  detalle?: string;
}

const FILTROS: Array<{ id: FiltroDietario; etiqueta: string }> = [
  { id: "vegano", etiqueta: "Vegano" },
  { id: "vegetariano", etiqueta: "Vegetariano" },
  { id: "sin-gluten", etiqueta: "Sin gluten" },
  { id: "sin-lactosa", etiqueta: "Sin lactosa" },
  { id: "picante", etiqueta: "Picante" },
];

const ETIQUETAS_FILTRO: Record<FiltroDietario, string> = {
  vegano: "Vegano",
  vegetariano: "Vegetariano",
  "sin-gluten": "Sin gluten",
  "sin-lactosa": "Sin lactosa",
  picante: "Picante",
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function CartaCliente() {
  const [carta, setCarta] = useState<Carta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [sesionId, setSesionId] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenAnalitica | null>(null);

  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [filtros, setFiltros] = useState<FiltroDietario[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const [cantidadDetalle, setCantidadDetalle] = useState(1);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pedidoCompartido, setPedidoCompartido] = useState<Pedido | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const vistaRegistrada = useRef(false);

  useEffect(() => {
    try {
      const clave = "nodo.carta.sesion.v1";
      let actual = window.sessionStorage.getItem(clave);
      if (!actual) {
        actual = crypto.randomUUID();
        window.sessionStorage.setItem(clave, actual);
      }
      setSesionId(actual);
    } catch {
      setSesionId(crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga(null);

    fetch("/api/menu", { cache: "no-store" })
      .then(async (res) => {
        const datos = (await res.json()) as RespuestaApi;
        if (!res.ok || !datos.ok || !datos.carta) {
          throw new Error(datos.error ?? "No pudimos cargar la carta.");
        }
        return datos.carta;
      })
      .then((cargada) => {
        if (!cancelado) setCarta(cargada);
      })
      .catch((error: unknown) => {
        if (!cancelado) {
          setErrorCarga(
            error instanceof Error
              ? error.message
              : "No pudimos cargar la carta."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [intento]);

  const enviarEvento = useCallback(
    async (
      evento: EventoAnalitica,
      extra: {
        productoId?: string;
        categoriaId?: string;
        valor?: number;
      } = {}
    ) => {
      if (!sesionId) return;
      try {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "evento",
            sesionId,
            evento,
            ...extra,
          }),
          keepalive: true,
        });
        const datos = (await res.json()) as RespuestaApi;
        if (datos.ok && datos.resumen) setResumen(datos.resumen);
      } catch {
        // La analítica nunca debe bloquear la experiencia de la carta.
      }
    },
    [sesionId]
  );

  useEffect(() => {
    if (!sesionId || vistaRegistrada.current) return;
    vistaRegistrada.current = true;
    void enviarEvento("vista_carta");
  }, [enviarEvento, sesionId]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(temporizador);
  }, [toast]);

  useEffect(() => {
    const cerrar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setProductoAbierto(null);
      setCarritoAbierto(false);
      setPedidoCompartido(null);
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, []);

  const productosPorId = useMemo(
    () => new Map((carta?.productos ?? []).map((producto) => [producto.id, producto])),
    [carta]
  );

  const productosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return (carta?.productos ?? []).filter((producto) => {
      if (categoriaActiva !== "todas" && producto.categoriaId !== categoriaActiva) {
        return false;
      }
      if (!filtros.every((filtro) => producto.filtros.includes(filtro))) {
        return false;
      }
      if (!termino) return true;
      return normalizar(
        `${producto.nombre} ${producto.descripcion} ${producto.alergenos.join(" ")}`
      ).includes(termino);
    });
  }, [busqueda, carta, categoriaActiva, filtros]);

  const secciones = useMemo(() => {
    if (!carta) return [];
    const categorias =
      categoriaActiva === "todas"
        ? carta.categorias
        : carta.categorias.filter((categoria) => categoria.id === categoriaActiva);

    return categorias
      .map((categoria) => ({
        categoria,
        productos: productosFiltrados.filter(
          (producto) => producto.categoriaId === categoria.id
        ),
      }))
      .filter((seccion) => seccion.productos.length > 0);
  }, [carta, categoriaActiva, productosFiltrados]);

  const lineasCarrito = useMemo<LineaCarrito[]>(() => {
    return Object.entries(carrito).flatMap(([productoId, cantidad]) => {
      const producto = productosPorId.get(productoId);
      return producto ? [{ producto, cantidad }] : [];
    });
  }, [carrito, productosPorId]);

  const cantidadTotal = lineasCarrito.reduce(
    (total, linea) => total + linea.cantidad,
    0
  );
  const totalCarrito = lineasCarrito.reduce(
    (total, linea) => total + linea.producto.precio * linea.cantidad,
    0
  );
  const hayFiltros = filtros.length > 0 || busqueda.trim().length > 0;

  function abrirProducto(producto: Producto) {
    setProductoAbierto(producto);
    setCantidadDetalle(1);
    void enviarEvento("vista_producto", {
      productoId: producto.id,
      categoriaId: producto.categoriaId,
    });
  }

  function alternarFiltro(filtro: FiltroDietario) {
    const activo = filtros.includes(filtro);
    setFiltros((actuales) =>
      activo ? actuales.filter((item) => item !== filtro) : [...actuales, filtro]
    );
    if (!activo) {
      void enviarEvento("filtro", { categoriaId: filtro });
    }
  }

  function agregarAlCarrito(producto: Producto, cantidad = 1) {
    setCarrito((actual) => ({
      ...actual,
      [producto.id]: (actual[producto.id] ?? 0) + cantidad,
    }));
    setToast({
      titulo: `${producto.nombre} añadido`,
      detalle: cantidad > 1 ? `${cantidad} raciones en tu selección` : undefined,
    });
    void enviarEvento("add_carrito", {
      productoId: producto.id,
      categoriaId: producto.categoriaId,
      valor: cantidad,
    });
  }

  function cambiarCantidad(productoId: string, delta: number) {
    setCarrito((actual) => {
      const siguiente = (actual[productoId] ?? 0) + delta;
      const copia = { ...actual };
      if (siguiente <= 0) delete copia[productoId];
      else copia[productoId] = siguiente;
      return copia;
    });
  }

  function limpiarFiltros() {
    setFiltros([]);
    setBusqueda("");
    setCategoriaActiva("todas");
  }

  async function compartirSeleccion() {
    if (!sesionId || lineasCarrito.length === 0) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pedido",
          sesionId,
          items: lineasCarrito.map((linea) => ({
            productoId: linea.producto.id,
            cantidad: linea.cantidad,
          })),
        }),
      });
      const datos = (await res.json()) as RespuestaApi;
      if (!res.ok || !datos.ok || !datos.pedido) {
        throw new Error(datos.error ?? "No pudimos compartir tu selección.");
      }
      if (datos.resumen) setResumen(datos.resumen);
      setPedidoCompartido(datos.pedido);
      setCarrito({});
      setCarritoAbierto(false);
    } catch (error) {
      setToast({
        titulo: "No pudimos compartir la selección",
        detalle: error instanceof Error ? error.message : "Inténtalo de nuevo.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-hueso-100 text-tinta-950">
      <header className="sticky top-0 z-40 h-[72px] border-b border-tinta-950/10 bg-hueso-100/85 backdrop-blur-2xl">
        <div className="contenedor flex h-full items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <LogoNodo tono="oscuro" />
            <span className="hidden h-4 w-px bg-tinta-950/15 sm:block" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold leading-none">Casa Norte</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-tinta-950/45">
                Carta viva · Cocina abierta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-tinta-950/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.15em] text-tinta-950/55 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brasa-500" />
              Mesa 12 · QR
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-tinta-950/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.15em] text-tinta-950/55">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lima-500" />
              {resumen?.eventos ?? 0} señales
            </span>
            <Link
              href="/"
              aria-label="Volver al inicio"
              className="grid h-9 w-9 place-items-center rounded-full border border-tinta-950/12 text-sm transition hover:bg-tinta-950 hover:text-hueso-100"
            >
              ×
            </Link>
          </div>
        </div>
      </header>

      {/* HERO CARTA */}
      <section className="relative overflow-hidden bg-hueso-100">
        <div aria-hidden="true" className="malla-clara absolute inset-0 opacity-45" />
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-44 h-[32rem] w-[32rem] rounded-full bg-brasa-400/15 blur-[100px]"
        />
        <div className="contenedor relative grid gap-10 pb-12 pt-12 sm:pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-tinta-950/50">
              <span className="h-1.5 w-1.5 rounded-full bg-brasa-500" />
              Carta de temporada · Invierno 2026
            </p>
            <h1 className="text-[clamp(3rem,8vw,7.5rem)] font-extrabold leading-[0.83] tracking-[-0.075em]">
              Hoy se come
              <br />
              <span className="italic text-brasa-500">distinto.</span>
            </h1>
            <p className="mt-6 max-w-xl text-balance text-sm leading-relaxed text-tinta-950/60 sm:text-base">
              Producto de mercado, fuego de encina y una carta que se adapta a ti.
              Filtra lo que necesitas y guarda tu selección para compartirla con
              el equipo de sala.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-tinta-950 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-100">
                {carta?.productos.length ?? 0} platos vivos
              </span>
              <span className="rounded-full border border-tinta-950/12 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-tinta-950/50">
                Sin registro
              </span>
              <span className="rounded-full border border-tinta-950/12 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-tinta-950/50">
                Analítica anónima
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-tinta-950/10 bg-tinta-950 p-5 text-hueso-100 shadow-card sm:p-6">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lima-400/10 blur-3xl"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-lima-300">
                    La carta está escuchando
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.035em]">
                    Pulso de esta sesión
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lima-400" />
                  Live
                </span>
              </div>

              <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4">
                {[
                  [resumen?.productosVistos ?? 0, "vistas"],
                  [resumen?.anadidos ?? 0, "añadidos"],
                  [resumen?.filtrosUsados.length ?? 0, "filtros"],
                ].map(([valor, etiqueta]) => (
                  <div key={etiqueta} className="px-3 first:pl-0 last:pr-0">
                    <p className="text-2xl font-semibold tracking-[-0.05em]">
                      {String(valor).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-hueso-400">
                      {etiqueta}
                    </p>
                  </div>
                ))}
              </div>

              <p className="relative mt-4 text-[11px] leading-relaxed text-hueso-300/55">
                Señales anónimas que ayudan a la cocina a entender qué se mira,
                qué se filtra y qué se pide. Sin cuentas ni datos personales.
              </p>
              <div className="relative mt-4 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-lima-300/70">
                <span className="h-px flex-1 bg-lima-400/25" />
                sesión {sesionId?.slice(0, 6) ?? "· · · ·"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTROS STICKY */}
      <div className="sticky top-[72px] z-30 border-y border-tinta-950/10 bg-hueso-100/90 backdrop-blur-2xl">
        <div className="contenedor py-3">
          <div className="scrollbar-oscuro flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategoriaActiva("todas")}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold transition ${
                categoriaActiva === "todas"
                  ? "bg-tinta-950 text-hueso-100"
                  : "border border-tinta-950/12 text-tinta-950/60 hover:border-tinta-950/30"
              }`}
            >
              Toda la carta
            </button>
            {carta?.categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => setCategoriaActiva(categoria.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold transition ${
                  categoriaActiva === categoria.id
                    ? "bg-tinta-950 text-hueso-100"
                    : "border border-tinta-950/12 text-tinta-950/60 hover:border-tinta-950/30"
                }`}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="scrollbar-oscuro flex items-center gap-1.5 overflow-x-auto pb-1">
              {FILTROS.map((filtro) => {
                const activo = filtros.includes(filtro.id);
                return (
                  <button
                    key={filtro.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => alternarFiltro(filtro.id)}
                    className={`shrink-0 rounded-full px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] transition ${
                      activo
                        ? "bg-brasa-500 text-white"
                        : "border border-tinta-950/10 text-tinta-950/50 hover:border-tinta-950/25 hover:text-tinta-950/80"
                    }`}
                  >
                    {filtro.etiqueta}
                  </button>
                );
              })}
              {hayFiltros && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="shrink-0 px-2 py-1 text-[10px] text-tinta-950/45 underline decoration-tinta-950/20 underline-offset-4 hover:text-tinta-950"
                >
                  Limpiar
                </button>
              )}
            </div>

            <label className="relative block sm:w-64">
              <span className="sr-only">Buscar en la carta</span>
              <span
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-tinta-950/35"
              >
                ⌕
              </span>
              <input
                className="input-claro min-h-9 rounded-full py-2 pl-8 pr-3 text-[11px]"
                placeholder="Buscar plato o ingrediente"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                maxLength={60}
              />
            </label>
          </div>
        </div>
      </div>

      <main className="contenedor pb-28 pt-10">
        {cargando && (
          <div className="space-y-10" aria-label="Cargando carta">
            {[0, 1].map((bloque) => (
              <div key={bloque}>
                <div className="mb-6 h-10 w-64 animate-pulse rounded-xl bg-tinta-950/10" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-80 animate-pulse rounded-[1.5rem] bg-white/60"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!cargando && errorCarga && (
          <div className="mx-auto max-w-md py-20 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-brasa-500">
              Carta no disponible
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              La cocina está reordenando.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tinta-950/55">
              {errorCarga}
            </p>
            <button
              type="button"
              onClick={() => setIntento((valor) => valor + 1)}
              className="btn-oscuro mt-6"
            >
              Volver a intentar
            </button>
          </div>
        )}

        {!cargando && !errorCarga && secciones.length === 0 && (
          <div className="mx-auto max-w-md py-20 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-brasa-500">
              Sin coincidencias
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              No hay platos con esos filtros.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tinta-950/55">
              Prueba a quitar algún filtro o busca otro ingrediente.
            </p>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="btn-oscuro mt-6"
            >
              Ver toda la carta
            </button>
          </div>
        )}

        {!cargando && !errorCarga && secciones.length > 0 && (
          <div className="space-y-16">
            {secciones.map(({ categoria, productos }, indice) => (
              <section
                key={categoria.id}
                id={`categoria-${categoria.id}`}
                className="scroll-mt-48"
              >
                <div className="mb-7 flex flex-col justify-between gap-4 border-t border-tinta-950/15 pt-5 md:flex-row md:items-end">
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                      style={{ color: categoria.acento }}
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="text-[clamp(1.9rem,4vw,3.4rem)] font-semibold leading-none tracking-[-0.06em]">
                        {categoria.nombre}
                      </h2>
                      <p className="mt-2 max-w-lg text-xs leading-relaxed text-tinta-950/50 sm:text-sm">
                        {categoria.descripcion}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-tinta-950/35">
                    {productos.length} {productos.length === 1 ? "plato" : "platos"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {productos.map((producto) => (
                    <article
                      key={producto.id}
                      className="group flex overflow-hidden rounded-[1.5rem] border border-tinta-950/10 bg-hueso-50 shadow-[0_1px_0_rgba(8,9,7,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                    >
                      <div className="flex w-full flex-col">
                        <button
                          type="button"
                          onClick={() => abrirProducto(producto)}
                          aria-label={`Ver detalles de ${producto.nombre}`}
                          className="relative block overflow-hidden text-left"
                        >
                          <div
                            className="relative h-32 overflow-hidden sm:h-36"
                            style={{
                              background: `linear-gradient(135deg, ${producto.acento}35 0%, #f7f5ec 72%)`,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="absolute -bottom-10 -right-2 text-[8rem] font-black leading-none tracking-[-0.1em] opacity-[0.09]"
                            >
                              {producto.nombre.charAt(0)}
                            </span>
                            <div className="absolute left-4 top-4 flex items-center gap-2">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: producto.acento }}
                              />
                              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-tinta-950/45">
                                {categoria.nombre}
                              </span>
                            </div>
                            {producto.destacado && (
                              <span className="absolute right-3 top-3 rounded-full bg-tinta-950 px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-hueso-100">
                                Favorito
                              </span>
                            )}
                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                              <div className="flex flex-wrap gap-1">
                                {producto.filtros.slice(0, 3).map((filtro) => (
                                  <span
                                    key={filtro}
                                    className="rounded-full border border-tinta-950/10 bg-hueso-50/70 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-tinta-950/50 backdrop-blur"
                                  >
                                    {ETIQUETAS_FILTRO[filtro]}
                                  </span>
                                ))}
                              </div>
                              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-tinta-950/40">
                                {producto.tiempoPrepMin} min
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => abrirProducto(producto)}
                              className="text-left"
                            >
                              <h3 className="text-lg font-semibold leading-tight tracking-[-0.045em]">
                                {producto.nombre}
                              </h3>
                            </button>
                            <span className="shrink-0 text-sm font-semibold tracking-tight">
                              {formatearEuros(producto.precio)}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-tinta-950/55 sm:text-xs">
                            {producto.descripcion}
                          </p>

                          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => abrirProducto(producto)}
                              className="font-mono text-[8px] uppercase tracking-[0.14em] text-tinta-950/40 underline decoration-tinta-950/15 underline-offset-4 transition hover:text-tinta-950"
                            >
                              Ver ficha
                            </button>
                            <button
                              type="button"
                              onClick={() => agregarAlCarrito(producto)}
                              className="grid h-8 w-8 place-items-center rounded-full bg-tinta-950 text-base text-hueso-100 transition hover:bg-brasa-500"
                              aria-label={`Añadir ${producto.nombre} a la selección`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-20 flex flex-col justify-between gap-4 border-t border-tinta-950/15 pt-6 sm:flex-row sm:items-center">
          <LogoNodo tono="oscuro" />
          <p className="max-w-md font-mono text-[8px] uppercase tracking-[0.16em] text-tinta-950/40">
            Casa Norte · Carta digital · Analítica anónima de sesión
          </p>
          <Link
            href="/tarjeta"
            className="text-xs text-tinta-950/60 transition hover:text-tinta-950"
          >
            Sumar un sello →
          </Link>
        </footer>
      </main>

      {/* BOTÓN FLOTANTE CARRITO */}
      {cantidadTotal > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6">
          <button
            type="button"
            onClick={() => setCarritoAbierto(true)}
            className="flex w-full max-w-md items-center justify-between gap-5 rounded-full border border-white/10 bg-tinta-950 py-2.5 pl-5 pr-2.5 text-hueso-100 shadow-2xl transition hover:-translate-y-0.5 sm:w-auto sm:min-w-[22rem]"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-lima-400 font-mono text-[10px] font-bold text-tinta-950">
                {cantidadTotal}
              </span>
              <span className="text-xs font-medium">Tu selección</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-hueso-300">
                {formatearEuros(totalCarrito)}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-hueso-100 text-tinta-950">
                →
              </span>
            </span>
          </button>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-4 top-24 z-[75] max-w-xs rounded-2xl border border-tinta-950/10 bg-hueso-50 p-4 text-tinta-950 shadow-2xl sm:left-6"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lima-400 text-[10px]">
              ✓
            </span>
            <div>
              <p className="text-xs font-semibold">{toast.titulo}</p>
              {toast.detalle && (
                <p className="mt-0.5 text-[10px] leading-relaxed text-tinta-950/55">
                  {toast.detalle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {productoAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="producto-titulo"
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-tinta-950/65 p-4 backdrop-blur-md"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) setProductoAbierto(null);
          }}
        >
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-[2rem] bg-hueso-50 shadow-2xl">
            <div
              className="relative h-44"
              style={{
                background: `linear-gradient(135deg, ${productoAbierto.acento}55 0%, #f7f5ec 82%)`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute -bottom-12 -right-3 text-[12rem] font-black leading-none tracking-[-0.12em] opacity-[0.08]"
              >
                {productoAbierto.nombre.charAt(0)}
              </span>
              <button
                type="button"
                onClick={() => setProductoAbierto(null)}
                aria-label="Cerrar ficha"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-tinta-950 text-hueso-100"
              >
                ×
              </button>
              <div className="absolute bottom-5 left-5 right-20">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-tinta-950/45">
                  {carta?.categorias.find(
                    (categoria) => categoria.id === productoAbierto.categoriaId
                  )?.nombre ?? "Carta Casa Norte"}
                </p>
                <h2
                  id="producto-titulo"
                  className="mt-1 text-3xl font-semibold leading-none tracking-[-0.055em]"
                >
                  {productoAbierto.nombre}
                </h2>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm leading-relaxed text-tinta-950/60">
                  {productoAbierto.descripcion}
                </p>
                <span className="shrink-0 text-xl font-semibold tracking-[-0.04em]">
                  {formatearEuros(productoAbierto.precio)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {productoAbierto.filtros.map((filtro) => (
                  <span
                    key={filtro}
                    className="rounded-full border border-tinta-950/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-tinta-950/55"
                  >
                    {ETIQUETAS_FILTRO[filtro]}
                  </span>
                ))}
                <span className="rounded-full border border-tinta-950/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-tinta-950/55">
                  {productoAbierto.tiempoPrepMin} min
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-tinta-950/10 bg-white/50 p-3 text-[10px] leading-relaxed text-tinta-950/50">
                <span className="font-semibold text-tinta-950/70">Alérgenos:</span>{" "}
                {productoAbierto.alergenos.length > 0
                  ? productoAbierto.alergenos.join(", ")
                  : "Ninguno declarado"}
                . Consulta al equipo si tienes una alergia severa.
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-full border border-tinta-950/15 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCantidadDetalle((valor) => Math.max(1, valor - 1))
                    }
                    className="grid h-7 w-7 place-items-center rounded-full text-base transition hover:bg-tinta-950/5"
                    aria-label="Quitar una unidad"
                  >
                    −
                  </button>
                  <span className="min-w-4 text-center font-mono text-xs">
                    {cantidadDetalle}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCantidadDetalle((valor) => Math.min(20, valor + 1))
                    }
                    className="grid h-7 w-7 place-items-center rounded-full text-base transition hover:bg-tinta-950/5"
                    aria-label="Añadir una unidad"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    agregarAlCarrito(productoAbierto, cantidadDetalle);
                    setProductoAbierto(null);
                  }}
                  className="btn-oscuro flex-1"
                >
                  Añadir ·{" "}
                  {formatearEuros(productoAbierto.precio * cantidadDetalle)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER CARRITO */}
      {carritoAbierto && (
        <div
          className="fixed inset-0 z-[80] bg-tinta-950/55 backdrop-blur-sm"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) setCarritoAbierto(false);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="seleccion-titulo"
            className="scrollbar-oscuro absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-hueso-50 p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-brasa-500">
                  Mesa 12 · Selección
                </p>
                <h2
                  id="seleccion-titulo"
                  className="mt-1 text-3xl font-semibold tracking-[-0.06em]"
                >
                  Tu selección
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCarritoAbierto(false)}
                aria-label="Cerrar selección"
                className="grid h-9 w-9 place-items-center rounded-full border border-tinta-950/15 text-lg"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {lineasCarrito.map(({ producto, cantidad }) => (
                <div
                  key={producto.id}
                  className="rounded-2xl border border-tinta-950/10 bg-white/60 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {producto.nombre}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-tinta-950/45">
                        {formatearEuros(producto.precio)} / ración
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatearEuros(producto.precio * cantidad)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 rounded-full border border-tinta-950/15 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(producto.id, -1)}
                        className="grid h-6 w-6 place-items-center text-sm"
                        aria-label={`Quitar una unidad de ${producto.nombre}`}
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center font-mono text-[11px]">
                        {cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(producto.id, 1)}
                        className="grid h-6 w-6 place-items-center text-sm"
                        aria-label={`Añadir una unidad de ${producto.nombre}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCarrito((actual) => {
                          const copia = { ...actual };
                          delete copia[producto.id];
                          return copia;
                        })
                      }
                      className="font-mono text-[8px] uppercase tracking-[0.12em] text-tinta-950/35 underline underline-offset-4 hover:text-brasa-500"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="flex items-center justify-between border-t border-tinta-950/15 pt-4">
                <span className="text-sm text-tinta-950/55">Total estimado</span>
                <span className="text-2xl font-semibold tracking-[-0.05em]">
                  {formatearEuros(totalCarrito)}
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-tinta-950/40">
                No es un pago. Compartes tu selección con el equipo de sala; ellos
                confirman disponibilidad y alérgenos en mesa.
              </p>
              <button
                type="button"
                onClick={() => void compartirSeleccion()}
                disabled={enviando || lineasCarrito.length === 0}
                className="btn-oscuro mt-4 w-full"
              >
                {enviando ? "Compartiendo…" : "Compartir con el equipo"}
                <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={() => setCarritoAbierto(false)}
                className="mt-2 w-full py-2 text-center text-[11px] text-tinta-950/45 underline underline-offset-4"
              >
                Seguir explorando
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* CONFIRMACIÓN */}
      {pedidoCompartido && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pedido-titulo"
          className="fixed inset-0 z-[85] grid place-items-center bg-tinta-950/70 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-[2rem] bg-hueso-50 p-6 text-tinta-950 shadow-2xl sm:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-lima-400 text-lg">
              ✓
            </span>
            <p className="mt-5 font-mono text-[8px] uppercase tracking-[0.18em] text-brasa-500">
              Selección registrada
            </p>
            <h2
              id="pedido-titulo"
              className="mt-1 text-3xl font-semibold tracking-[-0.06em]"
            >
              La mesa ya sabe.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-tinta-950/55">
              Hemos guardado tu selección con una referencia opaca. Muéstrasela
              al equipo si quieres ajustar algo.
            </p>

            <div className="mt-5 rounded-2xl border border-tinta-950/10 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-tinta-950/40">
                  Referencia
                </span>
                <span className="font-mono text-[9px] tracking-wider">
                  #{pedidoCompartido.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-tinta-950/10 pt-3">
                {pedidoCompartido.items.map((item) => (
                  <div
                    key={item.productoId}
                    className="flex items-center justify-between gap-3 text-[11px]"
                  >
                    <span className="text-tinta-950/65">
                      {item.cantidad} × {item.nombre}
                    </span>
                    <span className="font-medium">
                      {formatearEuros(item.precioUnitario * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-tinta-950/10 pt-3">
                <span className="text-xs text-tinta-950/50">Total estimado</span>
                <span className="text-lg font-semibold tracking-[-0.04em]">
                  {formatearEuros(pedidoCompartido.subtotal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPedidoCompartido(null)}
              className="btn-oscuro mt-5 w-full"
            >
              Volver a la carta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
