# Writes the legal pages (privacy, terms, imprint) into landing/. Fill ADDR and MAIL, then run:
#   python3 scripts/build-legal.py landing
import html, re, sys
OUT = sys.argv[1]
ADDR = 'Semih Sancar Caddesi 17, Girne Merkez, Girne, North Cyprus (KKTC)'
MAIL = '[E-MAIL]'
STAND = '19.10.2026'

def md(text):
    out = []
    blocks = []
    for block in text.strip().split('\n\n'):
        b = block.strip()
        if b.startswith('## '):
            head, _, rest = b.partition('\n')
            blocks.append(head)
            if rest.strip(): blocks.append(rest.strip())
        else:
            blocks.append(b)
    for b in blocks:
        if b.startswith('## '): out.append(f'<h2>{html.escape(b[3:])}</h2>'); continue
        if b.startswith('- '):
            lines = b.split('\n')
            items = [re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', html.escape(l[2:])) for l in lines if l.startswith('- ')]
            out.append('<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>')
            rest = [l for l in lines if not l.startswith('- ')]
            if rest: out.append('<p>' + html.escape(' '.join(rest)) + '</p>')
            continue
        out.append('<p>' + re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', html.escape(b)).replace('\n', '<br>') + '</p>')
    return '\n'.join(out)

def page(file, title, sections, single=False):
    nav = '' if single else '<nav>' + ''.join(f'<a href="#{k}">{k.upper()}</a>' for k, _, _ in sections) + '</nav>'
    body = ''.join(f'<section id="{k}" lang="{k}"><h1>{html.escape(h)}</h1>{md(t)}</section>' for k, h, t in sections)
    doc = f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · ODDO</title><link rel="icon" href="favicon.svg">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0a0a0a;--text:#f5f5f4;--muted:#a3a3a3;--border:#262626;--accent:#d4ff3a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 Inter,system-ui,sans-serif}}
main{{max-width:720px;margin:0 auto;padding:28px 16px 80px}}
header{{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}}
.logo{{font-family:Anton,Impact,sans-serif;font-size:26px;letter-spacing:1.5px;color:var(--text);text-decoration:none}}.logo span{{color:var(--accent)}}
nav a{{color:var(--muted);text-decoration:none;font-weight:800;font-size:13px;margin-left:14px}}nav a:hover{{color:var(--accent)}}
h1{{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:40px;line-height:1.1;text-transform:uppercase;margin:40px 0 8px}}
h2{{font-size:18px;margin:28px 0 6px}}p,li{{color:#d6d6d3}}a{{color:var(--accent)}}
section{{border-top:1px solid var(--border);padding-top:8px}}section:first-of-type{{border-top:0}}
footer{{color:var(--muted);font-size:13px;margin-top:48px}}
</style></head><body><main>
<header><a class="logo" href="/">ODD<span>O</span></a>{nav}</header>
{body}
<footer><a href="datenschutz.html">Datenschutz · Privacy · Gizlilik</a> · <a href="agb.html">AGB · Terms · Koşullar</a> · <a href="impressum.html">Impressum</a></footer>
</main></body></html>
'''
    open(f'{OUT}/{file}', 'w').write(doc)

PRIV_DE = f'''
Stand: {STAND}

## Verantwortlicher
Onur Ünal, {ADDR}, E-Mail: {MAIL}

## Kurz gesagt
ODDO ist ein Fitness-Coach. Wir verarbeiten nur, was die App dafür braucht, verkaufen keine Daten, zeigen keine Werbung und nutzen keine Tracking-Cookies. Fortschrittsfotos und deine GPS-Strecken bleiben auf deinem Gerät.

## Welche Daten wir verarbeiten
- **Konto:** eine zufällige Konto-ID, die beim Start automatisch entsteht, und auf Wunsch deine E-Mail-Adresse, um das Konto zu sichern.
- **Profil und Gesundheitsangaben:** Vorname, Ziel, Alter, Geschlecht, Größe, Gewicht, Bauchumfang, Trainingserfahrung, Trainings mit Sätzen und Gewichten, Ausdauer-Einheiten, Mahlzeiten mit Kalorien, Routinen und dein „Warum“. Diese Angaben sind Gesundheitsdaten. Wir verarbeiten sie nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a und Art. 6 Abs. 1 lit. a DSGVO), die du beim Erstellen deines Plans gibst.
- **Sicherung:** Damit du nichts verlierst, speichern wir eine Kopie deiner App-Daten (ohne Fotos) auf unserem Server.
- **Essensfotos und Beschreibungen:** Wenn du eine KI-Schätzung startest, schicken wir das Foto oder den Text an unseren KI-Dienstleister, um Kalorien und Nährwerte zu schätzen. Wir speichern das Foto nicht auf dem Server; ein kleines Vorschaubild bleibt auf deinem Gerät.
- **Fortschrittsfotos:** bleiben auf deinem Gerät.
- **Standort:** nur während du eine Strecke live aufzeichnest. Die Strecke bleibt auf deinem Gerät.
- **Community:** Wenn du Gruppen nutzt oder postest, sehen andere deinen Vornamen, deine Tagesserie, deinen heutigen Stand, deine Nachrichten, Beiträge und Kommentare: Gruppenmitglieder bei „Nur Gruppen“, alle angemeldeten Nutzer bei „Öffentlich“. Meldungen und Blockierungen speichern wir, um Missbrauch zu verhindern.
- **Trainer:** Wenn du dich mit dem Code eines Trainers verbindest, sieht dieser Trainer deinen Vornamen, deine Tagesserie und deine gesicherten App-Daten (Trainings, Mahlzeiten, Kalorien, Eiweiß, Gewicht, Aktivitäten). Er kann dir einen Trainingsplan schicken und mit dir schreiben. Du kannst die Verbindung jederzeit unter Einstellungen → Dein Trainer trennen; danach sieht er nichts mehr.
- **Partnerprogramm:** Wenn du mit dem Code eines Trainers, Studios oder Freundes startest, speichern wir, über wen du gekommen bist, damit der Partner eine Provision auf deine Zahlungen erhält. Der Partner sieht dabei nur deinen Vornamen und die Höhe seiner Provision. Partner, die Auszahlungen erhalten, hinterlegen dafür IBAN oder PayPal-Adresse; wir nutzen sie nur für die Überweisung. Eingereichte Clip-Links speichern wir mit den gezählten Views, um die Vergütung zu berechnen.
- **Studios:** Wenn du einem Studio mit dessen Code beitrittst, sieht das Studio deinen Vornamen, deine Tagesserie, deine Check-ins, deine Kursbuchungen und bis wann deine Mitgliedschaft gilt. Deine Trainings-, Ernährungs- und Gewichtsdaten sieht das Studio nicht. Du kannst das Studio jederzeit unter Einstellungen → Dein Studio verlassen.
- **Zahlungen:** laufen über Lemon Squeezy als Verkäufer (Merchant of Record). Wir erhalten nur, welches Paket aktiv ist, nie deine Kartendaten.
- **Missbrauchsschutz:** Für die Tageslimits der KI speichern wir pro Tag einen nicht rückrechenbaren Hashwert deiner Konto-ID oder IP-Adresse.
- **Warteliste auf der Website:** Name und E-Mail, wenn du dich einträgst, um dich zum Start zu informieren.

## Empfänger und Dienstleister
- Supabase (Server in Frankfurt, EU): Konten, Sicherung, Community
- Netlify (USA): Website, App-Auslieferung, Server-Funktionen, Warteliste
- Anthropic (USA): KI-Schätzungen und Wochentipps; Daten über die API werden laut Anbieter nicht zum Training verwendet
- CARTO (Spanien/USA): Kartenbilder beim Laufen und Radfahren; dabei werden nur deine IP-Adresse und der Kartenausschnitt übertragen, nicht deine Strecke
- Open Food Facts (Frankreich): Produktdaten, wenn du einen Barcode scannst; übertragen werden nur der Barcode und deine IP-Adresse
- Produkte, die du selbst einträgst (Barcode, Name, Marke, Nährwerte), sind für alle ODDO-Nutzer sichtbar. Dein Konto wird dazu gespeichert, aber niemandem angezeigt, damit nur du deinen Eintrag ändern kannst. Das Foto der Nährwerttabelle wird nur zum Auslesen an Anthropic geschickt und nicht gespeichert
- Resend (USA): E-Mail-Versand, etwa die Erinnerung vor dem Ende eines Gratis-Monats, wenn du eine E-Mail-Adresse hinterlegt hast
- Lemon Squeezy (USA): Bezahlung und Abos
- Apple und Google: wenn du die App aus ihren Stores lädst
Bei Übermittlungen in die USA stützen wir uns auf den EU-US Data Privacy Framework, soweit der Anbieter zertifiziert ist, sonst auf EU-Standardvertragsklauseln.

## Wie lange
Solange dein Konto besteht. In der App unter „Plan“ kannst du jederzeit „Konto und Daten löschen“ wählen; dann löschen wir Konto, Sicherung, Beiträge, Kommentare und Gruppen-Mitgliedschaften endgültig. Daten nur auf deinem Gerät löschst du mit „Neu starten“ oder durch Deinstallation.

## Deine Rechte
Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Widerruf deiner Einwilligung mit Wirkung für die Zukunft. Schreib an {MAIL}. Du kannst dich auch bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel in deinem EU-Wohnsitzland.

## Mindestalter
ODDO ist für Menschen ab 16 Jahren.

## Kein Ersatz für ärztlichen Rat
Kalorien- und Leistungsangaben sind Schätzungen. Bei Vorerkrankungen, Schwangerschaft oder Essstörungen sprich vorher mit einer Ärztin oder einem Arzt.
'''

PRIV_EN = f'''
Last updated: {STAND}

## Controller
Onur Ünal, {ADDR}, email: {MAIL}

## In short
ODDO is a fitness coach. We only process what the app needs for that, never sell data, show no ads and use no tracking cookies. Progress photos and your GPS routes stay on your device.

## What we process
- **Account:** a random account ID created automatically, and optionally your email address to save the account.
- **Profile and health details:** first name, goal, age, sex, height, weight, waist, training experience, workouts with sets and weights, cardio, meals with calories, routines and your "why". These are health data. We process them only with your explicit consent (Art. 9(2)(a) and Art. 6(1)(a) GDPR), which you give when creating your plan.
- **Backup:** a copy of your app data (without photos) on our server so you do not lose anything.
- **Meal photos and descriptions:** when you start an AI estimate, we send the photo or text to our AI provider to estimate calories and nutrients. We do not store the photo on the server; a small thumbnail stays on your device.
- **Progress photos:** stay on your device.
- **Location:** only while you record a route live. The route stays on your device.
- **Community:** if you use groups or post, others see your first name, streak, today's progress, messages, posts and comments: group members for "Groups only", all signed-in users for "Public". We keep reports and blocks to prevent abuse.
- **Trainers:** if you connect with a trainer's code, that trainer sees your first name, streak and backed-up app data (workouts, meals, calories, protein, weight, activities). They can send you a training plan and message you. You can disconnect any time under Settings → Your trainer; after that they see nothing.
- **Partner program:** if you start with a trainer's, gym's or friend's code, we store who brought you in so that partner earns a commission on your payments. The partner only sees your first name and the amount of their commission. Partners who receive payouts enter an IBAN or PayPal address for it; we use it only for the transfer. We store submitted clip links with the counted views to calculate the payment.
- **Studios:** if you join a studio with its code, the studio sees your first name, streak, check-ins, class bookings and until when your membership is valid. It does not see your workout, food or weight data. You can leave the studio any time under Settings → Your studio.
- **Payments:** handled by Lemon Squeezy as merchant of record. We only learn which plan is active, never your card details.
- **Abuse protection:** for the daily AI limits we keep a one-way hash of your account ID or IP address per day.
- **Website waitlist:** name and email if you sign up, to tell you about the launch.

## Recipients and providers
- Supabase (servers in Frankfurt, EU): accounts, backup, community
- Netlify (USA): website, app delivery, server functions, waitlist
- Anthropic (USA): AI estimates and weekly tips; per the provider, API data is not used for training
- CARTO (Spain/USA): map images for runs and rides; only your IP address and the map area are sent, not your route
- Open Food Facts (France): product data when you scan a barcode; only the barcode and your IP address are sent
- Products you add yourself (barcode, name, brand, nutrition values) are visible to everyone on ODDO. Your account is stored with them but never shown, so only you can change your entry. The photo of the nutrition table is sent to Anthropic only to read the values and is not stored
- Resend (USA): sending emails, such as the reminder before a free month ends, if you saved an email address
- Lemon Squeezy (USA): payments and subscriptions
- Apple and Google: if you install the app from their stores
For transfers to the USA we rely on the EU-US Data Privacy Framework where the provider is certified, otherwise on EU standard contractual clauses.

## How long
As long as your account exists. In the app under "Plan" you can choose "Delete account and data" at any time; we then permanently delete your account, backup, posts, comments and group memberships. Data only on your device is removed with "Start over" or by uninstalling.

## Your rights
Access, rectification, erasure, restriction, portability, objection and withdrawal of consent for the future. Write to {MAIL}. You can also complain to a data protection authority, for example in your EU country of residence.

## Minimum age
ODDO is for people aged 16 and over.

## Not medical advice
Calorie and performance figures are estimates. If you have a medical condition, are pregnant or have an eating disorder, talk to a doctor first.
'''

PRIV_TR = f'''
Güncelleme: {STAND}

## Sorumlu
Onur Ünal, {ADDR}, e-posta: {MAIL}

## Kısaca
ODDO bir fitness koçudur. Sadece uygulamanın bunun için ihtiyaç duyduğu verileri işleriz, veri satmayız, reklam göstermeyiz ve takip çerezi kullanmayız. İlerleme fotoğrafların ve GPS rotaların cihazında kalır.

## Hangi verileri işliyoruz
- **Hesap:** otomatik oluşturulan rastgele bir hesap kimliği ve isteğe bağlı olarak hesabını kaydetmek için e-posta adresin.
- **Profil ve sağlık bilgileri:** ad, hedef, yaş, cinsiyet, boy, kilo, bel ölçüsü, antrenman deneyimi, set ve ağırlıklarıyla antrenmanlar, kardiyo, kalorili öğünler, rutinler ve "neden"in. Bunlar sağlık verisidir. Bunları yalnızca planını oluştururken verdiğin açık rızayla işleriz (GDPR md. 9/2-a ve 6/1-a; Türkiye'de KVKK md. 6).
- **Yedek:** hiçbir şey kaybetmemen için uygulama verilerinin (fotoğraflar hariç) bir kopyası sunucumuzda.
- **Yemek fotoğrafları ve açıklamaları:** YZ tahmini başlattığında fotoğrafı veya metni kalori ve besin değerlerini tahmin etmesi için YZ sağlayıcımıza göndeririz. Fotoğrafı sunucuda saklamayız; küçük bir önizleme cihazında kalır.
- **İlerleme fotoğrafları:** cihazında kalır.
- **Konum:** sadece bir rotayı canlı kaydederken. Rota cihazında kalır.
- **Topluluk:** grupları kullanır veya paylaşım yaparsan, başkaları adını, serini, bugünkü durumunu, mesajlarını, paylaşımlarını ve yorumlarını görür: "Sadece gruplar" seçeneğinde grup üyeleri, "Herkese açık" seçeneğinde tüm giriş yapmış kullanıcılar. Kötüye kullanımı önlemek için bildirimleri ve engellemeleri saklarız.
- **Antrenör:** bir antrenörün koduyla bağlanırsan, o antrenör adını, serini ve yedeklenen uygulama verilerini (antrenmanlar, öğünler, kalori, protein, kilo, aktiviteler) görür. Sana antrenman planı gönderebilir ve seninle yazışabilir. Bağlantıyı istediğin zaman Ayarlar → Antrenörün bölümünden kesebilirsin; sonrasında hiçbir şey göremez.
- **Ortaklık programı:** bir antrenörün, salonun veya arkadaşının koduyla başlarsan, ödemelerinden komisyon alabilmesi için seni kimin getirdiğini kaydederiz. Ortak yalnızca adını ve komisyon tutarını görür. Ödeme alan ortaklar bunun için IBAN veya PayPal adresi girer; bunu yalnızca havale için kullanırız. Gönderilen video linklerini, ödemeyi hesaplamak için sayılan izlenmelerle birlikte saklarız.
- **Salonlar:** bir salona koduyla katılırsan, salon adını, serini, girişlerini, ders rezervasyonlarını ve üyeliğinin ne zamana kadar geçerli olduğunu görür. Antrenman, beslenme ve kilo verilerini göremez. Salondan istediğin zaman Ayarlar → Salonun bölümünden ayrılabilirsin.
- **Ödemeler:** satıcı olarak Lemon Squeezy üzerinden yapılır. Sadece hangi paketin aktif olduğunu öğreniriz, kart bilgilerini asla.
- **Kötüye kullanım koruması:** günlük YZ limitleri için hesap kimliğinin veya IP adresinin geri döndürülemez bir özetini gün bazında saklarız.
- **Web sitesi bekleme listesi:** kaydolursan, lansmanı haber vermek için ad ve e-posta.

## Alıcılar ve hizmet sağlayıcılar
- Supabase (sunucular Frankfurt, AB): hesaplar, yedek, topluluk
- Netlify (ABD): web sitesi, uygulama dağıtımı, sunucu fonksiyonları, bekleme listesi
- Anthropic (ABD): YZ tahminleri ve haftalık ipuçları; sağlayıcıya göre API verileri eğitim için kullanılmaz
- CARTO (İspanya/ABD): koşu ve bisiklette harita görüntüleri; yalnızca IP adresin ve harita bölgesi iletilir, rotan değil
- Open Food Facts (Fransa): barkod taradığında ürün bilgileri; yalnızca barkod ve IP adresin iletilir
- Kendin eklediğin ürünler (barkod, ad, marka, besin değerleri) tüm ODDO kullanıcılarına görünür. Hesabın bu kayıtla saklanır ama kimseye gösterilmez, böylece kaydını yalnızca sen değiştirebilirsin. Besin tablosunun fotoğrafı yalnızca değerleri okumak için Anthropic'e gönderilir ve saklanmaz
- Resend (ABD): e-posta gönderimi, örneğin e-posta adresi kaydettiysen ücretsiz ay bitmeden hatırlatma
- Lemon Squeezy (ABD): ödemeler ve abonelikler
- Apple ve Google: uygulamayı mağazalarından indirirsen
ABD'ye aktarımlarda, sağlayıcı sertifikalıysa AB-ABD Veri Gizliliği Çerçevesi'ne, değilse AB standart sözleşme maddelerine dayanırız.

## Ne kadar süre
Hesabın var olduğu sürece. Uygulamada "Plan" altında istediğin zaman "Hesabı ve verileri sil"i seçebilirsin; hesabını, yedeğini, paylaşımlarını, yorumlarını ve grup üyeliklerini kalıcı olarak sileriz. Sadece cihazındaki veriler "Yeniden başla" ile veya uygulamayı kaldırarak silinir.

## Hakların
Bilgi alma, düzeltme, silme, kısıtlama, veri taşınabilirliği, itiraz ve rızanı ileriye dönük geri alma. {MAIL} adresine yaz. Bir veri koruma otoritesine de şikâyette bulunabilirsin.

## Yaş sınırı
ODDO 16 yaş ve üzeri içindir.

## Tıbbi tavsiye değildir
Kalori ve performans değerleri tahmindir. Bir hastalığın varsa, hamileysen veya yeme bozukluğun varsa önce bir doktorla konuş.
'''

TERMS_DE = f'''
Stand: {STAND}

## Anbieter
Onur Ünal, {ADDR}, {MAIL}

## Leistung
ODDO ist eine App für Training, Ernährung und Gewohnheiten mit KI-Schätzungen und Community. Free ist kostenlos. Pro und Ultimate sind Abos mit zusätzlichen Funktionen, wie in der App beschrieben; Pro gibt es monatlich oder jährlich. Neue Nutzer bekommen einmalig 7 Tage Pro gratis, ohne Zahlungsdaten und ohne automatische Verlängerung. Funktionen, die als „bald“ markiert sind, sind noch nicht enthalten.

## Kauf und Kündigung
Abos verkauft und rechnet Lemon Squeezy als Verkäufer (Merchant of Record) ab; dabei gelten zusätzlich deren Bedingungen. Abos verlängern sich um ihren Zeitraum (Monat oder Jahr) und sind jederzeit zum Ende des Abrechnungszeitraums kündbar, über den Link in der Bestätigungs-Mail. Der Gründerpreis gilt, solange das Abo ohne Unterbrechung läuft. Belohnungen wie geschenkte Monate gibt es nicht als Geld.

## Widerrufsrecht
Verbraucher in der EU haben ein gesetzliches Widerrufsrecht von 14 Tagen. Wenn du ausdrücklich zustimmst, dass die digitale Leistung sofort beginnt, kann es vorzeitig erlöschen; Details nennt der Checkout von Lemon Squeezy.

## Gesundheit
ODDO ersetzt keine ärztliche Beratung. Kalorien, Verbrauch und Kraftvergleiche sind Schätzungen. Trainiere nur, wenn du gesund bist, und hör bei Schmerzen auf.

## Community-Regeln
Keine Beleidigungen, Belästigung, Hassrede, Nacktheit, Werbung oder fremde Inhalte ohne Erlaubnis. Wir dürfen Inhalte entfernen und Konten sperren, die dagegen verstoßen. Du kannst Beiträge melden und Personen blockieren.

## Haftung
Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit und für Schäden an Leben, Körper und Gesundheit, im Übrigen nur bei Verletzung wesentlicher Pflichten und begrenzt auf den vorhersehbaren Schaden. Zwingende Verbraucherrechte bleiben unberührt.

## Änderungen
Wir können diese Bedingungen anpassen und informieren dich vorher in der App. Bei Abos kannst du vor Inkrafttreten kündigen.
'''

TERMS_EN = f'''
Last updated: {STAND}

## Provider
Onur Ünal, {ADDR}, {MAIL}

## Service
ODDO is an app for training, nutrition and habits with AI estimates and a community. Free costs nothing. Pro and Ultimate are subscriptions with extra features as described in the app; Pro is available monthly or yearly. New users get 7 days of Pro once for free, without payment details and without automatic renewal. Features marked "coming soon" are not yet included.

## Purchase and cancellation
Subscriptions are sold and billed by Lemon Squeezy as merchant of record; their terms apply in addition. Subscriptions renew for their period (month or year) and can be cancelled at any time to the end of the billing period via the link in the confirmation email. The founder price applies as long as the subscription runs without interruption. Rewards such as free months are never paid out as money.

## Right of withdrawal
Consumers in the EU have a statutory 14-day right of withdrawal. If you expressly agree that the digital service starts immediately, it may end early; the Lemon Squeezy checkout gives details.

## Health
ODDO is not medical advice. Calories, burn and strength comparisons are estimates. Only train when you are healthy and stop if you feel pain.

## Community rules
No insults, harassment, hate speech, nudity, spam or other people's content without permission. We may remove content and suspend accounts that break these rules. You can report posts and block people.

## Liability
We are fully liable for intent, gross negligence and injury to life, body or health; otherwise only for breach of essential obligations and limited to foreseeable damage. Mandatory consumer rights remain unaffected.

## Changes
We may update these terms and will tell you in the app beforehand. Subscribers can cancel before changes take effect.
'''

TERMS_TR = f'''
Güncelleme: {STAND}

## Sağlayıcı
Onur Ünal, {ADDR}, {MAIL}

## Hizmet
ODDO; antrenman, beslenme ve alışkanlıklar için YZ tahminleri ve topluluk içeren bir uygulamadır. Free ücretsizdir. Pro ve Ultimate, uygulamada açıklanan ek özelliklere sahip aboneliklerdir; Pro aylık veya yıllık alınabilir. Yeni kullanıcılar bir kez 7 gün ücretsiz Pro alır; ödeme bilgisi gerekmez ve otomatik yenilenmez. "Yakında" olarak işaretlenen özellikler henüz dahil değildir.

## Satın alma ve iptal
Abonelikler satıcı olarak Lemon Squeezy tarafından satılır ve faturalanır; ayrıca onların koşulları geçerlidir. Abonelikler kendi dönemleri (ay veya yıl) kadar yenilenir ve onay e-postasındaki bağlantıyla istediğin zaman dönem sonuna kadar iptal edilebilir. Kurucu fiyatı abonelik kesintisiz devam ettiği sürece geçerlidir. Hediye aylar gibi ödüller para olarak ödenmez.

## Cayma hakkı
AB'deki tüketicilerin yasal 14 günlük cayma hakkı vardır. Dijital hizmetin hemen başlamasını açıkça kabul edersen bu hak erken sona erebilir; ayrıntılar Lemon Squeezy ödeme sayfasındadır.

## Sağlık
ODDO tıbbi tavsiye değildir. Kalori, harcama ve güç karşılaştırmaları tahmindir. Sadece sağlıklıysan antrenman yap ve ağrı hissedersen dur.

## Topluluk kuralları
Hakaret, taciz, nefret söylemi, çıplaklık, reklam veya izinsiz başkalarına ait içerik yok. Bu kuralları çiğneyen içerikleri kaldırabilir ve hesapları askıya alabiliriz. Paylaşımları bildirebilir ve kişileri engelleyebilirsin.

## Sorumluluk
Kasıt, ağır ihmal ve hayata, bedene veya sağlığa verilen zararlardan sınırsız; diğer durumlarda yalnızca temel yükümlülüklerin ihlalinde ve öngörülebilir zararla sınırlı olarak sorumluyuz. Zorunlu tüketici hakları saklıdır.

## Değişiklikler
Bu koşulları güncelleyebiliriz ve önceden uygulamada haber veririz. Aboneler değişiklikler yürürlüğe girmeden iptal edebilir.
'''

PARTNER_DE = f'''
Stand: {STAND}

## Parteien
Diese Vereinbarung gilt zwischen Onur Ünal, Betreiber von ODDO ({ADDR}), und dir („Partner“), sobald du im ODDO Business-Bereich einen Trainer- oder Studio-Code anlegst, unter „Verdienen“ deinen persönlichen Einladungscode nutzt oder einen Clip einreichst.

## Was du bekommst
- Personen, die mit deinem Code in ODDO starten, sind deine geworbenen Kunden. Es zählt der erste Code, mit dem jemand startet.
- Geworbene Kunden bekommen den ersten Monat ODDO Pro gratis.
- Danach erhältst du eine Provision auf jede bezahlte Abo-Zahlung deiner geworbenen Kunden, solange sie zahlen und du aktiv bist.
- Bemessungsgrundlage ist der Nettobetrag, den ODDO tatsächlich erhält: Zahlung abzüglich Steuern und der Gebühren von Lemon Squeezy, Apple oder Google.

## Provisionssätze
- Gründungspartner: die ersten 20 Partner erhalten 50 % für die ersten 6 Monate ab Anlage ihres Codes.
- Starter: 30 % bei 1 bis 9 zahlenden Kunden.
- Pro-Partner: 35 % bei 10 bis 49 zahlenden Kunden.
- Elite: 40 % ab 50 zahlenden Kunden.
- Der Satz richtet sich nach der Zahl deiner zahlenden Kunden zum Zeitpunkt der jeweiligen Zahlung.
- Freunde: Mit deinem persönlichen Einladungscode gelten dieselben Sätze ab 30 % (Gründungspartner-Plätze gibt es dafür nicht). Beim ersten Freund, der zahlt, bekommst du zusätzlich einen Monat ODDO Pro gratis. Für jeden der ersten 12 Freunde, die mit deinem Code starten, bekommst du eine Woche ODDO Pro gratis.
- Der Freundes-Code gilt nur für Personen, die noch über keinen Code gestartet sind und kein bezahltes Abo haben.
- Partner-Bonus: Wirbst du einen anderen Trainer oder ein Studio, erhältst du einmalig 50 €, sobald dort 10 Kunden zahlen.

## Clips
- Für eigene Videos über ODDO auf TikTok, Instagram oder YouTube zahlen wir pro 1.000 Views: 1,10 $, bei überwiegend türkischem Publikum 0,45 $. Ist die App in Benutzung zu sehen, gibt es 50 % mehr.
- Bezahlt wird ab 5.000 Views, höchstens 330 $ pro Clip und 1.100 $ pro Person und Monat. Für mehr schließen wir eine eigene Vereinbarung.
- Du reichst den Link in der App ein. Wir zählen die Views etwa 7 Tage nach dem Posten. Der Clip muss mindestens 30 Tage online bleiben, sonst wird der Betrag wieder abgezogen.
- Gekaufte Views, Bots, fremde oder kopierte Videos und irreführende Aussagen werden nicht bezahlt. Kennzeichne den Clip als Werbung, wenn das Recht deines Landes es verlangt.
- Wir dürfen eingereichte Clips mit Namensnennung auf ODDO-Kanälen teilen.

## Auszahlung
- Provisionen werden 30 Tage nach der Zahlung auszahlbar. Erstattete Zahlungen werden vorher wieder abgezogen.
- Wir zahlen einmal im Monat bis zum 15. aus, sobald mindestens 25 $ auszahlbar sind, per Überweisung oder PayPal an die Daten, die du in der App hinterlegst.
- Provisionen werden in US-Dollar berechnet, weil unsere Zahlungsanbieter in US-Dollar abrechnen.
- Du bist selbst für die Versteuerung deiner Provisionen verantwortlich.

## Regeln
- Keine Eigenwerbung: Käufe für dich selbst oder für eigene Zweitkonten zählen nicht.
- Kein Spam, keine falschen Versprechen, keine Werbung mit Rabatten, die es nicht gibt, keine bezahlte Suchmaschinenwerbung auf den Namen ODDO.
- Du darfst ODDO nicht als medizinische Behandlung oder als Ersatz für ärztlichen Rat bewerben.
- Bei Verstößen oder Betrug können wir offene Provisionen einbehalten und die Partnerschaft beenden.

## Laufzeit und Änderungen
- Du kannst jederzeit aufhören, indem du deinen Code im Business-Bereich deaktivierst oder uns schreibst.
- Als aktiv giltst du, solange dein Trainer-, Studio- oder Einladungscode besteht und du ODDO mindestens alle 90 Tage nutzt.
- Wir können die Sätze für die Zukunft ändern und kündigen das mindestens 30 Tage vorher in der App an. Bereits verdiente Provisionen bleiben unberührt.

## Kontakt
{MAIL}
'''

PARTNER_EN = f'''
Last updated: {STAND}

## Parties
This agreement is between Onur Ünal, operator of ODDO ({ADDR}), and you ("partner"), as soon as you create a trainer or gym code in the ODDO business area, use your personal invite code under "Earn" or submit a clip.

## What you get
- People who start ODDO with your code are your referred clients. The first code someone starts with counts.
- Referred clients get the first month of ODDO Pro free.
- After that you earn a commission on every paid subscription payment of your referred clients, as long as they pay and you are active.
- The basis is the net amount ODDO actually receives: the payment minus taxes and the fees of Lemon Squeezy, Apple or Google.

## Commission rates
- Founding partner: the first 20 partners get 50 % for the first 6 months after creating their code.
- Starter: 30 % with 1 to 9 paying clients.
- Pro partner: 35 % with 10 to 49 paying clients.
- Elite: 40 % with 50 or more paying clients.
- The rate depends on the number of your paying clients at the time of each payment.
- Friends: with your personal invite code the same rates apply from 30 % (there are no founding places for it). With the first friend who pays, you also get one month of ODDO Pro free. For each of the first 12 friends who start with your code, you get one week of ODDO Pro free.
- A friend code only works for people who have not started with a code yet and have no paid subscription.
- Partner bonus: if you bring in another trainer or gym, you get a one-time 50 € once 10 of their clients pay.

## Clips
- For your own videos about ODDO on TikTok, Instagram or YouTube we pay per 1,000 views: 1.10 $, or 0.45 $ for a mainly Turkish audience. If the app is shown in use, you get 50 % more.
- We pay from 5,000 views, at most 330 $ per clip and 1,100 $ per person and month. For more we make a separate agreement.
- You submit the link in the app. We count the views about 7 days after posting. The clip must stay online for at least 30 days, otherwise the amount is deducted again.
- Bought views, bots, other people's or copied videos and misleading claims are not paid. Mark the clip as an ad where the law of your country requires it.
- We may share submitted clips on ODDO channels, crediting you.

## Payouts
- Commissions become payable 30 days after the payment. Refunded payments are deducted before that.
- We pay out once a month by the 15th, once at least 25 $ is payable, by bank transfer or PayPal to the details you enter in the app.
- Commissions are calculated in US dollars because our payment providers settle in US dollars.
- You are responsible for any taxes on your commissions.

## Rules
- No self-referral: purchases for yourself or your own second accounts do not count.
- No spam, no false promises, no discounts that do not exist, no paid search ads on the name ODDO.
- You may not promote ODDO as medical treatment or as a replacement for medical advice.
- In case of violations or fraud we may withhold open commissions and end the partnership.

## Term and changes
- You can stop at any time by deactivating your code in the business area or by writing to us.
- You count as active while your trainer, gym or invite code exists and you use ODDO at least every 90 days.
- We may change the rates for the future and announce this in the app at least 30 days in advance. Commissions already earned are not affected.

## Contact
{MAIL}
'''

PARTNER_TR = f'''
Son güncelleme: {STAND}

## Taraflar
Bu sözleşme, ODDO işletmecisi Onur Ünal ({ADDR}) ile sen ("ortak") arasında, ODDO iş alanında bir antrenör veya salon kodu oluşturduğun, "Kazan" bölümünde kişisel davet kodunu kullandığın veya bir video gönderdiğin anda geçerlidir.

## Ne kazanırsın
- Kodunla ODDO'ya başlayan kişiler senin getirdiğin danışanlardır. Kişinin başladığı ilk kod geçerlidir.
- Getirdiğin danışanlar ilk ay ODDO Pro'yu ücretsiz alır.
- Sonrasında, ödedikleri ve sen aktif olduğun sürece, getirdiğin danışanların her abonelik ödemesinden komisyon alırsın.
- Hesaplama esası ODDO'nun gerçekten aldığı net tutardır: ödeme eksi vergiler ve Lemon Squeezy, Apple veya Google ücretleri.

## Komisyon oranları
- Kurucu ortak: ilk 20 ortak, kodunu oluşturduktan sonraki ilk 6 ay boyunca %50 alır.
- Başlangıç: 1-9 ödeyen danışanda %30.
- Pro ortak: 10-49 ödeyen danışanda %35.
- Elit: 50 ve üzeri ödeyen danışanda %40.
- Oran, her ödeme anındaki ödeyen danışan sayına göre belirlenir.
- Arkadaşlar: kişisel davet kodunla %30'dan başlayan aynı oranlar geçerlidir (bunun için kurucu ortak yeri yoktur). Ödeme yapan ilk arkadaşınla sana ek olarak 1 ay ücretsiz ODDO Pro verilir. Kodunla başlayan ilk 12 arkadaşın her biri için sana 1 hafta ücretsiz ODDO Pro verilir.
- Arkadaş kodu yalnızca henüz bir kodla başlamamış ve ücretli aboneliği olmayan kişiler için geçerlidir.
- Ortak bonusu: başka bir antrenör veya salon getirirsen, orada 10 danışan ödediğinde bir kerelik 50 € alırsın.

## Videolar
- TikTok, Instagram veya YouTube'da ODDO hakkındaki kendi videoların için 1.000 izlenme başına öderiz: 1,10 $, ağırlıklı olarak Türk izleyicide 0,45 $. Uygulama kullanılırken gösterilirse %50 daha fazla.
- 5.000 izlenmeden itibaren, video başına en fazla 330 $ ve kişi başına ayda en fazla 1.100 $ öderiz. Daha fazlası için ayrı bir anlaşma yaparız.
- Linki uygulamada gönderirsin. İzlenmeleri paylaşımdan yaklaşık 7 gün sonra sayarız. Video en az 30 gün yayında kalmalı, aksi halde tutar geri düşülür.
- Satın alınmış izlenmeler, botlar, başkasının veya kopyalanmış videolar ve yanıltıcı iddialar ödenmez. Ülkenin hukuku gerektiriyorsa videoyu reklam olarak işaretle.
- Gönderilen videoları adını belirterek ODDO kanallarında paylaşabiliriz.

## Ödeme
- Komisyonlar ödemeden 30 gün sonra ödenebilir olur. İade edilen ödemeler daha önce düşülür.
- En az 25 $ ödenebilir olduğunda ayda bir, ayın 15'ine kadar, uygulamada girdiğin bilgilere havale veya PayPal ile öderiz.
- Ödeme sağlayıcılarımız ABD doları ile çalıştığı için komisyonlar ABD doları ile hesaplanır.
- Komisyonlarının vergilendirilmesinden sen sorumlusun.

## Kurallar
- Kendine yönlendirme yok: kendin veya kendi ikinci hesapların için yapılan satın almalar sayılmaz.
- Spam, sahte vaat, var olmayan indirimler ve ODDO adına ücretli arama reklamı yok.
- ODDO'yu tıbbi tedavi veya doktor tavsiyesinin yerine geçen bir şey olarak tanıtamazsın.
- İhlal veya dolandırıcılık durumunda açık komisyonları tutabilir ve ortaklığı sonlandırabiliriz.

## Süre ve değişiklikler
- İş alanında kodunu devre dışı bırakarak veya bize yazarak istediğin zaman bırakabilirsin.
- Antrenör, salon veya davet kodun bulunduğu ve ODDO'yu en az 90 günde bir kullandığın sürece aktif sayılırsın.
- Oranları ileriye dönük değiştirebiliriz ve bunu en az 30 gün önce uygulamada duyururuz. Kazanılmış komisyonlar etkilenmez.

## İletişim
{MAIL}
'''

IMPRINT = f'''
## Angaben / Details / Bilgiler
Onur Ünal
{ADDR}

## Kontakt / Contact / İletişim
E-Mail: {MAIL}

## Verantwortlich für den Inhalt
Onur Ünal, Anschrift wie oben.

## Verbraucherstreitbeilegung
Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
'''

page('datenschutz.html', 'Datenschutz', [('de', 'Datenschutz', PRIV_DE), ('en', 'Privacy policy', PRIV_EN), ('tr', 'Gizlilik politikası', PRIV_TR)])
page('agb.html', 'AGB', [('de', 'Nutzungsbedingungen', TERMS_DE), ('en', 'Terms of use', TERMS_EN), ('tr', 'Kullanım koşulları', TERMS_TR)])
page('impressum.html', 'Impressum', [('de', 'Impressum', IMPRINT)], single=True)
page('partner.html', 'Partnervereinbarung', [('de', 'Partnervereinbarung', PARTNER_DE), ('en', 'Partner agreement', PARTNER_EN), ('tr', 'Ortaklık sözleşmesi', PARTNER_TR)])
