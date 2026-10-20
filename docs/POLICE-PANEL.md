# Panel personal de Lolo

Entrada: Ajustes → Entrar al apartado Policía Nacional, o `/#police`.
Panel privado de organización personal, sin contenido académico ni vinculación oficial.

## Acceso único

Toda la app muestra el inicio de sesión antes de abrir sus apartados. La cuenta existente de Alexia está autorizada en `police_members`; se utiliza su contraseña actual. No hace falta crear una cuenta para Lolo ni proporcionar otro correo.

Entrenamiento y Policía comparten el cliente y la sesión Supabase de la guía. El botón circular con gorra abre Policía; la mancuerna regresa al apartado de Alexia. La sesión se conserva en el navegador y se renueva automáticamente. Cerrar sesión en cualquiera de los apartados bloquea ambos en ese navegador.

La antigua sesión `plan-police-auth` se elimina al abrir la versión nueva. La función `police-login` se ha retirado y devuelve HTTP 410; no recibe ni valida credenciales. Las tablas mantienen RLS de propietario y pertenencia; no se han cambiado contraseñas ni registros existentes. El contenido estático de una PWA alojada en Pages es descargable; los registros privados están protegidos por Supabase, además de la barrera de interfaz.

## Guardado y cronómetro

- Registros versionados con UUID estable para reintentos. Conflictos entre dispositivos requieren actualizar; no se sobrescriben silenciosamente.
- Un cronómetro por usuario. La RPC usa bloqueo transaccional, comprueba la versión y finaliza en una transacción: crea la sesión con el mismo UUID y elimina el cronómetro. Repetir una finalización no duplica sesiones.
- Estudio y descansos son intervalos UTC separados. Al volver a la app, se recupera el estado remoto. Las acciones necesitan conexión y el tiempo no depende de mantener un intervalo JavaScript en segundo plano.
- Pomodoro limita cada bloque a su duración; no comienza automáticamente otro bloque mientras la app está cerrada. Sin promesa de alarmas, notificaciones o ejecución continua en iOS.
- El cronómetro normal puede quedar abierto: el historial permite corregirlo o borrarlo. Una corrección manual de tiempos coloca el descanso al final; editar solo texto conserva los intervalos originales.
- Escrituras confirmadas antes de reflejarlas como guardadas. Los formularios mantienen su borrador ante errores de red; cerrar la pestaña sin guardar puede perder ese borrador.

## Métricas

Estudio efectivo: unión de intervalos de estudio, excluyendo descansos, solapamientos y tiempo futuro; dividido en días según la zona horaria configurada. Semana: lunes–domingo. Media diaria: total dividido entre días naturales desde el primer estudio hasta hoy. Los descansos previstos se excluyen de la comparación de días esperados, sin penalización ni rachas obligatorias. La semana anterior se presenta completa, indicando que la actual puede estar en curso.

Planificar o marcar hecho no genera estudio. Resultados: misma categoría y escala. Marcas: misma actividad, unidad y dirección de mejora. Cafés sin precio suman unidades, nunca gasto inventado. Los objetivos usan registros reales. No se calcula probabilidad de aprobar ni preparación clínica o deportiva oficial.

## Verificación y límites

Pruebas unitarias en `src/police/model.test.ts`, junto a las pruebas existentes. Pruebas de integración con cuentas sintéticas para RLS, autenticación, concurrencia y reintentos; pruebas de navegador Chromium y WebKit. WebKit de escritorio no sustituye un iPhone físico. La autorización de la cuenta real se verifica en la base de datos; las pruebas de contraseña se realizan con cuentas sintéticas, sin pedir ni cambiar la contraseña personal.

El proyecto conserva el plan gratuito actual; no se han contratado servicios de pago. Su disponibilidad y cuotas dependen del proveedor. Sin cambios a la tabla `plan_data` existente ni a las cuentas personales previas.

La migración se creó con Supabase CLI y su nombre temporal se ajustó a la versión asignada por el despliegue remoto: `20261020220658_police_personal_panel.sql`. El asesor de rendimiento no detectó incidencias; el de seguridad mantiene el aviso previo de [protección contra contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sin modificar el plan de pago ni la configuración de las cuentas existentes.
