/* ═══════════════════════════════════════════════════════════════════════════
   Componentes de UI compartidos: creador, gestor, modales y sesión guiada.

   El CSS vive en styles.css (antes cada engine inyectaba su propio <style>).
   Los selectores .gym-* son exclusivos de este plugin, así que no pisan nada.
   ═══════════════════════════════════════════════════════════════════════════ */

import { CONFIG } from "../config";
import { pesoActual, UNIDADES_PESO, fijarUnidadPeso } from "../unidades";
import type { UnidadPeso } from "../tipos";

/* ── Elementos ──────────────────────────────────────────────────────────────
   Crea un elemento. El 2.º argumento admite DOS formatos:
     · clase(s)  → "gym-chip on"      (sin ":" se asigna como className)
     · CSS línea→ "display:flex;"    (con ":" se asigna como cssText)      */
export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K, claseOCss?: string | null, texto?: string,
): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (claseOCss) {
        if (claseOCss.includes(":")) e.style.cssText = claseOCss;
        else e.className = claseOCss;
    }
    if (texto !== undefined) e.textContent = texto;
    return e;
}

// Sustituto de dv.paragraph(): un párrafo plano dentro del bloque.
export const parrafo = (raiz: HTMLElement, texto: string): HTMLDivElement => {
    const d = el("div", "gym-parrafo", texto);
    raiz.appendChild(d);
    return d;
};

/* ── Ayuda flotante (tooltip propio) ──────────────────────────────────────
   A diferencia del `title` nativo: aparece al instante con el cursor y
   TAMBIÉN AL TOCAR en móvil. Un solo globo a la vez; se cierra al salir del
   elemento, al tocar fuera, al hacer scroll o al abrir otro. El texto se
   pide al momento (callback), así que siempre refleja el dato pintado. */
let globo: HTMLDivElement | null = null;
let globoEscuchas = false;
const cerrarGlobo = (): void => { globo?.remove(); globo = null; };

export const conAyuda = (e: HTMLElement, texto: () => string): void => {
    const abrir = (): void => {
        cerrarGlobo();
        const g = el("div", "position:fixed;z-index:10000;max-width:min(280px,80vw);padding:6px 10px;border-radius:8px;background:var(--background-primary);border:1px solid var(--background-modifier-border);box-shadow:0 4px 14px rgba(0,0,0,.35);font-size:.78em;line-height:1.45;pointer-events:none;", texto());
        document.body.appendChild(g);
        const r = e.getBoundingClientRect();
        const b = g.getBoundingClientRect();
        let top = r.top - b.height - 6;
        if (top < 6) top = r.bottom + 6;   // si no cabe encima, se pone debajo
        g.style.top = `${Math.max(6, Math.min(top, window.innerHeight - b.height - 6))}px`;
        g.style.left = `${Math.max(6, Math.min(r.left + r.width / 2 - b.width / 2, window.innerWidth - b.width - 6))}px`;
        globo = g;
        if (!globoEscuchas) {
            globoEscuchas = true;
            window.addEventListener("scroll", cerrarGlobo, { passive: true, capture: true });   // el scroll de la hoja no despega el globo: lo cierra
        }
    };
    e.style.cursor = "help";
    e.addEventListener("pointerenter", (ev) => { if (ev.pointerType === "mouse") abrir(); });   // hover de escritorio
    e.addEventListener("pointerleave", cerrarGlobo);
    e.addEventListener("pointerdown", () => {                                                   // tap de móvil
        abrir();
        setTimeout(() => document.addEventListener("pointerdown", cerrarGlobo, { once: true, capture: true }), 0);
    });
};

/* ── Cajas y tablas ─────────────────────────────────────────────────────── */

