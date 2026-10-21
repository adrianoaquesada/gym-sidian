# 🏋️ Gym Stone

Plugin de Obsidian con el **sistema de rutinas de gimnasio**: creas una rutina, registras sesiones,
medidas y anotaciones, y ves el progreso en un calendario mensual y unas estadísticas (mismo look
que el panel de trading).

Es la conversión a plugin —en TypeScript y sin Dataview— de un sistema de gestión propio, y
ahora vive **en pestañas propias a todo el ancho** (como Kanban), no dentro de notas.

## Instalar

**Desde la lista de plugins de la comunidad** (cuando esté publicado): Ajustes → Comunidad de
plugins → Explorar → busca «Gym Stone», o pulsa este enlace:
[obsidian://show-plugin?id=gym-stone](obsidian://show-plugin?id=gym-stone).
Funciona en **escritorio y móvil**.

**Instalación manual** (o mientras tanto, desde la última release de GitHub): descarga de la
[última release](https://github.com/adrianoaquesada/gym-stone/releases/latest) los tres
archivos — `main.js`, `manifest.json` y `styles.css` — y colócalos en

```
<tu-vault>/.obsidian/plugins/gym-stone/
```

Después: Ajustes → Comunidad de plugins → plugins sin verificar → activa **Gym Stone**.

También se puede instalar con **BRAT** (añade `adrianoaquesada/gym-stone`), que además
descarga las actualizaciones de cada nueva release automáticamente.

## Uso

Abre el plugin con la **campaña de mancuerna** (barra lateral izquierda) o con el comando
«Abrir la lista de rutinas». **Toda la navegación ocurre en una sola pestaña** (se cambia de
pantalla dentro de ella, nunca se abren pestañas de más):

- **📋 Lista («Rutinas»)**: índice de todas las rutinas (estado, fechas, semana en curso y
  sesiones hechas) más el resumen de medidas. Desde aquí creas (＋), registras medidas (⚖️),
  gestionas el catálogo global de ejercicios (🗂), editas (✏️), borras (🗑) o inicias la
  sesión guiada de una rutina (🎯) sin entrar a su ficha. El gestor de ejercicios renombra
  con ids estables (**el historial se conserva**), les asigna grupo muscular para el buscador
  y purga (🧹, con confirmación) las entradas que ya no usan ni rutinas ni plantillas.
- **🏋️ Rutina**: el dashboard de la rutina a todo el ancho — calendario mensual, registro de
  sesiones, estadísticas e historial. En el **modo sesión guiada** (pensado para el móvil)
  entrenas un ejercicio a la vez: descansos con **−15 s** / **＋30 s**, **tiempo activo real**
  (las pausas no cuentan ni en el cronómetro ni en los tiempos de las series) y «entre
  series» desglosado en descanso y ejecución. Al pulsar un día del calendario se abre su
  detalle: KPIs del día, gráficos de volumen, tiempos por serie y la **🕒 línea de tiempo**
  de toda la sesión; los días con anotación muestran su 📝 siempre a la vista.
- **✏️ Nueva/Editar**: el formulario se abre en una **hoja superpuesta** sobre lo que estés
  mirando (✕ o Esc la cierran y vuelves exactamente a donde estabas), con estado de la
  rutina (🟢 Activa · ⏸ Pausada · 🏁 Finalizada), selector **kg | lb** y búsqueda de
  ejercicios por nombre o **grupo muscular** con chips.

La **cabecera naranja** es la zona de navegación: en la lista es el título y en la ficha una
ruta de migas clicable (**`Rutinas › 🏋️ nombre`**), y su ⇄ alterna kg ↔ libras en todo el
plugin.

**Abrir los archivos del plugin es abrir el plugin** (el truco de Kanban): si abres
`08 Gimnasio/Rutinas.md` o un archivo de `Datos/rutinas/`, esa pestaña pasa a la vista del
plugin, y los iconos 📜 y 🏋️ de la esquina superior alternan entre la vista del plugin y la
nota cruda. No hay frontmatter ni notas-dashboard: los datos son JSON puro en notas `.md`
legibles, y el plugin es el dueño de sus archivos.

## Dónde viven los datos

| Archivo | Función |
|---|---|
| `08 Gimnasio/Rutinas.md` | **Índice**: una fila por rutina (fecha, id, nombre, estado) |
| `08 Gimnasio/Datos/rutinas/<id>.md` | Cada rutina con TODO: plan + sesiones + anotaciones |
| `08 Gimnasio/Datos/medidas.md` | Peso y talla (global) |
| `08 Gimnasio/Datos/ejercicios.md` | Grupo muscular de cada ejercicio (global) |
| `08 Gimnasio/Plantillas/<nombre>.md` | Plantillas reutilizables |

El índice se regenera solo cada vez que se guarda una rutina, así que aunque lo edites a mano
(o lo borres) se repone con lo último en disco. Todas las rutas son **ajustes del plugin**
(Ajustes → Gym Stone). El peso se guarda siempre en kg y la talla en cm: la unidad que muestras
(kg | lb, cm | in) es solo de pantalla y se teclea en esa unidad. Antes de sobrescribir un
archivo de datos se guarda su copia previa en `<archivo>.bak`; si un JSON está roto, el motor
avisa y **no** sobrescribe.

## Desarrollo

```bash
npm install        # dependencias (una vez)
npm run dev        # esbuild en watch (recompila main.js al guardar)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + bundle de producción
```

Publicar una versión nueva: sube la `version` de `manifest.json`, añade la entrada en
`versions.json`, haz commit y etiqueta con ese mismo número (sin «v»):
`git tag 1.0.1 && git push origin 1.0.1` — el workflow crea la release con los archivos
compilados.

Estructura del código:

```
src/
  main.ts            Plugin: registro de vistas, comandos, cinta y ajustes
  ajustes.ts         Ajustes del plugin (índice, carpetas y unidad de talla)
  estado.ts          App + ajustes vigentes (inyectados desde main.ts)
  config.ts          Constantes: paleta, objetivos, tipos, días, meses
  tipos.ts           Interfaces de los datos en memoria (+ índice)
  unidades.ts        kg | lb y cm | in (la conversión vive solo aquí)
  util/              fechas, texto (esc, slug, números a mano…)
  datos/             archivos.ts (lectura/escritura segura), indice.ts (Rutinas.md),
                     rutinas.ts, medidas.ts, plantillas.ts y calculos.ts (1RM, volumen…)
  ui/
    vistas.ts        tipos de vista + navegación (todo en una sola pestaña)
    vista-lista.ts   pestaña «Rutinas»: índice + medidas
    vista-rutina.ts  pestaña de una rutina (su dashboard)
    vista-form.ts    pestaña del formulario (legado: ahora se usa la hoja)
    cabecera.ts      la cabecera naranja: migas de pan clicable
    hoja.ts          crear/editar en hoja superpuesta (✕ o Esc la cierran)
    componentes.ts   el, KPI, cajas, tablas, modales, confirmar, toast…
    creador.ts       formulario de creación/edición
    calendario.ts    calendario mensual + detalle de un día
    registro.ts      sesión, anotación y medidas
    sesion-guiada.ts modo móvil: un ejercicio a la vez con descanso
    estadisticas.ts  progresión, medidas y récords
    historial.ts     historial filtrable
    gestor.ts        el dashboard (enlaza todas las secciones)
    pintar.ts        el "repinta todo" que usan los modales
    tabla-ajustes.ts pestaña de ajustes
styles.css           Todo el CSS .gym-* (antes cada engine inyectaba su <style>)
```

## Licencia

MIT — ver [LICENSE](LICENSE).
