/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes → Gym Stone
   ═══════════════════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
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
            .setDesc("Una sola nota con la lista de todas las rutinas (fecha, ID, nombre y estado). Se regenera solo al guardar.")
            .addText(t => t.setPlaceholder("08 Gimnasio/Rutinas.md")
                .setValue(conf().rutaIndice)
                .onChange(async v => this.guardar("rutaIndice", v)));

        new Setting(containerEl)
            .setName("Carpeta de datos")
            .setDesc("Un archivo .md por rutina con su definición y sus sesiones.")
            .addText(t => t.setPlaceholder("08 Gimnasio/datos/rutinas")
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
            .setDesc("(Guardar como plantilla) crea estructuras reutilizables.")
            .addText(t => t.setPlaceholder("08 Gimnasio/plantillas")
                .setValue(conf().carpetaPlantillas)
                .onChange(async v => this.guardar("carpetaPlantillas", v)));

        new Setting(containerEl)
            .setName("Unidad de talla")
            .setDesc("El archivo guarda centímetros; esto decide cómo se muestra.")
            .addDropdown(d => d.addOption("cm", "Cm").addOption("in", "In")
                .setValue(conf().unidadTalla)
                .onChange(async v => this.guardar("unidadTalla", v as "cm" | "in")));

        new Setting(containerEl)
            .setName("Unidad de peso")
            .setDesc("Se cambia en el selector kg | lb del propio panel; aquí solo se ve la vigente.")
            .addText(t => {
                t.setValue(pesoActual());
                t.inputEl.disabled = true;
                t.setPlaceholder("Cambia en el selector kg | lb del propio panel");
            });
    }

    /* Ajustes declarativos (Obsidian 1.13+): display() de arriba sigue
       pintando la pestaña en versiones antiguas, y con estas definiciones la
       pestaña entra además en el buscador de ajustes de 1.13 en adelante.
       Los valores van al mismo conf()/guardar() de display(), así que las
       dos vías siempre cuadran. */
    override getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            {
                name: "Archivo índice",
                desc: "Una sola nota con la lista de todas las rutinas (fecha, ID, nombre y estado). Se regenera solo al guardar.",
                control: { key: "rutaIndice", type: "text", placeholder: "08 Gimnasio/Rutinas.md" },
            },
            {
                name: "Carpeta de datos",
                desc: "Un archivo .md por rutina con su definición y sus sesiones.",
                control: { key: "carpetaDatos", type: "text", placeholder: "08 Gimnasio/datos/rutinas" },
            },
            {
                name: "Archivo de medidas",
                desc: "Peso y talla, globales para todas las rutinas.",
                control: { key: "rutaMedidas", type: "text", placeholder: "08 Gimnasio/Datos/medidas.md" },
            },
            {
                name: "Carpeta de plantillas",
                desc: "(Guardar como plantilla) crea estructuras reutilizables.",
                control: { key: "carpetaPlantillas", type: "text", placeholder: "08 Gimnasio/plantillas" },
            },
            {
                name: "Unidad de talla",
                desc: "El archivo guarda centímetros; esto decide cómo se muestra.",
                control: { key: "unidadTalla", type: "dropdown", options: { cm: "Cm", in: "In" } },
            },
            {
                name: "Unidad de peso",
                desc: "Se cambia en el selector kg | lb del propio panel; aquí solo se ve la vigente.",
                searchable: false,
            },
        ];
    }

    // La fuente de verdad no es plugin.settings sino conf(): se leen y se
    // escriben los ajustes del plugin desde ahí.
    override getControlValue(key: string): unknown {
        return (conf() as unknown as Record<string, unknown>)[key];
    }

    override setControlValue(key: string, value: unknown): void | Promise<void> {
        // normalizarAjustes (dentro de guardar) valida y rellena el resto
        return this.guardar(key as keyof AjustesGym, value as never);
    }

    private async guardar<K extends keyof AjustesGym>(clave: K, valor: AjustesGym[K]): Promise<void> {
        const actual = normalizarAjustes({ ...conf(), [clave]: valor });
        actualizarAjustes(actual);
        await this.pluginRef.guardarAjustes(actual);
        this.pluginRef.repintarVistasGym();
    }
}
