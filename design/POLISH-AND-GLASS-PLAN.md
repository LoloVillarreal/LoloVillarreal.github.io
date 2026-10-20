# Plan de interfaz, flujo de entrenamiento y Liquid Glass

## 1. Prioridad: dar espacio al entrenamiento

- Separar resumen, edición y consulta durante el gimnasio: cada pantalla tiene una tarea principal.
- Mostrar la rutina como una lista compacta con imagen, nombre, series y rango, antes de abrir la guía técnica.
- En edición, mostrar un resumen por ejercicio y desplegar sus parámetros cuando se quieran ajustar. Dos campos por fila en móvil y cuatro en pantallas amplias, con controles grandes y etiquetas completas.
- Abrir la biblioteca en un panel modal independiente, con buscador, filtro, imágenes, estado «Añadido» y un botón para volver. Mantener el foco dentro del panel, permitir Escape y devolver el foco al cerrarlo.
- Mantener el guardado visible al desplazarse. Mostrar si hay cambios sin guardar y confirmar antes de salir de una edición modificada; proteger también recarga/cierre y actualización de la PWA.

## 2. Prioridad: empezar y consultar la sesión con claridad

- Acción principal «Empezar entrenamiento» desde el resumen y desde el inicio.
- Acción «Guardar y empezar» desde el editor, manteniendo «Guardar entrenamiento» para planificar otra fecha.
- Guía de un ejercicio por pantalla, con posición visible, anterior/siguiente, imagen, técnica, alternativas y recomendaciones.
- Temporizador de descanso orientativo con empezar, pausa, continuar y reiniciar. Se calcula con la hora real para no acumular retrasos al pasar a segundo plano.
- Conservar la posición de lectura mientras la app permanece abierta y se navega a otra sección; mostrar «Continuar entrenamiento» en el inicio. La posición y el temporizador no se convierten en registros de series completadas.
- El descanso es un contador temporal de la pantalla actual: se reinicia al cambiar de ejercicio o salir de esa pantalla. La posición de lectura se conserva en memoria hasta cerrar la app o cambiar de cuenta.
- Mostrar los entrenamientos planificados, además del progreso, al revisar una copia JSON antes de restaurarla.
- Conservar miércoles solo cardio, viernes opcional, selección por fecha, guardado privado y firma de Alexia.

## 3. Prioridad: una portada más útil

- Portada más ligera, con koala e identidad L&A.
- Tarjeta «Hoy» con la rutina elegida o recomendada, contexto y botón para empezar/continuar.
- Accesos directos a nutrición, progreso y calculadoras; objetivo y semana en una tarjeta secundaria desplegable.
- Aviso para retomar una guía abierta de otra fecha, sin confundirla con la sesión de hoy.

## 4. Tercer tema: blanco Liquid Glass

- Mantener Claro y Oscuro; añadir Liquid Glass como tercera opción explícita en Ajustes y en el ciclo del botón de cabecera.
- Fondo blanco con luces suaves azul, lila, rosa y menta; tarjetas translúcidas, borde luminoso, desenfoque y sombras ligeras.
- Cápsula de navegación de cristal blanco con selección multicolor; controles y texto con contraste legible.
- Sistema tipográfico nativo y superficies con relieve sutil, inspirado en interfaces de Apple; conservar marca, koala y personalidad propias.
- Recordar la apariencia como preferencia del navegador y mantener compatibilidad con ajustes/copias anteriores que solo guardaban `darkMode`.
- Respetar movimiento reducido y dar un fondo opaco de respaldo cuando se solicite menor transparencia. Sin recursos externos necesarios para el tema, para conservar acceso offline.

## 5. Validación y publicación

- Pruebas de compatibilidad de temas y copias antiguas, temporizador y selección de entrenamiento.
- Chromium y WebKit: tres temas, tamaños de 320/390/768/1440 px, sin desbordamientos ni controles tapados por la cápsula.
- Flujo real con cuentas sintéticas: editar, buscar/añadir/reordenar, guardar y empezar, anterior/siguiente, pausa/continuación del descanso, retorno desde inicio y recuperación de la planificación en otro navegador.
- Cancelación de cambios, protección al salir, teclado/Escape y foco en la biblioteca; movimiento reducido y guía offline.
- Verificar respaldo remoto antes del despliegue; repetir comprobaciones en el sitio público, comparar archivos y eliminar los usuarios de prueba. Distinguir siempre pruebas de escritorio de la comprobación pendiente en iPhone físico.
