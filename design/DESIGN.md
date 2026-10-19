# Dirección visual — PLAN Lolo & alexia

## Plan

1. Navegación en una cápsula flotante, centrada horizontalmente y separada del borde inferior y del área segura del iPhone. Cinco destinos con nombre visible, estado activo claro y superficies táctiles de al menos 44 px.
2. Identidad cálida: crema, verde bosque, salvia y un acento melocotón. Mantener el koala L&A; darle aire en una portada de estilo editorial.
3. Unificar tarjetas, botones, formularios, selectores y estados. Reducir el peso de los bordes, aumentar el espacio y distinguir las acciones principales.
4. Adaptar la composición: una columna en móvil; portada, comidas y ejercicios aprovechan dos columnas en pantallas amplias. El contenido final queda por encima de la navegación al terminar de desplazarse.
5. Verificar 320/390/768/1440 px, Chromium y WebKit, todos los destinos, modo oscuro, teclado, movimiento reducido y acceso offline. Compilar y ejecutar las pruebas; respaldar la versión anterior y verificar la publicación pública.

## Implementación

`src/design.css` contiene la capa visual, cargada después de los estilos existentes. No cambia la autenticación, los datos ni el programa de entrenamiento. Las clases de sección en `App.tsx` permiten ajustar la composición sin duplicar pantallas.

La cápsula permanece abajo para alcanzarla con el pulgar. El centro de la pantalla queda disponible para leer las instrucciones y ver los ejercicios. El desenfoque tiene un fondo opaco de respaldo; las animaciones se desactivan con la preferencia de movimiento reducido.
