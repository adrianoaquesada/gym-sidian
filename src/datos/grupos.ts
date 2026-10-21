/* ═══════════════════════════════════════════════════════════════════════════
   Grupos musculares por ejercicio (global para todo el vault).

   Los ejercicios no tienen fichero propio (el catálogo se deriva de todo lo
   que hay en las rutinas), así que aquí se guarda SOLO id → grupo, en un
   fichero hermano de medidas.md — fuera de la carpeta de rutinas.
   ═══════════════════════════════════════════════════════════════════════════ */

import { conf } from "../estado";
import { contenidoNotaDatos, escribirSeguro, leerNotaDatos } from "./archivos";
import type { GruposDatos, LecturaNota } from "../tipos";

// Vive al lado de medidas.md (mismo directorio, otro fichero)
export const rutaGrupos = (): string => conf().rutaMedidas.replace(/[^/]+$/, "ejercicios.md");

// Memoria: el buscador pinta de golpe el mapa y el fichero se lee en segundo
// plano (mismo criterio que el catálogo de todas las rutinas). Se revalida al
// escribir, para que dos editores no se pisen sin avisar.
let cache: Record<string, string> | null = null;
let cargando: Promise<Record<string, string>> | null = null;

export const leerGrupos = async (): Promise<LecturaNota<GruposDatos>> => {
    const ruta = rutaGrupos();
    const r = await leerNotaDatos<GruposDatos>(ruta);
    if (r.error) {
        // Ausente = nadie ha clasificado nada todavía; roto = se avisa y no se toca
        if (r.error.includes("No existe")) return { datos: { grupos: {} }, ruta };
        return r;
    }
    const grupos = r.datos && typeof r.datos.grupos === "object" && r.datos.grupos !== null
        ? r.datos.grupos
        : {};
    return { datos: { ...r.datos, grupos }, ruta };
};

// Mapa actual en memoria (puede estar vacío mientras llega el fichero)
export const gruposEnMemoria = (): Record<string, string> => cache ?? {};

// Lee una sola vez y reutiliza: el buscador lo llama al abrir el modal
export const cargarGrupos = async (): Promise<Record<string, string>> => {
    if (cache) return cache;
    if (!cargando) {
        cargando = leerGrupos()
            .then(r => { cache = r.datos?.grupos ?? {}; cargando = null; return cache; })
            .catch(e => { cargando = null; throw e; });
    }
    return cargando;
};

// Fija (o quita, con cadena vacía) el grupo de un ejercicio: memoria + fichero
export const fijarGrupo = async (id: string, grupo: string): Promise<void> => {
    if (!cache) await cargarGrupos();
    const limpio = grupo.trim();
    const ruta = rutaGrupos();
    // Revalidación previa: si alguien más ha escrito desde la última lectura,
    // se parte de SU mapa y solo se toca este ejercicio.
    const ultima = await leerGrupos();
    const actual = { ...(ultima.datos?.grupos ?? {}) };
    if (limpio) actual[id] = limpio; else delete actual[id];
    cache = actual;
    const datos: GruposDatos = { grupos: actual };
    await escribirSeguro(ruta, contenidoNotaDatos(datos));
};

/* Quita del fichero las entradas de ejercicios que YA no aparecen en ninguna
   rutina ni plantilla (ids huérfanos: p. ej. tras borrar una rutina entera).
   Solo se toca el fichero de grupos — nunca una rutina—, y devuelve los ids
   eliminados. Revalida antes de escribir, igual que fijarGrupo. */
export const purgarGruposSinUsar = async (idsEnUso: Set<string>): Promise<string[]> => {
    const ultima = await leerGrupos();
    const actual = { ...(ultima.datos?.grupos ?? {}) };
    const fuera = Object.keys(actual).filter(id => !idsEnUso.has(id));
    if (!fuera.length) return [];
    for (const id of fuera) delete actual[id];
    cache = actual;
    const datos: GruposDatos = { grupos: actual };
    await escribirSeguro(ultima.ruta, contenidoNotaDatos(datos));
    return fuera;
};
