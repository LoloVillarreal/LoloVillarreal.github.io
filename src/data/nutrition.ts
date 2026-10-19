import type { Food, MenuDay } from '../types'

const SOURCE = 'USDA FoodData Central (valor genérico por 100 g; consulta y marca pueden variar)'
const f = (food: Omit<Food,'source'|'unit'> & Partial<Pick<Food,'source'|'unit'>>) => ({ unit:'g' as const, source:SOURCE, ...food })

export const foods: Record<string, Food> = Object.fromEntries([
  f({id:'oats',name:'Avena seca',kcal:389,protein:16.9,carbs:66.3,fat:6.9,tags:['vegetarian']}),
  f({id:'milk',name:'Leche semidesnatada',kcal:46,protein:3.4,carbs:4.8,fat:1.6,tags:['vegetarian','gluten-free']}),
  f({id:'banana',name:'Plátano',kcal:89,protein:1.1,carbs:22.8,fat:.3,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'peanut-butter',name:'Crema de cacahuete',kcal:588,protein:25,carbs:20,fat:50,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'rice',name:'Arroz blanco seco',kcal:365,protein:7.1,carbs:80,fat:.7,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'chicken',name:'Pechuga de pollo cruda',kcal:120,protein:22.5,carbs:0,fat:2.6,tags:['lactose-free','gluten-free']}),
  f({id:'vegetables',name:'Verduras variadas',kcal:35,protein:2,carbs:6.5,fat:.3,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'olive-oil',name:'Aceite de oliva',kcal:884,protein:0,carbs:0,fat:100,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'skyr',name:'Skyr natural',kcal:63,protein:11,carbs:4,fat:.2,tags:['vegetarian','gluten-free']}),
  f({id:'bread',name:'Pan integral',kcal:247,protein:13,carbs:41,fat:4.2,tags:['vegetarian','lactose-free']}),
  f({id:'walnuts',name:'Nueces',kcal:654,protein:15.2,carbs:13.7,fat:65.2,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'salmon',name:'Salmón crudo',kcal:208,protein:20.4,carbs:0,fat:13.4,tags:['lactose-free','gluten-free']}),
  f({id:'potato',name:'Patata cruda',kcal:77,protein:2,carbs:17.5,fat:.1,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'salad',name:'Ensalada variada',kcal:25,protein:1.3,carbs:4.5,fat:.2,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'egg',name:'Huevo',unit:'unit',gramsPerUnit:50,kcal:143,protein:12.6,carbs:.7,fat:9.5,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'tomato',name:'Tomate',kcal:18,protein:.9,carbs:3.9,fat:.2,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'orange',name:'Naranja',kcal:47,protein:.9,carbs:11.8,fat:.1,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'pasta',name:'Pasta seca',kcal:371,protein:13,carbs:74.7,fat:1.5,tags:['vegetarian','lactose-free']}),
  f({id:'turkey',name:'Pechuga de pavo cruda',kcal:114,protein:23.7,carbs:0,fat:1.5,tags:['lactose-free','gluten-free']}),
  f({id:'crushed-tomato',name:'Tomate triturado',kcal:32,protein:1.6,carbs:7,fat:.3,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'protein-yogurt',name:'Yogur alto en proteínas',kcal:64,protein:10,carbs:4.5,fat:.5,source:'Valor genérico documentado; comprobar etiqueta del producto',tags:['vegetarian','gluten-free']}),
  f({id:'berries',name:'Frutos rojos',kcal:50,protein:.8,carbs:12,fat:.3,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'hake',name:'Merluza cruda',kcal:86,protein:17.8,carbs:0,fat:1.6,tags:['lactose-free','gluten-free']}),
  f({id:'yogurt',name:'Yogur natural',kcal:61,protein:3.5,carbs:4.7,fat:3.3,tags:['vegetarian','gluten-free']}),
  f({id:'greek-yogurt',name:'Yogur griego natural',kcal:97,protein:9,carbs:3.9,fat:5,tags:['vegetarian','gluten-free']}),
  f({id:'strawberries',name:'Fresas',kcal:32,protein:.7,carbs:7.7,fat:.3,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'honey',name:'Miel',kcal:304,protein:.3,carbs:82.4,fat:0,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'lentils',name:'Lentejas secas',kcal:352,protein:24.6,carbs:63.4,fat:1.1,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'quark',name:'Queso fresco batido',kcal:67,protein:8.5,carbs:4,fat:1.8,source:'Valor genérico documentado; comprobar etiqueta del producto',tags:['vegetarian','gluten-free']}),
  f({id:'apple',name:'Manzana',kcal:52,protein:.3,carbs:13.8,fat:.2,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'sweet-potato',name:'Boniato crudo',kcal:86,protein:1.6,carbs:20.1,fat:.1,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'almonds',name:'Almendras',kcal:579,protein:21.2,carbs:21.6,fat:49.9,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'beef',name:'Ternera magra cruda',kcal:137,protein:21.4,carbs:0,fat:5,tags:['lactose-free','gluten-free']}),
  f({id:'jam',name:'Mermelada',kcal:250,protein:.4,carbs:65,fat:.1,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'fresh-cheese',name:'Queso fresco',kcal:170,protein:12,carbs:3,fat:12,tags:['vegetarian','gluten-free']}),
  f({id:'kiwi',name:'Kiwi',kcal:61,protein:1.1,carbs:14.7,fat:.5,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'tuna',name:'Atún al natural escurrido',kcal:116,protein:25.5,carbs:0,fat:.8,tags:['lactose-free','gluten-free']}),
  f({id:'chickpeas',name:'Garbanzos secos',kcal:364,protein:19.3,carbs:60.7,fat:6,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'fruit',name:'Fruta variada',kcal:55,protein:.7,carbs:13.5,fat:.2,tags:['vegetarian','lactose-free','gluten-free']}),
  f({id:'pizza-base',name:'Base de pizza',kcal:270,protein:8.5,carbs:52,fat:3,source:'Valor genérico documentado; comprobar etiqueta o receta',tags:['vegetarian','lactose-free']}),
  f({id:'mozzarella',name:'Mozzarella',kcal:280,protein:28,carbs:3.1,fat:17,tags:['vegetarian','gluten-free']}),
  f({id:'avocado',name:'Aguacate',kcal:160,protein:2,carbs:8.5,fat:14.7,tags:['vegetarian','lactose-free','gluten-free']}),
].map(x => [x.id,x]))

