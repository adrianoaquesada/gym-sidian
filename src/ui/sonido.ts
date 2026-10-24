/* ═══════════════════════════════════════════════════════════════════════════
   Pitido de aviso compartido: el del ⏱ temporizador libre y el del descanso
   de la sesión guiada, más el «Probar» de Ajustes → Gym Stone.

   El sonido se SINTETIZA con la Web Audio API (no hay archivos de audio):
   tres notas —A5 880 Hz, D6 1174.66 Hz y otra vez A5— con una envolvente de
   ganancia (ataque 20 ms, caída a los 260 ms, sin cortes). Manda el ajuste
   «Volumen del sonido» (0–100 %, que es el porcentaje de ganancia pico:
   30 % por defecto ≈ la ganancia 0.28 fija de siempre).

   Quién llama decide si TOCA sonar: cada aviso tiene su interruptor en
   Ajustes («Sonido del temporizador» y «Sonido del descanso»), y aquí se
   lee el que corresponde. La vibración va aparte —como en el temporizador
   libre de toda la vida— y solo depende de que el sistema la soporte.
   ═══════════════════════════════════════════════════════════════════════════ */

import { conf } from "../estado";

/* El pitido. `activo` es el interruptor del aviso que lo llama (temporizador
   o descanso, ya leído por la función de más abajo). */
const pitar = (activo: boolean): void => {
    try {
        if (!activo) return;   // apagado en Ajustes → Gym Stone
        const vol = Math.min(100, Math.max(0, conf().volumenSonido)) / 100;
        if (vol <= 0) return;   // volumen 0: también silencio (la rampa exponencial no admite 0)
        const Ctx = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const pitido = (t0: number, hz: number): void => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = "sine";
            o.frequency.value = hz;
            g.gain.setValueAtTime(0.0001, ctx.currentTime + t0);
            g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + 0.26);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + t0);
            o.stop(ctx.currentTime + t0 + 0.3);
        };
        pitido(0, 880); pitido(0.32, 1174.66); pitido(0.64, 880);
        window.setTimeout(() => void ctx.close(), 1500);
    } catch { /* sin audio: el aviso visual y la vibración ya están */ }
};

/* Avisos: cada uno lee SU interruptor de Ajustes */
export const sonarTemporizador = (): void => { pitar(conf().sonidoTemporizador); };
export const sonarDescanso = (): void => { pitar(conf().sonidoDescanso); };

/* Vibración en móvil (en escritorio no existe y no hace nada): dos pulsos,
   igual que siempre en el temporizador. No depende de ningún interruptor. */
export const vibrar = (): void => {
    try { if (typeof navigator.vibrate === "function") navigator.vibrate([300, 120, 300]); }
    catch { /* sin vibración */ }
};

/* Para el botón «Probar» de Ajustes → Gym Stone: suena SIEMPRE —ignora los
   dos interruptores, que probar justo eso no es— con el volumen vigente, para
   poder calibrarlo con el sonido apagado. */
export const probarSonido = (): void => { pitar(true); };
