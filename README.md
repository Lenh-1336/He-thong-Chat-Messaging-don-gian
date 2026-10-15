# A Lênh Conversation Platform

## Chạy ứng dụng trong môi trường phát triển

Backend dùng Node.js và PostgreSQL. Cấu hình hiện tại kết nối database `chat_messaging_alenh`; sửa `backend/.env` để nhập host, user, mật khẩu database và mật khẩu admin ban đầu. File `.env` đã được loại khỏi Git.

```sql
CREATE DATABASE chat_messaging_alenh;
```

Trong `backend/.env`, đặt `PGPASSWORD` thành mật khẩu PostgreSQL thật và `INITIAL_ADMIN_PASSWORD` thành mật khẩu admin ít nhất 8 ký tự. Admin được tạo tự động khi database chưa có tài khoản. Nếu database đã có dữ liệu tài khoản trong `backend/data/store.json`, server sẽ nhập các tài khoản đó sang PostgreSQL một lần.

Sau đó mở hai terminal tại thư mục dự án:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Trong backend chạy `npm install` một lần. Lệnh `npm run dev` tự nạp biến môi trường từ `.env`; lúc khởi động server tự tạo bảng `accounts`. `GET /api/health` báo `database: connected` khi PostgreSQL hoạt động. Frontend Vite chuyển tiếp `/api` đến `http://localhost:4000`.

Đăng nhập bằng email và mật khẩu admin đã cấu hình. Người dùng có thể đăng ký trong giao diện; tài khoản và mật khẩu đã băm được lưu trong PostgreSQL. Phiên truy cập hiện tại dùng token trong bộ nhớ backend nên cần đăng nhập lại sau khi khởi động lại server.

Để bật chức năng **Quên mật khẩu** gửi OTP, cấu hình các biến SMTP trong `backend/.env` rồi khởi động lại backend:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-email-app-password
SMTP_FROM=your-sender@gmail.com
```

SMTP dùng TLS trên cổng 465. Với Gmail, `SMTP_PASS` cần là mật khẩu ứng dụng. OTP gồm 6 chữ số, hết hạn sau 10 phút và tối đa 5 lần nhập.

Người dùng mới có thể chọn **Đăng ký ngay** bên dưới form đăng nhập. Vai trò mặc định là `Người dùng`.

## API

- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/chats`
- `GET /api/chats/:id/messages`, `POST /api/chats/:id/messages`
- `PATCH /api/chats/:id`
- `GET /api/leads`, `POST /api/leads`
- `GET /api/scenarios`, `PUT /api/scenarios/:id`
- `GET /api/visitors`
- `POST /api/visitors/:id/chat`, `POST /api/visitors/:id/notes`
- `GET /api/stats`
- `POST /api/auth/register`, `PATCH /api/auth/profile`
- Admin: `/api/admin/users`, `/api/admin/chats`, `/api/admin/stats` và các endpoint tài khoản/tin nhắn tương ứng; chỉ vai trò `admin` được truy cập.
