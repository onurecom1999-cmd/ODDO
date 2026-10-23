import type { L3 } from '../i18n/lang';

type Ex = { name: L3; cue?: L3; timed?: boolean };

// Every exercise the rule-based plan can pick, by id. Plans store ids; names render in the person's language.
export const EX: Record<string, Ex> = {
  push_wall: { name: { de: 'Wand-Liegestütze', en: 'Wall push-ups', tr: 'Duvar şınavı' }, cue: { de: 'Je weiter weg die Füße, desto schwerer.', en: 'The further your feet, the harder it gets.', tr: 'Ayaklar ne kadar uzaksa o kadar zor.' } },
  push_knee: { name: { de: 'Knie-Liegestütze', en: 'Knee push-ups', tr: 'Diz üstü şınav' }, cue: { de: 'Knie bis Kopf in einer Linie, tief runter.', en: 'Knees to head in one line, go deep.', tr: 'Dizden başa düz bir çizgi, derine in.' } },
  push: { name: { de: 'Liegestütze', en: 'Push-ups', tr: 'Şınav' }, cue: { de: 'Körper wie ein Brett, Brust bis knapp über den Boden.', en: 'Body like a plank, chest just above the floor.', tr: 'Vücut tahta gibi, göğüs yere yakın.' } },
  push_diamond: { name: { de: 'Diamond-Liegestütze', en: 'Diamond push-ups', tr: 'Elmas şınav' }, cue: { de: 'Hände unter der Brust, Ellbogen eng.', en: 'Hands under your chest, elbows tight.', tr: 'Eller göğsün altında, dirsekler yakın.' } },
  dips_bench: { name: { de: 'Bank-Dips, Füße am Boden', en: 'Bench dips, feet on floor', tr: 'Bank dips, ayaklar yerde' }, cue: { de: 'Schultern weg von den Ohren.', en: 'Shoulders away from your ears.', tr: 'Omuzlar kulaklardan uzak.' } },
  dips_bench_up: { name: { de: 'Bank-Dips, Füße erhöht', en: 'Bench dips, feet raised', tr: 'Bank dips, ayaklar yüksekte' }, cue: { de: 'Langsam runter, kräftig hoch.', en: 'Slow down, strong up.', tr: 'Yavaş in, güçlü kalk.' } },
  dips: { name: { de: 'Dips am Barren', en: 'Parallel bar dips', tr: 'Paralel bar dips' }, cue: { de: 'Leicht nach vorn lehnen, bis 90 Grad.', en: 'Lean slightly forward, down to 90 degrees.', tr: 'Hafif öne eğil, 90 dereceye kadar.' } },
  dips_slow: { name: { de: 'Dips am Barren, 3 s ablassen', en: 'Dips, 3 s lowering', tr: 'Dips, 3 sn inerek' }, cue: { de: 'Drei Sekunden runter zählen.', en: 'Count three seconds on the way down.', tr: 'İnerken üçe kadar say.' } },
  pike_hold: { name: { de: 'Pike-Halten im Stand', en: 'Standing pike hold', tr: 'Ayakta pike tutuş' }, timed: true, cue: { de: 'Hüfte hoch, Arme gestreckt.', en: 'Hips high, arms straight.', tr: 'Kalça yukarı, kollar düz.' } },
  pike: { name: { de: 'Pike-Liegestütze', en: 'Pike push-ups', tr: 'Pike şınav' }, cue: { de: 'Kopf zwischen die Hände senken.', en: 'Lower your head between your hands.', tr: 'Başını ellerin arasına indir.' } },
  pike_up: { name: { de: 'Pike-Liegestütze, Füße erhöht', en: 'Pike push-ups, feet raised', tr: 'Pike şınav, ayaklar yüksekte' }, cue: { de: 'Füße auf Stuhl oder Bank.', en: 'Feet on a chair or bench.', tr: 'Ayaklar sandalye ya da bankta.' } },
  handstand_wall: { name: { de: 'Handstand-Halten an der Wand', en: 'Wall handstand hold', tr: 'Duvarda amuda kalkma' }, timed: true, cue: { de: 'Bauch fest, Blick zwischen die Hände.', en: 'Brace your core, look between your hands.', tr: 'Karın sıkı, ellerin arasına bak.' } },
  row_table: { name: { de: 'Tisch-Rudern (Australian Rows)', en: 'Table rows (Australian rows)', tr: 'Masa altı çekiş (Australian row)' }, cue: { de: 'Unter einen stabilen Tisch, Brust zur Kante ziehen.', en: 'Under a sturdy table, pull your chest to the edge.', tr: 'Sağlam bir masanın altında, göğsü kenara çek.' } },
  pull_neg: { name: { de: 'Negative Klimmzüge, 5 s ablassen', en: 'Negative pull-ups, 5 s lowering', tr: 'Negatif barfiks, 5 sn inerek' }, cue: { de: 'Mit Sprung nach oben, dann langsam runter.', en: 'Jump up, then lower slowly.', tr: 'Zıplayarak çık, sonra yavaşça in.' } },
  pullup: { name: { de: 'Klimmzüge', en: 'Pull-ups', tr: 'Barfiks' }, cue: { de: 'Aus dem ganzen Hang, Kinn über die Stange.', en: 'From a dead hang, chin over the bar.', tr: 'Tam asılıdan başla, çene barın üstüne.' } },
  pullup_pause: { name: { de: 'Klimmzüge mit Pause oben', en: 'Pull-ups with a pause on top', tr: 'Üstte duraklamalı barfiks' }, cue: { de: 'Oben eine Sekunde halten.', en: 'Hold one second at the top.', tr: 'Üstte bir saniye bekle.' } },
  row_towel: { name: { de: 'Rudern mit Handtuch an der Tür', en: 'Towel door rows', tr: 'Kapıda havluyla çekiş' }, cue: { de: 'Tür gut schließen, Ellbogen nach hinten.', en: 'Close the door firmly, elbows back.', tr: 'Kapıyı iyi kapat, dirsekler geriye.' } },
  row_aus_up: { name: { de: 'Australian Rows, Füße erhöht', en: 'Australian rows, feet raised', tr: 'Australian row, ayaklar yüksekte' }, cue: { de: 'Körper gerade, Brust zur Stange.', en: 'Body straight, chest to the bar.', tr: 'Vücut düz, göğüs bara.' } },
  chinup: { name: { de: 'Chin-ups (Untergriff)', en: 'Chin-ups', tr: 'Ters tutuş barfiks' }, cue: { de: 'Handflächen zu dir, Brust zur Stange.', en: 'Palms facing you, chest to the bar.', tr: 'Avuçlar sana dönük, göğüs bara.' } },
  chinup_slow: { name: { de: 'Chin-ups, 3 s ablassen', en: 'Chin-ups, 3 s lowering', tr: 'Ters barfiks, 3 sn inerek' }, cue: { de: 'Langsam ablassen, nicht fallen lassen.', en: 'Lower slowly, never drop.', tr: 'Yavaş in, kendini bırakma.' } },
  squat_chair: { name: { de: 'Kniebeugen auf einen Stuhl', en: 'Box squats to a chair', tr: 'Sandalyeye squat' }, cue: { de: 'Kurz absetzen, aus den Fersen hochdrücken.', en: 'Touch down briefly, drive up through your heels.', tr: 'Kısa otur, topuklardan it.' } },
  squat: { name: { de: 'Kniebeugen', en: 'Squats', tr: 'Squat' }, cue: { de: 'Gewicht auf den Fersen, Knie folgen den Zehen.', en: 'Weight on your heels, knees follow your toes.', tr: 'Ağırlık topuklarda, dizler parmak yönünde.' } },
  split_squat: { name: { de: 'Bulgarian Split Squats', en: 'Bulgarian split squats', tr: 'Bulgar split squat' }, cue: { de: 'Hinterer Fuß auf der Bank, vorderes Knie stabil.', en: 'Rear foot on a bench, front knee stable.', tr: 'Arka ayak bankta, ön diz sabit.' } },
  pistol: { name: { de: 'Pistol Squats an der Stange', en: 'Assisted pistol squats', tr: 'Destekli pistol squat' }, cue: { de: 'An der Stange festhalten, kontrolliert runter.', en: 'Hold the bar, lower with control.', tr: 'Bara tutun, kontrollü in.' } },
  glute_bridge: { name: { de: 'Hüftheben', en: 'Glute bridges', tr: 'Kalça köprüsü' }, cue: { de: 'Oben den Po zwei Sekunden fest anspannen.', en: 'Squeeze your glutes for two seconds on top.', tr: 'Üstte kalçayı iki saniye sık.' } },
  glute_bridge_single: { name: { de: 'Einbeiniges Hüftheben', en: 'Single-leg glute bridges', tr: 'Tek bacak kalça köprüsü' }, cue: { de: 'Becken bleibt gerade.', en: 'Keep your hips level.', tr: 'Kalça düz kalsın.' } },
  nordic_neg: { name: { de: 'Nordic Curls, nur ablassen', en: 'Nordic curls, lowering only', tr: 'Nordic curl, sadece iniş' }, cue: { de: 'Füße fixieren, so langsam wie möglich runter.', en: 'Anchor your feet, lower as slowly as you can.', tr: 'Ayakları sabitle, olabildiğince yavaş in.' } },
  nordic: { name: { de: 'Nordic Curls', en: 'Nordic curls', tr: 'Nordic curl' }, cue: { de: 'Mit den Händen abfangen, mit den Beinen hochziehen.', en: 'Catch with your hands, pull up with your legs.', tr: 'Ellerle yakala, bacaklarla geri çek.' } },
  plank: { name: { de: 'Plank', en: 'Plank', tr: 'Plank' }, timed: true, cue: { de: 'Bauch und Po fest, ruhig atmen.', en: 'Brace abs and glutes, breathe calmly.', tr: 'Karın ve kalça sıkı, sakin nefes.' } },
  hollow: { name: { de: 'Hollow Hold', en: 'Hollow hold', tr: 'Hollow hold' }, timed: true, cue: { de: 'Unterer Rücken bleibt am Boden.', en: 'Lower back stays on the floor.', tr: 'Bel yerde kalsın.' } },
  knee_raise: { name: { de: 'Hängendes Knieheben', en: 'Hanging knee raises', tr: 'Asılı diz çekme' }, cue: { de: 'Nicht schwingen, Knie zur Brust.', en: 'No swinging, knees to chest.', tr: 'Sallanma, dizler göğse.' } },
  leg_raise: { name: { de: 'Hängendes Beinheben', en: 'Hanging leg raises', tr: 'Asılı bacak kaldırma' }, cue: { de: 'Beine gestreckt, langsam senken.', en: 'Legs straight, lower slowly.', tr: 'Bacaklar düz, yavaşça indir.' } },
  backpack_row: { name: { de: 'Rudern mit Rucksack', en: 'Backpack rows', tr: 'Sırt çantasıyla row' }, cue: { de: 'Rucksack mit Büchern füllen, Rücken gerade.', en: 'Fill a backpack with books, back straight.', tr: 'Çantayı kitapla doldur, sırt düz.' } },
  superman: { name: { de: 'Superman', en: 'Superman', tr: 'Superman' }, cue: { de: 'Arme und Beine gleichzeitig heben, kurz halten.', en: 'Lift arms and legs together, hold briefly.', tr: 'Kol ve bacakları birlikte kaldır, kısa tut.' } },
  reverse_lunge: { name: { de: 'Ausfallschritte rückwärts', en: 'Reverse lunges', tr: 'Geriye hamle' }, cue: { de: 'Großer Schritt zurück, Oberkörper aufrecht.', en: 'Big step back, torso upright.', tr: 'Büyük adım geri, gövde dik.' } },
  calf_raise: { name: { de: 'Wadenheben', en: 'Calf raises', tr: 'Baldır kaldırma' }, cue: { de: 'Oben kurz halten.', en: 'Pause briefly at the top.', tr: 'Üstte kısa bekle.' } },
  calf_raise_single: { name: { de: 'Wadenheben einbeinig', en: 'Single-leg calf raises', tr: 'Tek bacak baldır kaldırma' }, cue: { de: 'An der Wand abstützen, volle Bewegung.', en: 'Support on a wall, full range.', tr: 'Duvara dayan, tam hareket.' } },
  crunch: { name: { de: 'Crunches', en: 'Crunches', tr: 'Mekik' }, cue: { de: 'Nicht am Nacken ziehen.', en: "Don't pull on your neck.", tr: 'Boynundan çekme.' } },
  dead_hang: { name: { de: 'Aktives Hängen an der Stange', en: 'Active hang', tr: 'Aktif asılma' }, timed: true, cue: { de: 'Schultern aktiv nach unten ziehen.', en: 'Pull your shoulders down actively.', tr: 'Omuzları aktif aşağı çek.' } },
  chest_press: { name: { de: 'Brustpresse', en: 'Chest press machine', tr: 'Göğüs press makinesi' }, cue: { de: 'Schulterblätter zusammen, kontrolliert zurück.', en: 'Shoulder blades together, controlled return.', tr: 'Kürek kemikleri birlikte, kontrollü dönüş.' } },
  incline_db: { name: { de: 'Schrägbankdrücken mit Kurzhanteln', en: 'Incline dumbbell press', tr: 'Eğimli dambıl press' }, cue: { de: 'Hanteln über der Brust zusammenführen.', en: 'Bring the dumbbells together over your chest.', tr: 'Dambılları göğsün üstünde birleştir.' } },
  shoulder_machine: { name: { de: 'Schulterdrücken an der Maschine', en: 'Shoulder press machine', tr: 'Omuz press makinesi' }, cue: { de: 'Rücken an die Lehne, nicht ins Hohlkreuz.', en: 'Back against the pad, no arching.', tr: 'Sırt dayalı, beli çukurlaştırma.' } },
  lat_pulldown: { name: { de: 'Latzug', en: 'Lat pulldown', tr: 'Lat pulldown' }, cue: { de: 'Ellbogen Richtung Hüfte ziehen.', en: 'Drive your elbows toward your hips.', tr: 'Dirsekleri kalçaya doğru çek.' } },
  cable_row: { name: { de: 'Rudern am Kabel', en: 'Seated cable row', tr: 'Kablo row' }, cue: { de: 'Brust raus, Schulterblätter nach hinten.', en: 'Chest up, shoulder blades back.', tr: 'Göğüs dışarı, kürekler geriye.' } },
  face_pull: { name: { de: 'Face Pulls', en: 'Face pulls', tr: 'Face pull' }, cue: { de: 'Seil zur Stirn, Ellbogen hoch.', en: 'Rope to your forehead, elbows high.', tr: 'İpi alına çek, dirsekler yukarı.' } },
  leg_press: { name: { de: 'Beinpresse', en: 'Leg press', tr: 'Leg press' }, cue: { de: 'Knie nicht ganz durchstrecken.', en: "Don't lock out your knees.", tr: 'Dizleri tam kilitleme.' } },
  goblet_squat: { name: { de: 'Goblet Squat', en: 'Goblet squat', tr: 'Goblet squat' }, cue: { de: 'Hantel vor der Brust, Oberkörper aufrecht.', en: 'Dumbbell at your chest, torso upright.', tr: 'Dambıl göğüste, gövde dik.' } },
  rdl: { name: { de: 'Rumänisches Kreuzheben', en: 'Romanian deadlift', tr: 'Romanian deadlift' }, cue: { de: 'Rücken gerade, Bewegung aus der Hüfte.', en: 'Back straight, move from the hips.', tr: 'Sırt düz, hareket kalçadan.' } },
  leg_curl: { name: { de: 'Beinbeuger-Maschine', en: 'Leg curl machine', tr: 'Leg curl makinesi' }, cue: { de: 'Langsam zurück, nicht fallen lassen.', en: 'Return slowly, never drop.', tr: 'Yavaş geri bırak.' } },
  cable_crunch: { name: { de: 'Crunch am Kabel', en: 'Cable crunch', tr: 'Kablo mekik' }, cue: { de: 'Rund machen, Hüfte bleibt still.', en: 'Curl down, hips stay still.', tr: 'Kıvrıl, kalça sabit.' } },
  bench: { name: { de: 'Bankdrücken', en: 'Bench press', tr: 'Bench press' }, cue: { de: 'Schulterblätter zusammen, Stange zur unteren Brust.', en: 'Shoulder blades pinched, bar to your lower chest.', tr: 'Kürekler sıkı, bar göğsün altına.' } },
  ohp: { name: { de: 'Schulterdrücken mit Langhantel', en: 'Overhead press', tr: 'Overhead press' }, cue: { de: 'Po und Bauch fest, Stange gerade nach oben.', en: 'Glutes and abs tight, bar straight up.', tr: 'Kalça ve karın sıkı, bar dümdüz yukarı.' } },
  back_squat: { name: { de: 'Kniebeugen mit Langhantel', en: 'Barbell back squat', tr: 'Barbell squat' }, cue: { de: 'Brust raus, mindestens bis die Oberschenkel waagerecht sind.', en: 'Chest up, at least to parallel.', tr: 'Göğüs dik, en az paralele kadar.' } },
  deadlift: { name: { de: 'Kreuzheben', en: 'Deadlift', tr: 'Deadlift' }, cue: { de: 'Stange nah am Körper, Rücken bleibt gerade.', en: 'Bar close to your body, back stays straight.', tr: 'Bar vücuda yakın, sırt düz.' } },
  finisher: { name: { de: 'Intervall-Finisher: 6 × 30 s schnell, 30 s Pause', en: 'Interval finisher: 6 × 30 s fast, 30 s rest', tr: 'Interval bitiriş: 6 × 30 sn hızlı, 30 sn ara' }, timed: true },
  mobility5: { name: { de: '5 Minuten Mobility für Hüfte und Schultern', en: '5 minutes of hip and shoulder mobility', tr: 'Kalça ve omuz için 5 dakika mobilite' }, timed: true },
};

export const LADDER: Record<string, string[]> = {
  push: ['push_wall', 'push_knee', 'push', 'push_diamond'],
  dips: ['dips_bench', 'dips_bench_up', 'dips', 'dips_slow'],
  pike: ['pike_hold', 'pike', 'pike_up', 'handstand_wall'],
  pull: ['row_table', 'pull_neg', 'pullup', 'pullup_pause'],
  row: ['row_towel', 'row_aus_up', 'chinup', 'chinup_slow'],
  legs: ['squat_chair', 'squat', 'split_squat', 'pistol'],
  legs2: ['glute_bridge', 'glute_bridge_single', 'nordic_neg', 'nordic'],
  core: ['plank', 'hollow', 'knee_raise', 'leg_raise'],
};

// The next harder step of a bodyweight progression, or '' at the top.
export function nextStep(id: string) {
  for (const list of Object.values(LADDER)) { const i = list.indexOf(id); if (i >= 0 && i < list.length - 1) return list[i + 1]; }
  return '';
}

export function isTimed(id: string) { return !!EX[id]?.timed; }
