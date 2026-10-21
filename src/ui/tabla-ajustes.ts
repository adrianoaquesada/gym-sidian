/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes → Gym Stone
   ═══════════════════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting } from "obsidian";
import type GymStone from "../main";
import { normalizarAjustes, type AjustesGym } from "../ajustes";
import { actualizarAjustes, conf } from "../estado";
import { pesoActual } from "../unidades";

export class GymStoneTab extends PluginSettingTab {
    constructor(app: App, private readonly pluginRef: GymStone) {
        super(app, pluginRef);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Archivo índice")
            .setDesc("Una sola nota con la lista de todas las rutinas (fecha, id, nombre y estado). Se regenera solo al guardar.")
            .addText(t => t.setPlaceholder("08 Gimnasio/Rutinas.md")
                .setValue(conf().rutaIndice)
                .onChange(async v => this.guardar("rutaIndice", v)));

        new Setting(containerEl)
            .setName("Carpeta de datos")
            .setDesc("Un archivo .md por rutina con su definición y sus sesiones.")
            .addText(t => t.setPlaceholder("08 Gimnasio/Datos/rutinas")
                .setValue(conf().carpetaDatos)
                .onChange(async v => this.guardar("carpetaDatos", v)));

        new Setting(containerEl)
            .setName("Archivo de medidas")
            .setDesc("Peso y talla, globales para todas las rutinas.")
            .addText(t => t.setPlaceholder("08 Gimnasio/Datos/medidas.md")
                .setValue(conf().rutaMedidas)
                .onChange(async v => this.guardar("rutaMedidas", v)));

        new Setting(containerEl)
            .setName("Carpeta de plantillas")
            .setDesc("Estructuras reutilizables («Guardar como plantilla»).")
            .addText(t => t.setPlaceholder("08 Gimnasio/Plantillas")
                .setValue(conf().carpetaPlantillas)
                .onChange(async v => this.guardar("carpetaPlantillas", v)));

        new Setting(containerEl)
            .setName("Unidad de talla")
            .setDesc("El archivo guarda centímetros; esto decide cómo se muestra.")
            .addDropdown(d => d.addOption("cm", "cm").addOption("in", "in")
                .setValue(conf().unidadTalla)
                .onChange(async v => this.guardar("unidadTalla", v as "cm" | "in")));

        new Setting(containerEl)
            .setName("Unidad de peso")
            .setDesc("Se cambia en caliente desde cualquier formulario o rutina (se recuerda por dispositivo); aquí solo se ve la vigente.")
            .addText(t => {
                t.setValue(pesoActual());
                t.inputEl.disabled = true;
                t.setPlaceholder("cambia en el selector kg | lb del propio panel");
            });
    }

    private async guardar<K extends keyof AjustesGym>(clave: K, valor: AjustesGym[K]): Promise<void> {
        const actual = normalizarAjustes({ ...conf(), [clave]: valor });
        actualizarAjustes(actual);
        await this.pluginRef.guardarAjustes(actual);
        this.pluginRef.repintarVistasGym();
    }
}
