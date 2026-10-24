/* ═══════════════════════════════════════════════════════════════════════════
   Mantener la pantalla encendida mientras corre un temporizador.

   Obsidian NO tiene API nativa para esto: `App` no expone nada de energía ni
   de pantalla y la petición de «keep screen on» del foro sigue abierta. Lo
   que SÍ existe es la API estándar del navegador —Screen Wake Lock API,
   `navigator.wakeLock.request("screen")`— que es exactamente lo que usa el
   plugin LiftOff (la referencia de esta función). Funciona en Android y en
   iOS ≥ 18.4; en escritorio (o en cualquier navegador sin la API) es un
   no-op silencioso: nunca lanza, solo no hace nada.

   Dos capas, igual que la referencia:

     · Aquí vive la CUENTA de cuántos quieren la pantalla despierta. El
       sistema recibe UNA sola petición mientras haya al menos un reclamo, y
       se libera al soltar el último (así el ⏱ libre y el descanso de la
       sesión guiada pueden correr a la vez sin pisarse).
     · `ReclamoDespierta` es la instancia de CADA consumidor: `poner()` y
       `quitar()` son idempotentes, así su ciclo de vida se sincroniza desde
       un único sitio sin inflar la cuenta con dobles llamadas.

   Dos detalles de la API que este módulo cubre:

     · El navegador revoca el lock solo (sin visibilidad la pestaña), así que
       se vuelve a pedir en `visibilitychange` cuando vuelve a estar visible.
     · `request()` es una promesa que puede rechazarse (batería baja, modo
       ahorro, permisos): se degrada en silencio. Un `pendiente` evita
       pedirlo dos veces a la vez, y si la respuesta llega ya sin reclamos se
       libera en el acto.
   ═══════════════════════════════════════════════════════════════════════════ */

import { conf } from "./estado";

let n = 0;                    // cuántos reclamos lo quieren ahora mismo
let pendiente = false;        // hay una petición en vuelo (evita duplicados)
let candado: WakeLockSentinel | null = null;

/* El ajuste manda: apagado → ni se pide, ni lo que haya sigue sujetado. */
const permitido = (): boolean => {
    try { return conf().mantenerDespierta !== false; }
    catch { return false; }   // estado aún no inicializado: sin pantalla despierta
};

const api = (): WakeLock | undefined => {
    try { return navigator.wakeLock; }
    catch { return undefined; }   // entornos muy viejos: ni siquiera hay getter
};

const soltar = (): void => {
    const c = candado;
    candado = null;
    if (c) void c.release().catch(() => { /* ya estaba suelto */ });
};

const pedir = (): void => {
    if (!permitido() || n === 0 || candado || pendiente) return;
    const w = api();
    // Oculta el sistema no lo concede: se espera a visibilitychange
    if (!w || document.visibilityState !== "visible") return;
    pendiente = true;
    void w.request("screen").then(
        c => {
            pendiente = false;
            // Entre petición y respuesta se soltó el último reclamo (o se
            // apagó el ajuste): se suelta en el acto para no drenar batería
            if (!permitido() || n === 0) { void c.release().catch(() => {}); return; }
            candado = c;
            c.addEventListener("release", () => {
                if (candado === c) candado = null;
                // El sistema lo revoca (segundo plano, ahorro…): si aún
                // interesa y la pestaña está a la vista, otra vez
                if (candado === null && n > 0) pedir();
            });
        },
        () => { pendiente = false; },   // denegado: sin más (nada que avisar)
    );
};

const alCambiarVisibilidad = (): void => {
    if (document.visibilityState === "visible") pedir();
};

/* La vista de ajustes avisa al conmutar el interruptor: efecto inmediato
   (apagarlo suelta el candado aunque haya temporizadores corriendo). */
export const refrescarDespierta = (): void => {
    if (permitido()) pedir(); else soltar();
};

/* main.onunload: que no quede ningún candado ni oyente colgado. */
export const reiniciarDespierta = (): void => {
    n = 0;
    document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    soltar();
};

/* El reclamo de UN consumidor (temporizador libre, sesión guiada…): se puede
   poner y quitar las veces que haga falta sin romper la cuenta compartida. */
export class ReclamoDespierta {
    private poniendo = false;

    poner(): void {
        if (this.poniendo) return;
        this.poniendo = true;
        n++;
        if (n === 1) document.addEventListener("visibilitychange", alCambiarVisibilidad);
        pedir();
    }

    quitar(): void {
        if (!this.poniendo) return;
        this.poniendo = false;
        if (n === 0) return;
        n--;
        if (n === 0) {
            document.removeEventListener("visibilitychange", alCambiarVisibilidad);
            soltar();
        }
    }

    /* Poner/quitar según un estado: así el llamador solo refleja su ciclo
       de vida («corriendo», «en marcha y sin pausar») sin pensar en clics. */
    fijar(quiere: boolean): void { if (quiere) this.poner(); else this.quitar(); }
}
