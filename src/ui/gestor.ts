/* ═══════════════════════════════════════════════════════════════════════════
   Gestor de rutinas — el dashboard de una rutina existente.

   Dibuja, en este orden:
     1. Detalles   → KPIs, estructura y botones (editar, pausar/finalizar,
                     duplicar, guardar como plantilla, extender)
     2. Calendario → mensual y navegable, con clic en un día para editar
     3. Registro   → sesión guiada, sesión, anotación y medidas
     4. Estadísticas
     5. Historial filtrable
   ═══════════════════════════════════════════════════════════════════════════ */

import { CONFIG, DIAS_LARGO } from "../config";
import { conf } from "../estado";
import {
    catalogoEjercicios, escribirPlantilla, escribirRutina, esLibre,
    idNuevo, leerMedidas, leerRutina, medidasVacias, plantillaDeRutina,
    plantillaExiste, resumenLibre, semanaActual, semanasTotales,
    transcurrida,
} from "../datos";
import { esc, fechaLegible, hoy, limpiarNombre, sumarDias } from "../util";
import { pesoTexto } from "../unidades";
import type { LecturaNota, MedidasDatos, Rutina } from "../tipos";
import { btn, el, KPI, modal, pedirTexto, toast } from "./componentes";
import { pintarCabecera } from "./cabecera";
import { abrirFormulario, abrirLista, abrirRutina } from "./vistas";
import { fijarPintar, type Pintar } from "./pintar";
import { seccionCalendario } from "./calendario";
import { seccionRegistro } from "./registro";
import { seccionEstadisticas } from "./estadisticas";
import { seccionHistorial } from "./historial";

/* ══════════════════ Modo edición / acciones sobre la nota ══════════════════ */

/* ══════════════════ Punto de entrada ══════════════════ */

/* Dibuja el dashboard de una rutina dentro del contenedor de su pestaña.
   La vista (ui/vista-rutina.ts) se encarga de la cabecera y de reabrirlo. */
export const pintarDashboard = async (cont: HTMLElement, rutinaId: string): Promise<void> => {
    cont.innerHTML = "";

    const r = await leerRutina(rutinaId);
    if (r.error) return pintarError(cont, r.error);
    const rutina = r.datos!;
    if (!rutina?.id) return pintarError(cont, `El archivo ${r.ruta} no tiene una rutina dentro.`);

    let medidas: LecturaNota<MedidasDatos> = await leerMedidas();
    if (medidas.error) {
        // Un problema en medidas.md no debe tumbar el dashboard de la rutina
        toast("⚠️ " + medidas.error, false);
        medidas = { datos: medidasVacias(), ruta: conf().rutaMedidas };
    }

    const cont2 = el("div", "gym-g");
    cont2.style.lineHeight = "1.45";
    cont.appendChild(cont2);

    // Cabecera naranja = zona de navegación: «Rutinas › 🏋️ Esta rutina»
    pintarCabecera(cont2, [
        { texto: "Rutinas", ir: () => void abrirLista() },
        { texto: `🏋️ ${rutina.nombre || "Sin nombre"}` },
    ], {
        subtitulo: `${rutina.objetivo ? esc(rutina.objetivo) + " · " : ""}` +
            `${fechaLegible(rutina.inicio)} → ${fechaLegible(rutina.fin)}`,
    });

    const pintar = () => pintarDashboard(cont, rutinaId);

    seccionDetalles(cont2, rutina, pintar);
    seccionCalendario(cont2, rutina, pintar);
    seccionRegistro(cont2, rutina, pintar, medidas);
    seccionEstadisticas(cont2, rutina, medidas);
    seccionHistorial(cont2, rutina);

    fijarPintar(pintar);   // los modales llaman a esto tras mutar datos
};

const pintarError = (cont: HTMLElement, msg: string): void => {
    const c = el("div", "gym-aviso");
    c.innerHTML = `⚠️ ${esc(msg)}<br/><span style="opacity:.8">No toco nada hasta que el archivo de datos vuelva a estar legible.</span>`;
    cont.appendChild(c);
};

/* ══════════════════ 1 · Detalles de la rutina ══════════════════ */

