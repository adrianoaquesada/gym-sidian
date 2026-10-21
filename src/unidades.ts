/* ═══════════════════════════════════════════════════════════════════════════
   Unidades (kg | lb  y  cm | in).

   En el archivo SIEMPRE se guarda kg y cm; aquí se decide en qué unidad se
   MUESTRA y se TECLREA. El selector kg | lb lo cambia en caliente y se
   recuerda en el almacenamiento propio del vault (si no, volvería a kg al
   reabrir la nota). La unidad de talla es un ajuste del plugin
   (Ajustes → Gym Stone).
   ═══════════════════════════════════════════════════════════════════════════ */

import { CONFIG } from "./config";
import { aplicacion, conf } from "./estado";
import { aTexto } from "./util/texto";
import type { UnidadPeso } from "./tipos";

export const UNIDADES_PESO: UnidadPeso[] = ["kg", "lb"];
const CLAVE_UNIDAD = "gym-unidad-peso";

/* Se carga AL PRIMER USO (no al importar el módulo), cuando la App ya está
   inicializada. La elección vive en el almacenamiento propio del vault
   (App#saveLocalStorage): por vault, no global como el navegador. */
let unidadPeso: UnidadPeso | null = null;

function leerUnidad(): UnidadPeso {
    try {
        const u = aplicacion().loadLocalStorage(CLAVE_UNIDAD) as string | null;
        return u === "kg" || u === "lb" ? u : "kg";
    } catch { return "kg"; }
}

export const pesoActual = (): UnidadPeso => {
    if (unidadPeso === null) unidadPeso = leerUnidad();
    return unidadPeso;
};

export function fijarUnidadPeso(u: string): boolean {
    if (u !== "kg" && u !== "lb") return false;
    if (u === pesoActual()) return false;
    unidadPeso = u;
    try { aplicacion().saveLocalStorage(CLAVE_UNIDAD, u); } catch { /* sin almacenamiento */ }
    return true;
}

/* Unidades: el archivo guarda SIEMPRE kg y cm; aquí se convierte a lo mostrado.
   El vacío ("" u " ") se trata como «sin peso», no como 0. */
export const esPesoVacio = (kg: unknown): boolean =>
    kg === null || kg === undefined || aTexto(kg).trim() === "" || !Number.isFinite(Number(kg));

export const pesoMostrar = (kg: unknown): number | null => {
    if (esPesoVacio(kg)) return null;
    return pesoActual() === "lb" ? Number(kg) * CONFIG.LB_POR_KG : Number(kg);
};

// La unidad «contraria» a la principal (para poder mostrar las dos)
export const unidadContraria = (): UnidadPeso => (pesoActual() === "kg" ? "lb" : "kg");

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
    if (pesoActual() !== "lb") return n;
    return Math.round((n / CONFIG.LB_POR_KG) * 100) / 100;
};

// kg → valor que debe mostrar un campo de entrada (unidad activa).
// El vacío se queda vacío: Number("") es 0 y pintaría «0» sin querer.
export const pesoACampo = (kg: unknown): string => {
    if (kg === null || kg === undefined || aTexto(kg).trim() === "") return "";
    const v = pesoEn(kg, pesoActual());
    if (v === null) return "";
    return String(Number(v.toFixed(2)));
};

// Texto de un peso: SIEMPRE en la unidad activa del selector (kg | lb),
// sin repetir la otra unidad.
export const pesoTexto = (kg: unknown): string => {
    const v = pesoMostrar(kg);
    if (v === null) return "–";
    return `${Number(v.toFixed(1))} ${pesoActual()}`;
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
    const s = aTexto(txt).trim().replace(/\s+/g, "");
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
