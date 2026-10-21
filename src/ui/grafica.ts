/* ═══════════════════════════════════════════════════════════════════════════
   Gráfica ligera en SVG (hover con tooltip, sin dependencias).

   Mismo dibujo que el engine original: rejilla, eje X con pocas fechas,
   series con línea + puntos y una leyenda debajo.
   ═══════════════════════════════════════════════════════════════════════════ */

import { CONFIG, DIA_MS } from "../config";
import { dos } from "../util/fechas";
import { decimal } from "../util/texto";

export interface PuntoGrafica {
    ts: number;
    v: number;
    titulo?: string;
}

export interface SerieGrafica {
    nombre: string;
    color: string;
    puntos: PuntoGrafica[];
}

export const grafica = (
    raiz: HTMLElement,
    series: SerieGrafica[],
    { alto = 200, fmt = (v: number) => decimal(v, 0) }: { alto?: number; fmt?: (v: number) => string } = {},
): void => {
    const pts = series.flatMap(s => s.puntos);
    if (!pts.length) { raiz.appendChild(document.createElement("div")); return; }

    const envoltorio = document.createElement("div");
    envoltorio.style.position = "relative";

    const W = 760, H = alto, mg = { t: 14, r: 18, b: 26, l: 48 };
    const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
    const tMin = Math.min(...pts.map(p => p.ts)), tMax = Math.max(...pts.map(p => p.ts));
    // Ventana temporal: con una sola fecha (o casi) el punto se centra en una ventana de 2 días
    const hayVentanaCorta = tMax - tMin < DIA_MS;
    const t0 = hayVentanaCorta ? (tMin + tMax) / 2 - DIA_MS : tMin;
    const t1 = hayVentanaCorta ? (tMin + tMax) / 2 + DIA_MS : tMax;
    const spanT = t1 - t0;
    let vMin = Math.min(...pts.map(p => p.v)), vMax = Math.max(...pts.map(p => p.v));
    if (vMax - vMin < 1e-6) { vMax += 1; vMin -= 1; }
    const pad = (vMax - vMin) * 0.12;
    vMin -= pad; vMax += pad;

    const x = (t: number) => mg.l + (t - t0) / spanT * iw;
    const y = (v: number) => mg.t + (vMax - v) / (vMax - vMin) * ih;

    // Rejilla + eje Y
    let g = "";
    const paso = (vMax - vMin) / 4;
    for (let i = 0; i <= 4; i++) {
        const v = vMin + paso * i, py = y(v);
        g += `<line x1="${mg.l}" y1="${py.toFixed(1)}" x2="${W - mg.r}" y2="${py.toFixed(1)}" style="stroke:${CONFIG.BORDE}" opacity=".6"/>` +
            `<text x="${mg.l - 7}" y="${(py + 3.5).toFixed(1)}" text-anchor="end" font-size="10" style="fill:currentColor" opacity=".6">${fmt(v)}</text>`;
    }
    // Eje X: 4-5 fechas (sin repetir la misma etiqueta seguida, que pasa
    // cuando la ventana es de 1-2 días)
    const nTicks = 4;
    let etiquetaPrev = "";
    for (let i = 0; i <= nTicks; i++) {
        const t = t0 + spanT * i / nTicks;
        const d = new Date(t);
        const txt = spanT > 200 * DIA_MS ? `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}` : `${d.getDate()}/${d.getMonth() + 1}`;
        if (txt === etiquetaPrev) continue;
        etiquetaPrev = txt;
        g += `<text x="${x(t).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" style="fill:currentColor" opacity=".6">${txt}</text>`;
    }
    // Series
    let cuerpo = "";
    for (const s of series) {
        const ordenados = [...s.puntos].sort((a, b) => a.ts - b.ts);
        if (ordenados.length > 1) {
            cuerpo += `<polyline points="${ordenados.map(p => `${x(p.ts).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
        }
        for (const p of ordenados) {
            cuerpo += `<circle cx="${x(p.ts).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.2" fill="${s.color}" stroke="var(--background-primary)" stroke-width="1.2"/>`;
        }
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.cssText = "width:100%;height:auto;display:block;margin:6px 0;touch-action:none;";
    svg.innerHTML = g + cuerpo;

    const tip = document.createElement("div");
    tip.style.cssText =
        `position:absolute;pointer-events:none;opacity:0;transition:opacity .12s;background:var(--background-primary);` +
        `border:1px solid ${CONFIG.BORDE};border-radius:8px;padding:6px 9px;font-size:.78em;line-height:1.35;` +
        `box-shadow:0 2px 10px rgba(0,0,0,.3);white-space:nowrap;z-index:5;`;
    envoltorio.appendChild(svg);
    envoltorio.appendChild(tip);
    raiz.appendChild(envoltorio);

    svg.addEventListener("pointermove", e => {
        const r = svg.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H;
        let mejor: { p: PuntoGrafica; s: SerieGrafica } | null = null, dMejor = 16;
        for (const s of series) {
            for (const p of s.puntos) {
                const d = Math.hypot(x(p.ts) - px, y(p.v) - py);
                if (d < dMejor) { dMejor = d; mejor = { p, s }; }
            }
        }
        if (mejor) {
            const d = new Date(mejor.p.ts);
            tip.innerHTML = `<b style="color:${mejor.s.color}">${mejor.s.nombre}</b><br/>` +
                `${dos(d.getDate())}/${dos(d.getMonth() + 1)} — ${mejor.p.titulo ?? fmt(mejor.p.v)}`;
            const rc = envoltorio.getBoundingClientRect();
            tip.style.left = `${Math.min(Math.max(0, e.clientX - rc.left + 12), Math.max(0, rc.width - 190))}px`;
            tip.style.top = `${Math.max(0, e.clientY - rc.top - 12)}px`;
            tip.style.opacity = "1";
        } else tip.style.opacity = "0";
    });
    svg.addEventListener("pointerleave", () => { tip.style.opacity = "0"; });

    // Leyenda
    const ley = document.createElement("div");
    ley.style.cssText = "font-size:.8em;display:flex;gap:14px;flex-wrap:wrap;margin-top:2px;opacity:.85;";
    for (const s of series) {
        const it = document.createElement("span");
        it.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${s.color};margin-right:5px;"></span>${s.nombre}`;
        ley.appendChild(it);
    }
    raiz.appendChild(ley);
};