export const KPI = (k: string, v: string, color: string, pie?: string): HTMLDivElement => {
    const d = el("div", "gym-kpi");
    d.style.setProperty("--color", color);
    d.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div><div class="p">${pie ?? ""}</div>`;
    return d;
};

export const caja = (raiz: HTMLElement, titulo: string, subtitulo?: string): HTMLDivElement => {
    const c = el("div");
    c.style.cssText = `border:1px solid ${CONFIG.BORDE};border-radius:12px;padding:16px;margin:12px 0;line-height:1.45;`;
    raiz.appendChild(c);
    const t = el("div", "font-weight:700;border-bottom:2px solid " + CONFIG.NARANJA + ";padding-bottom:5px;margin-bottom:12px;");
    t.innerHTML = `<span style="color:${CONFIG.NARANJA}">${titulo}</span> <span style="font-weight:400;font-size:.82em;opacity:.7">${subtitulo ?? ""}</span>`;
    c.appendChild(t);
    return c;
};

// Tarjeta plegable: botón con texto para abrirla/cerrarla. Oculta por defecto;
// la elección se recuerda por dispositivo.
export const cajaColapsable = (raiz: HTMLElement, titulo: string, subtitulo: string, clave: string): HTMLDivElement => {
    const c2 = caja(raiz, titulo, subtitulo);
    c2.classList.add("gym-colaps");
    const tTit = c2.firstElementChild as HTMLDivElement;   // fila de título: queda visible también al plegar
    tTit.classList.add("gym-colaps-tit");
    const nombre = titulo.replace(/^\S+\s/, "");
    const nombreMin = nombre.charAt(0).toLowerCase() + nombre.slice(1);
    let abierta = false;
    try { abierta = localStorage.getItem(clave) === "1"; } catch { /* sin localStorage */ }
    const etiqueta = el("div");
    etiqueta.style.cssText = "min-width:0;";
    etiqueta.innerHTML = `<span style="color:${CONFIG.NARANJA}">${titulo}</span> ` +
        `<span style="font-weight:400;font-size:.82em;opacity:.7">${subtitulo}</span>`;
    const bPliegue = el("button", "gym-btn", "");
    bPliegue.type = "button";
    bPliegue.style.cssText = "min-height:34px;font-size:.85em;padding:4px 12px;white-space:nowrap;";
    tTit.style.cssText += ";display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;";
    tTit.replaceChildren(etiqueta, bPliegue);
    const pintarTit = () => {
        c2.classList.toggle("oculto", !abierta);
        bPliegue.textContent = (abierta ? "▾ Ocultar " : "▸ Ver ") + nombreMin;
        bPliegue.title = (abierta ? "Ocultar " : "Mostrar ") + nombreMin;
    };
    bPliegue.onclick = () => {
        abierta = !abierta;
        try { localStorage.setItem(clave, abierta ? "1" : "0"); } catch { /* sin localStorage */ }
        pintarTit();
    };
    pintarTit();
    return c2;
};

// Con un tema translúcido --background-primary puede ser rgba(...) con alfa < 1,
// y entonces la cabecera pegajosa deja ver el texto que pasa por detrás. Se
// opaca el color de la propia cabecera y, si viene transparente, se sube a
// buscar uno opaco al ancestro más cercano que tenga fondo.
const parseColor = (c: string): { r: number; g: number; b: number; a: number } | null => {
    const s = String(c || "").trim();
    if (!s || s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    const m = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (!m) return null;   // no es un color que sepamos leer: mejor no tocar nada
    const p = m[1].replace(/\//g, " ").trim().split(/[\s,]+/).filter(Boolean);
    const r = Number(p[0]), g = Number(p[1]), b = Number(p[2]);
    if (![r, g, b].every(Number.isFinite)) return null;
    let a = 1;
    if (p.length > 3) {
        a = p[3].endsWith("%") ? Number(p[3].slice(0, -1)) / 100 : Number(p[3]);
        if (!Number.isFinite(a)) a = 1;
    }
    return { r, g, b, a };
};

const opacaFondo = (th: HTMLTableCellElement): void => {
    const fijo = (col: { r: number; g: number; b: number }) => {
        const t = `rgb(${col.r},${col.g},${col.b})`;   // alfa fuera: con eso basta
        if (th.style.background !== t) th.style.background = t;   // solo escribe si cambia
    };
    const c = parseColor(getComputedStyle(th).backgroundColor);
    if (c && c.a >= 1) return fijo(c);   // ya es opaco: se respeta el color del tema
    let n = th.parentElement;
    while (n) {   // transparente: se sube buscando el primer ancestro con fondo opaco
        const cn = parseColor(getComputedStyle(n).backgroundColor);
        if (cn && cn.a >= 1) return fijo(cn);
        n = n.parentElement;
    }
    const lum = c ? (c.r * .299 + c.g * .587 + c.b * .114) / 255 : 1;   // último recurso
    const solido = lum > .5 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
    fijo(solido);
};

// Fija la altura del contenedor a las N primeras filas (más la cabecera) para
// que la tabla se scrollee en vez de crecer sin límite. Se recalcula cuando el
// contenedor cambia de tamaño: la sección del historial es colapsable y al
// renderizar puede estar oculta (display:none), en cuyo caso no hay medidas.
export const limitaAlto = (wrap: HTMLElement, t: HTMLTableElement, n: number): void => {
    const cabeceras = t.tHead ? [...t.tHead.rows[0].cells] : [];
    const medir = () => {
        cabeceras.forEach(c => opacaFondo(c as HTMLTableCellElement));
        const filas = [...(t.tBodies[0]?.rows ?? [])].slice(0, n);
        if (!filas.length) { wrap.style.maxHeight = ""; return; }
        const cab = t.tHead ? t.tHead.offsetHeight : 0;
        const alto = cab + filas.reduce((s, f) => s + f.offsetHeight, 0);
        if (alto <= 0) return;
        const px = `${Math.ceil(alto)}px`;
        if (wrap.style.maxHeight !== px) wrap.style.maxHeight = px;   // solo escribe si cambia: evita bucle con el ResizeObserver
    };
    medir();
    if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(medir);
        ro.observe(wrap);
    }
};

// Tabla dentro de una sección, con las celdas ya en HTML.
// Con {filasVisibles:n} la tabla deja de ser infinita: se limita a n filas en
// pantalla y el resto se recorre con scroll dentro de su propia caja.
export const tablaEn = (
    raiz: HTMLElement, cabeceras: string[], filas: string[][],
    { filasVisibles = 0 }: { filasVisibles?: number } = {},
): HTMLTableElement => {
    const t = document.createElement("table");
    t.className = "gym-tabla";
    t.innerHTML = `<thead><tr>${cabeceras.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
    const tb = document.createElement("tbody");
    for (const f of filas) {
        const tr = document.createElement("tr");
        tr.innerHTML = f.map(c => `<td>${c}</td>`).join("");
        tb.appendChild(tr);
    }
    t.appendChild(tb);
    const wrap = el("div", "gym-tabla-wrap" + (filasVisibles ? " gym-tabla-vista" : ""));
    wrap.appendChild(t);
    raiz.appendChild(wrap);
    if (filasVisibles) limitaAlto(wrap, t, filasVisibles);
    return t;
};

export const btn = (texto: string, css: string | null, onclick: (() => void) | null): HTMLButtonElement => {
    const b = el("button", "gym-btn" + (css ? " " + css : ""), texto);
    b.type = "button";
    if (onclick) b.onclick = onclick;
    return b;
};

/* ── Toast y confirmación ───────────────────────────────────────────────── */

export const toast = (txt: string, ok = true): void => {
    const d = el("div",
        `position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--background-primary);` +
        `color:var(--text-normal);border:1px solid ${ok ? CONFIG.VERDE : CONFIG.ROJO};border-radius:10px;padding:11px 20px;` +
        `z-index:9999;box-shadow:0 8px 28px rgba(0,0,0,.4);font-size:.9em;max-width:82vw;text-align:center;`, txt);
    d.className = "gym-toast";
    document.body.appendChild(d);
    setTimeout(() => {
        d.style.transition = "opacity .45s";
        d.style.opacity = "0";
        setTimeout(() => d.remove(), 500);
    }, 3600);
};

/* Confirmación con el estilo del vault (window.confirm() en Electron dibuja el
   cartel genérico del sistema). Devuelve una promesa<boolean>.
   · El overlay es PROPIO: se puede preguntar encima de un formulario o de
     otro modal sin cerrarlos.
   · Escape o clic en el fondo = cancelar, y el Escape no se cuela en el modal
     de debajo (fase capture). */
export const confirmar = (titulo: string, mensaje: string, textoOk = "Aceptar", textoNo = "Cancelar",
    peligro = false): Promise<boolean> =>
    new Promise(resolve => {
        let resuelto = false;
        const terminar = (v: boolean) => {
            if (resuelto) return;
            resuelto = true;
            document.removeEventListener("keydown", onKey, true);
            overlay.remove();
            resolve(v);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); terminar(false); }
        };
        const overlay = el("div",
            `position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;` +
            `align-items:center;justify-content:center;padding:16px;`);
        overlay.id = "gym-confirm-activo";   // los modales que quieran cederle el Escape lo buscan por aquí
        const cajaM = el("div",
            `background:var(--background-primary);border:1px solid var(--background-modifier-border);` +
            `border-radius:14px;padding:18px;width:min(480px,94vw);max-height:86vh;overflow:auto;` +
            `box-shadow:0 18px 50px rgba(0,0,0,.5);line-height:1.45;`);
        const t = el("div",
            `font-weight:700;color:${CONFIG.NARANJA};border-bottom:2px solid ${CONFIG.NARANJA};padding-bottom:6px;margin-bottom:12px;`, titulo);
        const p = el("div", "opacity:.9;white-space:pre-wrap;margin-bottom:4px;", mensaje);
        const fila = el("div", "display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;");
        const baseBtn = `padding:9px 15px;border-radius:9px;border:1px solid var(--background-modifier-border);` +
            `background:var(--background-secondary);color:var(--text-normal);font-family:inherit;` +
            `font-size:.88em;font-weight:600;min-height:40px;cursor:pointer;`;
        // `peligro` pinta el botón de confirmar en rojo (acciones destructivas)
        const estiloOk = peligro
            ? `background:${CONFIG.ROJO};border-color:${CONFIG.ROJO};color:#fff;font-weight:800;`
            : `background:${CONFIG.NARANJA};border-color:${CONFIG.NARANJA};color:#101010;font-weight:800;`;
        const ok = el("button", baseBtn + estiloOk, textoOk);
        const no = el("button", baseBtn, textoNo);
        ok.type = no.type = "button";
        ok.onclick = () => terminar(true);
        no.onclick = () => terminar(false);
        overlay.onclick = e => { if (e.target === overlay) terminar(false); };
        fila.appendChild(ok); fila.appendChild(no);
        cajaM.appendChild(t); cajaM.appendChild(p); cajaM.appendChild(fila);
        overlay.appendChild(cajaM);
        document.addEventListener("keydown", onKey, true);   // capture, por encima del modal de debajo
        document.body.appendChild(overlay);
        no.focus();   // el foco empieza en lo seguro: nada destructivo se dispara sin querer
    });

