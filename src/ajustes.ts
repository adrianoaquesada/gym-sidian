/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes del plugin (Ajustes → Gym Stone).

   Dónde viven los datos, en el orden en que los verás:
     rutaIndice         «Rutinas.md» → UNA nota con la lista de todas las rutinas
     carpetaDatos       un archivo por rutina con TODO (plan + sesiones + anotaciones)
     rutaMedidas        peso y talla (global)
     carpetaPlantillas  plantillas reutilizables
   ═══════════════════════════════════════════════════════════════════════════ */

export interface AjustesGym {
    rutaIndice: string;
    carpetaDatos: string;
    rutaMedidas: string;
    carpetaPlantillas: string;
    unidadTalla: "cm" | "in";
}

export const AJUSTES_POR_DEFECTO: AjustesGym = {
    rutaIndice: "08 Gimnasio/Rutinas.md",
    carpetaDatos: "08 Gimnasio/Datos/rutinas",
    rutaMedidas: "08 Gimnasio/Datos/medidas.md",
    carpetaPlantillas: "08 Gimnasio/Plantillas",
    unidadTalla: "cm",
};

// Rellena los huecos por si el usuario guardó ajustes de una versión vieja.
export function normalizarAjustes(datos: Partial<AjustesGym> | null | undefined): AjustesGym {
    const out: AjustesGym = { ...AJUSTES_POR_DEFECTO };
    if (datos && typeof datos === "object") {
        for (const k of Object.keys(AJUSTES_POR_DEFECTO) as (keyof AjustesGym)[]) {
            const v = (datos as Record<string, unknown>)[k];
            if (typeof v === "string" && v.trim()) out[k] = v.trim() as never;
        }
    }
    // La carpeta de rutinas vieja (una nota por rutina) ya no se usa: si venía
    // de una versión anterior, se ignora a propósito.
    return out;
}
