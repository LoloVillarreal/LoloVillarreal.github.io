# Panel personal de Policía — 21 octubre 2026

Inicio reúne estudio diario, tareas completadas, acceso a agenda, estudio semanal y cafés; las metas muestran avance calculado desde actividad real. Las tareas del plan y las prioridades existentes comparten casillas de completar/reabrir, edición y borrado. Marcar hecho no crea tiempo de estudio.

Agenda muestra meses naturales completos de lunes a domingo, navegación mensual, acceso a hoy y fecha libre. Cada día indica tareas hechas/previstas y estudio real; filtros Todas/Pendientes/Hechas, tareas atrasadas y actividad del día separada. Editar permite mover la fecha.

Café tiene apartado propio: registrar a la hora actual, contador diario/semanal/mensual, gasto total con precio conocido, historial hoy/todo, editar hora/precio/notas y deshacer con confirmación. No se calculan cafeína ni recomendaciones clínicas.

Se reutilizan los registros, validadores y operaciones Supabase existentes. Sin migración, sin cambios de acceso o RLS y sin modificar registros personales para probar.

Validación: 65 pruebas, compilación de producción; Chromium y WebKit con adaptador sintético de persistencia para verificar tareas, recarga, metas, meses, filtros y café (alta/edición/borrado). Tres temas a 320/390/900 px sin desbordamiento. Estas pruebas de interacción no equivalen a una nueva prueba de guardado contra Supabase real; la capa de persistencia no se ha cambiado. Sin iPhone físico disponible.

Respaldo remoto previo: `guide-before-police-dashboard`, SHA `723113ed927913ceae2646d1808fc202f5bbeaae`, en `LoloVillarreal/lolovillarreal-previous-site-archive`.
