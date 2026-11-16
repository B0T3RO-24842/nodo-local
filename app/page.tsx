import Link from "next/link";

import { LogoNodo } from "@/components/logo-nodo";

const modulos = [
  {
    indice: "01",
    nombre: "Escaparate cinemático",
    descripcion:
      "Una portada que se recuerda. Tipografía editorial, movimiento contenido y una identidad que vende antes de que el cliente pida.",
    etiquetas: ["Dirección de arte", "Storytelling", "Conversión"],
    href: "#inicio",
    estado: "Estás aquí",
    acento: "bg-lima-400",
    textoAcento: "text-tinta-950",
  },
  {
    indice: "02",
    nombre: "Tarjeta Club",
    descripcion:
      "Sellos, niveles y premios con pase listo para Apple y Google Wallet. La geocerca despierta la tarjeta justo cuando el cliente pasa cerca.",
    etiquetas: ["Wallet", "Geofencing", "Recompensas"],
    href: "/tarjeta",
    estado: "Abrir tarjeta",
    acento: "bg-brasa-400",
    textoAcento: "text-tinta-950",
  },
  {
    indice: "03",
    nombre: "Carta Viva",
    descripcion:
      "Una carta que se lee como una revista y aprende como un embudo. Cada vista, filtro y selección se convierte en una señal útil para el negocio.",
    etiquetas: ["QR", "Analítica", "Filtros dietéticos"],
    href: "/carta",
    estado: "Ver la carta",
    acento: "bg-cielo-400",
    textoAcento: "text-tinta-950",
  },
  {
    indice: "04",
    nombre: "Salón OS",
    descripcion:
      "Comandas, estados de cocina y división de cuenta en una consola rápida. Acceso por PIN, sesiones opacas y comprobación de propiedad en cada mutación.",
    etiquetas: ["PIN", "Anti-IDOR", "Tiempo real"],
    href: "/comandas",
    estado: "Entrar al panel",
    acento: "bg-[#c5a3ff]",
    textoAcento: "text-tinta-950",
  },
];

const reglas = [
  {
    codigo: "01",
    titulo: "IDs que no se adivinan",
    texto:
      "UUID v4 y tokens opacos. Nunca rutas como /mesa/4 ni identificadores secuenciales expuestos.",
  },
  {
    codigo: "02",
    titulo: "PIN que no se almacena",
    texto:
      "Cada PIN se deriva con scrypt, sal única y pepper de entorno. El servidor compara con timingSafeEqual.",
  },
  {
    codigo: "03",
    titulo: "La sesión manda",
    texto:
      "El rol y el mozoId se leen de la sesión emitida tras el PIN. El body del cliente no puede inyectarlos.",
  },
  {
    codigo: "04",
    titulo: "Propiedad antes que acción",
    texto:
      "Cada comanda se cruza con su propietario y rol antes de mutar. Un ID filtrado no basta para operar.",
  },
];

