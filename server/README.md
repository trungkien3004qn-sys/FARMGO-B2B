# FARMGO B2B Enterprise — Backend API Server

Hệ thống Backend chuẩn doanh nghiệp viết bằng **NestJS + Prisma ORM + TypeScript**, phục vụ toàn bộ các nghiệp vụ trọng tâm của nền tảng **FARMGO B2B**:
- **Auth & RBAC**: Phân quyền 4 vai trò (`BUYER`, `SUPPLIER`, `ADMIN`, `DRIVER`) với JWT Guard.
- **Products Catalog**: Quản lý nông sản, giá True-Cost và tồn kho sẵn sàng bán.
- **Orders & Idempotency**: Đặt đơn hàng kèm mã chống đặt trùng (`requestKey`), trừ tồn kho nguyên tử (`$transaction`).
- **Escrow & Double-entry Ledger**: Ký quỹ tiền thanh toán (HOLD), giải ngân trừ 3% phí sàn (SETTLEMENT), duyệt bồi thường hàng dập nát (REFUND), và rút tiền về ngân hàng (WITHDRAWAL).
- **Logistics & Milk-run**: Chốt ca gom đơn 22h, sinh mã vạch/QR sọt hàng (`CRATE-xxx`), phân công tài xế và quét mã giao hàng.
- **Farmgo Green**: Kinh tế tuần hoàn rác hữu cơ, cân thực tế, tích Điểm Xanh (2.000đ/kg) và đổi voucher giảm giá giao hàng.

---

## 🚀 Hướng dẫn khởi chạy nhanh

### 1. Cài đặt thư viện & Database
```bash
cd "D:\Project cá nhân\B2B-main\B2B\server"

# Cài đặt thư viện (nếu chưa cài)
npm install

# Đồng bộ mô hình dữ liệu vào SQLite cục bộ (dev.db)
npm run prisma:migrate

# Nạp dữ liệu mẫu ban đầu (6 tài khoản mẫu, 8 nông sản chất lượng cao, 1 đơn hàng ký quỹ)
npm run prisma:seed
```

### 2. Khởi động Backend Server
```bash
npm run start:dev
```
* **Server URL:** `http://localhost:3000`
* **Swagger OpenAPI Documentation:** `http://localhost:3000/api/docs`

---

## 👥 Danh sách Tài khoản Kiểm thử (Mật khẩu mặc định: `123456`)

| Vai trò | Email | Tên tài khoản | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **🏢 ADMIN** | `admin@farmgo.vn` | Ban Điều Hành Kho Hub HQ | Chốt ca gom đơn 22h, gán tài xế, duyệt giải ngân Escrow, duyệt khiếu nại |
| **🚚 DRIVER** | `driver@farmgo.vn` | Tài xế Nguyễn Văn A | Xem chuyến xe được giao, quét mã QR/Barcode sọt hàng bàn giao cho quán |
| **🌾 SUPPLIER** | `supplier1@farmgo.vn` | Nhà vườn Chú Sáu (Đà Lạt) | Đăng bán nông sản, xem tiền trong sổ cái ký quỹ, gửi yêu cầu rút tiền |
| **🌾 SUPPLIER** | `supplier2@farmgo.vn` | HTX Miền Tây (Tiền Giang) | Quản lý nông sản, xác nhận xe thu gom rác hữu cơ nhập xưởng |
| **🛒 BUYER** | `buyer1@farmgo.vn` | The Bean Coffee & Juice | Xem catalog, đặt đơn checkout với Escrow, gửi yêu cầu thu gom bã cà phê |
| **🛒 BUYER** | `buyer2@farmgo.vn` | Nước Ép Fresh Garden | Đặt hàng, đổi Điểm Xanh lấy voucher vận chuyển |

---

## 📚 Danh sách các Endpoint API chính

### 1. Xác thực (`/api/auth`)
* `POST /api/auth/register`: Đăng ký tài khoản mới
* `POST /api/auth/login`: Đăng nhập lấy JWT Access Token
* `GET /api/auth/profile`: Lấy thông tin tài khoản hiện tại (Cần Bearer Token)

### 2. Nông sản (`/api/products`)
* `GET /api/products`: Lấy danh sách nông sản (hỗ trợ lọc theo `category`)
* `GET /api/products/:id`: Xem chi tiết nông sản
* `POST /api/products`: Nhà vườn đăng bán sản phẩm mới (`SUPPLIER`, `ADMIN`)

### 3. Đơn hàng (`/api/orders`)
* `POST /api/orders/checkout`: Quán F&B đặt đơn (Kèm `requestKey` chống đặt lặp, tự động trừ tồn kho và tạo Escrow)
* `GET /api/orders`: Lấy danh sách đơn hàng theo vai trò người đăng nhập
* `GET /api/orders/:id`: Chi tiết đơn hàng kèm danh sách sọt và phân bổ ký quỹ

### 4. Tài chính & Ký quỹ (`/api/escrow`)
* `POST /api/escrow/settle`: Admin giải ngân tiền bán cho nhà vườn (tự động cắt 3% phí sàn)
* `POST /api/escrow/claims`: Quán gửi khiếu nại nông sản dập nát kèm số kg và ảnh
* `POST /api/escrow/claims/:id/review`: Admin duyệt hoàn tiền (Tự động ghi sổ cái REFUND)
* `POST /api/escrow/withdrawals`: Nhà vườn tạo lệnh rút tiền về ngân hàng
* `GET /api/escrow/finance`: Báo cáo dòng tiền, tổng giữ (HELD), tổng giải ngân (SETTLED) và hoa hồng sàn

### 5. Điều phối Vận chuyển (`/api/logistics`)
* `POST /api/logistics/aggregate-22h`: Chốt ca gom đơn lúc 22h thành chuyến xe Milk-run (Sinh mã sọt tem)
* `POST /api/logistics/shipments/:id/assign-driver`: Gán tài xế nhận chuyến
* `POST /api/logistics/scan-crate`: Tài xế quét mã QR/Barcode sọt cập nhật giao hàng
* `GET /api/logistics/shipments`: Lấy danh sách chuyến xe và lộ trình các điểm dừng

### 6. Kinh tế tuần hoàn Farmgo Green (`/api/green`)
* `POST /api/green/pickups`: Quán đăng ký thu gom rác hữu cơ
* `POST /api/green/pickups/:id/confirm`: HTX xác nhận yêu cầu
* `POST /api/green/pickups/:id/dispatch`: HTX điều xe gom
* `POST /api/green/pickups/:id/complete`: Cân thực tế tại quán, nhập OTP/QR và tích Điểm Xanh (2.000đ/kg)
* `POST /api/green/pickups/:id/receive`: HTX xác nhận nhập rác vào xưởng làm phân hữu cơ
* `POST /api/green/vouchers/redeem`: Quán dùng Điểm Xanh đổi Voucher giảm giá vận chuyển
* `GET /api/green/my-summary`: Xem số dư Điểm Xanh và lịch sử của quán
* `GET /api/green/all-pickups`: Danh sách toàn bộ yêu cầu cho HTX quản lý
