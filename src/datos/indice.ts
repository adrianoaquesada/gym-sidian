/* ═══════════════════════════════════════════════════════════════════════════
   El índice: UNA sola nota con la lista de todas las rutinas.

   Es lo que ves al abrir el plugin: nombre, estado, fechas y recuento de
   sesiones, sin tener que leer cada archivo de datos. Se regenera solo cada
   vez que se guarda una rutina, así que aunque lo borres a mano se repone.
   ═══════════════════════════════════════════════════════════════════════════ */

import { rutaIndice } from "../ajustes";
import { contenidoNotaDatos, leerNotaDatos, escribirSeguro } from "./archivos";
import type { Indice, IndiceRutina, Rutina } from "../tipos";

export const indiceVacio = (): Indice => ({ version: 1, rutinas: [] });

// La ruta del índice vive en ajustes (raíz única); aquí se reexporta para
// que quien ya importaba datos/indice no se entere del cambio.
export { rutaIndice };

// Fila del índice para una rutina (lo calcula quien la guarda, no se guarda aparte)
export const entradaDeRutina = (rutina: Rutina): IndiceRutina => ({
    id: rutina.id,
    nombre: rutina.nombre || "Sin nombre",
    estado: rutina.estado || "activa",
    tipo: rutina.tipo === "libre" ? "libre" : "planificada",
    inicio: rutina.inicio,
    fin: rutina.fin,
    semanas: rutina.semanas,
    sesiones: (rutina.sesiones ?? []).filter(s => !s.enCurso).length,
    creada: rutina.creado,
    modificada: rutina.modificado,
});

/* Lee el índice. Tolerante a lo razonable: si no existe se devuelve vacío;
   si existe pero está roto, se devuelve el error (no se pisa nada). */
export const leerIndice = async (): Promise<{ indice: Indice; error?: string }> => {
    const ruta = rutaIndice();
    const r = await leerNotaDatos<Indice>(ruta);
    if (r.error) {
        if (r.error.includes("No existe")) return { indice: indiceVacio() };
        return { indice: indiceVacio(), error: r.error };
    }
    const d = r.datos;
    if (!d || !Array.isArray(d.rutinas)) return { indice: indiceVacio() };
    // Cada fila se normaliza por si alguien editó el JSON a mano
    const rutinas: IndiceRutina[] = d.rutinas
        .filter(f => f && typeof f.id === "string" && f.id)
        .map(f => ({
            id: String(f.id),
            nombre: String(f.nombre ?? "Sin nombre"),
            estado: (["activa", "pausada", "finalizada"].includes(String(f.estado)) ? f.estado : "activa"),
            tipo: f.tipo === "libre" ? "libre" : "planificada",
            inicio: String(f.inicio ?? ""),
            fin: String(f.fin ?? ""),
            semanas: Number(f.semanas) || 0,
            sesiones: Number(f.sesiones) || 0,
            creada: String(f.creada ?? ""),
            modificada: String(f.modificada ?? ""),
        }));
    return { indice: { version: 1, rutinas } };
};

export const escribirIndice = async (indice: Indice): Promise<void> => {
    // Las más recientes primero: es el orden en el que se consultan
    indice.rutinas = [...indice.rutinas].sort((a, b) =>
        (b.modificada ?? "").localeCompare(a.modificada ?? "") || a.nombre.localeCompare(b.nombre, "es"));
    await escribirSeguro(rutaIndice(), contenidoNotaDatos(indice));
};

// Añade o actualiza la fila de una rutina (por id) y guarda el índice
export const guardarEnIndice = async (rutina: Rutina): Promise<void> => {
    const { indice } = await leerIndice();
    const nueva = entradaDeRutina(rutina);
    const p = indice.rutinas.findIndex(f => f.id === nueva.id);
    if (p >= 0) indice.rutinas[p] = nueva;
    else indice.rutinas.push(nueva);
    await escribirIndice(indice);
};

export const quitarDeIndice = async (id: string): Promise<void> => {
    const { indice } = await leerIndice();
    const antes = indice.rutinas.length;
    indice.rutinas = indice.rutinas.filter(f => f.id !== id);
    if (indice.rutinas.length !== antes) await escribirIndice(indice);
};