/* ── Modales ────────────────────────────────────────────────────────────── */

export interface ModalUI {
    overlay: HTMLDivElement;
    caja: HTMLDivElement;
    cab: HTMLDivElement;
    cerrar: () => void;
}

// Modal simple: devuelve el overlay para que quien lo llama lo rellene.
// `anidado = true` abre un modal ENCIMA de otro ya abierto (p. ej. el selector
// de ejercicio dentro del formulario de sesión). En ese caso NO se retira el de
// abajo y se usa otro id, para que al cerrar el de arriba siga intacto el suyo.
export const modal = (titulo: string, subtitulo?: string, anidado = false): ModalUI => {
    const viejo = document.getElementById("gym-modal-activo");
    if (viejo && !anidado) viejo.remove();
    const overlay = el("div", "gym-modal");
    overlay.id = anidado ? "gym-modal-anidado" : "gym-modal-activo";
    const cajaM = el("div", "gym-modal-caja");
    overlay.appendChild(cajaM);
    const cab = el("div", "font-weight:700;margin-bottom:14px;border-bottom:2px solid " + CONFIG.NARANJA + ";padding-bottom:6px;");
    cab.innerHTML = `<span style="color:${CONFIG.NARANJA}">${titulo}</span> ` +
        (subtitulo ? `<span style="font-weight:400;font-size:.82em;opacity:.7">${subtitulo}</span>` : "");
    cajaM.appendChild(cab);
    const cerrar = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (document.getElementById("gym-confirm-activo")) return;   // el confirm captura el Escape antes (evita bucle)
        // Con un modal anidado encima, Escape solo debe cerrar EL DE ARRIBA:
        // si no, se cerrarían los dos de golpe y se perdería el formulario.
        const modales = [...document.body.children].filter(n => /^gym-modal/.test(n.className || ""));
        if (modales.length && modales[modales.length - 1] !== overlay) return;
        cerrar();
    };
    overlay.onclick = e => { if (e.target === overlay) cerrar(); };
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    return { overlay, caja: cajaM, cab, cerrar };
};

