# AI Context — trello-api

Dán file này vào đầu mỗi cuộc chat mới trước khi hỏi debug/fix/review/viết module.

## Stack
- Node.js >= 18, Express 4
- Database: MongoDB (driver `mongodb` gốc, KHÔNG dùng Mongoose)
- Validate: Joi
- Auth: JWT (`jsonwebtoken`), đọc từ cookie qua `authenticationMiddleware`
- Build: Babel (dùng import/export ESM syntax, alias `~/` trỏ tới `src/`)
- Test: Jest (`tests:unit`, `tests:integration`), có `mongodb-memory-server` cho integration test
- Khác: Joi, http-status-codes, multer (upload), cloudinary, brevo (email), socket.io

## Kiến trúc (bắt buộc tuân theo, không tự đổi tầng)
Luồng 1 request đi qua đúng thứ tự:

```
routes/v1/xxxRoute.js
  → middlewares (authenticationMiddleware, authorizationMiddleware nếu có)
  → validations/xxxValidation.js   (Joi validate req.body/req.params, gọi next() hoặc next(ApiError))
  → controllers/xxxController.js   (chỉ lấy dữ liệu từ req, gọi service, trả res.status().json())
  → services/xxxService.js         (business logic, gọi model, KHÔNG động vào req/res)
  → models/xxxModel.js             (thao tác MongoDB collection trực tiếp qua GET_DB())
```

Quy tắc theo tầng:
- **Route**: chỉ khai báo path + middleware chain, không chứa logic.
- **Validation**: mỗi hàm nhận `(req, res, next)`, dùng `Joi.object({...}).validateAsync(...)`, lỗi thì `next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))`, thành công thì `next()`. Không trả response trực tiếp ở đây.
- **Controller**: luôn bọc `try/catch`, catch thì `next(error)` (không tự xử lý lỗi ở đây, không viết logic nghiệp vụ). Lấy `userId` từ `req.jwtDecoded._id` khi cần user hiện tại.
- **Service**: chứa toàn bộ business logic, orchestrate nhiều model nếu cần. Ném lỗi bằng `throw new ApiError(...)` hoặc `throw new Error(...)`.
- **Model**: định nghĩa `XXX_COLLECTION_NAME`, `XXX_COLLECTION_SCHEMA` (Joi schema), và các hàm CRUD thao tác trực tiếp MongoDB qua `GET_DB().collection(...)`. Luôn có `INVALID_UPDATE_FIELDS` để chặn field không được sửa khi update.

## Convention bắt buộc
- **Module export**: mỗi file export 1 object đặt tên theo file, gom các hàm lại. Ví dụ cuối `boardController.js`:
  ```js
  export const boardController = { createNew, getDetails, update, ... }
  ```
  Không dùng `export default` cho controller/service/model/validation.
- **Import alias**: dùng `~/` thay vì đường dẫn tương đối dài, ví dụ `import { boardService } from '~/services/boardService'`.
- **Xử lý lỗi**: dùng class `ApiError extends Error` (có `statusCode`) nằm ở `~/utils/ApiError.js`. Lỗi luôn được đẩy qua `next(error)` để `errorHandlingMiddleware` xử lý tập trung — KHÔNG tự viết `res.status(...).json({error...})` rải rác trong controller/service.
- **Response thành công**: controller trả thẳng `res.status(StatusCodes.XXX).json(data)`, không bọc thêm envelope kiểu `{ success: true, data: ... }`.
- **ObjectId**: luôn convert string id sang `new ObjectId(id)` trước khi query MongoDB. Validate format id bằng `OBJECT_ID_RULE` / `OBJECT_ID_RULE_MESSAGE` từ `~/utils/validators`.
- **Update field bảo vệ**: mỗi model có mảng `INVALID_UPDATE_FIELDS` (ít nhất gồm `_id`, `createdAt`) để xóa khỏi `updateData` trước khi `$set`.
- **Soft delete**: các collection chính dùng field `_destroy: boolean` thay vì xóa cứng khi có thể (board dùng cách này ở một số hàm; cân nhắc theo từng entity, không mặc định áp cho mọi thứ nếu chưa có tiền lệ).
- **HTTP status code**: luôn dùng enum từ `http-status-codes` (`StatusCodes.XXX`), không hardcode số.
- **Style code**: 4 spaces indent (một số file cũ dùng 2 spaces — nếu sửa file đó thì giữ nguyên style file, không trộn lẫn). Có ESLint (`.eslintrc.cjs`) — code mới phải pass `yarn lint`.
- **Comment**: codebase hiện tại có comment tiếng Việt giải thích business logic phức tạp (đặc biệt trong model, đoạn aggregate). Giữ phong cách này khi thêm logic tương tự.

## Cấu trúc thư mục (src/)
```
config/         # cors, mongodb connection, environment (đọc .env)
controllers/    # xxxController.js
middlewares/    # authenticationMiddleware, authorizationMiddleware, errorHandlingMiddleware, multerUploadMiddleware
models/         # xxxModel.js — Joi schema + MongoDB queries
providers/      # BrevoProvider (email), CloudinaryProvider (upload ảnh), JwtProvider
routes/v1/      # xxxRoute.js — API hiện tại đang dùng
routes/v2/      # đang để trống/khởi tạo, có thể là API version tiếp theo
services/       # xxxService.js — business logic
sockets/        # inviteUserToBoardSocket.js — logic socket.io
utils/          # ApiError, algorithms (paging...), constants, formatters, sorts, validators
validations/    # xxxValidation.js — Joi validate middleware
app.js          # khởi tạo express app, mount middleware + routes
server.js       # entry point, start server
```
Các entity chính: `board`, `column`, `card`, `label`, `user`, `invitation`. Quan hệ: 1 board có nhiều column (`columnOrderIds`), 1 column có nhiều card, board còn có `ownerIds`/`memberIds`/`labelIds`.

## Không tự ý làm (trừ khi tôi yêu cầu rõ)
- Không đổi từ MongoDB driver gốc sang Mongoose hoặc ORM khác.
- Không thêm envelope response mới (`{success, data}`, `{code, result}`...).
- Không tạo cách xử lý lỗi mới song song với `ApiError` + `errorHandlingMiddleware`.
- Không đổi cấu trúc thư mục hoặc tách thêm tầng mới (VD: thêm `repositories/`) nếu không được yêu cầu.
- Không tự thêm thư viện ngoài package.json hiện có mà không hỏi trước.

## Khi tôi dán code để hỏi
Tôi sẽ luôn nói rõ đoạn code thuộc tầng nào (route/validation/controller/service/model) và entity nào (board/card/column/...). Nếu tôi không nói, hãy hỏi lại 1 câu trước khi giả định.
