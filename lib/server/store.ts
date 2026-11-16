import type {
  Cliente,
  RecompensaTarjeta,
  RegistroClienteInput,
  Sello,
  TarjetaHidratada,
  TarjetaWallet,
} from "@/types/fidelizacion";
import type {
  AnaliticaMesa,
  Categoria,
  EventoAnalitica,
  Pedido,
  Producto,
  ResumenAnalitica,
} from "@/types/menu";
import type {
  Comanda,
  ComandaItem,
  ComandaSnapshot,
  EstadoMesa,
  EstadoPedido,
  Mesa,
  Mozo,
  MozoSesion,
  PersonalPublico,
  RolOperativo,
} from "@/types/comandas";
import { CATEGORIAS, PRODUCTOS, PRODUCTOS_POR_ID } from "@/lib/carta-data";
import { calcularMetricasSalon, calcularTotales } from "@/lib/comandas-engine";
import {
  compararHashSeguro,
  generarCodigoRecompensa,
  generarId,
  generarSerialTarjeta,
  generarToken,
  hashPin,
  hashToken,
  type Resultado,
  verificarPin,
} from "@/lib/seguridad";
import {
  aplicarSello,
  calcularResumen,
  elegirPremioCiclo,
  GEOCERCA,
  PREMIOS_CICLO,
} from "@/lib/wallet-engine";

/**
 * Persistencia en memoria para la demo ejecutable.
 *
 * La capa está aislada a propósito: sustituir estas funciones por Prisma /
 * Drizzle + Redis es el único cambio necesario para producción. Los tokens se
 * guardan hasheados y nunca se devuelven desde las consultas internas.
 */

type MozoCredencial = Mozo & { pinHash: string };

type TarjetaInterna = TarjetaWallet & {
  paseHash: string;
  creadaEn: string;
};

interface FallosLogin {
  intentos: number;
  reinicio: number;
}

interface Cuota {
  usos: number;
  reinicio: number;
}

interface Db {
  clientes: Map<string, Cliente>;
  tarjetas: Map<string, TarjetaInterna>;
  sellos: Sello[];
  pedidos: Pedido[];
  analiticas: AnaliticaMesa[];
  mesas: Map<string, Mesa>;
  comandas: Map<string, Comanda>;
  mozos: Map<string, MozoCredencial>;
  sesiones: Map<string, MozoSesion>;
  fallosLogin: Map<string, FallosLogin>;
  cuotas: Map<string, Cuota>;
  idempotencia: Map<string, string>;
}

const globalNodo = globalThis as typeof globalThis & { __nodoDb?: Db };

