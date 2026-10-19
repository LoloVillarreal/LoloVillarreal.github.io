# PLAN Lolo & alexia

Guía de entrenamiento y alimentación con calculadoras y progreso privado entre dispositivos.

Sitio: https://lolovillarreal.github.io/

## Experiencia

- Guía de 12 semanas con un objetivo y una fase claros.
- Entrenamientos con imágenes del catálogo estándar de Hevy, series, repeticiones, descanso, técnica y alternativas; miércoles exclusivamente de cardio y viernes complementario opcional.
- Entrenos y nutrición son guías de consulta: no hay casillas para registrar series ni comidas.
- Ideas de desayunos, comidas, cenas y meriendas, alternativas y menú semanal orientativo.
- Calculadoras con campos vacíos seguros y preferencias recordadas en una cuenta privada.
- Progreso con entradas editables, energía, sueño y medidas opcionales.
- Hip thrust: carga externa máxima, repeticiones opcionales, récord, cambio respecto al primer registro y gráfica; compara la misma variante y ejecución.
- Koala L&A con animación CSS suave, detenida al activar reducir movimiento.

## Datos y privacidad

El progreso, los borradores, el objetivo personal y los datos de calculadora se almacenan en Supabase con inicio de sesión. La tabla `public.plan_data` aplica RLS por `auth.uid()` para lectura, inserción, actualización y borrado. Las escrituras se serializan y usan versiones para detectar conflictos entre dispositivos. «Guardado en tu cuenta» significa que las escrituras pendientes han terminado correctamente.

La clave `sb_publishable_…` de `src/data/cloud-config.json` está diseñada para clientes públicos; el acceso depende de la sesión y de RLS. No hay claves secretas ni `service_role` en el código del cliente.

Los datos se mantienen en memoria durante la sesión y no se guardan como nuevos registros en IndexedDB ni en la caché del service worker. El navegador sí puede recordar el token de sesión para facilitar el acceso; cerrar sesión retira los datos de la pantalla y elimina la sesión local. Las preferencias visuales y de consulta de la guía permanecen en el dispositivo.

La versión antigua utilizaba IndexedDB: sus registros se conservan para exportación explícita, sin subirlos automáticamente a una cuenta. Las importaciones antiguas no suben fotos ni historial de entrenamiento a Supabase. Esta versión no ofrece carga de fotos personales.

Las imágenes de ejercicios son fichas estándar verificadas mediante el conector de Hevy, guardadas como recursos estáticos para poder consultar la guía sin conexión. No hay datos de ejercicios personalizados, historial, pesos, rutinas ni fotos personales de una cuenta de Hevy en el repositorio. No se promete sincronización con Hevy.

## Acceso

La cuenta del plan es independiente de la cuenta de administración de Supabase y de Hevy. Para entrar, abrir Progreso o Ajustes y usar el correo y contraseña creados para el plan. La misma cuenta permite recuperar los datos desde otro dispositivo.

Para mantener una configuración gratuita sin un proveedor de correo, el administrador crea la cuenta desde Authentication → Users → Add user → Create new user, activando Auto Confirm User y eligiendo una contraseña personal. La recuperación de acceso se gestiona desde el panel privado. No hay alta pública dentro de la app.

Proyecto: `plan-lolo-alexia`, región `eu-west-1`, organización `LoloVillarreal's`, plan Free. No se ha contratado un plan de pago. [Supabase Free](https://supabase.com/pricing) tiene cuotas y puede pausar proyectos tras una semana sin actividad; el administrador puede reanudarlos desde el panel. Las copias JSON exportadas son recomendables porque Free no incluye copias automáticas de la base de datos.

## Instalación y conexión

En Safari de iPhone: Compartir → Añadir a pantalla de inicio. Abrir la app e iniciar sesión con la cuenta del plan.

Tras la primera carga, la guía y sus imágenes se pueden consultar offline. El progreso y las calculadoras necesitan internet para recuperarse o sincronizar. Los cambios pendientes se indican en pantalla; no cerrar hasta confirmar guardado, o exportarlos si hay un error.

## Desarrollo y publicación

Node.js 24:

```sh
npm ci
npm test
npm run build
npm run preview
```

Cada push a `main` ejecuta estas verificaciones en `.github/workflows/pages.yml` y publica `dist/` mediante GitHub Pages. El repositorio conserva todo el código fuente. Las versiones de Supabase están fijadas y el lockfile está incluido.

```text
src/App.tsx           navegación, PWA y preferencias de la guía
src/screens.tsx       guía, nutrición, calculadoras y progreso
src/lib/account.tsx   autenticación, escrituras, conflictos y copias privadas
src/lib/storage.tsx   preferencias locales de consulta
src/lib/db.ts         conservación e importación del formato anterior
src/data/             programa, nutrición y fichas estándar de Hevy
public/hevy/          imágenes estándar de ejercicios
public/food/          imágenes ilustrativas de comidas
design/               fuentes visuales y procedencia
supabase/migrations/  esquema de la base de datos, RLS y restauración atómica
```

## Nutrición y límites de las estimaciones

Los valores por ingrediente son referencias genéricas basadas principalmente en [USDA FoodData Central](https://fdc.nal.usda.gov/data-documentation/). Los productos específicos deben contrastarse con su etiqueta. El menú detalla pesos en crudo salvo indicación. Las imágenes de comida son ilustrativas, no una representación exacta de las cantidades del menú. Los cálculos y recomendaciones son orientativos y no constituyen una prescripción clínica.

La carga máxima de hip thrust refleja el rendimiento de una serie: deben compararse técnica, recorrido, variante y repeticiones, y no interpretarse como una medida aislada de fuerza del glúteo.

## Respaldo y restauración

El sitio original se conserva en el repositorio privado `LoloVillarreal/lolovillarreal-previous-site-archive`, rama `original-main`, SHA `deb902cacde7477df85e7eaf4ebf914817102bf1`, con sus 26 commits. La primera PWA permanece en el historial de este repositorio.

La cuenta puede exportar JSON y CSV. Restaurar una copia muestra una revisión previa, descarga primero una copia actual y sustituye los datos mediante una operación atómica limitada al usuario autenticado. Una importación rechazada no cambia los datos anteriores.
