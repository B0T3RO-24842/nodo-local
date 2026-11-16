import type { Metadata } from "next";

import { CartaCliente } from "@/components/carta/carta-cliente";

export const metadata: Metadata = {
  title: "Carta Viva",
  description:
    "Carta digital interactiva de Casa Norte con filtros dietéticos y analítica de consumo anónima.",
};

export default function CartaPage() {
  return <CartaCliente />;
}
