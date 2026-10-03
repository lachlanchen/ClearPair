[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*تدرّب على ما تخلط بينه. تعلّم الفرق.*

ثمانية مسارات تركّز على الأصوات والحروف سهلة الالتباس، على iOS وAndroid وPWA. ClearPair اسم عمل مؤقت؛ وL & N تطبيق مستقل.

![ClearPair](../docs/assets/eight-icons-v4.png)

يتعرّف [تحديث التقييم الخاص بـ H & F فقط](../docs/HANDF-NATIVE-SCORING-20261003.md) على الصوت الإنجليزي والصيني المندريني المحفوظ باستخدام معالجة أصلية على iOS، مع بديل مضمّن يعمل دون اتصال بدل الاعتماد على فك الترميز في WebView. تبقى هوية الكلمة منفصلة عن تفاصيل الصوت المقاسة، وتُحفظ أسباب تعذّر التقييم مع تسجيلات السجل. لم تتغير الدورات الأخرى ولا المراجعات الرسمية الحالية. التحقق من المصدر لا يعني توفر الإصدار في المتجر أو اعتماد دقته على أصوات البشر.

تم التحقق من توفر [H & F 1.0.0 (13)](../docs/BETA-HANDF-1.0.0-13.md) في TestFlight والاختبار الداخلي على Google Play. حدّث التطبيق دون إزالته للحفاظ على السجل. هذا إصدار اختباري، وليس إصدارًا عامًا جديدًا في المتاجر.

تتوفر التطبيقات الثمانية المستقلة، بما فيها [اليابانية](../docs/JAPANESE-COURSE.md)، في [الاختبار الداخلي 1.0.0 (9) مع روابط الاختبار](../docs/BETA-1.0.0-9.md) على TestFlight وGoogle Play. لا تزال مراجعات iOS الرسمية الثماني تستخدم البناء 8 وتنتظر المراجعة، مع الإبقاء على الإصدار التلقائي بعد الموافقة؛ لم يكتمل تقديم إصدار الإنتاج إلى Google بعد. تم التحقق من [الحزم الموقعة وحالة المتاجر](../store/artifacts/internal-beta-1.0.0-9.json). تحديث الاختبار الداخلي لا يعني الموافقة أو الإتاحة العامة. لم تتغير PWA المنشورة.

## ثمانية مسارات متخصصة

| ClearPair | ثمانية مسارات متخصصة |
| --- | --- |
| H & F | h/f في الإنجليزية والماندرين |
| L & R | l/r والتجمعات الساكنة في الإنجليزية |
| English | حركات الإنجليزية وTH والجهر والنهايات |
| Mandarin | بدايات المقاطع ونهاياتها والنفَس والنغمات |
| Cantonese | تدريب الكانتونية: Jyutping والنغمات والحركات وبدايات المقاطع ونهاياتها |
| Korean | تذكّر الهانغول والأصوات المتشابهة |
| Arabic Letters | الأشكال والنقاط والوصلات والأصوات |
| Japanese | الكانا المتشابهة، ترتيب الخطوط، فوريغانا وإيقاع المورا |

## نسخة تطوير تجريبية

نُفّذت اختبارات الاستماع وتشغيل الأزواج وتكرارها وأدلة التعلم والمراجعة المتباعدة والموجات وسجل التسجيل والتصدير. يدعم المصدر لغات واجهة الملف الشخصي الإحدى عشرة، مستقلة عن لغة التدريب. الملاحظات الصوتية المتخصصة بالإنجليزية والصينية؛ ويُشار بوضوح إلى الملاحظات غير المترجمة بأنها إنجليزية.

توجّه أيقونات V4 ألوان التطبيق: خلفيات فاتحة وألوان انسيابية وبطاقات مرتّبة وتحكم ثابت في التسجيل والتشغيل. احتُفظ بإصدارات الأيقونات السابقة. تمنح الرسوم الاختيارية وألعاب الخمسة أسئلة نجوماً محلية للاستماع والتذكّر، لا لتقييم نطق غير مُعتمد. راجع [نطاق الترجمة](../docs/LOCALIZATION.md) و[ملاحظات الكانتونية](../docs/CANTONESE.md). تشمل [النسخة التجريبية 0.2.0 (2) للتطبيقات السبعة](../docs/BETA-0.2.0.md) أيقونات V4 ولغات الواجهة الإحدى عشرة والكانتونية.

**يحسّن البناء 9 درجة المطابقة التلقائية في التطبيق الأصلي.** اضغط التسجيل، وتكلم، ثم توقف قليلاً أو اضغط إيقاف وتقييم. يحتفظ التسجيل القصير الهادئ ببدايات ونهايات الحروف الساكنة الضعيفة؛ ويعطي التحليل صوت البداية أو الحركة أو النهاية الملتبس وزناً أكبر من الأصوات المشتركة. يعرض H & F الصوت والحركة/الكلمة والتوقيت؛ وتعرض الدورات الأخرى مطابقة الكلمة والفرق ومدة الكلام. تبقى أزرار التسجيل فوق النتائج. الدرجات مؤشرات تشابه محلية وليست نسباً مُعايرة لصحة النطق. يلزم صوت مثبت يعمل بلا إنترنت؛ يظل تقييم الفونيمات المُعاير وتقييم PWA معطّلين. راجع [ملاحظات الخوارزمية](../docs/SCORING-UPDATE-20261002.md). يجمع Capacitor واجهة React مع التسجيل والكلام الأصليين عبر Swift/Java؛ وليست هذه واجهات SwiftUI/Compose منفصلة.

## البناء والاختبار

يلزم Node 22+ وnpm وAndroid SDK/JDK 21، وجهاز Mac مع Xcode لنظام iOS. تُبنى التطبيقات بالتتابع. تختبر اختبارات المتصفح السلوك، لا دقة النطق.

```sh
npm ci --legacy-peer-deps
npm run dev
npm test
npm run build
npm run test:e2e
npm run native:sync -- handf android
npm run native:sync -- handf ios
node tools/native-family.mjs --android-build
```

معرّفات التطبيقات الثمانية: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`, `japanese`؛ ومعرّفات الحزم `art.lazying.clearpair.<id>`. ملفات PWA في `dist/site`. ملفات APK للتصحيح ليست إصدارات Play. لا تُؤكد إتاحة الاختبار إلا بإيصال موثّق من المتجر.

## الصوت والخصوصية

تبقى تسجيلات الميكروفون على الجهاز ولا يرفعها التطبيق. يفتح التصدير نافذة المشاركة الأصلية أو تنزيلًا في الويب، وأنت تختار الوجهة. قد يفشل التخزين؛ وقد يؤدي مسح البيانات أو إزالة التطبيق إلى حذف التسجيلات، لذا صدّر المهم منها.

لا تُضمّن مقاطع البحث الاصطناعية المؤقتة، إذ لم يُتحقق من إذن إعادة توزيعها أو جودة نطقها بشريًا. تستخدم نسخ الاختبار أصوات الجهاز المثبّتة. تختلف الجودة وتوافر اللغات والعمل دون اتصال، وقد يستخدم موفّر الصوت خدمات الشبكة.

## البحث والحدود

راجع [خطة البناء](../docs/BUILD-PLAN.md) و[تصميم التقييم](../docs/SCORING-DESIGN.md) و[مصادر المنهج](../docs/CURRICULUM-SOURCES.md). يحتاج كل تباين إلى أدلة مُعايرة؛ ولا يجوز اختلاق درجات للصمت أو المحتوى المجهول أو الفروق المندمجة في بعض اللهجات.

نسخة PWA التجريبية متاحة على [language-agent.lazying.art](https://language-agent.lazying.art/). النسخة تعليمية وليست علاجًا أو تشخيصًا. لم تُحسم حقوق العلامة التجارية أو رخصة المصدر المفتوح.

## الدعم

ادعم التطوير عبر [GitHub Sponsors](https://github.com/sponsors/lachlanchen) أو الأزرار أدناه.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## الاستشهاد

يقرأ GitHub ملف [CITATION.cff](../CITATION.cff) لعرض «Cite this repository». استخدم المرجع التالي:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