// ✕ de cierre en la cabecera de un modal. Mismo estilo que la de la sesión
// guiada: la clase .gym-cerrar-x es la única fuente de verdad de las dos.
export const ponerX = (m: ModalUI, titulo = "Cerrar"): HTMLButtonElement => {
    const contenido = el("div");
    contenido.style.cssText = "flex:1;min-width:0;";
    while (m.cab.firstChild) contenido.appendChild(m.cab.firstChild as ChildNode);
    const bX = el("button", "gym-btn-g gym-cerrar-x", "✕");
    bX.type = "button";
    bX.title = titulo;
    bX.onclick = () => m.cerrar();
    m.cab.style.cssText += ";display:flex;align-items:center;gap:8px;flex-wrap:wrap;";
    m.cab.appendChild(contenido); m.cab.appendChild(bX);
    return bX;
};

// Diálogo de texto (Obsidian/Electron no tiene window.prompt).
// · `sugerencias` → lista desplegable bajo el campo (datalist), p. ej. los
//   grupos musculares ya usados.
// · `anidado` → se abre SOBRE otro modal sin quitarlo (p. ej. sobre el
//   buscador de ejercicios).
// Escape y clic en el fondo cancelan y resuelven con null: sin eso, quien
// espera el texto se quedaría colgado aunque el diálogo se vea cerrado.
let dlN = 0;
export const pedirTexto = (
    titulo: string, inicial?: string, sugerencias?: string[], anidado = false,
): Promise<string | null> => new Promise(resolve => {
    const m = modal(titulo, undefined, anidado);
    const input = el("input");
    input.type = "text";
    input.value = inicial ?? "";
    if (sugerencias?.length) {
        const id = `gym-sug-${++dlN}`;
        const dl = document.createElement("datalist"); dl.id = id;
        for (const s of sugerencias) {
            const o = document.createElement("option"); o.value = s;
            dl.appendChild(o);
        }
        input.setAttribute("list", id);
        m.caja.appendChild(dl);
    }
    const c = el("div", "gym-fila");
    c.appendChild(input);
    m.caja.appendChild(c);
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (document.getElementById("gym-confirm-activo")) return;
        // Como en modal(): Escape solo cierra ESTE si es el de arriba del todo.
        // Si el listener de modal() (que va antes) ya cerró el overlay, se
        // resuelve igualmente: la promesa NO debe quedar colgada.
        if (m.overlay.isConnected) {
            const modales = [...document.body.children].filter(n => /^gym-modal/.test(n.className || ""));
            if (modales.length && modales[modales.length - 1] !== m.overlay) return;
        }
        cerrar(null);
    };
    document.addEventListener("keydown", onKey);
    const cerrar = (v: string | null): void => {
        document.removeEventListener("keydown", onKey);
        m.cerrar();
        resolve(v);
    };
    const fila = el("div", "gym-botones");
    const ok = btn("Guardar", "primario", () => cerrar(input.value.trim()));
    const no = btn("Cancelar", null, () => cerrar(null));
    fila.appendChild(ok); fila.appendChild(no);
    m.caja.appendChild(fila);
    m.overlay.onclick = e => { if (e.target === m.overlay) cerrar(null); };
    input.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ok.click(); } };
    input.focus();
    input.select();
});