const seccionDetalles = (c: HTMLElement, rutina: Rutina, pintar: Pintar): void => {
    const fila = el("div", "display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;");
    c.appendChild(fila);

    const semTotal = semanasTotales(rutina) || 1;
    const semActual = semanaActual(rutina);
    const avance = Math.max(0, Math.min(1, semActual / semTotal));

    fila.appendChild(KPI("Estado", estadoTxt(rutina), colorEstado(rutina),
        transcurrida(rutina) ? "pasada su fecha de fin" : `${semTotal} semanas`));
    fila.appendChild(KPI("Progreso", `Sem. ${semActual || "–"}/${semTotal}`, CONFIG.NARANJA,
        `<span style="display:block;height:6px;border-radius:4px;background:var(--background-secondary);margin-top:4px;overflow:hidden">` +
        `<span style="display:block;height:100%;width:${(avance * 100).toFixed(0)}%;background:${CONFIG.NARANJA}"></span></span>`));
    if (esLibre(rutina)) {
        // Sin días programados no hay "Días / semana" que medir: lo que importa
        // es cuántos días has ido y si mantienes la racha de semanas.
        const res = resumenLibre(rutina);
        const cat = catalogoEjercicios(rutina);
        fila.appendChild(KPI("Días entrenados", String(res.dias), CONFIG.AZUL,
            res.racha ? `racha de ${res.racha} semana${res.racha > 1 ? "s" : ""} seguidas`
                      : "sin plan semanal: registras lo que haces"));
        fila.appendChild(KPI("Ejercicios", String(cat.length), CONFIG.VERDE,
            `${(rutina.sesiones ?? []).length} ${rutina.sesiones?.length === 1 ? "sesión" : "sesiones"} registradas`));
    } else {
        fila.appendChild(KPI("Días / semana", String(new Set((rutina.diasSemana ?? []).map(Number)).size || "–"), CONFIG.AZUL,
            (rutina.diasSemana ?? []).map(n => DIAS_LARGO[(Number(n) || 1) - 1]?.slice(0, 3)).filter(Boolean).join(" · ") || "sin días asignados"));
        fila.appendChild(KPI("Ejercicios", String((rutina.dias ?? []).reduce((t, d) => t + (d.ejercicios?.length ?? 0), 0)), CONFIG.VERDE,
            `${(rutina.dias ?? []).length} ${rutina.dias?.length === 1 ? "día" : "días"}`));
    }

    // Estructura: días y ejercicios (o el aviso de que aquí no los hay)
    if (esLibre(rutina)) {
        const cat = catalogoEjercicios(rutina);
        const box = el("div", "padding:10px 12px;border-radius:9px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);margin:6px 0 4px;");
        box.innerHTML = `<div style="font-weight:700;color:${CONFIG.NARANJA}">🗒 Rutina libre</div>` +
            `<div style="font-size:.78em;opacity:.75;margin-bottom:8px">` +
            `Sin días de la semana ni ejercicios fijos: cada día anotas lo que haces de verdad. ` +
            `Las variantes cuentan aparte («Press banca» y «Press banca con mancuernas» tienen su propia progresión).</div>` +
            (cat.length
                ? `<div style="font-size:.82em;line-height:1.9">` +
                  cat.slice(0, 40).map(x => `<span class="gym-chip" style="display:inline-block;margin:0 5px 5px 0">${esc(x.nombre)}</span>`).join("") +
                  `</div>` + (cat.length > 40 ? `<div style="font-size:.74em;opacity:.6;margin-top:4px">…y ${cat.length - 40} más</div>` : "")
                : `<div style="font-size:.82em;opacity:.7">Todavía no has registrado ningún ejercicio.</div>`);
        c.appendChild(box);
    } else {
        const est = el("div", "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:6px 0 4px;");
        for (const d of rutina.dias ?? []) {
            const box = el("div", "padding:10px 12px;border-radius:9px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);");
            const diasTxt = (d.diasSemana ?? []).map(n => DIAS_LARGO[(Number(n) || 1) - 1]).filter(Boolean).join(", ");
            box.innerHTML = `<div style="font-weight:700;color:${CONFIG.NARANJA}">${esc(d.nombre)}</div>` +
                `<div style="font-size:.76em;opacity:.75;margin-bottom:6px">${esc(diasTxt || "sin días asignados")}</div>` +
                `<ul style="margin:0;padding-left:16px;font-size:.82em;line-height:1.6">` +
                (d.ejercicios ?? []).map(e =>
                    `<li>${esc(e.nombre)}` +
                    ` <span style="opacity:.7">· ${e.series}×${e.repsObjetivo}` +
                    (e.pesoObjetivo ? ` @ ${pesoTexto(e.pesoObjetivo)}` : "") +
                    (e.descansoSeg ? ` · desc. ${e.descansoSeg}s` : "") + `</span></li>`).join("") +
                `</ul>`;
            est.appendChild(box);
        }
        c.appendChild(est);
    }

    // Botones de acción
    const acciones = el("div", "gym-botones");
    acciones.appendChild(btn("✏️ Editar rutina", "", () => abrirFormulario({ modo: "editar", rutinaId: rutina.id })));
    acciones.appendChild(btn(
        rutina.estado === "activa" ? "⏸ Pausar" : rutina.estado === "pausada" ? "▶ Reanudar" : "🔄 Marcar como activa",
        "", () => cambiarEstado(rutina, pintar)));
    if (rutina.estado !== "finalizada") acciones.appendChild(btn("🏁 Finalizar", "", () => cambiarEstado(rutina, pintar)));
    acciones.appendChild(btn("📄 Duplicar", "", () => duplicar(rutina)));
    // Una rutina libre no tiene estructura que plantillear
    if (!esLibre(rutina)) acciones.appendChild(btn("📦 Guardar como plantilla", "", () => guardarComoPlantilla(rutina)));
    if (transcurrida(rutina)) acciones.appendChild(btn("➕ Extender 4 semanas", "", () => extender(rutina, pintar)));
    c.appendChild(acciones);
};

