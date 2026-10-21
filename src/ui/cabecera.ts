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
