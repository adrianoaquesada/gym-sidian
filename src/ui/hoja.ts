/* ═══════════════════════════════════════════════════════════════════════════
   La hoja de crear/editar (propuesta E).

   El formulario deja de ser una pantalla: se abre HOJA superpuesta sobre lo
   que estés mirando, a casi todo el ancho. «✕» o Esc la cierran y vuelves
   exactamente a donde estabas (el borrador que estuvieras escribiendo se
   conserva: el estado del formulario vive en ui/creador.ts).
   Al guardar, el formulario navega a la ficha de la rutina y la hoja se cierra
   encima de esa misma pestaña.
   ═══════════════════════════════════════════════════════════════════════════ */

import { leerRutina } from "../datos";
import type { Rutina } from "../tipos";
import { el, toast } from "./componentes";
import { crear, editar } from "./creador";

export interface OpcionesHoja {
    modo: "crear" | "editar";
    rutinaId?: string | null;
}

export const hojaFormulario = async ({ modo, rutinaId = null }: OpcionesHoja): Promise<void> => {
    let inicial: Rutina | null = null;
    if (modo === "editar" && rutinaId) {
        const r = await leerRutina(rutinaId);
        if (r.error) { toast("⚠️ No puedo editar la rutina: " + r.error, false); return; }
        inicial = r.datos as Rutina;
    }

    const overlay = el("div", "gym-hoja-overlay");
    const hoja = el("div", "gym-hoja");
    const cab = el("div", "gym-hoja-cab");
    const cuerpo = el("div", "gym-hoja-cuerpo");

    const btnCerrar = el("button", "gym-hoja-x", "✕");
    btnCerrar.type = "button";
    btnCerrar.title = "Cerrar (esc)";

    const tit = el("div", "gym-hoja-tit");   // flex:1 en CSS: el título a la izquierda, la ✕ a la derecha
    tit.append(
        el("span", "gym-naranja", modo === "editar" ? "✏️ Editar rutina" : "🏋️ Nueva rutina"),
        " ",
        el("span", "gym-hoja-sub", modo === "editar"
            ? "las sesiones registradas se conservan"
            : "al guardar se cierra la hoja y ves su ficha"),
    );
    cab.appendChild(tit);
    cab.appendChild(btnCerrar);
    hoja.appendChild(cab);
    hoja.appendChild(cuerpo);
    overlay.appendChild(hoja);
    document.body.appendChild(overlay);

    const cerrar = () => {
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
    };
    // El Escape lo cede a los confirmar() que se abran encima (limpiar…)
    const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !document.getElementById("gym-confirm-activo")) {
            e.stopPropagation();
            cerrar();
        }
    };
    document.addEventListener("keydown", onKey, true);
    btnCerrar.onclick = cerrar;

    // Al guardar, el propio formulario ya navega a la ficha de la rutina;
    // aquí solo hacemos que la hoja desaparezca por encima.
    const alGuardar = () => cerrar();

    if (modo === "editar" && inicial) await editar(cuerpo, inicial, alGuardar, true);
    else await crear(cuerpo, alGuardar, true);
};
