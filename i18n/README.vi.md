[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# ClearPair by LazyingArt

[![11 UI languages](https://img.shields.io/badge/UI-11_languages-456BA4?style=for-the-badge)](../docs/LOCALIZATION.md) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

*Luyện điều dễ nhầm. Học cách phân biệt.*

Tám khóa tập trung vào âm và chữ dễ nhầm, dành cho iOS, Android và PWA. ClearPair là tên tạm; L & N là ứng dụng riêng.

![ClearPair](../docs/assets/eight-icons-v4.png)

[Hồ sơ phát hành mới nhất](../docs/RELEASE-20261004.md) xác nhận cả tám ứng dụng 1.0.0 có trên TestFlight và thử nghiệm nội bộ Google Play: H & F **15**, L & R **11**, tiếng Anh **11**, Quan thoại **10**, Quảng Đông **11**, tiếng Hàn **10**, tiếng Ả Rập **10** và tiếng Nhật **10**. Cập nhật mà không gỡ ứng dụng để giữ Lịch sử.

Đã gửi đúng tám bản dựng này để xét duyệt chính thức. Trạng thái xác minh ngày 4 tháng 10 năm 2026: Apple **Waiting for Review**; Google **Changes in review**, với toàn bộ **173 quốc gia và vùng hỗ trợ ứng dụng trả phí** được chọn. Giữ nguyên giá và phát hành tự động sau khi duyệt. Gửi xét duyệt không đồng nghĩa với được duyệt hoặc đã công khai.

[Bản cập nhật phản hồi chung](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md) đưa bản chép lời ngoại tuyến thực tế trong ứng dụng native, bằng chứng âm học riêng cho từng cặp và điều khiển gọn, ổn định sang các khóa khác. Kiểm tra kỹ thuật âm thanh đã lưu không chứng nhận độ chính xác trên người thật. [Bản mở rộng bảng âm và đối chiếu thanh điệu](../docs/SOUND-COVERAGE-RESEARCH.md) là công việc phát triển riêng, chưa có trong các bản đã gửi hoặc PWA hiện tại.


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

Chạm Ghi âm, nói rồi ngừng một chút hoặc chạm Dừng và chấm điểm. Khi nhận dạng được, kết quả giữ đúng từ đã nghe và tách nhận dạng từ khỏi bằng chứng âm thanh đo được. Nút ghi âm nằm giữa, cố định phía trên kết quả và không có bộ đếm thời gian. Điểm là chỉ số luyện tập trên máy, không phải phần trăm chính xác đã hiệu chuẩn. Cần giọng ngoại tuyến của ngôn ngữ luyện tập; mô hình nhận dạng từ tích hợp chỉ có trong ứng dụng native. Xem [ghi chú thuật toán](../docs/PAIR-FEEDBACK-MIGRATION-20261003.md). Capacitor kết hợp React với ghi âm và phát tiếng native Swift/Java, không phải giao diện SwiftUI/Compose riêng.

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

ID: `handf`, `landr`, `english`, `chinese`, `korean`, `arabic`, `cantonese`, `japanese`; ID gói dùng `art.lazying.clearpair.<id>`. PWA được tạo trong `dist/site`. APK gỡ lỗi không phải bản Play. Khả năng tham gia thử nghiệm cần xác nhận đã kiểm chứng từ cửa hàng.

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
