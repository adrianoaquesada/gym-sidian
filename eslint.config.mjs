/* Configuración de lint: la misma que usa la revisión automatizada de la
   comunidad de Obsidian (ESLint + eslint-plugin-obsidianmd, con las reglas
   typescript-eslint type-checked incluidas en su «recommended»).

   Uso: `npm run lint` (o `npx eslint src --fix` para lo autoarreglable). */
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
    ...obsidianmd.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["eslint.config.*"],
                },
            },
        },
        rules: {
            /* El placeholder del ajuste «Carpeta raíz» es el propio nombre de
               carpeta, que es MINÚSCULAS a propósito («gym-stone»), igual que
               el sufijo «.gym-stone.md»: la regla de sentence case no debe
               subirle la inicial a esa cadena concreta. */
            "obsidianmd/ui/sentence-case": ["warn", { ignoreRegex: ["^gym-stone$"] }],
        },
    },
]);
