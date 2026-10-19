# Glute & Core PWA

Aplicación web progresiva, local-first y sin cuentas para entrenamiento, nutrición y progreso. Está optimizada para instalarse desde Safari en iPhone. No es una app nativa y no requiere Xcode ni un archivo IPA.

## Funciones incluidas

- Programa estructurado de 12 semanas con miércoles exclusivo de cardio.
- Registro de calentamiento y series efectivas, peso, repeticiones/duración, RIR, notas y descanso.
- Temporizador, comparación con la última sesión, volumen y sugerencia de doble progresión.
- Nombres e IDs de Hevy conservados y exportación JSON manual. No usa una API no documentada ni sincroniza cuentas.
- Menú de 7 días con macros calculados por ingrediente, selector de porción, alternativas y lista de compra agregada.
- Diario de peso opcional, cintura, cadera, energía, sueño, notas y foto local.
- Gráficas de tendencia y rendimiento.
- IMC contextualizado, Mifflin-St Jeor, rango de mantenimiento y macros con suma calórica comprobada.
- IndexedDB, exportación/importación JSON, exportaciones CSV y borrado total.
- Manifest, iconos, `apple-touch-icon`, service worker, caché sin conexión y aviso de actualización.

## Datos nutricionales

La tabla local usa valores genéricos por 100 g basados principalmente en [USDA FoodData Central](https://fdc.nal.usda.gov/data-documentation/). Los valores de yogures proteicos, quesos frescos y base de pizza se identifican expresamente como genéricos y deben contrastarse con la etiqueta del producto comprado. Las cantidades de arroz, pasta, avena y legumbres son en crudo; carnes y pescados también se registran en crudo.

No se llama a una API en tiempo de uso, por lo que el menú funciona sin conexión y los cálculos son reproducibles. Las cifras son una estimación inicial, no una prescripción clínica.

## Desarrollo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Para validar:

```bash
npm test
npm run build
npm run preview
```

El resultado estático queda en `dist/`.

## Despliegue

### GitHub Pages

El workflow `.github/workflows/pages.yml` publica en https://lolovillarreal.github.io al actualizar `main`: instala con `npm ci`, ejecuta las pruebas, compila y despliega `dist/`. En Settings → Pages, la fuente debe ser **GitHub Actions**. El código fuente y el lockfile permanecen en el repositorio; `dist/` se genera en cada ejecución.

### Vercel

1. Importar el repositorio.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Publicar. Vercel sirve HTTPS automáticamente.

### Netlify

1. Importar el repositorio.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Publicar. Netlify sirve HTTPS automáticamente.

La opción `base: './'` también permite publicar `dist/` en GitHub Pages. Los despliegues deben usar HTTPS para que el service worker funcione fuera de `localhost`.

## Instalar en iPhone

1. Abrir la URL publicada en Safari.
2. Tocar **Compartir**.
3. Elegir **Añadir a pantalla de inicio**.
4. Activar **Abrir como app web**.
5. Tocar **Añadir**.

Apple documenta el mismo flujo en su [Manual de uso del iPhone](https://support.apple.com/es-es/guide/iphone/iphea86e5236/ios).

## Lista de comprobación en iPhone

- Abrir en Safari y confirmar que no aparece desplazamiento horizontal.
- Instalar desde Compartir y verificar que abre en modo independiente.
- Registrar una serie, cerrar la web app y comprobar que el dato persiste.
- Activar modo avión, abrir de nuevo y navegar por Inicio, Entreno, Nutrición y Progreso.
- Exportar una copia JSON desde Ajustes y volver a importarla.
- Cambiar el contenido o versión, volver a desplegar y comprobar que aparece el aviso de actualización.
- Probar orientación vertical, teclado, VoiceOver, tamaño de texto y zonas seguras en un iPhone con Dynamic Island.

Las fotos y registros permanecen en IndexedDB. Pueden perderse si se borran los datos de Safari. La app no promete sincronización entre dispositivos.

## Arquitectura breve

```text
src/
  data/          ejercicios, programa, menú y tabla nutricional
  lib/           cálculos, IndexedDB, copias y CSV
  App.tsx        flujos de uso y navegación
  index.css      estilos mobile-first y safe areas
public/          fallback sin conexión e iconos generados
```
