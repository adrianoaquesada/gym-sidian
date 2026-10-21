/* ═══════════════════════════════════════════════════════════════════════════
   El «pintar» del dashboard, compartido por todas las secciones.

   En el motor era `window.__gymPintar`: los modales lo llaman tras mutar los
   datos para que el dashboard se refresque. Aquí es un módulo con una sola
   referencia, fijada por gestor.ts en cada render.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Pintar = () => void | Promise<void>;

let pintar: Pintar | null = null;

export const fijarPintar = (f: Pintar): void => { pintar = f; };

// Refresca el dashboard entero si ya se ha montado uno (los modales y la
// sesión guiada lo llaman tras guardar en disco)
export const repintarTodo = async (): Promise<void> => {
    if (pintar) await pintar();
};
