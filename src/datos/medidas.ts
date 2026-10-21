/* ═══════════════════════════════════════════════════════════════════════════
   Medidas corporales: peso y talla, globales para todo el vault.
   ═══════════════════════════════════════════════════════════════════════════ */

import { conf } from "../estado";
import { contenidoNotaDatos, escribirSeguro, leerNotaDatos } from "./archivos";
import type { LecturaNota, MedidasDatos } from "../tipos";

export const medidasVacias = (): MedidasDatos => ({ registros: [] });

export const leerMedidas = async (): Promise<LecturaNota<MedidasDatos>> => {
    const ruta = conf().rutaMedidas;
    const r = await leerNotaDatos<MedidasDatos>(ruta);
    if (r.error) {
        // Archivo ausente = sin medidas todavía; roto = se avisa y no se toca
        if (r.error.includes("No existe")) return { datos: medidasVacias(), ruta };
        return r;
    }
    if (!r.datos || !Array.isArray(r.datos.registros)) return { datos: medidasVacias(), ruta };
    return { datos: r.datos, ruta };
};

export const escribirMedidas = async (datos: MedidasDatos): Promise<string> => {
    const ruta = conf().rutaMedidas;
    datos.registros = [...(datos.registros ?? [])].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    await escribirSeguro(ruta, contenidoNotaDatos(datos));
    return ruta;
};

// Último peso y última talla (la talla no se repite: se hereda de la última
// medida). El IMC se calcula SIEMPRE en kg, sin importar la unidad mostrada.
export const ultimaMedida = (datos?: MedidasDatos): {
    pesoKg: number | null; tallaCm: number | null; fecha: string | null; imc: number | null;
} => {
    const regs = datos?.registros ?? [];
    let peso: number | null = null, talla: number | null = null, fechaPeso: string | null = null;
    for (const r of regs) {
        if (Number.isFinite(Number(r.pesoKg))) { peso = Number(r.pesoKg); fechaPeso = r.fecha; }
        if (Number.isFinite(Number(r.tallaCm))) talla = Number(r.tallaCm);
    }
    return {
        pesoKg: peso,
        tallaCm: talla,
        fecha: fechaPeso,
        imc: (peso && talla) ? peso / Math.pow(talla / 100, 2) : null,
    };
};