const meal = (id:string,name:string,ingredients:[string,number][],alternatives:string[]=[] ) => ({id,name,ingredients:ingredients.map(([foodId,amount])=>({foodId,amount})),alternatives})
export const menu: MenuDay[] = [
  {day:1,name:'Lunes',meals:[
    meal('mo-breakfast','Desayuno',[['oats',50],['milk',200],['banana',100],['peanut-butter',10]],['Leche sin lactosa o bebida de soja enriquecida']),
    meal('mo-lunch','Comida',[['rice',70],['chicken',130],['vegetables',200],['olive-oil',10]],['Tofu firme por pollo']),
    meal('mo-snack','Merienda',[['skyr',170],['bread',50],['walnuts',15]],['Skyr sin lactosa o yogur de soja alto en proteína']),
    meal('mo-dinner','Cena',[['salmon',120],['potato',230],['salad',150],['olive-oil',10]],['Tempeh por salmón'])]},
  {day:2,name:'Martes',meals:[
    meal('tu-breakfast','Desayuno',[['bread',80],['egg',2],['tomato',100],['orange',150]],['Pan certificado sin gluten']),
    meal('tu-lunch','Comida',[['pasta',75],['turkey',110],['crushed-tomato',150],['olive-oil',10]],['Pasta sin gluten; soja texturizada por pavo']),
    meal('tu-snack','Merienda',[['protein-yogurt',200],['oats',35],['berries',100]],['Yogur sin lactosa o de soja']),
    meal('tu-dinner','Cena',[['hake',140],['rice',55],['vegetables',200],['olive-oil',15],['yogurt',125]],['Tofu por merluza; yogur sin lactosa'])]},
  {day:3,name:'Miércoles',meals:[
    meal('we-breakfast','Desayuno',[['greek-yogurt',200],['oats',55],['strawberries',100],['honey',10]],['Yogur sin lactosa o de soja']),
    meal('we-lunch','Comida',[['lentils',75],['rice',40],['vegetables',200],['olive-oil',10]]),
    meal('we-snack','Merienda',[['bread',60],['quark',150],['apple',150]],['Pan sin gluten; queso fresco batido sin lactosa']),
    meal('we-dinner','Cena',[['chicken',140],['sweet-potato',220],['vegetables',200],['olive-oil',15]],['Tofu firme por pollo'])]},
  {day:4,name:'Jueves',meals:[
    meal('th-breakfast','Desayuno',[['oats',55],['milk',200],['banana',100],['almonds',15]],['Leche sin lactosa o bebida de soja']),
    meal('th-lunch','Comida',[['rice',60],['beef',130],['vegetables',200],['olive-oil',10]],['Tempeh por ternera']),
    meal('th-snack','Merienda',[['skyr',170],['bread',60],['jam',20]],['Skyr sin lactosa; pan sin gluten']),
    meal('th-dinner','Cena',[['egg',2],['potato',250],['salad',200],['bread',40],['olive-oil',10]],['Pan certificado sin gluten'])]},
  {day:5,name:'Viernes',meals:[
    meal('fr-breakfast','Desayuno',[['bread',80],['fresh-cheese',80],['turkey',60],['kiwi',100]],['Pan sin gluten; queso sin lactosa; tofu ahumado por pavo']),
    meal('fr-lunch','Comida',[['pasta',70],['tuna',100],['crushed-tomato',150],['olive-oil',15]],['Pasta sin gluten; soja texturizada por atún']),
    meal('fr-snack','Merienda',[['milk',250],['banana',120],['oats',30]],['Leche sin lactosa o bebida de soja']),
    meal('fr-dinner','Cena',[['chicken',110],['rice',70],['vegetables',200],['olive-oil',10]],['Tofu firme por pollo'])]},
  {day:6,name:'Sábado',meals:[
    meal('sa-breakfast','Desayuno',[['oats',50],['protein-yogurt',200],['berries',100],['walnuts',15]],['Yogur sin lactosa o de soja']),
    meal('sa-lunch','Comida',[['chickpeas',75],['egg',2],['vegetables',200],['olive-oil',10]]),
    meal('sa-snack','Merienda',[['bread',70],['turkey',80],['fruit',150]],['Pan sin gluten; tofu ahumado por pavo']),
    meal('sa-dinner','Cena',[['pizza-base',100],['mozzarella',50],['chicken',60],['crushed-tomato',75],['vegetables',75]],['Base sin gluten; mozzarella sin lactosa; tofu por pollo'])]},
  {day:0,name:'Domingo',meals:[
    meal('su-breakfast','Desayuno',[['bread',80],['egg',2],['avocado',50],['fruit',100]],['Pan certificado sin gluten']),
    meal('su-lunch','Comida',[['rice',60],['chicken',115],['vegetables',200],['olive-oil',10]],['Tofu firme por pollo']),
    meal('su-snack','Merienda',[['skyr',170],['oats',35],['fruit',150]],['Skyr sin lactosa o yogur de soja']),
    meal('su-dinner','Cena',[['hake',150],['potato',250],['vegetables',250],['olive-oil',15],['yogurt',125]],['Tofu por merluza; yogur sin lactosa'])]},
]
