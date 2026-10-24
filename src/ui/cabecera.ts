/* ═══════════════════════════════════════════════════════════════════════════
   La cabecera naranja (con el subrayado) de cada pantalla, como zona de
   navegación: migas de pan «Rutinas › 🏋️ Nombre de la rutina» — cada tramo
   menos el último es clicable.
   ═══════════════════════════════════════════════════════════════════════════ */

import { el } from "./componentes";

export interface Miga { texto: string; ir?: () => void; }

export interface OpcionesCabecera {
    subtitulo?: string;
}

export const pintarCabecera = (
    cont: HTMLElement,
    migas: Miga[],
    { subtitulo = "" }: OpcionesCabecera = {},
): HTMLElement => {
    const cab = el("div", "gym-cab");

    // Migas de pan: «Rutinas › Esta rutina»
    migas.forEach((m, i) => {
        if (i > 0) cab.appendChild(el("span", "gym-miga-sep", "›"));
        const ultima = i === migas.length - 1;
        if (!ultima && m.ir) {
            const b = el("button", "gym-miga", m.texto);
            b.type = "button";
            b.title = `Ir a ${m.texto}`;
            b.onclick = m.ir;
            cab.appendChild(b);
        } else {
            cab.appendChild(el("span", "t", m.texto));
        }
    });

    if (subtitulo) cab.appendChild(el("span", "s", subtitulo));
    cont.appendChild(cab);
    return cab;
};

/* ═══════════════════════════════════════════════════════════════════════════
   El carrusel de navegación de debajo (tipo pestañas): los accesos
   principales de la pantalla, en UNA sola línea al principio del contenido
   que se recorre lateralmente, sin barra de desplazamiento visible (el CSS
   la oculta; el gesto de deslizar sigue funcionando, también en móvil).
   `principal` pinta el botón en naranja (la acción destacada) y `activo`
   la pestaña de sección que está en pantalla ahora mismo.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BotonNav {
    texto: string;
    alPulsar: () => void;
    principal?: boolean;   // naranja: la acción destacada
    activo?: boolean;      // pestaña de sección marcada (naranja suave)
    derecha?: boolean;     // empujado al final, a la derecha del carrusel
}

export const pintarNavegacion = (cont: HTMLElement, botones: BotonNav[]): HTMLElement => {
    const nav = el("div", "gym-nav");
    let espacio = false;
    for (const b of botones) {
        // El primer botón «derecha» separa el carrusel de la acción final
        if (b.derecha && !espacio) { nav.appendChild(el("div", "gym-nav-espacio")); espacio = true; }
        const x = el("button", "gym-nav-btn" + (b.principal ? " primario" : "") + (b.activo ? " activo" : ""), b.texto);
        x.type = "button";
        x.onclick = b.alPulsar;
        nav.appendChild(x);
    }
    cont.appendChild(nav);
    return nav;
};

/* Título de sección SIN caja (sin el marco que rodea la sección completa):
   solo la etiqueta naranja con su subtítulo y el subrayado, al estilo de las
   cabeceras de caja. Lo usan las secciones de pantalla completa (Rutinas,
   Medidas e IMC, Ejercicios). */
export const pintarTituloSeccion = (
    cont: HTMLElement, titulo: string, subtitulo = "",
): HTMLElement => {
    const t = el("div", "gym-tit-caja");
    t.append(el("span", "gym-naranja", titulo), " ", el("span", "gym-sub", subtitulo));
    cont.appendChild(t);
    return t;
};