export default function HomePage() {
  return (
    <main className="overflow-clip bg-tinta-950">
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="contenedor pt-4 sm:pt-5">
          <div className="flex items-center justify-between rounded-full border border-white/10 bg-tinta-950/65 px-4 py-2.5 shadow-2xl backdrop-blur-2xl sm:px-5">
            <LogoNodo />

            <nav
              aria-label="Navegación principal"
              className="hidden items-center gap-7 text-[12px] font-medium text-hueso-200 lg:flex"
            >
              <a className="transition hover:text-lima-300" href="#manifiesto">
                El sistema
              </a>
              <a className="transition hover:text-lima-300" href="#modulos">
                Módulos
              </a>
              <a className="transition hover:text-lima-300" href="#accesos">
                Accesos
              </a>
              <a className="transition hover:text-lima-300" href="#seguridad">
                Seguridad
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-hueso-300 md:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-lima-400 shadow-[0_0_10px_rgba(210,255,63,0.8)]" />
                Demo viva
              </span>
              <Link
                href="/comandas"
                className="btn-lima min-h-9 px-4 text-[11px] uppercase tracking-[0.12em]"
              >
                <span className="hidden sm:inline">Abrir panel</span>
                <span className="sm:hidden">Panel</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        id="inicio"
        className="grain relative flex min-h-[100svh] flex-col overflow-hidden bg-tinta-950"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 77% 36%, rgba(210,255,63,0.10) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 9% 92%, rgba(255,116,70,0.10) 0%, transparent 65%), linear-gradient(180deg, #080907 0%, #090b08 58%, #0c0e0a 100%)",
          }}
        />
        <div aria-hidden="true" className="malla absolute inset-0 opacity-50" />
        <div
          aria-hidden="true"
          className="absolute -right-[18rem] top-[5%] h-[46rem] w-[46rem] rounded-full border border-white/[0.07]"
        >
          <div className="absolute inset-[12%] rounded-full border border-white/[0.06]" />
          <div className="absolute inset-[26%] rounded-full border border-lima-400/15" />
          <div className="absolute inset-[38%] rounded-full bg-lima-400/[0.035] blur-3xl" />
        </div>
        <div
          aria-hidden="true"
          className="absolute right-[10%] top-[18%] h-72 w-72 animate-aurora rounded-full bg-lima-400/[0.09] blur-[100px]"
        />

        <div className="contenedor relative z-10 flex flex-1 flex-col justify-end pb-8 pt-32 sm:pt-36 lg:pt-40">
          <div className="grid flex-1 items-center gap-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
            <div className="animate-aparecer">
              <div className="mb-7 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-lima-400/25 bg-lima-400/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-lima-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
                  Ecosistema local · Edición 01
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-hueso-400">
                  Madrid / 40.4264° N
                </span>
              </div>

              <h1 className="display sombra-texto max-w-[10ch]">
                <span className="block">El barrio</span>
                <span className="block text-hueso-200/90">en otro</span>
                <span className="block">
                  nivel<span className="text-lima-400">.</span>
                </span>
              </h1>

              <div className="mt-9 grid max-w-3xl gap-7 sm:grid-cols-[1.1fr_0.9fr] sm:items-end">
                <p className="text-balance text-base leading-relaxed text-hueso-200/75 sm:text-lg">
                  Marketing que se siente. Operaciones que funcionan. Cuatro
                  módulos conectados para que un comercio local compita con la
                  experiencia de una gran marca, sin perder su alma.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Link href="/carta" className="btn-lima">
                    Vivir la experiencia
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="#modulos" className="btn-ghost">
                    Ver arquitectura
                  </Link>
                </div>
              </div>
            </div>

            {/* Consola visual del ecosistema */}
            <div className="relative mx-auto hidden w-full max-w-[26rem] animate-aparecer animacion-retraso-2 lg:block">
              <div className="absolute -inset-8 rounded-full bg-lima-400/[0.06] blur-3xl" />
              <div className="relative rotate-[-2.5deg] rounded-[2rem] border border-white/15 bg-white/[0.055] p-2.5 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-700 hover:rotate-0">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-tinta-950/95">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-brasa-400" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#f3c969]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-hueso-400">
                      nodo / live
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="mb-5 flex items-end justify-between">
                      <div>
                        <p className="label-mono text-hueso-400">Casa Norte</p>
                        <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                          Una noche conectada
                        </p>
                      </div>
                      <span className="rounded-full border border-lima-400/25 bg-lima-400/[0.08] px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-lima-300">
                        En vivo
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        ["01", "Escaparate", "Identidad"],
                        ["02", "Tarjeta", "5 / 8 sellos"],
                        ["03", "Carta", "38 señales"],
                        ["04", "Salón", "M04 · cocina"],
                      ].map(([numero, nombre, estado], indice) => (
                        <div
                          key={numero}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3"
                        >
                          <span className="font-mono text-[9px] text-hueso-400">
                            {numero}
                          </span>
                          <span className="flex-1 text-xs font-medium">
                            {nombre}
                          </span>
                          <span
                            className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                              indice === 3 ? "text-brasa-300" : "text-hueso-400"
                            }`}
                          >
                            {estado}
                          </span>
                          <span
                            className={`h-1 w-1 rounded-full ${
                              indice === 3 ? "bg-brasa-400" : "bg-lima-400"
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                        <p className="label-mono text-hueso-400">Ticket medio</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight">
                          34,80 €
                          <span className="ml-1 font-mono text-[9px] font-normal text-lima-300">
                            +12%
                          </span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                        <p className="label-mono text-hueso-400">Retorno</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight">
                          Cada 8
                          <span className="ml-1 font-mono text-[9px] font-normal text-hueso-400">
                            sellos
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-lima-400 via-cielo-400 to-brasa-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-7 -left-7 animate-flotar rounded-2xl border border-lima-400/30 bg-lima-400 px-4 py-3 text-tinta-950 shadow-halo">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-60">
                  Recompensa
                </p>
                <p className="mt-0.5 text-sm font-bold tracking-tight">
                  Postre desbloqueado
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 hidden items-center justify-between border-t border-white/10 pt-5 md:flex">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-[11px]">
                ↓
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-hueso-400">
                Desliza para entrar
              </span>
            </div>
            <div className="flex items-center gap-8 font-mono text-[9px] uppercase tracking-[0.2em] text-hueso-400">
              <span>4 motores</span>
              <span>1 identidad</span>
              <span>0 fricción</span>
              <span className="text-lima-300">Next.js 16</span>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="relative overflow-hidden border-y border-white/10 bg-lima-400 py-3 text-tinta-950">
        <div className="flex w-max animate-marquesina">
          {[0, 1].map((grupo) => (
            <div
              key={grupo}
              aria-hidden={grupo === 1}
              className="flex shrink-0 items-center gap-8 pr-8 font-mono text-[10px] font-semibold uppercase tracking-[0.22em]"
            >
              <span>Escaparate cinemático</span>
              <span aria-hidden="true">✳</span>
              <span>Tarjeta Wallet</span>
              <span aria-hidden="true">✳</span>
              <span>Carta analítica</span>
              <span aria-hidden="true">✳</span>
              <span>Salón sin fricción</span>
              <span aria-hidden="true">✳</span>
              <span>Una sola infraestructura</span>
              <span aria-hidden="true">✳</span>
            </div>
          ))}
        </div>
      </div>

      {/* MANIFIESTO */}
      <section
        id="manifiesto"
        className="relative border-b border-white/10 bg-tinta-900 py-24 sm:py-32"
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-lima-400/30 to-transparent"
        />
        <div className="contenedor">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="kicker mb-8">El manifiesto</p>
              <h2 className="titulo-seccion text-balance">
                No es una web.
                <br />
                <span className="text-hueso-400">Es el sistema</span>
                <br />
                de tu negocio.
              </h2>
            </div>

            <div className="flex flex-col justify-between gap-12">
              <div className="space-y-6 text-base leading-relaxed text-hueso-200/70 sm:text-lg">
                <p>
                  El comercio local no necesita más herramientas sueltas.
                  Necesita una experiencia coherente: la misma voz en la
                  portada, en la carta, en la tarjeta y en la mesa.
                </p>
                <p>
                  NODO conecta marketing y operaciones en una arquitectura
                  modular, segura y medible. Cada señal de consumo vuelve al
                  negocio. Cada interacción se siente como parte de la misma
                  noche.
                </p>
              </div>

              <div className="grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-6">
                {[
                  ["04", "Módulos", "conectados"],
                  ["01", "Identidad", "sin costuras"],
                  ["00", "Fricción", "en el acceso"],
                ].map(([numero, titulo, detalle]) => (
                  <div key={titulo} className="px-4 first:pl-0 last:pr-0">
                    <p className="text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">
                      {numero}
                    </p>
                    <p className="mt-2 text-xs font-medium text-hueso-200">
                      {titulo}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-hueso-400">
                      {detalle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MÓDULOS */}
      <section
        id="modulos"
        className="relative overflow-hidden rounded-t-[2.5rem] bg-hueso-100 py-24 text-tinta-950 sm:py-32"
      >
        <div aria-hidden="true" className="malla-clara absolute inset-0 opacity-50" />
        <div className="contenedor relative">
          <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-tinta-950/55">
                <span className="h-1.5 w-1.5 rounded-full bg-tinta-950" />
                02 · Arquitectura modular
              </p>
              <h2 className="titulo-seccion max-w-[13ch] text-balance">
                Cuatro motores.
                <br />
                Una misma noche.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-tinta-950/60">
              Cada módulo funciona solo. Juntos multiplican el valor: la carta
              alimenta el salón, el salón alimenta la tarjeta y la tarjeta hace
              que el cliente vuelva.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {modulos.map((modulo) => (
              <Link
                key={modulo.indice}
                href={modulo.href}
                className="group relative flex min-h-[23rem] flex-col justify-between overflow-hidden rounded-[1.8rem] border border-tinta-950/15 bg-hueso-50 p-6 transition-all duration-500 hover:-translate-y-1 hover:bg-tinta-950 hover:text-hueso-100 hover:shadow-2xl sm:p-8"
              >
                <div
                  aria-hidden="true"
                  className={`absolute -right-24 -top-24 h-64 w-64 rounded-full ${modulo.acento} opacity-[0.14] blur-3xl transition-all duration-700 group-hover:scale-125 group-hover:opacity-30`}
                />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-45">
                    Módulo {modulo.indice}
                  </span>
                  <span
                    className={`rounded-full ${modulo.acento} ${modulo.textoAcento} px-3 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.15em]`}
                  >
                    {modulo.estado}
                  </span>
                </div>

                <div className="relative z-10 mt-16">
                  <div className="mb-7 flex items-center gap-2">
                    <span className={`h-px flex-1 ${modulo.acento} opacity-30`} />
                    <span
                      className={`h-9 w-9 rounded-full border border-current/20 transition-all duration-500 group-hover:rotate-45 group-hover:border-current/40`}
                    >
                      <span className="grid h-full w-full place-items-center text-lg">
                        ↗
                      </span>
                    </span>
                  </div>
                  <h3 className="text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
                    {modulo.nombre}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed opacity-60">
                    {modulo.descripcion}
                  </p>
                </div>

                <div className="relative z-10 mt-8 flex flex-wrap items-center gap-1.5">
                  {modulo.etiquetas.map((etiqueta) => (
                    <span
                      key={etiqueta}
                      className="rounded-full border border-current/15 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] opacity-60"
                    >
                      {etiqueta}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESOS */}
      <section
        id="accesos"
        className="relative overflow-hidden bg-tinta-950 py-24 sm:py-32"
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-lima-400/[0.04] blur-[120px]"
        />
        <div className="contenedor relative">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="kicker mb-6">Elige tu puerta</p>
              <h2 className="titulo-seccion max-w-[13ch] text-balance">
                ¿Vienes a disfrutar o a operar?
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-hueso-200/55">
              Dos experiencias, un mismo sistema. Sin descargas, sin esperas y
              sin compartir datos de más.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="group relative min-h-[34rem] overflow-hidden rounded-[2.5rem] border border-white/10 bg-tinta-900 p-7 sm:p-10">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-80"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 65% at 75% 15%, rgba(210,255,63,0.20) 0%, transparent 60%), linear-gradient(145deg, rgba(255,255,255,0.03), transparent 55%)",
                }}
              />
              <div aria-hidden="true" className="malla absolute inset-0 opacity-30" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="label-mono text-lima-300">Acceso cliente</span>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 font-mono text-[10px]">
                    01
                  </span>
                </div>

                <div className="my-12">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hueso-400">
                    Sin cuenta. Sin fricción.
                  </p>
                  <h3 className="mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-5xl">
                    Tu tarjeta.
                    <br />
                    Tu carta.
                    <br />
                    <span className="text-lima-400">Tu noche.</span>
                  </h3>
                  <p className="mt-5 max-w-sm text-sm leading-relaxed text-hueso-200/60">
                    Consulta tus sellos y premios, o abre la carta del local con
                    filtros dietéticos y una experiencia pensada para el móvil.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link href="/tarjeta" className="btn-lima">
                    Abrir mi tarjeta
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/carta" className="btn-ghost">
                    Ver la carta
                  </Link>
                </div>
              </div>
            </article>

            <article className="group relative min-h-[34rem] overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#11130f] p-7 sm:p-10">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 65% at 20% 80%, rgba(255,116,70,0.18) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 92% 8%, rgba(99,214,197,0.12) 0%, transparent 55%)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute -right-28 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full border border-white/[0.08]"
              />
              <div
                aria-hidden="true"
                className="absolute -right-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full border border-white/[0.08]"
              />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="label-mono text-brasa-300">Acceso equipo</span>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 font-mono text-[10px]">
                    02
                  </span>
                </div>

                <div className="my-12">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hueso-400">
                    PIN + sesión opaca · 8 h
                  </p>
                  <h3 className="mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-5xl">
                    El salón,
                    <br />
                    bajo control.
                    <br />
                    <span className="text-brasa-400">Sin ruido.</span>
                  </h3>
                  <p className="mt-5 max-w-sm text-sm leading-relaxed text-hueso-200/60">
                    Abre mesas, envía platos a cocina, actualiza estados y divide
                    cuentas. Cada acción se valida contra la sesión del personal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link href="/comandas" className="btn-hueso">
                    Entrar al panel
                    <span aria-hidden="true">→</span>
                  </Link>
                  <span className="rounded-full border border-white/15 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-hueso-300">
                    Demo PIN 2468
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section
        id="seguridad"
        className="relative border-y border-white/10 bg-tinta-900 py-24 sm:py-32"
      >
        <div className="contenedor">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <p className="kicker mb-8">Backend first</p>
              <h2 className="titulo-seccion text-balance">
                La confianza
                <br />
                también se diseña.
              </h2>
              <p className="mt-7 max-w-md text-sm leading-relaxed text-hueso-200/60 sm:text-base">
                Un PIN no es una puerta decorativa. La seguridad vive en el
                servidor: sesiones que caducan, permisos que se comprueban y
                mutaciones que jamás confían en el cliente.
              </p>

              <div className="mt-9 flex flex-wrap gap-2">
                {["UUID v4", "scrypt", "timingSafeEqual", "Rate limit", "Anti-IDOR"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/12 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-hueso-300"
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-tinta-950">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brasa-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f3c969]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-lima-400" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-hueso-400">
                    mutación protegida
                  </span>
                </div>
                <div className="scrollbar-fino overflow-x-auto p-5 font-mono text-[11px] leading-7 text-hueso-300">
                  <p>
                    <span className="text-hueso-400">PATCH</span>{" "}
                    <span className="text-cielo-300">/api/comandas</span>
                  </p>
                  <p>
                    <span className="text-hueso-400">header</span>{" "}
                    x-sesion-operativa:{" "}
                    <span className="text-lima-300">tok_9f8a…</span>
                  </p>
                  <p className="mt-2">
                    <span className="text-brasa-300">assert</span> sesion.rol ∈
                    [mozo, supervisor]
                  </p>
                  <p>
                    <span className="text-brasa-300">assert</span> comanda.mozoId
                    === sesion.mozoId
                  </p>
                  <p>
                    <span className="text-brasa-300">assert</span> item.comandaId
                    === comanda.id
                  </p>
                  <p>
                    <span className="text-brasa-300">assert</span> transición
                    válida(item.estado → nuevo)
                  </p>
                  <p className="mt-2 text-lima-300">
                    ✓ 200 · snapshot actualizado
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {reglas.map((regla) => (
                  <article
                    key={regla.codigo}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-colors hover:border-lima-400/25 hover:bg-white/[0.045]"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-lima-300">
                      {regla.codigo} / regla
                    </p>
                    <h3 className="mt-3 text-sm font-semibold tracking-tight">
                      {regla.titulo}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-hueso-200/55">
                      {regla.texto}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="grain relative overflow-hidden bg-tinta-950 py-24 sm:py-32">
        <div
          aria-hidden="true"
          className="absolute right-[-10%] top-1/2 h-[36rem] w-[36rem] -translate-y-1/2 rounded-full bg-brasa-400/[0.07] blur-[100px]"
        />
        <div aria-hidden="true" className="malla absolute inset-0 opacity-30" />
        <div className="contenedor relative">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <p className="kicker mb-7">Fin del recorrido. Inicio de la noche.</p>
              <h2 className="display-md max-w-[11ch] text-balance">
                Nos vemos
                <br />
                en el <span className="text-lima-400">barrio.</span>
              </h2>
            </div>
            <div className="flex flex-col items-start gap-4 lg:items-end">
              <p className="max-w-sm text-sm leading-relaxed text-hueso-200/55 lg:text-right">
                Recorre los cuatro módulos de NODO. La demo incluye datos,
                credenciales y estados reales de operación.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/tarjeta" className="btn-lima">
                  Empezar por la tarjeta
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/comandas" className="btn-ghost">
                  Abrir el salón
                </Link>
              </div>
            </div>
          </div>

          <footer className="mt-20 border-t border-white/10 pt-7">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex flex-wrap items-center gap-6">
                <LogoNodo />
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-hueso-400">
                  Marketing × Operaciones
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-[11px] text-hueso-300">
                <Link className="transition hover:text-lima-300" href="/tarjeta">
                  Tarjeta
                </Link>
                <Link className="transition hover:text-lima-300" href="/carta">
                  Carta
                </Link>
                <Link className="transition hover:text-lima-300" href="/comandas">
                  Comandas
                </Link>
                <span className="text-hueso-400">© 2026 NODO Local</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-4 font-mono text-[8px] uppercase tracking-[0.18em] text-hueso-500 sm:flex-row">
              <span>Next.js 16 · TypeScript · Tailwind CSS</span>
              <span>Demo ejecutable · Persistencia en memoria</span>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
