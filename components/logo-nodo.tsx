import Link from "next/link";

type Tono = "claro" | "oscuro";

interface LogoNodoProps {
  className?: string;
  tono?: Tono;
  compacto?: boolean;
  href?: string | null;
}

export function LogoNodo({
  className = "",
  tono = "claro",
  compacto = false,
  href = "/",
}: LogoNodoProps) {
  const colorTexto = tono === "claro" ? "text-hueso-100" : "text-tinta-950";
  const colorMarca = tono === "claro" ? "border-hueso-100/70" : "border-tinta-950/70";

  const contenido = (
    <span className={`inline-flex items-center gap-2.5 ${colorTexto} ${className}`}>
      <span
        className={`relative grid h-7 w-7 place-items-center rounded-full border ${colorMarca}`}
        aria-hidden="true"
      >
        <span className="absolute inset-[5px] rounded-full border border-current opacity-30" />
        <span className="h-1.5 w-1.5 rounded-full bg-lima-400 shadow-[0_0_12px_rgba(210,255,63,0.9)]" />
      </span>
      {!compacto && (
        <span className="text-[17px] font-bold leading-none tracking-[-0.07em]">
          NODO<span className="text-lima-400">.</span>
        </span>
      )}
    </span>
  );

  if (!href) return contenido;

  return (
    <Link href={href} aria-label="NODO, ir al inicio" className="inline-flex">
      {contenido}
    </Link>
  );
}