const estadoTxt = (r: Rutina): string =>
    r.estado === "pausada" ? "⏸ Pausada" : r.estado === "finalizada" ? "🏁 Finalizada"
        : transcurrida(r) ? "✔ Transcurrida" : "🟢 Activa";
const colorEstado = (r: Rutina): string =>
    r.estado === "pausada" ? "var(--text-muted)" : r.estado === "finalizada" || transcurrida(r)
        ? CONFIG.AZUL : CONFIG.VERDE;

const cambiarEstado = async (rutina: Rutina, pintar: Pintar): Promise<void> => {
    const m = modal("Estado de la rutina", rutina.nombre);
    const fila = el("div", "gym-botones");
    const estados: [string, string][] = [["activa", "🟢 Activa"], ["pausada", "⏸ Pausada"], ["finalizada", "🏁 Finalizada"]];
    for (const [valor, texto] of estados) {
        fila.appendChild(btn(texto, rutina.estado === valor ? "primario" : "", async () => {
            try {
                rutina.estado = valor as Rutina["estado"];
                await escribirRutina(rutina);      // guarda el archivo y su fila en el índice
                m.cerrar();
                toast(`✅ Estado: ${valor}`);
                pintar();
            } catch (e: any) {
                console.error("[Gym Stone estado]", e);
                toast("⚠️ No pude cambiar el estado: " + (e?.message ?? e), false);
            }
        }));
    }
    m.caja.appendChild(fila);
};

const extender = async (rutina: Rutina, pintar: Pintar): Promise<void> => {
    try {
        rutina.fin = sumarDias(rutina.fin, 28);
        rutina.semanas = (semanasTotales(rutina) || 0) + 4;
        if (rutina.estado === "finalizada") rutina.estado = "activa";
        await escribirRutina(rutina);
        toast(`✅ Rutina extendida hasta el ${rutina.fin}`);
        pintar();
    } catch (e: any) {
        console.error("[Gym Stone extender]", e);
        toast("⚠️ No pude extender la rutina: " + (e?.message ?? e), false);
    }
};

/* Duplicar: crea otro archivo de datos con el mismo plan (sin registros) y su
   fila en el índice, y abre la copia en su pestaña. */
const duplicar = async (rutina: Rutina): Promise<void> => {
    const nombre = (await pedirTexto("Nombre de la copia", `${rutina.nombre} (copia)`)) ?? null;
    if (nombre === null) return;
    const limpio = limpiarNombre(nombre);
    if (!limpio) { toast("⚠️ El nombre de la copia está vacío.", false); return; }
    const copia: Rutina = JSON.parse(JSON.stringify(rutina));
    copia.id = await idNuevo(limpio);
    copia.nombre = limpio;
    copia.sesiones = [];         // la copia arranca sin registros
    copia.notasDia = [];
    copia.estado = "activa";
    copia.creado = hoy();
    copia.modificado = hoy();
    try {
        const ruta = await escribirRutina(copia);
        toast(`✅ Rutina duplicada → ${ruta}`);
        await abrirRutina(copia.id);
    } catch (e: any) {
        console.error("[Gym Stone duplicar]", e);
        toast("⚠️ No pude duplicar: " + (e?.message ?? e), false);
    }
};

const guardarComoPlantilla = async (rutina: Rutina): Promise<void> => {
    const nombre = (await pedirTexto("Nombre de la plantilla", rutina.nombre)) ?? null;
    if (nombre === null) return;
    const limpio = limpiarNombre(nombre);
    if (!limpio) { toast("⚠️ El nombre de la plantilla está vacío.", false); return; }
    if (plantillaExiste(limpio)) {
        toast(`⚠️ Ya existe la plantilla «${limpio}.md». No la piso: elige otro nombre o bórrala/renómbrala primero.`, false);
        return;
    }
    try {
        const ruta = await escribirPlantilla(limpio, plantillaDeRutina(rutina));
        toast(`✅ Plantilla guardada → ${ruta}`);
    } catch (e: any) { toast("⚠️ No pude guardar la plantilla: " + (e?.message ?? e), false); }
};
