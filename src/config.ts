/* ═══════════════════════════════════════════════════════════════════════════
   Configuración fija del sistema (lo que NO cambia entre usuarios).

   Las carpetas, la unidad de talla y demás ajustes VIVEN en ajustes.ts
   (Ajustes del plugin, editables desde Ajustes → Gym Stone).
   ═══════════════════════════════════════════════════════════════════════════ */

export const CONFIG = {
    /* Unidades: el archivo SIEMPRE guarda kg y cm; aquí solo conversiones. */
    LB_POR_KG: 2.20462,
    PULG_POR_CM: 0.393701,

    SEMANAS_POR_DEFECTO: 12,
    OBJETIVOS: ["fuerza", "hipertrofia", "pérdida de grasa", "resistencia", "otro"],

    // Dos formas de entrenar, con el mismo motor por debajo:
    //   planificada → días de la semana con ejercicios y objetivos (la clásica)
    //   libre       → sin días ni ejercicios fijos: registras lo que haces
    TIPOS_RUTINA: ["planificada", "libre"] as const,

    // Paleta: la MISMA que el panel de trading para que todo cuadre
    NARANJA: "#F99624",
    VERDE: "#2ecc71",
    ROJO: "#e74c3c",
    AZUL: "#5dade2",
    BORDE: "var(--background-modifier-border)",
};

/* Días de la semana (1 = lunes … 7 = domingo, como en las rutinas) */
export const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
export const DIAS_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const DIA_MS = 86400000;
