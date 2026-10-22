/* ═══════════════════════════════════════════════════════════════════════════
   Temporizador libre (cuenta atrás para lo que quieras: descanso, series
   temporizadas, cocina…). No está atado a ninguna rutina ni a ninguna sesión.

   Se abre desde «Rutinas» —la lista o el dashboard de una rutina— o con el
   comando «Abrir el temporizador». Es la suma de tres referencias: el anillo
   circular con la hora a la que sonará, el ajuste a mano de h/m/s y los
   presets de un toque —en carrusel lateral—, más los controles del descanso
   de la sesión guiada (−15 s, ＋15 s…). El botón principal lo es TODO: arranca
   con los campos puestos y, mientras corre, se convierte en pausa y en
   reanudar; no hay un botón de pausa aparte.

   El estado vive en el MÓDULO, no en el modal: se puede cerrar la ventana y
   la cuenta atrás sigue corriendo; al volver se reanuda donde estaba. Al
   llegar a 0 suena un pitido, vibra (en móvil) y sale un aviso. El tiempo
   sale de Date.now() —no de tics—, así que con la pantalla apagada u
   Obsidian en segundo plano, al volver se recalcula solo: la misma lección
   que el descanso de la sesión guiada.
   ═══════════════════════════════════════════════════════════════════════════ */

import { dos } from "../util";
import { el, modal, ponerX, toast } from "./componentes";

/* ── Estado (del módulo: sobrevive al cierre del modal) ─────────────────── */
let totalMs = 5 * 60000;        // la duración elegida (5:00 al empezar)
let finEn: number | null = null;   // cuándo termina (Date.now()); null = no corre
let guardado = totalMs;         // restante mientras no corre (parado o en pausa)
let pausado = false;
let idReloj: number | null = null;
let alPintar: (() => void) | null = null;   // repintado del modal, si está abierto

const restante = (): number => (finEn != null ? Math.max(0, finEn - Date.now()) : guardado);

/* ── Aviso al terminar: pitido (Web Audio) + vibración + toast ──────────── */
const pitar = (): void => {
    try {
        const Ctx = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const pitido = (t0: number, hz: number): void => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = "sine";
            o.frequency.value = hz;
            g.gain.setValueAtTime(0.0001, ctx.currentTime + t0);
            g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + 0.26);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + t0);
            o.stop(ctx.currentTime + t0 + 0.3);
        };
        pitido(0, 880); pitido(0.32, 1174.66); pitido(0.64, 880);
        window.setTimeout(() => void ctx.close(), 1500);
    } catch { /* sin audio: el aviso visual y la vibración ya están */ }
};

const avisar = (): void => {
    pitar();
    try { if (typeof navigator.vibrate === "function") navigator.vibrate([300, 120, 300]); }
    catch { /* sin vibración */ }
    toast("⏰ ¡Tiempo! El temporizador ha terminado.");
};

/* ── Reloj: cada 250 ms se mira el reloj del sistema, no se cuentan tics ── */
const tic = (): void => {
    if (finEn != null && restante() <= 0) { terminar(); return; }
    notificar();
};
const arrancarReloj = (): void => { if (idReloj == null) idReloj = window.setInterval(tic, 250); };
const pararReloj = (): void => {
    if (idReloj == null) return;
    window.clearInterval(idReloj);
    idReloj = null;
};
const notificar = (): void => { alPintar?.(); };

/* ── Acciones ───────────────────────────────────────────────────────────── */
const arrancar = (ms: number): void => {
    totalMs = Math.max(1000, ms);
    finEn = Date.now() + totalMs;
    guardado = totalMs;
    pausado = false;
    arrancarReloj();
    notificar();
};

const terminar = (): void => {
    finEn = null;
    pausado = false;
    guardado = 0;
    pararReloj();
    avisar();
    notificar();
};

const parar = (): void => {
    finEn = null;
    pausado = false;
    guardado = totalMs;
    pararReloj();
    notificar();
};

const alternarPausa = (): void => {
    if (finEn != null) { guardado = restante(); finEn = null; pausado = true; pararReloj(); }
    else if (pausado) { finEn = Date.now() + guardado; pausado = false; arrancarReloj(); }
    notificar();
};

const ajustar = (deltaMs: number): void => {
    const r = Math.max(0, restante() + deltaMs);
    if (finEn != null) {
        finEn = Date.now() + r;          // sigue corriendo desde ese restante
        totalMs = Math.max(totalMs, r);  // el anillo no se sale de su pista
        if (r <= 0) { terminar(); return; }
    } else {
        // Parado (o aún sin empezar): los ± ajustan la duración elegida
        totalMs = Math.max(1000, totalMs + deltaMs);
        guardado = totalMs;
    }
    notificar();
};

