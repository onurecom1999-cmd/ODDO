import type { L3 } from '../i18n/lang';

// Common meals for one-tap logging, with typical portions.
export const QUICK: { name: L3; kcal: number; protein: number }[] = [
  { name: { de: 'Hähnchen mit Reis und Gemüse', en: 'Chicken with rice and vegetables', tr: 'Tavuk, pilav ve sebze' }, kcal: 600, protein: 45 },
  { name: { de: 'Döner Kebab', en: 'Döner kebab', tr: 'Döner dürüm' }, kcal: 700, protein: 35 },
  { name: { de: 'Menemen mit Brot', en: 'Menemen with bread', tr: 'Ekmekle menemen' }, kcal: 450, protein: 20 },
  { name: { de: 'Simit mit Käse', en: 'Simit with cheese', tr: 'Peynirli simit' }, kcal: 420, protein: 16 },
  { name: { de: 'Magerquark mit Beeren (250 g)', en: 'Quark or skyr with berries (250 g)', tr: 'Meyveli yağsız lor (250 g)' }, kcal: 220, protein: 30 },
  { name: { de: 'Müsli mit Milch', en: 'Muesli with milk', tr: 'Sütlü müsli' }, kcal: 400, protein: 15 },
  { name: { de: 'Halbe Pizza Margherita', en: 'Half a margherita pizza', tr: 'Yarım margarita pizza' }, kcal: 550, protein: 22 },
  { name: { de: 'Linsensuppe mit Brot', en: 'Lentil soup with bread', tr: 'Ekmekle mercimek çorbası' }, kcal: 480, protein: 22 },
  { name: { de: 'Omelett mit Gemüse (3 Eier)', en: 'Vegetable omelette (3 eggs)', tr: 'Sebzeli omlet (3 yumurta)' }, kcal: 380, protein: 26 },
  { name: { de: 'Protein-Shake mit Wasser', en: 'Protein shake with water', tr: 'Su ile protein shake' }, kcal: 130, protein: 25 },
];
