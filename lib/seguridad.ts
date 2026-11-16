import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import type { RegistroClienteInput } from "@/types/fidelizacion";
import type { EventoAnalitica } from "@/types/menu";

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; error: string; estado?: number };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,59}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{24,220}$/;
const PIN_RE = /^\d{4,8}$/;

/** Lectura perezosa: no rompe `next build`, pero en producción nunca cae al valor demo público. */
function secreto(nombre: "PIN_PEPPER" | "SESSION_PEPPER", demo: string): string {
  const valor = process.env[nombre];
  if (valor) return valor;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${nombre} es obligatorio en producción.`);
  }
  return demo;
}

const EVENTOS_CARTA: EventoAnalitica[] = [
  "vista_carta",
  "vista_producto",
  "filtro",
  "add_carrito",
  "pedido_enviado",
];

const ESTADOS_PEDIDO = [
  "pendiente",
  "cocina",
  "listo",
  "entregado",
] as const;

const ESTADOS_MESA_PUBLICOS = ["libre", "por_limpiar", "reservada"] as const;

export function esUUID(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_RE.test(valor);
}

export function esSlugSeguro(valor: unknown): valor is string {
  return typeof valor === "string" && SLUG_RE.test(valor);
}

export function pinValido(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_RE.test(pin);
}

export function tokenValido(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

export function generarId(): string {
  return randomUUID();
}

export function generarToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generarSerialTarjeta(): string {
  return `NODO-${randomBytes(9).toString("hex").toUpperCase()}`;
}

export function generarCodigoRecompensa(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let cuerpo = "";
  for (let i = 0; i < bytes.length; i += 1) {
    cuerpo += alfabeto[bytes[i] % alfabeto.length];
    if (i === 3 || i === 6) cuerpo += "-";
  }
  return `NODO-${cuerpo}`;
}

/** Token opaco (sesión de mozo o pase de tarjeta): solo se persiste su HMAC. */
export function hashToken(token: string): string {
  return createHmac("sha256", secreto("SESSION_PEPPER", "nodo-demo-session-pepper"))
    .update(token)
    .digest("hex");
}

export function compararHashSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function pinConPepper(pin: string): string {
  return `${pin}:${secreto("PIN_PEPPER", "nodo-demo-pin-pepper")}`;
}

/** PIN con sal aleatoria + pepper de entorno. Formato: salt:derivado. */
export function hashPin(pin: string, salt = randomBytes(16).toString("hex")): string {
  const derivado = scryptSync(pinConPepper(pin), salt, 64).toString("hex");
  return `${salt}:${derivado}`;
}

export function verificarPin(pin: string, almacenado: string): boolean {
  if (!pinValido(pin)) return false;
  const [salt, hash] = almacenado.split(":");
  if (!salt || !hash) return false;
  const candidato = scryptSync(pinConPepper(pin), salt, 64).toString("hex");
  return compararHashSeguro(candidato, hash);
}

export function limpiarTexto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (limpio.length > max) return null;
  return limpio;
}

export function normalizarEmail(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const email = valor.trim().toLowerCase();
  if (email.length < 5 || email.length > 120 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function normalizarTelefono(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor !== "string") return null;
  const telefono = valor.replace(/[^\d+\s-]/g, "").trim();
  if (telefono.length < 6 || telefono.length > 20) return null;
  if (!/^\+?[\d\s-]+$/.test(telefono)) return null;
  return telefono;
}

function objeto(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

function fallo(error: string): Resultado<never> {
  return { ok: false, error };
}

export function validarRegistroCliente(
  payload: unknown
): Resultado<RegistroClienteInput> {
  const datos = objeto(payload);
  if (!datos) return fallo("El cuerpo de la petición no es válido.");

  const nombre = limpiarTexto(datos.nombre, 80);
  if (!nombre || nombre.length < 2) {
    return fallo("El nombre debe tener entre 2 y 80 caracteres.");
  }

  const email = normalizarEmail(datos.email);
  if (!email) return fallo("Introduce un email válido.");

  const telefono = normalizarTelefono(datos.telefono);
  if (telefono === null) return fallo("Introduce un teléfono válido.");

  if (
    datos.consentimientoMarketing !== undefined &&
    typeof datos.consentimientoMarketing !== "boolean"
  ) {
    return fallo("El consentimiento de marketing no es válido.");
  }

  return {
    ok: true,
    valor: {
      nombre,
      email,
      telefono,
      consentimientoMarketing: datos.consentimientoMarketing === true,
    },
  };
}

export interface LoginMozoValidado {
  mozoId: string;
  pin: string;
}

export function validarLoginMozo(payload: unknown): Resultado<LoginMozoValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Petición de acceso no válida.");
  if (!esUUID(datos.mozoId)) return fallo("Personal no reconocido.");
  if (!pinValido(datos.pin)) return fallo("El PIN debe tener entre 4 y 8 dígitos.");
  return { ok: true, valor: { mozoId: datos.mozoId, pin: datos.pin } };
}

export interface AccesoPaseValidado {
  tarjetaId: string;
  pase: string;
}

export function validarAccesoPase(
  payload: unknown
): Resultado<AccesoPaseValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Acceso a la tarjeta no válido.");
  if (!esUUID(datos.tarjetaId)) return fallo("Tarjeta no válida.");
  if (!tokenValido(datos.pase)) return fallo("Pase de tarjeta no válido.");
  return { ok: true, valor: { tarjetaId: datos.tarjetaId, pase: datos.pase } };
}

export interface SelloValidado extends AccesoPaseValidado {
  origen: "compra" | "visita" | "bonus";
  idempotencia?: string;
}

export function validarSello(payload: unknown): Resultado<SelloValidado> {
  const acceso = validarAccesoPase(payload);
  if (!acceso.ok) return acceso;
  const datos = objeto(payload) as Record<string, unknown>;
  const origen = datos.origen ?? "compra";
  if (origen !== "compra" && origen !== "visita" && origen !== "bonus") {
    return fallo("Origen de sello no válido.");
  }
  let idempotencia: string | undefined;
  if (datos.idempotencia !== undefined) {
    if (!tokenValido(datos.idempotencia)) return fallo("Idempotencia no válida.");
    idempotencia = datos.idempotencia;
  }
  return { ok: true, valor: { ...acceso.valor, origen, idempotencia } };
}

export interface CanjeValidado extends AccesoPaseValidado {
  recompensaId: string;
}

export function validarCanje(payload: unknown): Resultado<CanjeValidado> {
  const acceso = validarAccesoPase(payload);
  if (!acceso.ok) return acceso;
  const datos = objeto(payload) as Record<string, unknown>;
  if (!esUUID(datos.recompensaId)) return fallo("Recompensa no válida.");
  return {
    ok: true,
    valor: { ...acceso.valor, recompensaId: datos.recompensaId },
  };
}

export interface ItemComandaValidado {
  productoId: string;
  cantidad: number;
  notas?: string;
}

export interface CrearComandaValidado {
  mesaId: string;
  items: ItemComandaValidado[];
  notas?: string;
}

function validarItems(valor: unknown): Resultado<ItemComandaValidado[]> {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > 30) {
    return fallo("La comanda debe incluir entre 1 y 30 productos.");
  }

  const items: ItemComandaValidado[] = [];
  for (const bruto of valor) {
    const item = objeto(bruto);
    if (!item) return fallo("Hay un producto con formato no válido.");
    if (!esSlugSeguro(item.productoId)) return fallo("Producto no válido.");
    if (
      typeof item.cantidad !== "number" ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad < 1 ||
      item.cantidad > 20
    ) {
      return fallo("La cantidad debe ser un entero entre 1 y 20.");
    }
    let notas: string | undefined;
    if (item.notas !== undefined && item.notas !== "") {
      const texto = limpiarTexto(item.notas, 140);
      if (!texto) return fallo("Las notas superan el límite permitido.");
      notas = texto;
    }
    items.push({ productoId: item.productoId, cantidad: item.cantidad, notas });
  }
  return { ok: true, valor: items };
}

export function validarCrearComanda(
  payload: unknown
): Resultado<CrearComandaValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Comanda no válida.");
  if (!esUUID(datos.mesaId)) return fallo("Mesa no válida.");
  const items = validarItems(datos.items);
  if (!items.ok) return items;

  let notas: string | undefined;
  if (datos.notas !== undefined && datos.notas !== "") {
    const texto = limpiarTexto(datos.notas, 200);
    if (!texto) return fallo("Las notas de la comanda no son válidas.");
    notas = texto;
  }

  return { ok: true, valor: { mesaId: datos.mesaId, items: items.valor, notas } };
}

export interface AgregarItemsValidado {
  comandaId: string;
  items: ItemComandaValidado[];
}

export function validarAgregarItems(
  payload: unknown
): Resultado<AgregarItemsValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Solicitud no válida.");
  if (!esUUID(datos.comandaId)) return fallo("Comanda no válida.");
  const items = validarItems(datos.items);
  if (!items.ok) return items;
  return { ok: true, valor: { comandaId: datos.comandaId, items: items.valor } };
}

export interface ActualizarItemValidado {
  comandaId: string;
  itemId: string;
  estado: (typeof ESTADOS_PEDIDO)[number];
}

export function validarActualizarItem(
  payload: unknown
): Resultado<ActualizarItemValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Solicitud no válida.");
  if (!esUUID(datos.comandaId)) return fallo("Comanda no válida.");
  if (!esUUID(datos.itemId)) return fallo("Línea de comanda no válida.");
  if (
    typeof datos.estado !== "string" ||
    !ESTADOS_PEDIDO.includes(datos.estado as (typeof ESTADOS_PEDIDO)[number])
  ) {
    return fallo("Estado de pedido no válido.");
  }
  return {
    ok: true,
    valor: {
      comandaId: datos.comandaId,
      itemId: datos.itemId,
      estado: datos.estado as (typeof ESTADOS_PEDIDO)[number],
    },
  };
}

export interface CerrarComandaValidado {
  comandaId: string;
  propinaPct: number;
}

export function validarCerrarComanda(
  payload: unknown
): Resultado<CerrarComandaValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Solicitud no válida.");
  if (!esUUID(datos.comandaId)) return fallo("Comanda no válida.");
  const propinaPct = datos.propinaPct ?? 0;
  if (
    typeof propinaPct !== "number" ||
    !Number.isFinite(propinaPct) ||
    propinaPct < 0 ||
    propinaPct > 25
  ) {
    return fallo("La propina debe estar entre 0 y 25%.");
  }
  return { ok: true, valor: { comandaId: datos.comandaId, propinaPct } };
}

export interface ActualizarMesaValidado {
  mesaId: string;
  estado: (typeof ESTADOS_MESA_PUBLICOS)[number];
}

export function validarEstadoMesa(
  payload: unknown
): Resultado<ActualizarMesaValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Solicitud no válida.");
  if (!esUUID(datos.mesaId)) return fallo("Mesa no válida.");
  if (
    typeof datos.estado !== "string" ||
    !ESTADOS_MESA_PUBLICOS.includes(
      datos.estado as (typeof ESTADOS_MESA_PUBLICOS)[number]
    )
  ) {
    return fallo("Estado de mesa no permitido.");
  }
  return {
    ok: true,
    valor: {
      mesaId: datos.mesaId,
      estado: datos.estado as (typeof ESTADOS_MESA_PUBLICOS)[number],
    },
  };
}

export interface EventoCartaValidado {
  sesionId: string;
  evento: EventoAnalitica;
  productoId?: string;
  categoriaId?: string;
  valor?: number;
}

export function validarEventoCarta(payload: unknown): Resultado<EventoCartaValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Evento no válido.");
  if (!esUUID(datos.sesionId)) return fallo("Sesión de carta no válida.");
  if (
    typeof datos.evento !== "string" ||
    !EVENTOS_CARTA.includes(datos.evento as EventoAnalitica)
  ) {
    return fallo("Evento no permitido.");
  }
  if (datos.productoId !== undefined && !esSlugSeguro(datos.productoId)) {
    return fallo("Producto no válido.");
  }
  if (datos.categoriaId !== undefined && !esSlugSeguro(datos.categoriaId)) {
    return fallo("Categoría no válida.");
  }
  if (
    datos.valor !== undefined &&
    (typeof datos.valor !== "number" ||
      !Number.isInteger(datos.valor) ||
      datos.valor < 0 ||
      datos.valor > 100_000)
  ) {
    return fallo("Valor analítico no válido.");
  }
  return {
    ok: true,
    valor: {
      sesionId: datos.sesionId,
      evento: datos.evento as EventoAnalitica,
      productoId: datos.productoId as string | undefined,
      categoriaId: datos.categoriaId as string | undefined,
      valor: datos.valor as number | undefined,
    },
  };
}

export interface PedidoCartaValidado {
  sesionId: string;
  items: ItemComandaValidado[];
}

export function validarPedidoCarta(
  payload: unknown
): Resultado<PedidoCartaValidado> {
  const datos = objeto(payload);
  if (!datos) return fallo("Selección no válida.");
  if (!esUUID(datos.sesionId)) return fallo("Sesión de carta no válida.");
  const items = validarItems(datos.items);
  if (!items.ok) return items;
  return { ok: true, valor: { sesionId: datos.sesionId, items: items.valor } };
}

/**
 * Comprobación de propiedad anti-IDOR. El rol nunca se acepta desde el cliente:
 * proviene de la sesión firmada en servidor.
 */
export function autorizarPropietario(
  sesion: { mozoId: string; rol: "mozo" | "supervisor" | "admin" },
  propietarioId: string
): boolean {
  if (sesion.rol === "supervisor" || sesion.rol === "admin") return true;
  return sesion.mozoId === propietarioId;
}

/** Defensa CSRF adicional para mutaciones same-origin. */
export function origenPermitido(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
