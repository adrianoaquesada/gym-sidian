/* ═══════════════════════════════════════════════════════════════════════════
   Estado global del plugin: la instancia de App y los ajustes vigentes.

   El motor original usaba el global `app` de Obsidian; aquí se inyecta una
   vez desde main.ts y el resto de módulos lo pide con aplicacion()/conf().
   ═══════════════════════════════════════════════════════════════════════════ */

import type { App } from "obsidian";
import type { AjustesGym } from "./ajustes";

let _app: App | null = null;
let _ajustes: AjustesGym | null = null;

export function iniciarEstado(app: App, ajustes: AjustesGym): void {
    _app = app;
    _ajustes = ajustes;
}

export function actualizarAjustes(ajustes: AjustesGym): void {
    _ajustes = ajustes;
}

export function aplicacion(): App {
    if (!_app) throw new Error("Gym Stone aún no se ha inicializado.");
    return _app;
}

export function conf(): AjustesGym {
    if (!_ajustes) throw new Error("Gym Stone aún no se ha inicializado.");
    return _ajustes;
}
