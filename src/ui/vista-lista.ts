/* ═══════════════════════════════════════════════════════════════════════════
   La pestaña inicial: «Main».

   Es el índice hecho interfaz, con tres secciones a pantalla completa que se
   cambian desde el carrusel de navegación (sin barra de desplazamiento):

     · Rutinas      → los KPIs del resumen + la lista de todas las rutinas
                      (nombre, estado, fechas, semana en curso y sesiones
                      hechas). ES LA SECCIÓN POR DEFECTO al abrir el plugin.
     · Medidas e IMC→ peso corporal, evolución e IMC (la misma sección que en
                      «rutina/estadisticas»).
     · Ejercicios   → el catálogo global, también a pantalla completa.

   No lee cada archivo de datos: todo sale del índice (Rutinas.md), que se
   regenera solo al guardar.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { CONFIG } from "../config";
import { aplicacion } from "../estado";
import { carpetaDatos, rutaIndice, rutaMedidas } from "../ajustes";
import { borrarRutina, leerIndice, leerMedidas, leerRutina, ultimaMedida } from "../datos";
import type { IndiceRutina } from "../tipos";
import { diffDias, fechaLegible, hoy, msgError } from "../util";
import { pesoTexto, tallaTexto } from "../unidades";
import { KPI, btn, confirmar, el, toast } from "./componentes";
import { pintarCabecera, pintarNavegacion, pintarTituloSeccion, type BotonNav } from "./cabecera";
import { pintarGestionEjercicios } from "./ejercicios-ui";
import { formularioMedidas } from "./registro";
import { seccionMedidas } from "./estadisticas";
import { elegirDiaGuiada } from "./sesion-guiada";
import { abrirTemporizador } from "./temporizador";
import { VISTA_LISTA, abrirFormulario, abrirRutina } from "./vistas";

/* Las secciones de Main, en el orden del carrusel de navegación. */
type SeccionMain = "rutinas" | "medidas" | "ejercicios";

export class VistaLista extends ItemView {
    constructor(leaf: WorkspaceLeaf) { super(leaf); }

    getViewType(): string { return VISTA_LISTA; }
    getDisplayText(): string { return "Main"; }
    getIcon(): string { return "dumbbell"; }

