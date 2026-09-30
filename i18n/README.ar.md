[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

*تدرّب على ما تخلط بينه. تعلّم الفرق.*

ستة تطبيقات تركّز على الأصوات والحروف سهلة الالتباس، على iOS وAndroid وPWA. ClearPair اسم عمل مؤقت؛ وL & N تطبيق مستقل.

## ستة تطبيقات متخصصة

| ClearPair | ستة تطبيقات متخصصة |
| --- | --- |
| H & F | h/f في الإنجليزية والماندرين |
| L & R | l/r والتجمعات الساكنة في الإنجليزية |
| English | حركات الإنجليزية وTH والجهر والنهايات |
| Mandarin | بدايات المقاطع ونهاياتها والنفَس والنغمات |
| Korean | تذكّر الهانغول والأصوات المتشابهة |
| Arabic Letters | الأشكال والنقاط والوصلات والأصوات |

## نسخة تطوير تجريبية

تتضمن التطبيقات اختبارات الاستماع وتشغيل الأزواج وتكرارها وأدلة التعلم والمراجعة المتباعدة والموجات الصوتية وسجل التسجيلات وتصديرها. لغة الواجهة، الإنجليزية أو الصينية المبسطة، مستقلة عن لغة التدريب.

**درجات النطق معطّلة إلى حين دمج النماذج والتحقق البشري.** جودة الإشارة لا تعني صحة النطق. يجمع Capacitor واجهة React مع التسجيل والكلام الأصليين عبر Swift/Java؛ وليست هذه واجهات SwiftUI/Compose منفصلة.

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

معرّفات التطبيقات الستة: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`؛ ومعرّفات الحزم `art.lazying.clearpair.<id>`. ملفات PWA في `dist/site`. ملفات APK للتصحيح ليست إصدارات Play. لا تُؤكد إتاحة الاختبار إلا بإيصال موثّق من المتجر.

## الصوت والخصوصية

تبقى تسجيلات الميكروفون على الجهاز ولا يرفعها التطبيق. يفتح التصدير نافذة المشاركة الأصلية أو تنزيلًا في الويب، وأنت تختار الوجهة. قد يفشل التخزين؛ وقد يؤدي مسح البيانات أو إزالة التطبيق إلى حذف التسجيلات، لذا صدّر المهم منها.

المراجع المضمّنة كلام اصطناعي لنصوص دروس أصلية، ولا تزال تحتاج إلى مراجعة بشرية لجودة النطق. عند غياب مرجع، قد تستخدم أصوات الجهاز خدمات الشبكة.

## البحث والحدود

راجع [خطة البناء](../docs/BUILD-PLAN.md) و[تصميم التقييم](../docs/SCORING-DESIGN.md) و[مصادر المنهج](../docs/CURRICULUM-SOURCES.md). يحتاج كل تباين إلى أدلة مُعايرة؛ ولا يجوز اختلاق درجات للصمت أو المحتوى المجهول أو الفروق المندمجة في بعض اللهجات.

الموقع المخطط هو [language-agent.lazying.art](https://language-agent.lazying.art/)، ولم يُتحقق من نشره بعد. النسخة تعليمية وليست علاجًا أو تشخيصًا. لم تُحسم حقوق العلامة التجارية أو رخصة المصدر المفتوح.

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
  version = {0.1.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
