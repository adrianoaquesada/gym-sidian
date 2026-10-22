/* ═══════════════════════════════════════════════════════════════════════════
   Gym Stone — plugin de Obsidian (entrada principal)

   Sistema de rutinas de gimnasio a pantalla completa: el plugin vive en
   pestañas propias (tipo Kanban), no dentro de notas. Navegación en una sola
   pestaña: lista «Rutinas» ⇄ ficha de la rutina; crear/editar en hoja
   superpuesta.

   Dónde están los datos (notas .md con bloques ```json```: legibles a mano,
   git-friendly; el motor avisa y no sobrescribe si alguien lo rompe):

     · Rutinas.md            el índice: una fila por rutina (fecha, id, nombre, estado)
     · Datos/rutinas/<id>.md cada rutina con TODO: plan + sesiones + anotaciones
     · Datos/medidas.md      peso y talla (globales)
     · Plantillas/*.md       plantillas reutilizables
   ═══════════════════════════════════════════════════════════════════════════ */

import { MarkdownView, Plugin, type WorkspaceLeaf } from "obsidian";
import { normalizarAjustes, type AjustesGym } from "./ajustes";
import { iniciarEstado, actualizarAjustes } from "./estado";
import { limpiarOverlays, toast } from "./ui/componentes";
import { abrirTemporizador, pararTemporizador } from "./ui/temporizador";
import { GymStoneTab } from "./ui/tabla-ajustes";
import { VistaLista } from "./ui/vista-lista";
import { VistaRutina } from "./ui/vista-rutina";
import { VistaForm } from "./ui/vista-form";
import {
    VISTA_FORM, VISTA_LISTA, VISTA_RUTINA,
    abrirArchivoComoPlugin, abrirFormulario, abrirLista,
    esArchivoGym, esMdRecienteDelPlugin,
} from "./ui/vistas";

export default class GymStone extends Plugin {
    ajustes: AjustesGym = normalizarAjustes(null);

    async onload(): Promise<void> {
        const datos = ((await this.loadData()) ?? {}) as Partial<AjustesGym> & { avisoListo?: boolean };
        this.ajustes = normalizarAjustes(datos);
        iniciarEstado(this.app, this.ajustes);

        /* ── Las pantallas del plugin ── */
        this.registerView(VISTA_LISTA, leaf => new VistaLista(leaf));
        this.registerView(VISTA_RUTINA, leaf => new VistaRutina(leaf));
        this.registerView(VISTA_FORM, leaf => new VistaForm(leaf));   // legado

        /* ── Cinta lateral: la lista de rutinas con un clic ── */
        this.addRibbonIcon("dumbbell", "Abrir las rutinas", () => void abrirLista());

        /* ── Abrir los archivos del plugin COMO el plugin (truco de Kanban):
              si abres el índice o una rutina desde el explorador, un enlace o
              el buscador rápido, ESA pestaña pasa a la vista del plugin ── */
        this.registerEvent(this.app.workspace.on("file-open", f => {
            if (!f || !esArchivoGym(f.path)) return;
            if (esMdRecienteDelPlugin(f.path)) return;   // fue nuestra propia «abrir como markdown»
            const vistasMd = this.app.workspace.getLeavesOfType("markdown");
            const vistaActiva = this.app.workspace.getActiveViewOfType(MarkdownView);
            const hoja = vistasMd.find(l => (l.view as MarkdownView).file?.path === f.path)
                ?? vistasMd.find(l => l.view === vistaActiva);
            if (!hoja || !(hoja.view instanceof MarkdownView)) return;
            void abrirArchivoComoPlugin(hoja, f.path);
        }));

        /* ── Y al revés: botón «abrir con el plugin» en la cabecera (arriba-
              derecha) de las pestañas markdown de esos mismos archivos ── */
        this.registerEvent(this.app.workspace.on("active-leaf-change", leaf => this.marcarVistaMarkdownGym(leaf)));

        /* ── Comandos ── */
        this.addCommand({
            id: "abrir-lista",
            name: "Abrir la lista de rutinas",
            callback: () => void abrirLista(),
        });
        this.addCommand({
            id: "nueva-rutina",
            name: "Crear nueva rutina",
            callback: () => void abrirFormulario({ modo: "crear" }),
        });
        this.addCommand({
            id: "temporizador",
            name: "Abrir el temporizador (cuenta atrás libre)",
            callback: () => abrirTemporizador(),
        });

        this.addSettingTab(new GymStoneTab(this.app, this));

        /* Aviso la primera vez (solo si aún no hay índice) */
        this.app.workspace.onLayoutReady(() => {
            // Pestañas markdown de archivos del plugin restauradas al arrancar:
            // se les pone su botón «abrir con el plugin» (a diferencia del
            // file-open, aquí no se convierte nada sin que lo pidas)
            for (const hoja of this.app.workspace.getLeavesOfType("markdown")) {
                this.marcarVistaMarkdownGym(hoja);
            }
            try {
                if (!datos.avisoListo && !this.app.vault.getAbstractFileByPath(this.ajustes.rutaIndice)) {
                    toast("🏋️ Gym Stone: pulsa la campana de mancuerna (izquierda) o el comando «Abrir la lista de rutinas».");
                    void this.saveData({ ...this.ajustes, avisoListo: true });
                }
            } catch { /* sin datos no hay nada que avisar */ }
        });
    }

    /* Botón «abrir con el plugin» en la vista markdown de un archivo del
       plugin (índice o rutina). Se añade UNA sola vez por pestaña: la marca
       vive en la propia vista, que es la que se destruye al convertirla. */
    private marcarVistaMarkdownGym(leaf: WorkspaceLeaf | null): void {
        const v = leaf?.view;
        if (!(v instanceof MarkdownView)) return;
        const f = v.file;
        if (!f || !esArchivoGym(f.path)) return;
        const marcada = v as unknown as { gymBoton?: boolean };
        if (marcada.gymBoton) return;
        marcada.gymBoton = true;
        v.addAction("dumbbell", "Abrir este archivo con Gym Stone (vista del plugin)", () => {
            void abrirArchivoComoPlugin(v.leaf, f.path);
        });
    }

    onunload(): void {
        pararTemporizador();   // el intervalo del temporizador libre no debe sobrevivir
        limpiarOverlays();
    }

    /* ── Utilidades para la pestaña de ajustes ── */

    async guardarAjustes(ajustes: AjustesGym): Promise<void> {
        this.ajustes = ajustes;
        actualizarAjustes(ajustes);
        await this.saveData(ajustes);
    }

    // Tras cambiar rutas o unidades, las pestañas abiertas se repintan
    repintarVistasGym(): void {
        for (const tipo of [VISTA_LISTA, VISTA_RUTINA]) {
            for (const hoja of this.app.workspace.getLeavesOfType(tipo)) {
                const vista = hoja.view as unknown as { pintar?: () => Promise<void> };
                if (typeof vista?.pintar === "function") void vista.pintar();
            }
        }
    }
}
