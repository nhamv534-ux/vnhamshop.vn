# VĂN NHÂM Blox Fruits Shop

Website mẫu full-stack chạy local bằng Node.js, giao diện responsive tông tím/đen.

## Có gì?
- Đăng ký/đăng nhập khách hàng; mật khẩu được băm bằng bcrypt.
- Danh mục sản phẩm, tìm kiếm, lọc, tồn kho.
- Tạo đơn hàng và trang xem đơn hàng của khách.
- Admin thêm/sửa/xóa sản phẩm; cập nhật trạng thái đơn hàng; xem thống kê.
- Hiển thị hướng dẫn chuyển khoản lấy từ biến môi trường.
- Lưu dữ liệu trong `data/store.json` để thử nghiệm.

## Chạy trên Windows
1. Cài Node.js LTS từ https://nodejs.org/
2. Giải nén ZIP, mở thư mục `van_nham_blox_fruits_shop`.
3. Sao chép `.env.example` thành `.env`; thay `SESSION_SECRET`, `ADMIN_PASSWORD` và thông tin ngân hàng bằng giá trị của bạn.
4. Mở Terminal/CMD tại thư mục đó và chạy:
   ```bash
   npm install
   npm start
   ```
5. Mở http://localhost:3000
6. Đăng nhập admin bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong `.env`. Đổi mật khẩu mẫu trước khi dùng.

## Lưu ý quan trọng trước khi đưa lên mạng
- Đây là starter để phát triển và chạy thử, chưa phải hệ thống thương mại production đã được kiểm thử bảo mật.
- Không nhập thông tin thẻ ngân hàng, OTP, mật khẩu Roblox hoặc thông tin đăng nhập tài khoản game vào ghi chú/biểu mẫu.
- Tính năng “nạp thẻ” hiện chỉ tạo đơn ở trạng thái chờ; chưa kết nối nhà cung cấp thẻ. Muốn nhận thẻ tự động, cần hợp đồng/API chính thức của nhà cung cấp và xác minh chữ ký callback phía server.
- Chuyển khoản cũng chưa tự động xác minh. Admin phải kiểm tra giao dịch trong ứng dụng ngân hàng của mình trước khi đổi trạng thái đơn.
- Dùng HTTPS, session store bền vững, CSRF/rate limiting, sao lưu dữ liệu, log kiểm toán và kiểm tra bảo mật trước khi public. Session mặc định của Express chỉ phù hợp chạy thử.
- Chỉ đăng bán tài khoản/sản phẩm bạn có quyền cung cấp; kiểm tra điều khoản hiện hành của Roblox và quy định tại nơi bạn hoạt động.
- Đây không phải trang chính thức của Roblox hoặc Blox Fruits. Không dùng logo/nhận diện chính thức theo cách gây hiểu nhầm.
