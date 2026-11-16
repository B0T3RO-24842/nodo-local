import type { Metadata } from "next";

import { TarjetaCliente } from "@/components/tarjeta/tarjeta-cliente";

export const metadata: Metadata = {
  title: "Tarjeta Club",
  description:
    "Sellos, premios y pase Wallet con geocerca. La fidelización de Casa Norte, dentro de NODO.",
};

export default function TarjetaPage() {
  return <TarjetaCliente />;
}
