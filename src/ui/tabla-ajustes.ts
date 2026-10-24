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
            .setName("Carpeta raíz")
            .setDesc("Toda la vida del plugin en UNA carpeta (en minúsculas): rutinas.gym-stone.md (índice), datos/rutinas/ (una rutina por archivo), " +
                "datos/medidas.gym-stone.md, datos/ejercicios.gym-stone.md y plantillas/. Cambiarla no mueve los archivos existentes.")
            .addText(t => t.setPlaceholder("gym-stone")
                .setValue(conf().carpetaRaiz)
                .onChange(async v => this.guardar("carpetaRaiz", v)));

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
                name: "Carpeta raíz",
                desc: "Toda la vida del plugin en UNA carpeta (en minúsculas): rutinas.gym-stone.md (índice), datos/rutinas/ (una rutina por archivo), datos/medidas.gym-stone.md, datos/ejercicios.gym-stone.md y plantillas/. Cambiarla no mueve los archivos existentes.",
                control: { key: "carpetaRaiz", type: "text", placeholder: "gym-stone" },
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
