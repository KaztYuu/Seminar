# Change Log — Database Alignment

**Project:** FoodTourVinhKhanh  
**Scope:** `FoodTourVinhKhanh/Backend/config/db/db.sql`  
**Purpose:** Ghi lại các thay đổi đã được cập nhật trực tiếp trong file `db.sql` để đồng bộ schema và seed với nghiệp vụ hiện tại của project.

---

# 1. Tổng quan

Các thay đổi được áp dụng theo nguyên tắc:

* Minimal change
* Không dùng migration
* Chỉ chỉnh trực tiếp `db.sql`
* Không refactor kiến trúc hiện tại
* Không mở rộng phạm vi sang module không liên quan

---

# 2. Subscription Architecture

## Trạng thái hiện tại

Hệ thống chỉ còn subscription cho **Vendor**.

Luồng quan hệ được giữ nguyên:

```text
vendor_subscriptions
→ payment_id
→ payments.package_id
→ subscription_packages
```

## Thay đổi đã áp dụng

* Xóa hoàn toàn bảng `tourist_subscriptions`
* Giữ nguyên bảng `vendor_subscriptions`
* Không thêm `package_id` vào `vendor_subscriptions`
* Giữ `payments.package_id` là điểm nối tới `subscription_packages`

---

# 3. Subscription Packages

## Thay đổi schema

Trong bảng `subscription_packages`:

* Xóa cột `target_role`
* Giữ package chỉ dành cho Vendor
* Thêm và giữ:

```sql
poi_create_limit INT DEFAULT 1
is_default BOOLEAN DEFAULT FALSE
is_protected BOOLEAN DEFAULT FALSE
```

## Comment quota chuẩn

```sql
-- FEATURE 2
-- Số POI tối đa Vendor được tạo trong 1 ngày
```

---

# 4. Quota Logic

Ý nghĩa hiện tại của `poi_create_limit`:

```text
Số POI tối đa Vendor được tạo trong 1 ngày
```

Không còn dùng tên cũ:

* `daily_poi_limit`
* `daily_poi_create_limit`

---

# 5. POI Status

Trong bảng `pois` đã giữ:

```sql
status ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'pending'
```

Seed POI đang hoạt động đã được đồng bộ:

```text
is_Active = 1  → status = 'approved'
```

Đồng thời vẫn giữ nguyên:

* `is_Active`
* `is_Deleted`

để đảm bảo backward compatibility.

---

# 6. Seed Data

## Users

Seed user đã được rút gọn còn 3 tài khoản:

* `admin@test.com`
* `vendor1@test.com`
* `vendor2@test.com`

## Subscription Packages

Chỉ còn package cho Vendor:

* `FREE - Vendor`
* `Basic Vendor`
* `Pro Vendor`

Đã xóa hoàn toàn:

* `FREE - Tourist`

## Default / Protected

FREE package:

* `is_default = TRUE`
* `is_protected = TRUE`

Paid package:

* `is_default = FALSE`
* `is_protected = FALSE`

## Vendor Subscriptions

Seed `vendor_subscriptions` hiện gán mặc định cho:

* `vendor1`
* `vendor2`

---

# 7. Kết quả cuối cùng

File `db.sql` hiện đã đồng bộ theo nghiệp vụ mới:

* Vendor-only subscription
* Không còn tourist subscription schema
* Không còn tourist package seed
* Không còn `target_role`
* Không còn quota field cũ
* Có `poi_create_limit`
* Có `is_default` và `is_protected`
* Có `pois.status`
* Seed và schema khớp nhau trong cùng file

---

# 8. Files Affected

```text
FoodTourVinhKhanh/Backend/config/db/db.sql
changes.md
```
