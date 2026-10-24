/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes del plugin (Ajustes → Gym Stone).

   Toda la vida del plugin cabe en UNA carpeta raíz (carpetaRaiz, en
   minúsculas; «gym-stone» por defecto) y de ahí salen estas rutas fijas:

     <raíz>/rutinas.gym-stone.md            el índice: UNA nota con la lista
     <raíz>/datos/rutinas/<id>.gym-stone.md una rutina por archivo (plan + sesiones)
     <raíz>/datos/medidas.gym-stone.md      peso y talla (globales)
     <raíz>/datos/ejercicios.gym-stone.md   grupos musculares (hermano de medidas)
     <raíz>/plantillas/*.md                 plantillas reutilizables

   Los datos llevan el sufijo .gym-stone.md en lugar de carpetas propias: el
   plugin los identifica por NOMBRE (esArchivoGym), sin necesidad de recorrer
   el vault. Las plantillas quedan FUERA del sufijo a propósito: son
   contenido que se edita a mano y se abren como nota normal.
   ═══════════════════════════════════════════════════════════════════════════ */

import { conf } from "./estado";

// Terminación de los archivos de datos del plugin (legible: siguen siendo .md)
export const SUFIJO_MD = ".gym-stone.md";

export interface AjustesGym {
    carpetaRaiz: string;      // carpeta única que contiene todo lo de arriba
    unidadTalla: "cm" | "in";
    avisoListo: boolean;      // ya se mostró el aviso de bienvenida
}

export const AJUSTES_POR_DEFECTO: AjustesGym = {
    carpetaRaiz: "gym-stone",
    unidadTalla: "cm",
    avisoListo: false,
};

/* La raíz siempre en minúsculas y sin barras sueltas en los extremos: los
   nombres del plugin son minúsculas por convención (y Obsidian en mayúsculas
   las busca mal en algunos buscadores). Vacío → la de por defecto. */
export const carpetaRaizLimpia = (v: unknown): string => {
    if (typeof v !== "string") return AJUSTES_POR_DEFECTO.carpetaRaiz;
    const limpio = v.trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/").toLowerCase();
    return limpio || AJUSTES_POR_DEFECTO.carpetaRaiz;
};

/* Rellena los huecos por si el usuario guardó ajustes de una versión vieja.
   Los campos antiguos (rutaIndice, carpetaDatos, rutaMedidas,
   carpetaPlantillas) NO se copian a propósito: así el data.json que se
   escribe queda limpio, con un solo campo de ruta (carpetaRaiz). */
export function normalizarAjustes(
    datos: Partial<AjustesGym> | Record<string, unknown> | null | undefined,
): AjustesGym {
    const out: AjustesGym = { ...AJUSTES_POR_DEFECTO };
    if (datos && typeof datos === "object") {
        const d = datos as Record<string, unknown>;
        out.carpetaRaiz = carpetaRaizLimpia(d.carpetaRaiz);
        if (d.unidadTalla === "cm" || d.unidadTalla === "in") out.unidadTalla = d.unidadTalla;
        out.avisoListo = d.avisoListo === true;
    }
    return out;
}

/* ── Rutas derivadas de la raíz: la fuente de verdad de dónde vive cada
      cosa. Todo el código pide estas funciones, nunca campos sueltos. ── */

export const rutaIndice = (): string => `${conf().carpetaRaiz}/rutinas${SUFIJO_MD}`;
export const carpetaDatos = (): string => `${conf().carpetaRaiz}/datos/rutinas`;
export const rutaMedidas = (): string => `${conf().carpetaRaiz}/datos/medidas${SUFIJO_MD}`;
export const rutaGrupos = (): string => `${conf().carpetaRaiz}/datos/ejercicios${SUFIJO_MD}`;
export const carpetaPlantillas = (): string => `${conf().carpetaRaiz}/plantillas`;
