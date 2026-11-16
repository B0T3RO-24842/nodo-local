import type { Metadata } from "next";

import { ComandasApp } from "@/components/comandas/comandas-app";

export const metadata: Metadata = {
  title: "Salón OS · Comandas",
  description:
    "Consola de salón con acceso por PIN, comandas, estados de cocina y división de cuentas.",
};

export default function ComandasPage() {
  return <ComandasApp />;
}
