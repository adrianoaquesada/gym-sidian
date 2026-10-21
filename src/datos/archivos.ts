/* ═══════════════════════════════════════════════════════════════════════════
   Bloques JSON dentro de las notas de datos + escritura segura.

   Cada nota de datos es un bloque ```json``` puro: sin frontmatter y sin
   texto que acompañe. Así la nota es legible en el editor, git-friendly y,
   si alguien la toca a mano y rompe el JSON, el motor AVISA y no sobrescribe.

   Escritura segura (nunca se pierden datos):
     · archivo nuevo   → se escribe en un temporal y se renombra (atómico)
     · archivo existente → antes de sobrescribir se guarda la copia previa en
       <archivo>.bak, y solo se escribe si el contenido cambia
     · lectura fallida → se devuelve { error } y NO se escribe nada
   ═══════════════════════════════════════════════════════════════════════════ */

import { TFile } from "obsidian";
import { aplicacion } from "../estado";
import type { LecturaNota } from "../tipos";

// Extrae el contenido del primer bloque ```json``` de una nota
export const bloqueJson = (txt: unknown): string | null => {
    const m = /```json\s*\n?([\s\S]*?)```/.exec(String(txt ?? ""));
    return m ? m[1].trim() : null;
};

// Nota de datos completa: un único bloque ```json``` (sin frontmatter)
export const contenidoNotaDatos = (datos: unknown): string =>
    "```json\n" + JSON.stringify(datos, null, 2) + "\n```\n";

const carpetaDe = (ruta: string): string => (ruta.includes("/") ? ruta.slice(0, ruta.lastIndexOf("/")) : "");

export const asegurarCarpeta = async (ruta: string): Promise<void> => {
    const carpeta = carpetaDe(ruta);
    if (!carpeta || aplicacion().vault.getAbstractFileByPath(carpeta)) return;
    const partes = carpeta.split("/");
    let acum = "";
    for (const p of partes) {
        acum = acum ? `${acum}/${p}` : p;
        if (!aplicacion().vault.getAbstractFileByPath(acum)) await aplicacion().vault.createFolder(acum);
    }
};

// Escribe `contenido` en `ruta` sin riesgo de perder lo que había.
// Si la lectura previa falla, lanza (el aviso lo da quien llama): no se
// sobrescribe nunca un archivo que no se puede leer.
export const escribirSeguro = async (ruta: string, contenido: string): Promise<void> => {
    await asegurarCarpeta(ruta);
    const vault = aplicacion().vault;
    const existente = vault.getAbstractFileByPath(ruta);
    if (!existente) {
        // Nuevo: temporal + rename (atómico a nivel de sistema de archivos)
        const tmp = `${ruta.replace(/\.md$/, "")}.tmp.md`;
        const previo = vault.getAbstractFileByPath(tmp);
        if (previo) await vault.delete(previo);        // restos de un corte anterior
        const f = await vault.create(tmp, contenido);
        await aplicacion().fileManager.renameFile(f, ruta);
        return;
    }
    if (!(existente instanceof TFile)) return;
    const previo = await vault.read(existente);
    if (previo === contenido) return;                   // nada que tocar
    // Copia de seguridad del contenido anterior, y solo después se escribe
    const bak = `${ruta}.bak`;
    const fb = vault.getAbstractFileByPath(bak);
    if (fb instanceof TFile) await vault.modify(fb, previo);
    else await vault.create(bak, previo);
    await vault.modify(existente, contenido);
};

// Lee y parsea una nota de datos. Nunca lanza: devuelve { error } en su lugar.
export const leerNotaDatos = async <T>(ruta: string): Promise<LecturaNota<T>> => {
    const vault = aplicacion().vault;
    const f = vault.getAbstractFileByPath(ruta);
    if (!f) return { error: `No existe el archivo ${ruta}.`, ruta };
    if (!(f instanceof TFile)) return { error: `${ruta} no es un archivo.`, ruta };
    let txt = "";
    try { txt = await vault.read(f); }
    catch (e: any) { return { error: `No pude leer ${ruta}: ${e?.message ?? e}`, ruta }; }
    const json = bloqueJson(txt);
    if (json === null) return { error: `El archivo ${ruta} no tiene bloque json legible: no lo sobrescribo por si acaso.`, ruta };
    try { return { datos: JSON.parse(json) as T, file: f, ruta }; }
    catch (e: any) { return { error: `El bloque JSON de ${ruta} está roto (${e?.message ?? e}): no lo sobrescribo por si acaso.`, ruta }; }
};
