import type { Exercise } from '../types'
const guides:[RegExp,string,string?][]=[
 [/^Arnold Press/i,'Empieza con mancuernas delante de los hombros y palmas hacia ti. Empuja hacia arriba girando las palmas hacia delante; baja despacio invirtiendo el giro. Mantén el tronco estable.','https://www.hevyapp.com/exercises/arnold-press-dumbbell/'],
 [/^Hip Thrust/i,'Apoya la parte alta de la espalda en un soporte estable y planta los pies. Eleva la cadera contrayendo los glúteos, sin arquear la espalda. Haz una pausa y baja con control. En máquina, ajusta primero el apoyo y la almohadilla.','https://www.hevyapp.com/exercises/how-to-hip-thrust/'],
 [/^Romanian Deadlift/i,'Con rodillas ligeramente flexionadas, lleva la cadera hacia atrás y mantén la carga cerca de las piernas. Baja hasta donde puedas conservar la espalda neutra. Vuelve extendiendo la cadera, sin inclinarte hacia atrás.'],
 [/^Glute Bridge/i,'Túmbate boca arriba con rodillas flexionadas y pies apoyados. Eleva la pelvis apretando los glúteos hasta alinear cadera y tronco. Baja lentamente sin perder el control abdominal.'],
 [/^(Seated|Lying|Standing) Leg Curl/i,'Ajusta el apoyo a tu pierna y alinea la rodilla con el eje de la máquina. Flexiona la rodilla llevando el talón hacia atrás, sin mover la cadera. Extiende de nuevo con control.'],
 [/^Leg Extension/i,'Ajusta el asiento para apoyar la espalda y alinear las rodillas con el eje. Extiende las piernas levantando el rodillo sin impulso. Baja lentamente sin dejar caer la carga.'],
 [/^Leg Press/i,'Apoya espalda y pelvis en el respaldo y coloca los pies estables en la plataforma. Flexiona las rodillas sin despegar la pelvis. Empuja la plataforma con control, evitando bloquear bruscamente las rodillas.'],
 [/^Hip Abduction/i,'Coloca los apoyos en la cara exterior de las piernas. Separa las rodillas manteniendo el tronco estable; vuelve lentamente sin golpear los pesos.'],
 [/^Hip Adduction/i,'Ajusta los apoyos en la cara interior de las piernas a una apertura cómoda. Acerca las piernas con control y vuelve despacio, sin forzar la apertura.'],
 [/^(Lat Pulldown|Lat Pulldown -)/i,'Fija los muslos bajo el apoyo y agarra la barra. Lleva los codos hacia abajo, acercando el agarre a la parte alta del pecho. Deja que los brazos suban de nuevo sin balancearte.'],
 [/^Seated (Cable )?Row/i,'Siéntate con apoyo firme y espalda estable. Lleva el agarre hacia el tronco guiando con los codos. Extiende los brazos lentamente sin lanzar el cuerpo hacia delante.'],
 [/^Lateral Raise/i,'Mantén una pequeña flexión de codos. Eleva los brazos hacia los lados hasta una altura cómoda, sin encoger los hombros ni balancearte. Baja con control.'],
 [/^(Bicep Curl|Hammer Curl|Preacher Curl)/i,'Mantén los codos estables y las muñecas alineadas. Flexiona los codos para subir la carga, sin balancear el tronco. Baja lentamente hasta un recorrido cómodo. Usa el apoyo del banco si es una variante predicador.'],
 [/^Triceps Pushdown/i,'Con codos junto al cuerpo, extiéndelos empujando el agarre hacia abajo. Mantén hombros y tronco quietos. Flexiona de nuevo los codos sin dejar que la carga tire de ti.'],
 [/^Chest Press/i,'Ajusta el asiento para que los agarres queden a la altura del pecho. Mantén la espalda apoyada y empuja sin elevar los hombros. Regresa despacio a una profundidad cómoda.'],
 [/^Calf Raise|^Seated Calf Raise|^Standing Calf Raise/i,'Con un apoyo estable, eleva los talones presionando con la parte delantera de los pies. Pausa arriba y baja lentamente. Evita rebotar y mantén el tobillo alineado.'],
 [/^Plank$/i,'Apoya antebrazos y puntas de los pies. Mantén cabeza, tronco y pelvis alineados, con abdomen activo. Respira con normalidad y termina si ya no puedes mantener la postura.'],
 [/^Cable Crunch$/i,'Arrodíllate frente a la polea y mantén el agarre estable cerca de la cabeza. Flexiona el tronco acercando las costillas a la pelvis. Vuelve lentamente sin tirar solo con los brazos.']
]
export function techniqueFor(exercise:Exercise){
 if(!exercise.id.startsWith('hevy-'))return {text:exercise.technique,general:false,source:undefined}
 const match=guides.find(([pattern])=>pattern.test(exercise.hevyName))
 return match?{text:match[1],general:true,source:match[2]}:{text:exercise.technique,general:false,source:undefined}
}
