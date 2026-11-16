import type {
  Cliente,
  Geocerca,
  NivelFidelizacion,
  PaseWallet,
  PremioOferta,
  RecompensaTarjeta,
  ResumenTarjeta,
  Sello,
  TarjetaWallet,
} from "@/types/fidelizacion";

/**
 * Motor puro de fidelización. Sin acceso a red, base de datos ni reloj global:
 * toda la información variable se inyecta para poder testearlo y auditarlo.
 */

export const META_SELLOS = 8;

export const GEOCERCA: Geocerca = {
  lat: 40.42645,
  lng: -3.70462,
  radioMetros: 180,
  etiqueta: "Casa Norte",
  direccion: "Calle del Espíritu Santo 12, Madrid",
};

export const PREMIOS_CICLO: PremioOferta[] = [
  {
    id: "premio-postre-brasa",
    nombre: "Postre de la casa",
    descripcion: "Tarta de queso al horno, chocolate y sal, o fruta de temporada.",
    sellosRequeridos: META_SELLOS,
    tipo: "premio",
    activo: true,
    acento: "#d2ff3f",
  },
  {
    id: "premio-vermut",
    nombre: "Vermut de bienvenida",
    descripcion: "Un vermut de la casa para brindar por la siguiente visita.",
    sellosRequeridos: META_SELLOS,
    tipo: "premio",
    activo: true,
    acento: "#ff7446",
  },
  {
    id: "premio-cafe",
    nombre: "Café y petit four",
    descripcion: "Café de especialidad con el dulce del día, por cuenta de la casa.",
    sellosRequeridos: META_SELLOS,
    tipo: "premio",
    activo: true,
    acento: "#63d6c5",
  },
];

export function calcularNivel(sellosHistoricos: number): NivelFidelizacion {
  if (sellosHistoricos >= 48) return "bosque";
  if (sellosHistoricos >= 24) return "brote";
  if (sellosHistoricos >= 8) return "raiz";
  return "semilla";
}

export function calcularResumen(tarjeta: TarjetaWallet): ResumenTarjeta {
  const saldo = Math.max(0, tarjeta.saldoSellos);
  const disponibles = tarjeta.recompensas.filter(
    (recompensa) => recompensa.estado === "disponible"
  ).length;

  return {
    metaSellos: META_SELLOS,
    sellosRestantes: Math.max(0, META_SELLOS - saldo),
    porcentaje: Math.min(100, Math.round((saldo / META_SELLOS) * 100)),
    recompensasDisponibles: disponibles,
  };
}

export interface ContextoSello {
  tarjetaId: string;
  selloId: string;
  recompensaId: string;
  codigoRecompensa: string;
  ahora: string;
  premio: PremioOferta;
}

export interface ResultadoSello {
  saldoSellos: number;
  sellosHistoricos: number;
  nivel: NivelFidelizacion;
  recompensas: RecompensaTarjeta[];
  sello: Sello;
  recompensaDesbloqueada?: RecompensaTarjeta;
}

/**
 * Suma exactamente un sello. Si se cruza el umbral, descuenta la meta y crea
 * una recompensa de un solo uso. El servidor decide el premio; el cliente no
 * puede elegir ni inyectar saldo.
 */