    /* Al llegar a Main (desde el plugin, desde una rutina o al restaurar la
       pestaña) se vuelve a la sección de por defecto: «📋 Rutinas». Los
       cambios de vault no pasan por aquí, así que repintar no pierde la
       sección en la que estabas. */
    async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
        await super.setState(state, result);
        this.seccion = "rutinas";
        await this.pintar();
    }

    async onOpen(): Promise<void> {
        // Se repinta sola cuando cambia algo relevante en el vault (índice,
        // medidas o un archivo de rutina): los datos que lleguen de fuera se
        // ven al momento, sin recargar Obsidian.
        const relevante = (ruta: string): boolean =>
            ruta === rutaIndice()
            || ruta === rutaMedidas()
            || ruta.startsWith(carpetaDatos() + "/");
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
        // Solo recargar: los accesos de siempre (secciones, nueva rutina,
        // temporizador, medidas) viven en el carrusel de navegación, y
        // «alternar pesos» y «abrir como markdown» en el menú ⋮ (main.ts).
        this.addAction("refresh-cw", "Recargar lista", () => void this.pintar());
    }

    /* Nota cruda de esta pantalla (para «abrir como markdown» del menú ⋮) */
    rutaMarkdown(): string { return rutaIndice(); }

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

    /* Sección que se muestra ahora. Rutinas es la que arranca al abrir el
       plugin (o al volver a Main desde una rutina). No viaja en el estado de
       la pestaña: siempre se vuelve a la que tiene sentido ver. */
    private seccion: SeccionMain = "rutinas";

    private irA(s: SeccionMain): Promise<void> {
        this.seccion = s;
        return this.pintar();
    }

    async pintar(): Promise<void> {
        const raiz = this.contentEl;
        raiz.empty();
        raiz.addClass("gym-vista");

        // Acciones en la cabecera de la pestaña (como las de Kanban)
        this.acciones();

        // Todo el contenido vive en la pestaña (sin riel lateral)
        const cont = raiz;

        // Cabecera naranja: el título de esta pantalla («casa»)
        pintarCabecera(cont, [{ texto: "🏋️ Main" }]);

        // Carrusel de navegación: las tres secciones de Main, la acción
        // principal (según la sección) y, al final, a la derecha, el
        // temporizador. En «Ejercicios» no hay acción principal: el catálogo
        // no crea rutinas, así que el botón desaparece.
        const botones: BotonNav[] = [
            { texto: "📋 Rutinas", activo: this.seccion === "rutinas",
              alPulsar: () => void this.irA("rutinas") },
            { texto: "⚖️ Medidas e IMC", activo: this.seccion === "medidas",
              alPulsar: () => void this.irA("medidas") },
            { texto: "🗂 Ejercicios", activo: this.seccion === "ejercicios",
              alPulsar: () => void this.irA("ejercicios") },
        ];
        // En «Medidas e IMC» la acción principal registra medidas; en
        // «Rutinas», crea una rutina nueva; en «Ejercicios», ninguna.
        if (this.seccion === "medidas") {
            botones.push({ texto: "＋ Registrar medidas", principal: true, alPulsar: () => void this.abrirMedidas() });
        } else if (this.seccion !== "ejercicios") {
            botones.push({ texto: "＋ Nueva rutina", principal: true, alPulsar: () => void abrirFormulario({ modo: "crear" }) });
        }
        botones.push({ texto: "⏱ Temporizador", alPulsar: () => void abrirTemporizador(), derecha: true });
        pintarNavegacion(cont, botones);

        if (this.seccion === "medidas") return this.pintarMedidas(cont);
        if (this.seccion === "ejercicios") return this.pintarEjercicios(cont);
        return this.pintarRutinas(cont);
    }

    /* ── Sección 1 · Rutinas (la de por defecto) ──
       Igual que «Medidas e IMC»: de arriba a abajo, título con subrayado,
       los KPIs del resumen y DEBAJO la lista. Sin el marco que antes
       rodeaba toda la sección. */
    private async pintarRutinas(cont: HTMLElement): Promise<void> {
        const { indice, error } = await leerIndice();
        pintarTituloSeccion(cont, "📋 Rutinas", "Pulsa una rutina para abrir su dashboard");
        if (error) {
            cont.createDiv({
                cls: "gym-error-vista",
                text: "⚠️ " + error + " — no lo sobrescribo: repáralo a mano (o bórralo y se regenerará vacío).",
            });
        }

        // ── Los datos de la sección: resumen del vault y de las medidas ──
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

        // ── La lista de rutinas ──
        if (!indice.rutinas.length) {
            cont.createDiv({
                cls: "gym-vacio",
                text: "🏋️ Aún no hay rutinas: pulsa «＋ Nueva rutina» para crear la primera.",
            });
            return;
        }

        const lista = cont.createDiv({ cls: "gym-lista-rutinas" });
        // Las activas primero; dentro de cada grupo, las más recientes
        const orden = [...indice.rutinas].sort((a, b) =>
            (a.estado === "activa" ? 0 : a.estado === "pausada" ? 1 : 2) - (b.estado === "activa" ? 0 : b.estado === "pausada" ? 1 : 2)
            || (b.modificada ?? "").localeCompare(a.modificada ?? ""));
        for (const f of orden) lista.appendChild(this.fila(f));
    }

    /* ── Sección 2 · Medidas e IMC ──
       La misma sección que «📈 Estadísticas» dentro de una rutina (peso
       corporal: evolución e IMC), a pantalla completa. */
    private async pintarMedidas(cont: HTMLElement): Promise<void> {
        pintarTituloSeccion(cont, "⚖️ Medidas e IMC", "peso corporal, evolución e IMC");
        const medidas = await leerMedidas();
        if (medidas.error) {
            cont.createDiv({
                cls: "gym-error-vista",
                text: "⚠️ " + medidas.error + " — no lo sobrescribo: repáralo a mano (o bórralo y se regenerará vacío).",
            });
            return;
        }
        // Sin encabezado propio: el título de la sección («⚖️ Medidas e IMC»)
        // ya pone Main, y su línea punteada no debe aparecer debajo
        seccionMedidas(cont, medidas, { titulo: false });
    }

    /* ── Sección 3 · Ejercicios ──
       El mismo gestor del catálogo, pero ocupando todo el espacio de la
       pestaña en vez de abrirse como popup. */
    private pintarEjercicios(cont: HTMLElement): void {
        pintarTituloSeccion(cont, "🗂 Ejercicios", "nombres y grupos musculares de todo el vault");
        const caja = cont.createDiv({ cls: "gym-ejercicios-inline" });
        pintarGestionEjercicios(caja);
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
