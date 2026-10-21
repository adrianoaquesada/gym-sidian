/* ═══════════════════════════════════════════════════════════════════════════
   Unidades (kg | lb  y  cm | in).

   En el archivo SIEMPRE se guarda kg y cm; aquí se decide en qué unidad se
   MUESTRA y se TECLREA. El selector kg | lb lo cambia en caliente y se
   recuerda en localStorage (mismo código que el engine original: si no,
   volvería a kg al reabrir la nota). La unidad de talla es un ajuste del
   plugin (Ajustes → Gym Stone).
   ═══════════════════════════════════════════════════════════════════════════ */

import { CONFIG } from "./config";
import { conf } from "./estado";
import type { UnidadPeso } from "./tipos";

export const UNIDADES_PESO: UnidadPeso[] = ["kg", "lb"];
const CLAVE_UNIDAD = "gym-unidad-peso";

let unidadPeso: UnidadPeso = "kg";
try {
    const u = localStorage.getItem(CLAVE_UNIDAD);
    if (u === "kg" || u === "lb") unidadPeso = u;
} catch { /* sin localStorage → se queda en la unidad por defecto */ }

export const pesoActual = (): UnidadPeso => unidadPeso;

export function fijarUnidadPeso(u: string): boolean {
    if (u !== "kg" && u !== "lb") return false;
    if (u === unidadPeso) return false;
    unidadPeso = u;
    try { localStorage.setItem(CLAVE_UNIDAD, u); } catch { /* sin localStorage */ }
    return true;
}

/* Unidades: el archivo guarda SIEMPRE kg y cm; aquí se convierte a lo mostrado.
   El vacío ("" u " ") se trata como «sin peso», no como 0. */
export const esPesoVacio = (kg: unknown): boolean =>
    kg === null || kg === undefined || String(kg).trim() === "" || !Number.isFinite(Number(kg));

export const pesoMostrar = (kg: unknown): number | null => {
    if (esPesoVacio(kg)) return null;
    return unidadPeso === "lb" ? Number(kg) * CONFIG.LB_POR_KG : Number(kg);
};

// La unidad «contraria» a la principal (para poder mostrar las dos)
export const unidadContraria = (): UnidadPeso => (unidadPeso === "kg" ? "lb" : "kg");

// Convierte el kg guardado a la unidad pedida
export const pesoEn = (kg: unknown, unidad: UnidadPeso): number | null => {
    if (esPesoVacio(kg)) return null;
    return unidad === "lb" ? Number(kg) * CONFIG.LB_POR_KG : Number(kg);
};

// Un valor TECLEADO en la unidad activa → kg (lo único que se guarda en disco).
// En lb se redondea a 2 decimales: así «154.3» vuelve siempre a «154.3» al
// repintar y no se acumula deriva de coma flotante. En kg no se toca nada.
export const pesoAKg = (valor: unknown): number | null => {
    const n = numeroATexto(valor);
    if (n === null) return null;
    if (unidadPeso !== "lb") return n;
    return Math.round((n / CONFIG.LB_POR_KG) * 100) / 100;
};

// kg → valor que debe mostrar un campo de entrada (unidad activa).
// El vacío se queda vacío: Number("") es 0 y pintaría «0» sin querer.
export const pesoACampo = (kg: unknown): string => {
    if (kg === null || kg === undefined || String(kg).trim() === "") return "";
    const v = pesoEn(kg, unidadPeso);
    if (v === null) return "";
    return String(Number(v.toFixed(2)));
};

// Texto de un peso: SIEMPRE en la unidad activa del selector (kg | lb),
// sin repetir la otra unidad.
export const pesoTexto = (kg: unknown): string => {
    const v = pesoMostrar(kg);
    if (v === null) return "–";
    return `${Number(v.toFixed(1))} ${unidadPeso}`;
};

export const tallaTexto = (cm: unknown): string => {
    if (cm === null || cm === undefined || !Number.isFinite(Number(cm))) return "–";
    return conf().unidadTalla === "in"
        ? `${(Number(cm) * CONFIG.PULG_POR_CM).toFixed(1)} in`
        : `${Number(cm)} cm`;
};

/* Normaliza un número escrito a mano (mismo criterio que el motor original):
     "" → ""   ·  "8" → 8   ·  "8,5" → 8.5   ·  "87.239,5" → 87239.5  ·  "peso" → null  */
function numeroATexto(txt: unknown): number | null {
    const s = String(txt ?? "").trim().replace(/\s+/g, "");
    if (!s) return null;
    let n = s;
    const coma = n.lastIndexOf(","), punto = n.lastIndexOf(".");
    if (coma >= 0 && punto >= 0) n = coma > punto ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "");
    else if ((n.match(/,/g) || []).length > 1) n = n.replace(/,/g, "");
    else n = n.replace(",", ".");
    if (/^[+-]?\d+\.$/.test(n)) n = n.slice(0, -1);
    if (!/^-?(\d+(\.\d+)?|\.\d+)$/.test(n)) return null;
    return Number(n);
}
