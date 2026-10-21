/* ═══════════════════════════════════════════════════════════════════════════
   Texto: escapado, nombres, ids y números tecleados a mano.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Los datos llegan de JSON, notas o del usuario: se reciben como `unknown` y
   aquí se convierten sin recurrir a `any` en el resto del código. */

// String() defensivo para una entrada desconocida: la trata como texto plano.
export const aTexto = (v: unknown): string =>
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- unknown a propósito
    String(v ?? "");

// Mensaje legible de un error capturado (los `catch` se tipan como unknown).
export const msgError = (e: unknown): string =>
    e instanceof Error ? e.message : typeof e === "string" ? e : "error desconocido";

// Copia profunda de datos JSON que van a mutarse antes de guardarse.
export const clonarJSON = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const esc = (txt: unknown): string =>
    aTexto(txt).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const limpiarNombre = (txt: unknown): string =>
    aTexto(txt).replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/\s+/g, " ").trim();

// "Press banca plano" → "press-banca-plano"
export const slug = (txt: unknown): string =>
    limpiarNombre(txt).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "sin-nombre";

export const uid = (prefijo: string): string =>
    `${prefijo}-${Math.random().toString(36).slice(2, 7)}`;

// Normaliza un número escrito a mano:
//   "" → ""   ·  "8" → "8"  ·  "8,5" → "8.5"  ·  "87.239,5" → "87239.5"  ·  "peso" → null
export const numero = (txt: unknown): string | null => {
    const s = aTexto(txt).trim().replace(/\s+/g, "");
    if (!s) return "";
    let n = s;
    const coma = n.lastIndexOf(","), punto = n.lastIndexOf(".");
    if (coma >= 0 && punto >= 0) n = coma > punto ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "");
    else if ((n.match(/,/g) || []).length > 1) n = n.replace(/,/g, "");
    else n = n.replace(",", ".");
    if (/^[+-]?\d+\.$/.test(n)) n = n.slice(0, -1);
    return /^-?(\d+(\.\d+)?|\.\d+)$/.test(n) ? n : null;
};

export const aNumero = (txt: unknown): number | null => {
    const n = numero(txt);
    return n === "" || n === null ? null : Number(n);
};

export const decimal = (n: number, dec = 1): string =>
    Number.isFinite(n) ? n.toFixed(dec).replace(".", ",") : "–";

// Normaliza un nombre para compararlo: sin tildes, minúsculas y espacios seguidos.
export const norm = (s: unknown): string =>
    aTexto(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