/* Detiene el intervalo al descargar el plugin (lo llama main.onunload) */
export const pararTemporizador = (): void => {
    pararReloj();
    alPintar = null;
};

/* ── Formato ────────────────────────────────────────────────────────────── */
const fmt = (ms: number): string => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h ? `${h}:${dos(m)}` : String(m)) + `:${dos(s % 60)}`;
};

const horaDe = (ts: number): string => {
    const d = new Date(ts);
    return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

const NS_SVG = "http://www.w3.org/2000/svg";
const svgEl = (tag: string, attrs: Record<string, string>): SVGElement => {
    const n = document.createElementNS(NS_SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
};

/* Presets de un toque (el anillo se pone a girar en el acto) */
const PRESETS: [string, number][] = [
    ["1:00", 60_000], ["3:00", 180_000], ["5:00", 300_000],
    ["10:00", 600_000], ["15:00", 900_000], ["30:00", 1_800_000],
];

/* ═══════════════════════════════════════════════════════════════════════════
   El modal. Se puede cerrar (✕, Escape o clic fuera) sin parar la cuenta
   atrás: al reabrirlo se ve donde iba.
   ═══════════════════════════════════════════════════════════════════════════ */
export function abrirTemporizador(): void {
    const m = modal("⏱ Temporizador", "cuenta atrás libre · al cerrarla sigue corriendo");
    m.caja.classList.add("gym-temp-caja");
    ponerX(m, "Cerrar (la cuenta atrás sigue corriendo)");

    // ── Anillo con el tiempo dentro (arriba el total, abajo la hora del aviso) ──
    const anillo = el("div", "gym-temp-anillo");
    const svg = svgEl("svg", { viewBox: "0 0 200 200", "aria-hidden": "true" });
    const R = 88, C = 2 * Math.PI * R;
    svg.append(
        svgEl("circle", { cx: "100", cy: "100", r: String(R), class: "pista" }),
        svgEl("circle", { cx: "100", cy: "100", r: String(R), class: "barra" }),
    );
    const barra = svg.lastElementChild as SVGElement;
    barra.style.strokeDasharray = String(C);   // perímetro completo: con offset = 0 el anillo está lleno
    barra.setAttribute("transform", "rotate(-90 100 100)");   // empieza arriba
    const cen = el("div", "gym-temp-cen");
    const tTotal = el("div", "gym-temp-sub");
    const tGrande = el("div", "gym-temp-t");
    const tHora = el("div", "gym-temp-sub");
    cen.append(tTotal, tGrande, tHora);
    anillo.append(svg, cen);
    m.caja.appendChild(anillo);

    // ── Estado (el «Running» de la referencia) ──
    const estado = el("div", "gym-temp-estado");
    m.caja.appendChild(estado);

    // ── Ajuste a mano de horas / minutos / segundos (lo PRIMERO: es lo que se
    //    edita; los presets de abajo solo sobrescriben estos campos y arrancan) ──
    m.caja.appendChild(el("div", "gym-et gym-temp-tit", "Ajustar"));
    const filaAjuste = el("div", "gym-temp-ajuste");
    const entradas: HTMLInputElement[] = [];
    for (const [etq, max] of [["Horas", 99], ["Minutos", 59], ["Segundos", 59]] as [string, number][]) {
        const campo = el("div", "gym-temp-campo");
        const i = el("input");
        i.type = "number";
        i.min = "0";
        i.max = String(max);
        i.inputMode = "numeric";
        campo.append(el("div", "gym-et", etq), i);
        filaAjuste.appendChild(campo);
        entradas.push(i);
    }
    m.caja.appendChild(filaAjuste);

    const msDeEntradas = (): number =>
        (Number(entradas[0].value) || 0) * 3600000
        + (Number(entradas[1].value) || 0) * 60000
        + (Number(entradas[2].value) || 0) * 1000;

    // El botón principal lo es TODO: arranca con los campos puestos y, en
    // marcha o en pausa, hace de pausa/reanudar. No hay botón de pausa aparte.
    const bEmpezar = el("button", "gym-btn gym-temp-empezar primario", "▶ Empezar");
    bEmpezar.type = "button";
    bEmpezar.onclick = () => {
        if (finEn != null || pausado) { alternarPausa(); return; }   // en marcha o pausado: es el de pausa
        const ms = msDeEntradas();
        if (ms < 1000) return toast("⚠️ Pon al menos 1 segundo.", false);
        arrancar(ms);
    };
    m.caja.appendChild(bEmpezar);

    // ── Presets de un toque: carrusel lateral (se desliza en horizontal y no
    //    rompe la estrechez del modal, como las chips de la lista) ──
    m.caja.appendChild(el("div", "gym-et gym-temp-tit", "Rápidos"));
    const filaPres = el("div", "gym-temp-presets");
    const chips: HTMLButtonElement[] = [];
    for (const [txt, ms] of PRESETS) {
        const c = el("button", "gym-chip gym-temp-chip", txt);
        c.type = "button";
        c.title = `Arrancar una cuenta atrás de ${txt}`;
        c.onclick = () => { fijarEntradas(ms); arrancar(ms); };
        filaPres.appendChild(c);
        chips.push(c);
    }
    m.caja.appendChild(filaPres);

    // ── Controles: los mismos del descanso de la sesión guiada, sin botón de
    //    pausa (eso ya lo hace el botón principal) ──
    const controles = el("div", "gym-temp-controles");
    const bMenos = el("button", "gym-btn-g", "−15 s"); bMenos.type = "button";
    bMenos.title = "Restar 15 segundos";
    const bMas = el("button", "gym-btn-g", "＋15 s"); bMas.type = "button";
    bMas.title = "Sumar 15 segundos";
    const bReiniciar = el("button", "gym-btn-g", "↺ Reiniciar"); bReiniciar.type = "button";
    bReiniciar.title = "Volver a arrancar con la duración elegida";
    const bParar = el("button", "gym-btn-g", "⏹ Parar"); bParar.type = "button";
    bParar.title = "Parar la cuenta atrás y volver al principio";
    bMenos.onclick = () => ajustar(-15000);
    bMas.onclick = () => ajustar(15000);
    bReiniciar.onclick = () => arrancar(totalMs);
    bParar.onclick = () => parar();
    controles.append(bMenos, bMas, bReiniciar, bParar);
    m.caja.appendChild(controles);

    // ── Repintado: lee el estado del módulo y lo refleja en pantalla ──
    const pintar = (): void => {
        if (!m.overlay.isConnected) { alPintar = null; return; }   // ya se cerró
        const r = restante();
        const corriendo = finEn != null;
        const listo = !corriendo && !pausado && guardado === 0;
        // Fracción del anillo: lo que queda de la duración elegida
        const base = corriendo ? r : pausado ? guardado : listo ? 0 : totalMs;
        const pct = totalMs > 0 ? Math.min(1, Math.max(0, base / totalMs)) : 0;
        barra.style.strokeDashoffset = String(C * (1 - pct));
        anillo.classList.toggle("listo", listo);
        anillo.classList.toggle("pausa", pausado);
        tTotal.textContent = listo ? "" : `de ${fmt(totalMs)}`;
        tGrande.textContent = listo ? "¡LISTO!" : fmt(r);
        tHora.textContent = corriendo ? `🔔 suena a las ${horaDe(Date.now() + r)}`
            : listo ? "pulsa un preset para volver a empezar" : "";

        estado.textContent = corriendo ? "● En marcha" : listo ? "✔ ¡Terminado!" : pausado ? "⏸ En pausa" : "⏹ Parado";
        estado.className = "gym-temp-estado" + (corriendo ? " on" : listo ? " listo" : "");

        // El botón principal lo es TODO: arranca, pausa y reanuda
        bEmpezar.textContent = corriendo ? "⏸ Pausa" : pausado ? "▶ Reanudar" : "▶ Empezar";
        bEmpezar.classList.toggle("primario", !corriendo);
        bEmpezar.classList.toggle("pausa", corriendo);
        bMenos.disabled = r <= 0;
        bReiniciar.disabled = corriendo && r === totalMs;
        bParar.disabled = !corriendo && !pausado;
        // El preset elegido se resalta mientras esté vigente esa duración
        chips.forEach((c, i) => c.classList.toggle("on",
            corriendo && totalMs === PRESETS[i][1]));
    };

    const fijarEntradas = (ms: number): void => {
        const s = Math.round(ms / 1000);
        entradas[0].value = String(Math.floor(s / 3600));
        entradas[1].value = String(Math.floor((s % 3600) / 60));
        entradas[2].value = String(s % 60);
    };

    fijarEntradas(guardado > 0 ? guardado : totalMs);
    alPintar = pintar;
    pintar();
}