export function aplicarSello(
  tarjeta: Pick<
    TarjetaWallet,
    "id" | "saldoSellos" | "sellosHistoricos" | "recompensas"
  >,
  contexto: ContextoSello,
  origen: Sello["origen"] = "compra"
): ResultadoSello {
  const saldoBruto = tarjeta.saldoSellos + 1;
  const sellosHistoricos = tarjeta.sellosHistoricos + 1;
  const recompensas = [...tarjeta.recompensas];
  let recompensaDesbloqueada: RecompensaTarjeta | undefined;

  let saldoSellos = saldoBruto;
  if (saldoBruto >= META_SELLOS) {
    saldoSellos = saldoBruto - META_SELLOS;
    recompensaDesbloqueada = {
      id: contexto.recompensaId,
      premioId: contexto.premio.id,
      titulo: contexto.premio.nombre,
      descripcion: contexto.premio.descripcion,
      estado: "disponible",
      codigo: contexto.codigoRecompensa,
      otorgadaEn: contexto.ahora,
    };
    recompensas.push(recompensaDesbloqueada);
  }

  const sello: Sello = {
    id: contexto.selloId,
    tarjetaId: tarjeta.id,
    tipo: origen,
    origen,
    valor: 1,
    creadoEn: contexto.ahora,
  };

  return {
    saldoSellos,
    sellosHistoricos,
    nivel: calcularNivel(sellosHistoricos),
    recompensas,
    sello,
    recompensaDesbloqueada,
  };
}

export function elegirPremioCiclo(sellosHistoricos: number): PremioOferta {
  const disponibles = PREMIOS_CICLO.filter((premio) => premio.activo);
  return disponibles[sellosHistoricos % disponibles.length] ?? PREMIOS_CICLO[0];
}

export function calcularDistanciaMetros(
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number }
): number {
  const radioTierra = 6_371_000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const dLat = aRadianes(destino.lat - origen.lat);
  const dLng = aRadianes(destino.lng - origen.lng);
  const lat1 = aRadianes(origen.lat);
  const lat2 = aRadianes(destino.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function construirPaseWallet(
  tarjeta: TarjetaWallet,
  cliente: Cliente,
  premios: PremioOferta[],
  baseUrl: string
): PaseWallet {
  const premioDisponible = tarjeta.recompensas.find(
    (recompensa) => recompensa.estado === "disponible"
  );
  const progreso = calcularResumen(tarjeta);

  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.nodo.local",
    serialNumber: tarjeta.serialNumber,
    teamIdentifier: "NODODEMO01",
    organizationName: "NODO Local",
    description: `Tarjeta de fidelización de ${cliente.nombre}`,
    logoText: "NODO CLUB",
    backgroundColor: "#0d0f0b",
    foregroundColor: "#f4f1e7",
    labelColor: "#d2ff3f",
    barcode: {
      format: "PKBarcodeFormatQR",
      message: `${baseUrl.replace(/\/$/, "")}/tarjeta?tarjeta=${tarjeta.id}`,
      messageEncoding: "iso-8859-1",
      altText: tarjeta.serialNumber,
    },
    storeCard: {
      primaryFields: [
        {
          key: "sellos",
          label: "SELLOS",
          value: `${tarjeta.saldoSellos} / ${META_SELLOS}`,
        },
      ],
      secondaryFields: [
        { key: "cliente", label: "SOCIO", value: cliente.nombre },
        {
          key: "premio",
          label: "RECOMPENSA",
          value: premioDisponible?.titulo ?? `Faltan ${progreso.sellosRestantes}`,
        },
      ],
      backFields: [
        { key: "direccion", label: "DÓNDE", value: GEOCERCA.direccion },
        {
          key: "premios",
          label: "TUS PREMIOS",
          value:
            premios.map((premio) => `${premio.nombre}: ${premio.descripcion}`).join("\n") ||
            "Sigue sellando para desbloquear premios.",
        },
        {
          key: "seguridad",
          label: "SEGURIDAD",
          value:
            "Este pase se actualiza desde el servidor. No compartas el código de canje.",
        },
      ],
    },
    locations: [
      {
        latitude: GEOCERCA.lat,
        longitude: GEOCERCA.lng,
        relevantText: "Estás cerca de Casa Norte. Tu tarjeta te espera.",
      },
    ],
    maxDistance: GEOCERCA.radioMetros,
    _meta: {
      estado: "listo_para_firma",
      generadoEn: new Date().toISOString(),
      nota:
        "JSON de pase preparado. La firma .pkpass de Apple y el JWT de Google Wallet se añaden con las credenciales del comercio.",
    },
  };
}
