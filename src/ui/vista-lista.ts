/* ═══════════════════════════════════════════════════════════════════════════
   La pestaña inicial: «Rutinas».

   Es el índice hecho interfaz: la lista de todas las rutinas (nombre, estado,
   fechas, semana en curso y sesiones hechas) con sus acciones, más un resumen
   de las medidas corporales. No lee cada archivo de datos: todo sale del
   índice (Rutinas.md), que se regenera solo al guardar.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import { CONFIG } from "../config";
import { aplicacion, conf } from "../estado";
import { borrarRutina, leerIndice, leerMedidas, leerRutina, ultimaMedida } from "../datos";
import type { IndiceRutina } from "../tipos";
import { diffDias, fechaLegible, hoy, msgError } from "../util";
import { fijarUnidadPeso, pesoActual, pesoTexto, tallaTexto, unidadContraria } from "../unidades";
import { KPI, btn, caja, confirmar, el, toast } from "./componentes";
import { pintarCabecera } from "./cabecera";
import { gestionarEjercicios } from "./ejercicios-ui";
import { formularioMedidas } from "./registro";
import { elegirDiaGuiada } from "./sesion-guiada";
import { VISTA_LISTA, abrirComoMarkdown, abrirFormulario, abrirRutina } from "./vistas";

export class VistaLista extends ItemView {
    constructor(leaf: WorkspaceLeaf) { super(leaf); }

    getViewType(): string { return VISTA_LISTA; }
    getDisplayText(): string { return "Rutinas"; }
    getIcon(): string { return "dumbbell"; }

    async onOpen(): Promise<void> {
        // Se repinta sola cuando cambia algo relevante en el vault (índice,
        // medidas o un archivo de rutina): los datos que lleguen de fuera se
        // ven al momento, sin recargar Obsidian.
        const relevante = (ruta: string): boolean =>
            ruta === conf().rutaIndice
            || ruta === conf().rutaMedidas
            || ruta.startsWith(conf().carpetaDatos + "/");
        const alCambiar = (f: { path: string }) => { if (relevante(f.path)) void this.pintar(); };
        this.registerEvent(aplicacion().vault.on("modify", alCambiar));
        this.registerEvent(aplicacion().vault.on("create", alCambiar));
        this.registerEvent(aplicacion().vault.on("delete", alCambiar));
        await this.pintar();
    }

    private accionesHechas = false;

    /* Solo se añaden UNA vez (cada pintado nuevo repetiría los iconos) */
    private acciones(): void {
        if (this.accionesHechas) return;
        this.accionesHechas = true;
        // Solo recargar y kg↔lb: crear y registrar medidas viven dentro del
        // panel (sus botones), aquí no se duplican.
        this.addAction("refresh-cw", "Recargar lista", () => void this.pintar());
        this.addAction("arrow-left-right", "Alternar pesos kg ↔ libras", () => {
            fijarUnidadPeso(unidadContraria());
            toast(`⚖️ Pesos en ${pesoActual()}`);
            void this.pintar();
        });
        // Arriba-derecha: ver esta misma pestaña como la nota cruda
        this.addAction("file-text", "Abrir Rutinas.md como markdown", () => abrirComoMarkdown(conf().rutaIndice));
    }

    /* ── Semana en curso, calculada solo con las fechas del índice ── */
    private semanaDe(f: IndiceRutina): number {
        const d = diffDias(f.inicio, hoy()) + 1;
        if (d <= 0) return 0;                    // aún no ha empezado
        return Math.min(Math.ceil(d / 7), f.semanas || 1);
    }

    private estadoTxt = (f: IndiceRutina): string =>
        f.estado === "pausada" ? "⏸ Pausada" : f.estado === "finalizada" ? "🏁 Finalizada"
            : this.semanaDe(f) > f.semanas ? "✔ Transcurrida" : "🟢 Activa";

    private estadoColor = (f: IndiceRutina): string =>
        f.estado === "pausada" ? "var(--text-muted)"
            : f.estado === "finalizada" || this.semanaDe(f) > f.semanas ? CONFIG.AZUL : CONFIG.VERDE;

    async pintar(): Promise<void> {
        const raiz = this.contentEl;
        raiz.empty();
        raiz.addClass("gym-vista");

        // Acciones en la cabecera de la pestaña (como las de Kanban)
        this.acciones();

        // Todo el contenido vive en la pestaña (sin riel lateral)
        const cont = raiz;

        // Cabecera naranja: el título de esta pantalla («casa»)
        pintarCabecera(cont, [{ texto: "🏋️ Rutinas" }]);

        const { indice, error } = await leerIndice();
        if (error) {
            cont.createDiv({
                cls: "gym-error-vista",
                text: "⚠️ " + error + " — no lo sobrescribo: repáralo a mano (o bórralo y se regenerará vacío).",
            });
        }

        // ── Resumen ──
        const resumen = cont.createDiv({ cls: "gym-kpis" });
        const activas = indice.rutinas.filter(f => f.estado === "activa").length;
        const totalSesiones = indice.rutinas.reduce((n, f) => n + (f.sesiones || 0), 0);
        resumen.appendChild(KPI("Rutinas", String(indice.rutinas.length), CONFIG.NARANJA,
            indice.rutinas.length ? `${activas} activas` : undefined));
        resumen.appendChild(KPI("Sesiones hechas", String(totalSesiones), CONFIG.VERDE));

        const medidas = await leerMedidas();
        if (medidas.error) toast("⚠️ " + medidas.error, false);
        const ult = ultimaMedida(medidas.datos);
        if (ult.pesoKg != null) {
            resumen.appendChild(KPI("Peso actual", pesoTexto(ult.pesoKg), CONFIG.AZUL,
                ult.fecha ? fechaLegible(ult.fecha) : undefined));
        }
        if (ult.tallaCm != null) {
            resumen.appendChild(KPI("Talla", tallaTexto(ult.tallaCm), CONFIG.AZUL));
        }
        if (ult.imc != null) {
            resumen.appendChild(KPI("IMC", ult.imc.toFixed(1), CONFIG.VERDE));
        }

        // ── Lista de rutinas ──
        const c = caja(cont, "📋 Rutinas", "Pulsa una rutina para abrir su dashboard");

        // Acciones visibles dentro del panel (además de los iconos de cabecera)
        const filaAcciones = el("div", "gym-botones");
        filaAcciones.appendChild(btn("＋ Nueva rutina", "primario", () => void abrirFormulario({ modo: "crear" })));
        filaAcciones.appendChild(btn("⚖️ Registrar medidas", "", () => void this.abrirMedidas()));
        filaAcciones.appendChild(btn("🗂 Ejercicios", "", () => gestionarEjercicios()));
        c.appendChild(filaAcciones);
        if (!indice.rutinas.length) {
            c.createDiv({
                cls: "gym-vacio",
                text: "🏋️ Aún no hay rutinas: pulsa «＋ Nueva rutina» para crear la primera.",
            });
            return;
        }

        const lista = c.createDiv({ cls: "gym-lista-rutinas" });
        // Las activas primero; dentro de cada grupo, las más recientes
        const orden = [...indice.rutinas].sort((a, b) =>
            (a.estado === "activa" ? 0 : a.estado === "pausada" ? 1 : 2) - (b.estado === "activa" ? 0 : b.estado === "pausada" ? 1 : 2)
            || (b.modificada ?? "").localeCompare(a.modificada ?? ""));
        for (const f of orden) lista.appendChild(this.fila(f));
    }

    /* Una fila de la lista: nombre + estado + fechas + progreso, con editar y borrar */
    private fila(f: IndiceRutina): HTMLElement {
        const fila = el("div", "gym-fila-rutina");

        const principal = btn("", "gym-fila-rutina-principal", () => void abrirRutina(f.id));
        principal.createSpan({ cls: "gym-fila-nombre", text: f.nombre });
        const sem = this.semanaDe(f);
        const meta = [
            this.estadoTxt(f),
            f.inicio ? `${fechaLegible(f.inicio)} → ${f.fin ? fechaLegible(f.fin) : "…"}` : "",
            sem > 0 ? `Semana ${sem}/${f.semanas || "?"}` : "",
            `${f.sesiones || 0} sesiones`,
        ].filter(Boolean).join(" · ");
        const m = principal.createSpan({ cls: "gym-fila-meta", text: meta });
        m.style.color = this.estadoColor(f);
        fila.appendChild(principal);

        const acciones = fila.createDiv({ cls: "gym-fila-rutina-acciones" });
        const bGuiada = btn("🎯", "gym-btn-icono", () => void this.sesionGuiada(f));
        bGuiada.title = "🎯 Empezar sesión guiada";
        acciones.appendChild(bGuiada);
        acciones.appendChild(btn("✏️", "gym-btn-icono", () => void abrirFormulario({ modo: "editar", rutinaId: f.id })));
        acciones.appendChild(btn("🗑", "gym-btn-icono", () => void this.borrar(f)));
        return fila;
    }

    /* Atajo de fila: arrancar la sesión guiada de esa rutina sin entrar a su
       ficha (la guiada es un overlay: se vive encima de la lista, y al guardar
       repinta ésta; los cambios de vault también la repintan solos). */
    private async sesionGuiada(f: IndiceRutina): Promise<void> {
        const r = await leerRutina(f.id);
        if (r.error || !r.datos) return toast("⚠️ " + (r.error ?? "No pude leer esa rutina."), false);
        elegirDiaGuiada(r.datos, () => void this.pintar());
    }

    private async borrar(f: IndiceRutina): Promise<void> {
        const ok = await confirmar("🗑 Borrar rutina",
            `¿Borrar «${f.nombre}»? Se elimina su archivo de datos (queda copia .bak en la misma carpeta) y su fila del índice. Las plantillas y las medidas no se tocan.`,
            "Borrar", "Cancelar", true);   // botón en rojo: es destructivo
        if (!ok) return;
        try {
            await borrarRutina(f.id);
            toast(`🗑 Rutina «${f.nombre}» borrada (copia .bak guardada)`);
            await this.pintar();
        } catch (e: unknown) {
            console.error("[Gym Stone borrar]", e);
            toast("⚠️ No pude borrar la rutina: " + msgError(e), false);
        }
    }

    private async abrirMedidas(): Promise<void> {
        const medidas = await leerMedidas();
        if (medidas.error) toast("⚠️ " + medidas.error, false);
        formularioMedidas(medidas, () => void this.pintar());
    }
}
