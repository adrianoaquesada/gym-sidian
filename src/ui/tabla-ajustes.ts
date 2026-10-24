/* ═══════════════════════════════════════════════════════════════════════════
   Ajustes → Gym Stone
   ═══════════════════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type GymStone from "../main";
import { normalizarAjustes, type AjustesGym } from "../ajustes";
import { actualizarAjustes, conf } from "../estado";
import { refrescarDespierta } from "../despierta";
import { probarSonido } from "./sonido";
import { fijarUnidadPeso, pesoActual } from "../unidades";

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
            .setDesc("En el archivo el peso se guarda SIEMPRE en kg; esto decide en qué unidad se muestra y se teclea. " +
                "Es el mismo cambio que el selector kg | lb del propio panel o «Alternar pesos kg ↔ libras» del menú ⋮: " +
                "aquí se hace desde la configuración y se recuerda por vault.")
            .addDropdown(d => d.addOption("kg", "Kilogramos (kg)")
                .addOption("lb", "Libras (lb)")
                .setValue(pesoActual())
                .onChange(u => this.fijarPeso(u)));

        new Setting(containerEl)
            .setName("Mantener la pantalla encendida")
            .setDesc("Mientras corre un temporizador —el ⏱ libre o la cuenta atrás de una sesión guiada en marcha— la pantalla no se apaga sola " +
                "(al pausar o parar se suelta). En móvil es lo que evita que se oscurezca entre series; en escritorio no hace falta y no hace nada. " +
                "Sin efecto si el sistema no lo permite (batería baja o navegador sin esa API).")
            .addToggle(t => t.setValue(conf().mantenerDespierta)
                .onChange(async v => this.guardar("mantenerDespierta", v)));

        // ── Sonido de los avisos: interruptor de CADA uno + volumen común + prueba ──
        new Setting(containerEl)
            .setName("Sonido del temporizador")
            .setDesc("Al terminar la cuenta atrás del ⏱ libre suena un pitido de tres notas (sintetizado, sin archivos de audio). " +
                "Apágalo si prefieres solo el aviso visual y la vibración del móvil.")
            .addToggle(t => t.setValue(conf().sonidoTemporizador)
                .onChange(async v => this.guardar("sonidoTemporizador", v)));

        new Setting(containerEl)
            .setName("Sonido del descanso")
            .setDesc("Al terminar un descanso entre series de la sesión guiada suena el mismo pitido y el móvil vibra. " +
                "Sin sonido siguen el «¡Listo!» de pantalla y la devolución al ejercicio. No suena con «⏭ Saltar descanso».")
            .addToggle(t => t.setValue(conf().sonidoDescanso)
                .onChange(async v => this.guardar("sonidoDescanso", v)));

        new Setting(containerEl)
            .setName("Volumen del sonido")
            .setDesc("Intensidad del pitido (0–100 %), igual para el temporizador y para el descanso. Al 0 % no suena aunque el sonido esté activado.")
            .addSlider(s => s.setLimits(0, 100, 5)
                .setValue(conf().volumenSonido)
                .onChange(async v => this.guardar("volumenSonido", v)))
            .addButton(b => b.setButtonText("🔊 Probar")
                .setTooltip("Suena el pitido con el volumen actual (ignora los interruptores)")
                .onClick(() => probarSonido()));
    }

    /* Ajustes declarativos (Obsidian 1.13+): display() de arriba sigue
       pintando la pestaña en versiones antiguas, y con estas definiciones la
       pestaña entra además en el buscador de ajustes de 1.13 en adelante.
       Los valores van al mismo conf()/guardar() de display() —y el de
       «unidadPeso» a fijarPeso(), que no es un ajuste de data.json—, así que
       las dos vías siempre cuadran. */
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
                desc: "En el archivo el peso se guarda SIEMPRE en kg; esto decide en qué unidad se muestra y se teclea. " +
                    "Es el mismo cambio que el selector kg | lb del propio panel o «Alternar pesos kg ↔ libras» del menú ⋮: " +
                    "aquí se hace desde la configuración y se recuerda por vault.",
                control: {
                    key: "unidadPeso", type: "dropdown",
                    options: { kg: "Kilogramos (kg)", lb: "Libras (lb)" },
                },
            },
            {
                name: "Mantener la pantalla encendida",
                desc: "Mientras corre un temporizador —el ⏱ libre o la cuenta atrás de una sesión guiada en marcha— la pantalla no se apaga sola " +
                    "(al pausar o parar se suelta). En móvil es lo que evita que se oscurezca entre series; en escritorio no hace falta y no hace nada. " +
                    "Sin efecto si el sistema no lo permite (batería baja o navegador sin esa API).",
                control: { key: "mantenerDespierta", type: "toggle" },
            },
            {
                name: "Sonido del temporizador",
                desc: "Al terminar la cuenta atrás del ⏱ libre suena un pitido de tres notas (sintetizado, sin archivos de audio). " +
                    "Apágalo si prefieres solo el aviso visual y la vibración del móvil.",
                control: { key: "sonidoTemporizador", type: "toggle" },
            },
            {
                name: "Sonido del descanso",
                desc: "Al terminar un descanso entre series de la sesión guiada suena el mismo pitido y el móvil vibra. " +
                    "Sin sonido siguen el «¡Listo!» de pantalla y la devolución al ejercicio. No suena con «⏭ Saltar descanso».",
                control: { key: "sonidoDescanso", type: "toggle" },
            },
            {
                name: "Volumen del sonido",
                desc: "Intensidad del pitido (0–100 %), igual para el temporizador y para el descanso. Al 0 % no suena aunque el sonido esté activado.",
                control: {
                    key: "volumenSonido", type: "slider", min: 0, max: 100, step: 5,
                    displayFormat: (v: number) => `${v} %`,
                },
            },
            {
                name: "Probar el sonido",
                desc: "Suena el pitido con el volumen actual (ignora los interruptores).",
                searchable: false,
                render: s => {
                    s.addButton(b => b.setButtonText("🔊 Probar")
                        .setTooltip("Suena el pitido con el volumen actual (ignora los interruptores)")
                        .onClick(() => probarSonido()));
                },
            },
        ];
    }

    // La fuente de verdad no es plugin.settings sino conf(): se leen y se
    // escriben los ajustes del plugin desde ahí. Excepción: la unidad de peso
    // NO es un ajuste de data.json —va al almacén propio del vault (ver
    // unidades.ts)—, así que se desvía a su propio camino.
    override getControlValue(key: string): unknown {
        if (key === "unidadPeso") return pesoActual();
        return (conf() as unknown as Record<string, unknown>)[key];
    }

    override setControlValue(key: string, value: unknown): void | Promise<void> {
        if (key === "unidadPeso") return this.fijarPeso(String(value));
        // normalizarAjustes (dentro de guardar) valida y rellena el resto
        return this.guardar(key as keyof AjustesGym, value as never);
    }

    /* Mismo cambio que el selector kg | lb del panel y que «Alternar pesos»
       del menú ⋮: fijarUnidadPeso (que se recuerda por vault) y repintar las
       vistas para que todo el plugin pase a la nueva unidad al instante. */
    private fijarPeso(u: string): void {
        if (!fijarUnidadPeso(u)) return;   // unidad inválida o ya vigente
        this.pluginRef.repintarVistasGym();
    }

    private async guardar<K extends keyof AjustesGym>(clave: K, valor: AjustesGym[K]): Promise<void> {
        const actual = normalizarAjustes({ ...conf(), [clave]: valor });
        actualizarAjustes(actual);
        await this.pluginRef.guardarAjustes(actual);
        if (clave === "mantenerDespierta") refrescarDespierta();   // efecto inmediato, sin esperar al siguiente temporizador
        this.pluginRef.repintarVistasGym();
    }
}