/** Los PIN demo están en el código fuente: en producción sin variable de entorno, el mozo queda inactivo. */
function crearMozo(
  nombre: string,
  pinEntorno: string | undefined,
  pinDemo: string,
  rol: RolOperativo
): MozoCredencial {
  const pin = pinEntorno ?? (process.env.NODE_ENV === "production" ? null : pinDemo);
  const iniciales = nombre
    .split(" ")
    .map((parte) => parte[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: generarId(),
    nombre,
    iniciales,
    rol,
    activo: pin !== null,
    pinHash: pin === null ? "" : hashPin(pin),
  };
}

function itemDemo(
  productoId: string,
  cantidad: number,
  estado: EstadoPedido,
  notas?: string
): ComandaItem {
  const producto = PRODUCTOS_POR_ID.get(productoId);
  if (!producto) throw new Error(`Producto de seed inexistente: ${productoId}`);
  const ahora = new Date().toISOString();
  return {
    id: generarId(),
    productoId,
    nombre: producto.nombre,
    precioUnitario: producto.precio,
    cantidad,
    notas,
    estado,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}

function crearDb(): Db {
  const ana = crearMozo("Ana Torres", process.env.DEMO_PIN_ANA, "2468", "mozo");
  const leo = crearMozo("Leo Márquez", process.env.DEMO_PIN_LEO, "1357", "supervisor");

  const definicionesMesa = [
    { codigo: "M01", nombre: "Mesa 01", zona: "Ventana", capacidad: 2 },
    { codigo: "M02", nombre: "Mesa 02", zona: "Ventana", capacidad: 2 },
    { codigo: "M03", nombre: "Mesa 03", zona: "Barra", capacidad: 2 },
    { codigo: "M04", nombre: "Mesa 04", zona: "Salón", capacidad: 4 },
    { codigo: "M05", nombre: "Mesa 05", zona: "Salón", capacidad: 4 },
    { codigo: "M06", nombre: "Mesa 06", zona: "Salón", capacidad: 6 },
    { codigo: "M07", nombre: "Mesa 07", zona: "Terraza", capacidad: 4 },
    { codigo: "M08", nombre: "Mesa 08", zona: "Terraza", capacidad: 6 },
  ];

  const ahora = new Date().toISOString();
  const mesas = new Map<string, Mesa>();
  for (const definicion of definicionesMesa) {
    const mesa: Mesa = {
      id: generarId(),
      codigo: definicion.codigo,
      nombre: definicion.nombre,
      zona: definicion.zona,
      capacidad: definicion.capacidad,
      estado: "libre",
      actualizadaEn: ahora,
    };
    mesas.set(mesa.id, mesa);
  }

  const mesaOcupada = [...mesas.values()].find((mesa) => mesa.codigo === "M04");
  const mesaReservada = [...mesas.values()].find((mesa) => mesa.codigo === "M06");
  const mesaPorLimpiar = [...mesas.values()].find((mesa) => mesa.codigo === "M07");

  if (mesaReservada) {
    mesaReservada.estado = "reservada";
    mesaReservada.actualizadaEn = ahora;
  }
  if (mesaPorLimpiar) {
    mesaPorLimpiar.estado = "por_limpiar";
    mesaPorLimpiar.actualizadaEn = ahora;
  }

  const comandas = new Map<string, Comanda>();
  if (mesaOcupada) {
    const comanda: Comanda = {
      id: generarId(),
      mesaId: mesaOcupada.id,
      mozoId: ana.id,
      estado: "abierta",
      items: [
        itemDemo("pan-masa-madre", 2, "entregado"),
        itemDemo("pulpo-brasa", 1, "cocina"),
        itemDemo("vino-tinto", 2, "entregado"),
        itemDemo("tarta-queso", 1, "pendiente"),
      ],
      creadaEn: ahora,
      actualizadaEn: ahora,
    };
    comandas.set(comanda.id, comanda);
    mesaOcupada.estado = "ocupada";
    mesaOcupada.mozoAsignadoId = ana.id;
    mesaOcupada.comandaActivaId = comanda.id;
    mesaOcupada.actualizadaEn = ahora;
  }

  return {
    clientes: new Map(),
    tarjetas: new Map(),
    sellos: [],
    pedidos: [],
    analiticas: [],
    mesas,
    comandas,
    mozos: new Map([
      [ana.id, ana],
      [leo.id, leo],
    ]),
    sesiones: new Map(),
    fallosLogin: new Map(),
    cuotas: new Map(),
    idempotencia: new Map(),
  };
}

const db: Db = globalNodo.__nodoDb ?? crearDb();
if (process.env.NODE_ENV !== "production") {
  globalNodo.__nodoDb = db;
}

/* -------------------------------------------------------------------------- */
/* Administración y acceso                                                    */
/* -------------------------------------------------------------------------- */

export function listarPersonal(): PersonalPublico[] {
  return [...db.mozos.values()]
    .filter((mozo) => mozo.activo)
    .map(({ id, nombre, iniciales, rol }) => ({ id, nombre, iniciales, rol }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function autenticarMozo(mozoId: string, pin: string): Mozo | null {
  const mozo = db.mozos.get(mozoId);
  if (!mozo || !mozo.activo) return null;
  if (!verificarPin(pin, mozo.pinHash)) return null;
  const { pinHash: _pinHash, ...publico } = mozo;
  void _pinHash;
  return publico;
}

export function crearSesionMozo(mozo: Mozo): {
  token: string;
  sesion: MozoSesion;
} {
  const token = generarToken(32);
  const creadaEn = new Date();
  const expiraEn = new Date(creadaEn.getTime() + 8 * 60 * 60 * 1000);
  const sesion: MozoSesion = {
    id: generarId(),
    mozoId: mozo.id,
    nombre: mozo.nombre,
    rol: mozo.rol,
    creadaEn: creadaEn.toISOString(),
    expiraEn: expiraEn.toISOString(),
  };
  db.sesiones.set(hashToken(token), sesion);
  return { token, sesion };
}

export function validarSesionMozo(token: string | null): MozoSesion | null {
  if (!token) return null;
  const clave = hashToken(token);
  const sesion = db.sesiones.get(clave);
  if (!sesion) return null;
  if (new Date(sesion.expiraEn).getTime() <= Date.now()) {
    db.sesiones.delete(clave);
    return null;
  }
  return sesion;
}

export function revocarSesionMozo(token: string): void {
  db.sesiones.delete(hashToken(token));
}

export function comprobarBloqueoLogin(clave: string): {
  bloqueado: boolean;
  reintentarEn: number;
} {
  const registro = db.fallosLogin.get(clave);
  if (!registro) return { bloqueado: false, reintentarEn: 0 };
  if (Date.now() >= registro.reinicio) {
    db.fallosLogin.delete(clave);
    return { bloqueado: false, reintentarEn: 0 };
  }
  return {
    bloqueado: registro.intentos >= 5,
    reintentarEn: Math.max(1, Math.ceil((registro.reinicio - Date.now()) / 1000)),
  };
}

/** Claves controladas por el cliente (IP, sesionId) harían crecer el Map sin límite. */
function podarCaducados(mapa: Map<string, { reinicio: number }>): void {
  if (mapa.size < 10_000) return;
  const ahora = Date.now();
  for (const [clave, valor] of mapa) if (valor.reinicio <= ahora) mapa.delete(clave);
}

export function registrarFalloLogin(clave: string): void {
  podarCaducados(db.fallosLogin);
  const ventana = 5 * 60 * 1000;
  const actual = db.fallosLogin.get(clave);
  if (!actual || Date.now() >= actual.reinicio) {
    db.fallosLogin.set(clave, { intentos: 1, reinicio: Date.now() + ventana });
    return;
  }
  actual.intentos += 1;
}

export function limpiarFallosLogin(clave: string): void {
  db.fallosLogin.delete(clave);
}

export function consumirCuota(
  clave: string,
  maximo: number,
  ventanaMs: number
): boolean {
  podarCaducados(db.cuotas);
  const actual = db.cuotas.get(clave);
  if (!actual || Date.now() >= actual.reinicio) {
    db.cuotas.set(clave, { usos: 1, reinicio: Date.now() + ventanaMs });
    return true;
  }
  if (actual.usos >= maximo) return false;
  actual.usos += 1;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Fidelización                                                               */
/* -------------------------------------------------------------------------- */

export function crearClienteYTarjeta(
  input: RegistroClienteInput
): { tarjeta: TarjetaHidratada; pase: string } {
  const ahora = new Date().toISOString();
  const cliente: Cliente = {
    id: generarId(),
    nombre: input.nombre,
    email: input.email,
    telefono: input.telefono,
    creadoEn: ahora,
    consentimientoMarketing: input.consentimientoMarketing,
  };

  const pase = generarToken(32);
  const tarjeta: TarjetaInterna = {
    id: generarId(),
    clienteId: cliente.id,
    serialNumber: generarSerialTarjeta(),
    saldoSellos: 0,
    sellosHistoricos: 0,
    nivel: "semilla",
    estado: "activa",
    recompensas: [],
    actualizadaEn: ahora,
    paseHash: hashToken(pase),
    creadaEn: ahora,
  };

  db.clientes.set(cliente.id, cliente);
  db.tarjetas.set(tarjeta.id, tarjeta);

  return { tarjeta: hidratarTarjeta(tarjeta), pase };
}

export function obtenerTarjetaInterna(id: string): TarjetaInterna | null {
  return db.tarjetas.get(id) ?? null;
}

export function validarPaseTarjeta(tarjeta: TarjetaInterna, pase: string): boolean {
  return compararHashSeguro(hashToken(pase), tarjeta.paseHash);
}

export function hidratarTarjeta(tarjeta: TarjetaInterna): TarjetaHidratada {
  const cliente = db.clientes.get(tarjeta.clienteId);
  if (!cliente) throw new Error("Cliente de tarjeta no encontrado");

  const { paseHash: _paseHash, creadaEn: _creadaEn, ...publica } = tarjeta;
  void _paseHash;
  void _creadaEn;

  return {
    tarjeta: publica,
    cliente,
    premios: PREMIOS_CICLO,
    geocerca: GEOCERCA,
    resumen: calcularResumen(publica),
  };
}

interface ResultadoSelloServidor {
  duplicado: boolean;
  hidratada: TarjetaHidratada;
  recompensa?: RecompensaTarjeta;
}

export function sellarTarjeta(
  tarjeta: TarjetaInterna,
  origen: Sello["origen"],
  idempotencia?: string
): ResultadoSelloServidor {
  const claveIdempotencia = idempotencia
    ? `sello:${tarjeta.id}:${idempotencia}`
    : null;

  if (claveIdempotencia && db.idempotencia.has(claveIdempotencia)) {
    return { duplicado: true, hidratada: hidratarTarjeta(tarjeta) };
  }

  const ahora = new Date().toISOString();
  const premio = elegirPremioCiclo(tarjeta.sellosHistoricos);
  const resultado = aplicarSello(
    tarjeta,
    {
      tarjetaId: tarjeta.id,
      selloId: generarId(),
      recompensaId: generarId(),
      codigoRecompensa: generarCodigoRecompensa(),
      ahora,
      premio,
    },
    origen
  );

  tarjeta.saldoSellos = resultado.saldoSellos;
  tarjeta.sellosHistoricos = resultado.sellosHistoricos;
  tarjeta.nivel = resultado.nivel;
  tarjeta.recompensas = resultado.recompensas;
  tarjeta.actualizadaEn = ahora;
  db.sellos.push(resultado.sello);
  if (claveIdempotencia) db.idempotencia.set(claveIdempotencia, tarjeta.id);

  return {
    duplicado: false,
    hidratada: hidratarTarjeta(tarjeta),
    recompensa: resultado.recompensaDesbloqueada,
  };
}

export function canjearRecompensa(
  tarjeta: TarjetaInterna,
  recompensaId: string
): Resultado<RecompensaTarjeta> {
  const recompensa = tarjeta.recompensas.find(
    (item) => item.id === recompensaId
  );
  if (!recompensa) {
    return { ok: false, error: "La recompensa no existe.", estado: 404 };
  }
  if (recompensa.estado === "canjeada") {
    return { ok: false, error: "Esta recompensa ya se ha canjeado.", estado: 409 };
  }
  recompensa.estado = "canjeada";
  recompensa.canjeadaEn = new Date().toISOString();
  tarjeta.actualizadaEn = recompensa.canjeadaEn;
  return { ok: true, valor: recompensa };
}

/* -------------------------------------------------------------------------- */
/* Carta y analítica                                                          */
/* -------------------------------------------------------------------------- */

export function obtenerCarta(): {
  categorias: Categoria[];
  productos: Producto[];
} {
  return {
    categorias: [...CATEGORIAS].sort((a, b) => a.orden - b.orden),
    productos: PRODUCTOS.filter((producto) => producto.disponible),
  };
}

export function registrarAnalitica(input: {
  sesionId: string;
  evento: EventoAnalitica;
  productoId?: string;
  categoriaId?: string;
  valor?: number;
}): ResumenAnalitica {
  const analitica: AnaliticaMesa = {
    id: generarId(),
    sesionId: input.sesionId,
    evento: input.evento,
    productoId: input.productoId,
    categoriaId: input.categoriaId,
    valor: input.valor,
    creadoEn: new Date().toISOString(),
  };
  db.analiticas.push(analitica);
  if (db.analiticas.length > 5_000) {
    db.analiticas.splice(0, db.analiticas.length - 5_000);
  }
  return obtenerResumenAnalitica(input.sesionId);
}

function obtenerResumenAnalitica(sesionId: string): ResumenAnalitica {
  const eventos = db.analiticas.filter((item) => item.sesionId === sesionId);
  return {
    sesionId,
    eventos: eventos.length,
    productosVistos: eventos.filter((item) => item.evento === "vista_producto")
      .length,
    anadidos: eventos.filter((item) => item.evento === "add_carrito").length,
    filtrosUsados: eventos
      .filter((item) => item.evento === "filtro")
      .map((item) => item.categoriaId ?? "")
      .filter(Boolean),
    actualizadoEn: new Date().toISOString(),
  };
}

export function guardarPedidoCarta(
  sesionId: string,
  items: Pedido["items"]
): Pedido {
  const pedido: Pedido = {
    id: generarId(),
    sesionId,
    items,
    subtotal: items.reduce(
      (total, item) => total + item.precioUnitario * item.cantidad,
      0
    ),
    creadoEn: new Date().toISOString(),
    estado: "compartido",
  };
  db.pedidos.push(pedido);
  if (db.pedidos.length > 5_000) db.pedidos.splice(0, db.pedidos.length - 5_000);
  return pedido;
}

/* -------------------------------------------------------------------------- */
/* Salón / comandas                                                           */
/* -------------------------------------------------------------------------- */

function listarMesas(): Mesa[] {
  return [...db.mesas.values()].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "es")
  );
}

export function obtenerComanda(comandaId: string): Comanda | null {
  return db.comandas.get(comandaId) ?? null;
}

function listarComandas(): Comanda[] {
  return [...db.comandas.values()].filter(
    (comanda) => comanda.estado !== "cerrada"
  );
}

export function crearComanda(
  mesaId: string,
  mozoId: string,
  itemsEntrada: Array<{ productoId: string; cantidad: number; notas?: string }>
): Resultado<Comanda> {
  const mesa = db.mesas.get(mesaId);
  if (!mesa) return { ok: false, error: "Mesa no encontrada.", estado: 404 };
  if (mesa.estado === "ocupada" || mesa.comandaActivaId) {
    return { ok: false, error: "La mesa ya tiene una comanda abierta.", estado: 409 };
  }
  if (mesa.estado === "por_limpiar") {
    return {
      ok: false,
      error: "La mesa debe marcarse como libre antes de abrir una comanda.",
      estado: 409,
    };
  }

  const ahora = new Date().toISOString();
  const items: ComandaItem[] = [];
  for (const entrada of itemsEntrada) {
    const producto = PRODUCTOS_POR_ID.get(entrada.productoId);
    if (!producto || !producto.disponible) {
      return { ok: false, error: "Producto no disponible.", estado: 422 };
    }
    items.push({
      id: generarId(),
      productoId: producto.id,
      nombre: producto.nombre,
      precioUnitario: producto.precio,
      cantidad: entrada.cantidad,
      notas: entrada.notas,
      estado: "pendiente",
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  const comanda: Comanda = {
    id: generarId(),
    mesaId,
    mozoId,
    items,
    estado: "abierta",
    creadaEn: ahora,
    actualizadaEn: ahora,
  };

  db.comandas.set(comanda.id, comanda);
  mesa.estado = "ocupada";
  mesa.mozoAsignadoId = mozoId;
  mesa.comandaActivaId = comanda.id;
  mesa.actualizadaEn = ahora;
  return { ok: true, valor: comanda };
}

export function agregarItemsComanda(
  comandaId: string,
  itemsEntrada: Array<{ productoId: string; cantidad: number; notas?: string }>
): Resultado<Comanda> {
  const comanda = db.comandas.get(comandaId);
  if (!comanda) return { ok: false, error: "Comanda no encontrada.", estado: 404 };
  if (comanda.estado === "cerrada") {
    return { ok: false, error: "La comanda ya está cerrada.", estado: 409 };
  }

  const ahora = new Date().toISOString();
  for (const entrada of itemsEntrada) {
    const producto = PRODUCTOS_POR_ID.get(entrada.productoId);
    if (!producto || !producto.disponible) {
      return { ok: false, error: "Producto no disponible.", estado: 422 };
    }
    comanda.items.push({
      id: generarId(),
      productoId: producto.id,
      nombre: producto.nombre,
      precioUnitario: producto.precio,
      cantidad: entrada.cantidad,
      notas: entrada.notas,
      estado: "pendiente",
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }
  comanda.actualizadaEn = ahora;
  const mesa = db.mesas.get(comanda.mesaId);
  if (mesa) mesa.actualizadaEn = ahora;
  return { ok: true, valor: comanda };
}

export function actualizarEstadoItem(
  comandaId: string,
  itemId: string,
  estado: EstadoPedido
): Resultado<Comanda> {
  const comanda = db.comandas.get(comandaId);
  if (!comanda) return { ok: false, error: "Comanda no encontrada.", estado: 404 };
  if (comanda.estado === "cerrada") {
    return { ok: false, error: "La comanda ya está cerrada.", estado: 409 };
  }
  const item = comanda.items.find((linea) => linea.id === itemId);
  if (!item) {
    return { ok: false, error: "Línea de comanda no encontrada.", estado: 404 };
  }
  const ahora = new Date().toISOString();
  item.estado = estado;
  item.actualizadoEn = ahora;
  comanda.actualizadaEn = ahora;
  return { ok: true, valor: comanda };
}

export function cerrarComanda(
  comandaId: string,
  propinaPct: number
): Resultado<Comanda> {
  const comanda = db.comandas.get(comandaId);
  if (!comanda) return { ok: false, error: "Comanda no encontrada.", estado: 404 };
  if (comanda.estado === "cerrada") {
    return { ok: false, error: "La comanda ya está cerrada.", estado: 409 };
  }

  const ahora = new Date().toISOString();
  const totales = calcularTotales(comanda.items, propinaPct);
  comanda.estado = "cerrada";
  comanda.cerradaEn = ahora;
  comanda.actualizadaEn = ahora;
  comanda.totalCobrado = totales.total;

  const mesa = db.mesas.get(comanda.mesaId);
  if (mesa) {
    mesa.estado = "por_limpiar";
    mesa.comandaActivaId = undefined;
    mesa.mozoAsignadoId = undefined;
    mesa.actualizadaEn = ahora;
  }

  return { ok: true, valor: comanda };
}

export function actualizarEstadoMesa(
  mesaId: string,
  estado: Extract<EstadoMesa, "libre" | "por_limpiar" | "reservada">
): Resultado<Mesa> {
  const mesa = db.mesas.get(mesaId);
  if (!mesa) return { ok: false, error: "Mesa no encontrada.", estado: 404 };
  if (mesa.comandaActivaId) {
    return {
      ok: false,
      error: "No se puede cambiar el estado con una comanda abierta.",
      estado: 409,
    };
  }
  mesa.estado = estado;
  mesa.actualizadaEn = new Date().toISOString();
  return { ok: true, valor: mesa };
}

export function construirSnapshot(sesion: MozoSesion): ComandaSnapshot {
  const mesas = listarMesas();
  const comandas = listarComandas();
  return {
    sesion,
    mesas,
    comandas,
    carta: obtenerCarta(),
    metricas: calcularMetricasSalon(mesas, comandas),
  };
}
