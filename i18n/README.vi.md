[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Luyện điều dễ nhầm. Học cách phân biệt.*

Tám khóa tập trung vào âm và chữ dễ nhầm, dành cho iOS, Android và PWA. ClearPair là tên tạm; L & N là ứng dụng riêng.

![ClearPair](../docs/assets/eight-icons-v4.png)

Bảy ứng dụng ban đầu có bản thử nội bộ 1.0.0 (3) trên Apple và Google. Mã nguồn ứng viên (4) thêm [tiếng Nhật](../docs/JAPANESE-COURSE.md), phân tích WAV và [đánh giá trên thiết bị](../docs/ON-DEVICE-SCORING.md). Tiếng Nhật chưa được tải lên; chưa nộp xét duyệt chính thức. Điểm phát âm vẫn tắt cho đến khi mô hình cục bộ được kiểm định.

## Tám khóa chuyên biệt

| ClearPair | Tám khóa chuyên biệt |
| --- | --- |
| H & F | h/f trong tiếng Anh và Quan thoại |
| L & R | l/r và cụm phụ âm tiếng Anh |
| English | Nguyên âm, TH, hữu thanh và âm cuối |
| Mandarin | Thanh mẫu, vận mẫu, bật hơi và thanh điệu |
| Cantonese | Jyutping, thanh điệu, nguyên âm, bật hơi và âm cuối tiếng Quảng Đông |
| Korean | Ghi nhớ Hangul và các âm dễ nhầm |
| Arabic Letters | Hình dạng, dấu chấm, nối chữ và âm |
| Japanese | Kana dễ nhầm, thứ tự nét, furigana theo ngữ cảnh và nhịp mora |

## Bản xem trước phát triển

Đã có câu đố nghe, phát/lặp cặp từ, hướng dẫn, ôn giãn cách, dạng sóng, lịch sử và xuất bản ghi. Mã nguồn hỗ trợ 11 ngôn ngữ giao diện của hồ sơ, độc lập với ngôn ngữ luyện. Ghi chú ngữ âm chuyên sâu vẫn dùng Anh/Trung; phần chưa dịch được ghi rõ là tiếng Anh.

Biểu tượng V4 dẫn dắt bảng màu: nền sáng, màu mềm, thẻ gọn và nút ghi/phát giữ vị trí ổn định. Biểu tượng cũ được giữ lại. Hoạt ảnh tùy chọn và trò chơi năm câu trao sao cục bộ cho nghe/nhớ, không phải điểm phát âm chưa được kiểm chứng. Xem [phạm vi ngôn ngữ](../docs/LOCALIZATION.md) và [ghi chú Quảng Đông](../docs/CANTONESE.md). [Bản beta 0.2.0 (2) của bảy ứng dụng](../docs/BETA-0.2.0.md) có V4, 11 ngôn ngữ giao diện và ứng dụng Quảng Đông.

**Điểm phát âm đang tắt cho đến khi tích hợp mô hình và kiểm chứng với người thật.** Chất lượng tín hiệu không phải độ chính xác phát âm. Capacitor kết hợp React với ghi âm và giọng nói gốc Swift/Java, không phải giao diện SwiftUI/Compose riêng.

## Biên dịch và kiểm thử

Cần Node 22+, npm, Android SDK/JDK 21 và Mac có Xcode cho iOS. Biên dịch tuần tự. Kiểm thử trình duyệt xác nhận hành vi, không xác nhận độ chính xác phát âm.

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

ID: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`; ID gói dùng `art.lazying.clearpair.<id>`. PWA được tạo trong `dist/site`. APK gỡ lỗi không phải bản Play. Khả năng tham gia thử nghiệm cần xác nhận đã kiểm chứng từ cửa hàng.

## Âm thanh và riêng tư

Bản ghi mic ở trên thiết bị; ứng dụng không tải chúng lên. Xuất mở bảng chia sẻ gốc hoặc tải xuống web; bạn chọn nơi nhận. Lưu trữ có thể thất bại; xóa dữ liệu hoặc gỡ ứng dụng có thể làm mất bản ghi. Hãy xuất bản quan trọng.

Không đóng gói các đoạn giọng tổng hợp dùng tạm cho nghiên cứu: quyền phân phối lại và kiểm chứng phát âm bởi người nghe chưa được xác nhận. Bản thử nghiệm dùng giọng đã cài trên thiết bị. Chất lượng, ngôn ngữ và khả năng ngoại tuyến khác nhau; nhà cung cấp có thể dùng mạng.

## Nghiên cứu và giới hạn

Xem [kế hoạch](../docs/BUILD-PLAN.md), [thiết kế chấm điểm](../docs/SCORING-DESIGN.md) và [nguồn giáo trình](../docs/CURRICULUM-SOURCES.md). Mỗi tương phản cần bằng chứng được hiệu chỉnh; không bịa điểm cho im lặng, nội dung không rõ hoặc âm nhập làm một trong một số giọng địa phương.

Bản PWA xem trước đã có tại [language-agent.lazying.art](https://language-agent.lazying.art/). Đây là công cụ giáo dục, không phải trị liệu hay chẩn đoán. Chưa xác lập quyền nhãn hiệu hoặc giấy phép nguồn mở.

## Ủng hộ

Ủng hộ phát triển qua [GitHub Sponsors](https://github.com/sponsors/lachlanchen) hoặc các nút bên dưới.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Trích dẫn

GitHub đọc [CITATION.cff](../CITATION.cff) để hiển thị “Cite this repository”. Trích dẫn như sau:

```bibtex
@software{chen_clearpair_2026,
  author = {Chen, Lachlan},
  title = {ClearPair: Practise What You Mix Up},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/ClearPair}
}
```
