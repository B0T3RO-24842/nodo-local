/**
 * Dominio de fidelización.
 *
 * Los importes se guardan siempre en céntimos (integer) para evitar errores de
 * coma flotante. Las fechas se serializan en ISO-8601.
 */

export type NivelFidelizacion = "semilla" | "raiz" | "brote" | "bosque";

export type EstadoTarjeta = "activa" | "bloqueada";

export type OrigenSello = "compra" | "visita" | "bonus" | "evento";

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  creadoEn: string;
  consentimientoMarketing: boolean;
}

export interface Sello {
  id: string;
  tarjetaId: string;
  tipo: OrigenSello;
  origen: OrigenSello;
  valor: number;
  creadoEn: string;
}

export interface PremioOferta {
  id: string;
  nombre: string;
  descripcion: string;
  /** Sellos necesarios para desbloquear el premio. */
  sellosRequeridos: number;
  tipo: "premio" | "oferta";
  activo: boolean;
  vigenciaHasta?: string;
  acento: string;
}

export type EstadoRecompensa = "disponible" | "canjeada";

export interface RecompensaTarjeta {
  id: string;
  premioId: string;
  titulo: string;
  descripcion: string;
  estado: EstadoRecompensa;
  /** Código de canje de un solo uso, generado en servidor. */
  codigo: string;
  otorgadaEn: string;
  canjeadaEn?: string;
}

export interface Geocerca {
  lat: number;
  lng: number;
  radioMetros: number;
  etiqueta: string;
  direccion: string;
}

export interface TarjetaWallet {
  id: string;
  clienteId: string;
  /** Serial estable del pase. No es un ID secuencial. */
  serialNumber: string;
  saldoSellos: number;
  sellosHistoricos: number;
  nivel: NivelFidelizacion;
  estado: EstadoTarjeta;
  recompensas: RecompensaTarjeta[];
  actualizadaEn: string;
}

export interface ResumenTarjeta {
  metaSellos: number;
  sellosRestantes: number;
  porcentaje: number;
  recompensasDisponibles: number;
}

export interface TarjetaHidratada {
  tarjeta: TarjetaWallet;
  cliente: Cliente;
  premios: PremioOferta[];
  geocerca: Geocerca;
  resumen: ResumenTarjeta;
}

export interface PaseWallet {
  formatVersion: 1;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  barcode: {
    format: "PKBarcodeFormatQR";
    message: string;
    messageEncoding: "iso-8859-1";
    altText: string;
  };
  storeCard: {
    primaryFields: Array<{ key: string; label: string; value: string }>;
    secondaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  locations: Array<{ latitude: number; longitude: number; relevantText: string }>;
  maxDistance: number;
  /** El JSON es válido para Wallet, pero la firma PKPass se delega al emisor. */
  _meta: {
    estado: "listo_para_firma";
    generadoEn: string;
    nota: string;
  };
}

export interface RegistroClienteInput {
  nombre: string;
  email: string;
  telefono?: string;
  consentimientoMarketing: boolean;
}
