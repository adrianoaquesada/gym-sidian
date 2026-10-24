/* ═══════════════════════════════════════════════════════════════════════════
   La pestaña de una rutina: su dashboard a todo el ancho.

   Aquí solo vive la cabecera de la pestaña (recargar; el resto de accesos
   está en la fila de navegación y en el menú ⋮) y el estado (qué rutina
   está abierta); el contenido lo pinta ui/gestor.ts.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { aplicacion } from "../estado";
import { leerRutina, rutaDatosDe } from "../datos";
import { pintarDashboard } from "./gestor";
import { VISTA_RUTINA, abrirLista } from "./vistas";

interface EstadoRutinaAbierta { [k: string]: unknown; rutinaId?: string | null; }

export class VistaRutina extends ItemView {
    private rutinaId: string | null = null;
    private nombre = "";

    constructor(leaf: WorkspaceLeaf) { super(leaf); }

    getViewType(): string { return VISTA_RUTINA; }
    getDisplayText(): string { return this.nombre || (this.rutinaId ? `Rutina · ${this.rutinaId}` : "Rutina"); }
    getIcon(): string { return "dumbbell"; }

    /* El id viaja en el estado de la pestaña: al reabrir Obsidian se restaura */
    getState(): EstadoRutinaAbierta { return { rutinaId: this.rutinaId }; }

    async setState(state: EstadoRutinaAbierta, result: ViewStateResult): Promise<void> {
        this.rutinaId = state?.rutinaId ?? null;
        await super.setState(state, result);
        await this.pintar();
    }

    async onOpen(): Promise<void> {
        if (!this.rutinaId) {
            const st = this.leaf.getViewState()?.state;
            this.rutinaId = typeof st?.rutinaId === "string" ? st.rutinaId : null;
        }
        // Se repinta si cambia el archivo de LA rutina que está abierta ahora
        // (ediciones externas, otras vistas…): el id se mira en cada evento,
        // por si la misma pestaña ha pasado a otra rutina.
        const esMia = (ruta: string): boolean => Boolean(this.rutinaId) && ruta === rutaDatosDe(this.rutinaId!);
        this.registerEvent(aplicacion().vault.on("modify", f => { if (esMia(f.path)) void this.pintar(); }));
        this.registerEvent(aplicacion().vault.on("delete", f => { if (esMia(f.path)) void this.pintar(); }));
        await this.pintar();
    }

    private accionesHechas = false;

    private acciones(): void {
        if (this.accionesHechas) return;
        this.accionesHechas = true;
        // Solo recargar: volver/editar/temporizador viven en la fila de
        // navegación, y «alternar pesos» y «abrir como markdown» en el
        // menú ⋮ (main.ts), no aquí.
        this.addAction("refresh-cw", "Recargar", () => void this.pintar());
    }

    /* Nota cruda de esta rutina (para «abrir como markdown» del menú ⋮) */
    rutaMarkdown(): string | null { return this.rutinaId ? rutaDatosDe(this.rutinaId) : null; }

    async pintar(): Promise<void> {
        const raiz = this.contentEl;
        raiz.empty();
        raiz.addClass("gym-vista");
        this.acciones();

        if (!this.rutinaId) { void abrirLista(); return; }

        // El título de la pestaña sigue al nombre real de la rutina
        const r = await leerRutina(this.rutinaId);
        if (r.error) {
            raiz.createDiv({ cls: "gym-error-vista", text: "⚠️ " + r.error });
            return;
        }
        this.nombre = r.datos?.nombre || "";

        // Todo el contenido vive en la pestaña (sin riel lateral)
        const cont = raiz;
        await pintarDashboard(cont, this.rutinaId);
    }
}
