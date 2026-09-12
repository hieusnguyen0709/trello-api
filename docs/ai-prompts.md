# AI Prompts — trello-api

Các khung prompt dùng lại cho 3 việc chính: debug, review, viết module mới.
Luôn dán kèm `ai-context.md` (hoặc phần liên quan) ở đầu chat trước khi dùng các khung này.

---

## 1. Debug lỗi

```
Tầng: [route / validation / controller / service / model]
Entity: [board / card / column / label / user / invitation]

Lỗi gặp phải:
[mô tả lỗi, message, stack trace nếu có]

Code liên quan:
[dán hàm/đoạn code]

Yêu cầu:
- Chỉ ra nguyên nhân, giải thích ngắn gọn tại sao lỗi xảy ra.
- CHƯA sửa code. Đợi tôi xác nhận nguyên nhân đúng trước khi đề xuất fix.
```

Lý do tách bước "chưa sửa": tránh trường hợp AI đoán sai nguyên nhân nhưng vẫn đưa code sửa nhìn có vẻ hợp lý, dễ khiến bạn merge nhầm.

---

## 2. Review code

```
Tầng: [route / validation / controller / service / model]
Entity: [board / card / column / label / user / invitation]

Code cần review:
[dán code]

Review theo các tiêu chí sau, liệt kê vấn đề (không viết lại code):
1. Đúng logic nghiệp vụ, có edge case nào bị bỏ sót không.
2. Có vi phạm convention trong ai-context.md không (export style, xử lý lỗi qua ApiError, ObjectId convert, INVALID_UPDATE_FIELDS...).
3. Vấn đề hiệu năng nếu có (query MongoDB không tối ưu, N+1, thiếu index cần lưu ý...).
4. Bảo mật (thiếu check quyền, thiếu validate input...).
```

---

## 3. Viết module / chức năng nhỏ

```
Chức năng cần viết: [mô tả]
Entity liên quan: [board / card / column / label / user / invitation]
Tầng cần viết: [validation / controller / service / model / cả chuỗi]

Input: [tham số, req.body/req.params nếu có]
Output mong muốn: [dữ liệu trả về]

Ràng buộc:
- Theo đúng convention trong ai-context.md (export dạng object, dùng ApiError, alias ~/, ObjectId convert...).
- Nếu cần thêm field mới vào schema, chỉ rõ thay đổi ở model nào.
- Không thêm thư viện ngoài package.json hiện tại.

Code hiện có liên quan (nếu có, để AI không viết trùng hoặc sai layer):
[dán các hàm liên quan trong cùng entity, ví dụ model + service hiện tại]
```

---

## Mẹo dùng chung
- Luôn ghi rõ **tầng** và **entity** — đây là 2 thông tin AI không tự đoán được nếu bạn chỉ dán 1 hàm lẻ.
- Với bug liên quan đến MongoDB aggregate/query phức tạp, nên dán thêm cả model gốc (không chỉ đoạn lỗi), vì các hàm trong model hay gọi chéo nhau (VD: `boardModel` import `columnModel`, `cardModel`, `userModel`, `labelModel`).
- Nếu chức năng mới cần đụng đến cả 4 tầng (route → validation → controller → service → model), nên yêu cầu AI viết từng tầng một, review từng phần, thay vì để AI viết hết 1 lần rồi khó review.