/* ── Selector de unidad de peso (kg | lb) ───────────────────────────────── */
// El MISMO componente se usa en el creador y en la rutina. `alCambiar` se
// invoca después del cambio para que quien lo monta repinte; aquí se repinta
// a sí mismo.
export const selectorUnidad = (alCambiar?: (u: UnidadPeso) => void): HTMLElement => {
    const cont = el("div");
    cont.style.cssText = "display:inline-flex;gap:6px;align-items:center;";
    const pintar = () => {
        cont.innerHTML = "";
        for (const u of UNIDADES_PESO) {
            const activo = pesoActual() === u;
            const b = el("button", "", u);
            b.type = "button";
            b.title = u === "kg" ? "Mostrar y teclear los pesos en kilogramos" : "Mostrar y teclear los pesos en libras";
            b.setAttribute("aria-pressed", String(activo));
            b.style.cssText =
                "min-width:54px;min-height:40px;padding:7px 13px;border-radius:8px;cursor:pointer;" +
                "font-size:.88em;font-weight:800;letter-spacing:.05em;" +
                (activo
                    ? `background:${CONFIG.NARANJA};border:1px solid ${CONFIG.NARANJA};color:#111;`
                    : "background:var(--background-primary);border:1px solid var(--background-modifier-border);color:var(--text-normal);opacity:.72;");
            b.onclick = () => {
                if (!fijarUnidadPeso(u)) return;
                pintar();
                if (alCambiar) alCambiar(u);
            };
            cont.appendChild(b);
        }
    };
    pintar();
    return cont;
};

/* ── Limpieza al descargar el plugin ────────────────────────────────────── */
// Los modales, el confirm y la sesión guiada se montan en document.body:
// si el plugin se desactiva a mitad de todo eso, se retiran.
export const limpiarOverlays = (): void => {
    for (const s of [".gym-modal", ".gym-modo", "#gym-confirm-activo", ".gym-hoja-overlay", ".gym-toast"]) {
        document.querySelectorAll(s).forEach(n => n.remove());
    }
};
