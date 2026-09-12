import js from '@eslint/js' // Reglas recomendadas de ESLint para JavaScript
import globals from 'globals' // Lista de variables globales (window, document, etc.)
import reactHooks from 'eslint-plugin-react-hooks' // Plugin que vigila las reglas de los Hooks de React
import reactRefresh from 'eslint-plugin-react-refresh' // Plugin para recarga rápida (HMR) con Vite
import { defineConfig, globalIgnores } from 'eslint/config' // Ayudas para declarar la configuración y carpetas ignoradas

/**
 * Configuración de ESLint del proyecto.
 * Define qué archivos se revisan, qué plugins se usan y qué entornos existen.
 */
export default defineConfig([ // Exporta el arreglo de configuraciones que ESLint aplicará
  globalIgnores(['dist']), // No analiza la carpeta de compilación (archivos ya empaquetados)
  { // Objeto de reglas para el código fuente
    files: ['**/*.{js,jsx}'], // Aplica estas reglas a todos los .js y .jsx del proyecto
    extends: [ // Hereda conjuntos de reglas ya hechas
      js.configs.recommended, // Buenas prácticas generales de JavaScript
      reactHooks.configs.flat.recommended, // Obliga a usar bien useState, useEffect, etc.
      reactRefresh.configs.vite, // Compatible con el recargado en caliente de Vite
    ],
    languageOptions: { // Opciones del analizador de lenguaje
      globals: globals.browser, // Reconoce APIs del navegador (localStorage, fetch, etc.)
      parserOptions: { ecmaFeatures: { jsx: true } }, // Permite sintaxis JSX en los archivos
    },
  },
])
