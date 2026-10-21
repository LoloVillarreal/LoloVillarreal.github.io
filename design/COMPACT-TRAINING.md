# Entrenamiento compacto — 21 octubre 2026

- Vista semanal inicial, calendario mensual desplegable y ejercicios antes de las acciones de borrado.
- Filas de unos 64–75 px, imagen de 40 px a la izquierda; tocar abre la guía.
- Editar entrenamiento muestra el asa de tres líneas a la derecha. Pulsación táctil de 240 ms y arrastre vertical; ratón y teclado (espacio, flechas, Escape) disponibles. Ajustes y botones subir/bajar al desplegar una fila.
- Guardar conserva orden y parámetros en la cuenta; guardar y empezar abre la guía.
- Biblioteca de 387 ejercicios estándar con IDs de Hevy: 385 imágenes locales y dos iconos de sustitución. Búsqueda por nombre/músculo y filtros de músculo/material. No se consultaron rutinas ni registros personales.
- El conector devuelve hasta cinco resultados por búsqueda: las consultas específicas amplían el catálogo, pero no garantizan exhaustividad. Los nuevos nombres mantienen el original y los parámetros iniciales son orientativos/editables, no programas de Hevy. Miércoles sigue reservado a cardio.
- Las imágenes se incluyen en la caché offline; precarga total aproximada de 10 MB. Se conserva el aviso de actualización de la PWA. Guardar en la cuenta requiere conexión.

## Referencias consultadas

- Hevy: https://www.hevyapp.com/features/exercise-programming-options/
- Hevy: https://www.hevyapp.com/features/gym-routines/
- Hevy: https://www.hevyapp.com/features/track-workouts/
- dnd-kit sortable: https://dndkit.com/legacy/presets/sortable/overview/
- dnd-kit touch: https://dndkit.com/legacy/api-documentation/sensors/touch/

## Validación

59 pruebas unitarias y compilación de producción. Pruebas de navegador con cuenta sintética: filas compactas, calendario, orden con ratón/teclado, cancelación, catálogo, guardado en nube y recarga, miércoles y tres temas a 320/390/768 px. Chromium verifica además pulsación prolongada con eventos táctiles. WebKit de escritorio no sustituye la comprobación en un iPhone real.
