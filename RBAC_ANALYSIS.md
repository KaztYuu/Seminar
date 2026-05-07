# PHÂN TÍCH HỆ THỐNG RBAC - FOOD TOUR VINH KHÁNH

**Ngày phân tích:** 6 tháng 5, 2026  
**Phân tích bởi:** Senior System Analyst  
**Trạng thái:** Hoàn chỉnh

---

## 1. SYSTEM OVERVIEW

### 1.1 Mục tiêu hệ thống

Food Tour Vinh Khánh là một ứng dụng du lịch cho phép:

- **Admin** quản lý hệ thống (POI, Tour, User, Package)
- **Vendor** (chủ cửa hàng/POI) tạo và quản lý điểm du lịch của mình
- **Tourist** (khách du lịch) khám phá, xem chi tiết POI/Tour và đặt tour

### 1.2 Các module chính

| Module                      | Mô tả                                  | Role sử dụng                          |
| --------------------------- | -------------------------------------- | ------------------------------------- |
| **Auth**                    | Đăng ký, đăng nhập, quản lý session    | Tất cả                                |
| **POI (Point of Interest)** | Quản lý địa điểm du lịch               | Admin, Vendor, Tourist (xem)          |
| **Tour**                    | Quản lý các tour du lịch (tập hợp POI) | Admin (CRUD), Tourist (xem)           |
| **Subscription & Payment**  | Gói dịch vụ, thanh toán, giới hạn      | Admin (quản lý), Vendor/Tourist (mua) |
| **User Management**         | Quản lý người dùng, phân quyền         | Admin                                 |

### 1.3 Mapping Role → Module

```
┌─────────────────────────────────────────────────────────────┐
│                   ROLE → MODULE MAPPING                     │
├──────────┬───────┬────────┬────────┬──────────┬──────────────┤
│ Module   │ Admin │ Vendor │ Tourist│ Auth Req │ Sub Req      │
├──────────┼───────┼────────┼────────┼──────────┼──────────────┤
│ POI      │ CRUD  │ C(√)RU │ R(√)   │ YES      │ YES (Create) │
│ Tour     │ CRUD  │ ✗      │ R(√)   │ YES      │ YES (Read)   │
│ Package  │ CRUD  │ ✗      │ ✗      │ YES      │ NO           │
│ Payment  │ R     │ R      │ R      │ YES      │ NO           │
│ User     │ CRUD  │ ✗      │ ✗      │ YES      │ NO           │
│ Dashboard│ ✓     │ ✗      │ ✗      │ YES      │ NO           │
└──────────┴───────┴────────┴────────┴──────────┴──────────────┘

Legend:
  ✓ = Toàn quyền    C=Create  R=Read  U=Update  D=Delete
  (√) = Có điều kiện (owner_id, is_Active, subscription)
  ✗ = Không có quyền
  Auth Req = Cần login
  Sub Req = Cần có gói dịch vụ hoạt động
```

---

## 2. ROLE PERMISSION MATRIX

### 2.1 Chi tiết quyền hạn theo tính năng

| #                          | FEATURE               | ADMIN | VENDOR | TOURIST              | GHI CHÚ                                                   |
| -------------------------- | --------------------- | ----- | ------ | -------------------- | --------------------------------------------------------- |
| **POI Management**         |                       |       |        |                      |                                                           |
| 1.1                        | Create POI (Admin)    | ✓     | ✗      | ✗                    | Không có daily_limit                                      |
| 1.2                        | Create POI (Vendor)   | ✗     | ✓(C)   | ✗                    | Daily_limit theo subscription tier                        |
| 1.3                        | View All POI (Admin)  | ✓     | ✓(Own) | ✓(Active+Vendor_Sub) | Admin thấy all; Vendor thấy own; Tourist thấy active only |
| 1.4                        | Edit POI (Admin)      | ✓     | ✗      | ✗                    | Can toggle is_Active                                      |
| 1.5                        | Edit POI (Vendor)     | ✗     | ✓(Own) | ✗                    | Cannot change is_Active; phải có subscription             |
| 1.6                        | Delete POI            | ✓     | ✓(Own) | ✗                    | Soft delete (is_Deleted=TRUE)                             |
| 1.7                        | Activate POI (bulk)   | ✓     | ✗      | ✗                    | Admin-only batch activation                               |
| **Tour Management**        |                       |       |        |                      |                                                           |
| 2.1                        | Create Tour           | ✓     | ✗      | ✗                    | Phải có ≥1 POI (chưa validated)                           |
| 2.2                        | View Tour (Admin)     | ✓     | ✗      | ✗                    | Xem all tours (incl. inactive)                            |
| 2.3                        | View Tour (Tourist)   | ✗     | ✗      | ✓                    | Xem active tours only                                     |
| 2.4                        | Edit Tour             | ✓     | ✗      | ✗                    | Can update points/name/status                             |
| 2.5                        | Delete Tour           | ✓     | ✗      | ✗                    | Cascade delete tour_points                                |
| **User Management**        |                       |       |        |                      |                                                           |
| 3.1                        | View All Users        | ✓     | ✗      | ✗                    | Admin only                                                |
| 3.2                        | Create User           | ✓     | ✗      | ✗                    | Set role (admin/vendor/tourist)                           |
| 3.3                        | Edit User             | ✓     | ✗      | ✗                    | Can block/unblock user                                    |
| 3.4                        | Delete User           | ✓     | ✗      | ✗                    | Soft delete or hard delete                                |
| 3.5                        | Edit Own Profile      | ✓     | ✓      | ✓                    | name, phoneNumber only                                    |
| 3.6                        | Change Password       | ✓     | ✓      | ✓                    | Invalidate session                                        |
| **Package & Subscription** |                       |       |        |                      |                                                           |
| 4.1                        | Manage Packages       | ✓     | ✗      | ✗                    | Create/edit/delete packages                               |
| 4.2                        | View Packages         | ✓     | ✓      | ✓                    | Role-specific packages                                    |
| 4.3                        | Buy Package           | ✗     | ✓      | ✓                    | Via VNPay payment                                         |
| 4.4                        | View Own Subscription | ✗     | ✓      | ✓                    | Current active subscription                               |
| 4.5                        | View Payment History  | ✓     | ✓      | ✓                    | All / Own only                                            |
| **Map & Explore**          |                       |       |        |                      |                                                           |
| 5.1                        | Get Nearby POI        | ✓     | ✓      | ✓                    | Filter theo role (radius 0.1-50km)                        |
| **Dashboard**              |                       |       |        |                      |                                                           |
| 6.1                        | Admin Dashboard Stats | ✓     | ✗      | ✗                    | Users, POI, Tour, Payment stats                           |

### 2.2 Ký hiệu

- **✓** = Toàn quyền
- **✓(C)** = Có điều kiện (Check constraint)
- **✓(Own)** = Chỉ sở hữu của chính mình
- **✓(Active+Vendor_Sub)** = POI phải active + Vendor có sub hoạt động
- **✗** = Bị từ chối (403 Forbidden)
- **(chưa validated)** = Chưa có validation tương ứng trong code

---

## 3. WORKFLOW THEO ROLE

### 3.1 ADMIN WORKFLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN WORKFLOW                           │
└─────────────────────────────────────────────────────────────┘

1. LOGIN
   POST /auth/login
   ├─ Email: admin@gmail.com
   ├─ Password: ****
   └─ Response: session_id (cookie)

2. DASHBOARD
   GET /users/dashboard-stats
   ├─ Total Users, POIs, Tours, Payments
   └─ Display on Admin Dashboard

3. USER MANAGEMENT
   │
   ├─ View All Users
   │  GET /users/get-users?search=""
   │
   ├─ Create User
   │  POST /users/create
   │  ├─ name, email, password, phoneNumber
   │  ├─ role: "admin" | "vendor" | "tourist"
   │  └─ is_Blocked: false
   │
   ├─ Edit User
   │  PUT /users/update/{user_id}
   │  ├─ Có thể thay đổi: role, email, password, is_Blocked
   │  └─ Cascade: Nếu block = không access POI/Tour
   │
   └─ Delete User
      DELETE /users/delete/{user_id}
      └─ Vendor POIs → owner_id = NULL (SET NULL)

4. POI MANAGEMENT
   │
   ├─ Create POI (Admin)
   │  POST /pois/admin/create
   │  ├─ Data: POICreateAdmin
   │  │  ├─ thumbnail, banner (images)
   │  │  ├─ position: {lat, lng, audio_range, access_range}
   │  │  ├─ localized: {lang_code, name, description}
   │  │  └─ knowledge: [{category, content}]
   │  ├─ Xử lý:
   │  │  ├─ 1. Save images → /uploads/images/
   │  │  ├─ 2. Translate description (Gemini) → vi, en, ...
   │  │  ├─ 3. Create TTS audio (Gemini) → /uploads/audio/
   │  │  ├─ 4. Insert pois table (is_Active = data.is_active)
   │  │  ├─ 5. Insert poi_position, poi_localized_data, poi_knowledge_base
   │  │  └─ 6. Invalidate cache
   │  └─ Response: poi_id
   │
   ├─ Edit POI (Admin)
   │  PUT /pois/admin/update/{poi_id}
   │  ├─ Data: POIUpdateAdmin (optional fields)
   │  │  ├─ thumbnail, banner (optional)
   │  │  ├─ position (optional: lat, lng, audio_range, access_range)
   │  │  ├─ localized (optional: name, description)
   │  │  └─ knowledge (optional: list of KBs)
   │  ├─ Xử lý:
   │  │  ├─ Check ownership (ANY if Admin)
   │  │  ├─ Update pois table (can set is_Active)
   │  │  ├─ Update related tables (position, localized_data, KB)
   │  │  └─ Invalidate cache
   │  └─ Response: poi_id
   │
   ├─ Delete POI
   │  DELETE /pois/delete/{poi_id}
   │  ├─ Xử lý:
   │  │  ├─ Check: poi exists AND is_Deleted = FALSE
   │  │  ├─ Soft delete: UPDATE pois SET is_Deleted = TRUE
   │  │  ├─ ⚠️  CASCADE: tour_points referencing this POI
   │  │  │       are NOT automatically deleted (due to DB constraint)
   │  │  ├─ Delete related files (audio, images)
   │  │  └─ Invalidate cache
   │  └─ Response: success message
   │
   ├─ View All POI
   │  GET /pois/get-pois?search=""
   │  ├─ Filter: NONE (thấy all POI)
   │  ├─ Can see is_Expired (vendor subscription status)
   │  └─ Response: list of POIs (admin role)
   │
   └─ Activate POI (Bulk)
      PUT /pois/activate
      ├─ Activate all inactive POIs where:
      │  ├─ owner is Admin OR
      │  └─ owner is Vendor with active subscription
      ├─ Xử lý:
      │  ├─ UPDATE pois SET is_Active = TRUE
      │  ├─ WHERE is_Active = FALSE AND is_Deleted = FALSE
      │  └─ Invalidate cache
      └─ Response: number of activated POIs

5. TOUR MANAGEMENT
   │
   ├─ Create Tour
   │  POST /tours/admin/create
   │  ├─ Data: {name, is_Active, points: [{poi_id, point_order}]}
   │  ├─ ⚠️  ISSUE: No validation that points.length >= 1
   │  ├─ ⚠️  ISSUE: No validation that POIs exist and are active
   │  ├─ Xử lý:
   │  │  ├─ 1. INSERT tours table
   │  │  ├─ 2. INSERT tour_points (for each point)
   │  │  └─ 3. Commit
   │  └─ Response: tour_id
   │
   ├─ Edit Tour
   │  PUT /tours/admin/update/{tour_id}
   │  ├─ Data: {name?, is_Active?, points?}
   │  ├─ Xử lý:
   │  │  ├─ Update tours table
   │  │  ├─ If points: DELETE old tour_points, INSERT new
   │  │  └─ Commit
   │  └─ Response: success
   │
   ├─ View All Tours
   │  GET /tours/admin
   │  ├─ Return: all tours (including inactive)
   │  ├─ Include: points (POI details + coords)
   │  └─ Response: list of tours
   │
   └─ Delete Tour
      DELETE /tours/admin/delete/{tour_id}
      ├─ DELETE from tours table
      ├─ CASCADE: tour_points are auto-deleted
      └─ Response: success

6. PACKAGE MANAGEMENT
   │
   ├─ Create Package
   │  POST /packages/create
   │  ├─ Data: {name, target_role, price, duration_hours, daily_poi_limit}
   │  └─ Response: package_id
   │
   ├─ Edit Package
   │  PUT /packages/update/{package_id}
   │  └─ Update package details
   │
   └─ Delete Package
      DELETE /packages/delete/{package_id}
      └─ Delete package

7. LOGOUT
   POST /auth/logout
   ├─ Delete session from Redis
   ├─ Clear session_id cookie
   └─ Response: success
```

**Key Features:**

- ✓ Có quyền cao nhất, có thể quản lý tất cả
- ✓ POI được activate ngay (is_Active = true khi create)
- ✓ Can set daily_poi_limit khi create POI (ko còn giới hạn)
- ✓ Bulk activation POI dựa trên vendor subscription status
- ⚠️ Không có validation tour có ≥1 POI
- ⚠️ Soft delete POI nhưng tour_points vẫn tham chiếu

---

### 3.2 VENDOR WORKFLOW

```
┌──────────────────────────────────────────────────────────────┐
│                   VENDOR WORKFLOW                            │
└──────────────────────────────────────────────────────────────┘

PREREQUISITE:
- Vendor phải có active subscription để sử dụng hệ thống
- Dependency: verify_active_subscription() 
- Return: 403 SUBSCRIPTION_EXPIRED nếu hết hạn

1. REGISTRATION (mới)
   POST /auth/register
   ├─ Data: {name, email, password, phoneNumber, role: "vendor"}
   ├─ Xử lý:
   │  ├─ Check email already exists
   │  ├─ INSERT users (role='vendor', is_Blocked=false, is_Deleted=false)
   │  └─ NO subscription attached (free tier = 1 POI/day)
   └─ Response: "Tạo tài khoản thành công"

2. LOGIN
   POST /auth/login
   ├─ Email: chuhang@gmail.com
   ├─ Password: ****
   ├─ Xử lý:
   │  ├─ Check: password correct
   │  ├─ Check: is_Blocked = FALSE
   │  ├─ Create session in Redis
   │  └─ Set session_id cookie
   ├─ Return: session_id
   └─ If failed: 401 Invalid email/password/blocked

3. CHECK SUBSCRIPTION STATUS
   GET /packages/get-my-package
   ├─ Fetch: vendor_subscriptions for this user
   ├─ Join: payments → subscription_packages
   ├─ Return: {
   │    "name": "Gói Vendor 1 tháng",
   │    "price": 99000,
   │    "duration_hours": 730,
   │    "daily_poi_limit": 5,  <-- Daily limit
   │    "end_time": "2026-05-07 10:30:00"
   │  }
   │ OR null if no active subscription
   └─ Action: If null → suggest buy package

4. BUY SUBSCRIPTION
   POST /payments/create
   ├─ Data: {package_id, payment_method: "vnpay"}
   ├─ Xử lý:
   │  ├─ Create payment record (status='pending')
   │  ├─ Generate VNPay payment URL
   │  └─ Return redirect URL
   ├─ User redirects to VNPay
   ├─ VNPay return: GET /payments/vnpay-return
   ├─ IPN callback: GET /payments/vnpay-ipn
   │  └─ Create vendor_subscription if payment success
   └─ Response: success page

5. POI MANAGEMENT (CREATE)
   POST /pois/vendor/create
   ├─ GUARD: verify_active_subscription()
   │  └─ If SUBSCRIPTION_EXPIRED → 403
   │
   ├─ CHECK DAILY LIMIT
   │  ├─ Fetch vendor subscription daily_poi_limit
   │  ├─ Count POIs created TODAY (DATE(created_at) = CURDATE())
   │  ├─ If today_count >= daily_limit → 429 Too Many Requests
   │  └─ Response: {
   │      "daily_limit": 5,
   │      "today_created": 5,
   │      "remaining": 0
   │    }
   │
   ├─ Data: POICreateVendor
   │  ├─ thumbnail, banner (required)
   │  ├─ position: {lat, lng} ONLY (audio_range, access_range locked to defaults)
   │  │  └─ audio_range: hardcoded 30m
   │  │  └─ access_range: hardcoded 10m
   │  ├─ localized: {lang_code, name, description}
   │  └─ knowledge: [{category, content}]
   │
   ├─ Xử lý:
   │  ├─ 1. Save images
   │  ├─ 2. Translate description (Gemini)
   │  ├─ 3. Generate TTS audio
   │  ├─ 4. INSERT pois (owner_id=vendor_id, is_Active=FALSE) ← Chưa duyệt!
   │  ├─ 5. Insert related tables (position, localized_data, KB)
   │  ├─ 6. Invalidate cache
   │  └─ 7. Return remaining quota
   │
   └─ Response: {
      "poi_id": 123,
      "quota": {
        "daily_limit": 5,
        "today_created": 1,
        "remaining": 4
      }
    }

6. POI MANAGEMENT (EDIT)
   PUT /pois/vendor/update/{poi_id}
   ├─ GUARD: verify_active_subscription()
   ├─ OWNERSHIP CHECK: poi.owner_id must equal vendor_id
   │  └─ If not owner → 403 Forbidden
   │
   ├─ Data: POIUpdateVendor (no audio/access range fields)
   │  ├─ thumbnail, banner (optional)
   │  ├─ position: {lat, lng} only
   │  ├─ localized, knowledge (optional)
   │  └─ NO is_active field (cannot change status)
   │
   ├─ Xử lý:
   │  ├─ Check: vendor owns this POI
   │  ├─ Update pois, poi_position, poi_localized_data, poi_knowledge_base
   │  └─ Keep is_Active as-is
   │
   └─ Response: poi_id, success message

7. POI MANAGEMENT (DELETE)
   DELETE /pois/delete/{poi_id}
   ├─ GUARD: verify_active_subscription()
   ├─ OWNERSHIP CHECK: if vendor, must own POI
   │  └─ Admin can delete any POI
   │
   ├─ Xử lý:
   │  ├─ Check: poi exists AND is_Deleted = FALSE
   │  ├─ If vendor: check owner_id == vendor_id
   │  ├─ Soft delete: SET is_Deleted = TRUE
   │  ├─ Delete audio/image files
   │  └─ Invalidate cache
   │
   └─ Response: "Xóa POI thành công"

8. VIEW OWN POIs
   GET /pois/get-pois?search=""
   ├─ GUARD: verify_active_subscription()
   ├─ Filter: p.owner_id = vendor_id
   │  └─ Vendor only sees POI of themselves
   │
   ├─ Include: is_Expired flag (subscription status)
   │  └─ TRUE if: vendor subscription ended
   │  └─ FALSE if: vendor is still active
   │
   └─ Response: list of own POIs

9. GET POI DETAIL
   GET /pois/get-poi-by-id/{poi_id}
   ├─ GUARD: verify_active_subscription()
   ├─ OWNERSHIP CHECK: if vendor, check owner
   │  └─ Return 404 if not owner
   │
   └─ Response: POI details with knowledge base

10. EXPLORE MAP
    GET /pois/nearby?lat=10.76&lng=106.66&radius=5
    ├─ GUARD: verify_active_subscription()
    ├─ Fetch POIs within radius
    │  └─ Filter same as get-pois (own only)
    │
    └─ Response: nearby POIs list

11. UPDATE PROFILE
    PUT /users/me
    ├─ Data: {name, phoneNumber}
    ├─ Update users table + update session
    └─ Response: success

12. CHANGE PASSWORD
    PUT /users/change-password
    ├─ Data: {current_password, new_password}
    ├─ Check current_password
    ├─ Update password, invalidate session
    └─ Response: success

13. LOGOUT
    POST /auth/logout
    ├─ Delete session from Redis
    ├─ Clear cookie
    └─ Response: success

KEY CONSTRAINTS:
✓ Daily POI limit based on active subscription tier
✓ POI created with is_Active=FALSE (pending admin approval)
✓ Cannot edit is_Active status (admin only)
✓ Cannot create tours
✓ Can only access own POIs
✓ Subscription required for all operations
✗ Cannot view admin dashboard
```

**Important Notes:**

- 📌 Vendor CANNOT create POI without active subscription
- 📌 Vendor POIs are inactive by default (waiting for admin activation via `/pois/activate`)
- 📌 Daily POI limit is per day (resets at midnight)
- 📌 If subscription expires → cannot create more POI + cannot edit/delete
- ⚠️ But old POI visibility depends on subscription status (is_Expired flag)

---

### 3.3 TOURIST WORKFLOW

```
┌──────────────────────────────────────────────────────────────┐
│                   TOURIST WORKFLOW                           │
└──────────────────────────────────────────────────────────────┘

PREREQUISITE:
- Cần active subscription để access POI/Tour
- Nếu hết hạn → 403 SUBSCRIPTION_EXPIRED
- Free users có thể đăng ký mà không cần subscribe ban đầu (lỗi logic?)

1. REGISTRATION
   POST /auth/register
   ├─ Data: {name, email, password, phoneNumber, role: "tourist"}
   ├─ Default: role = "tourist" (nếu không specify)
   ├─ INSERT users (role='tourist')
   └─ Response: "Tạo tài khoản thành công"

2. LOGIN
   POST /auth/login
   ├─ Email: dukhach@gmail.com
   ├─ Password: ****
   ├─ Create session in Redis
   ├─ Set session_id cookie (1 hour expiry)
   └─ Response: session_id

3. CHECK SUBSCRIPTION (optional, but required for accessing content)
   GET /packages/get-my-package
   ├─ Fetch: tourist_subscriptions for this user
   ├─ Join: payments → subscription_packages
   ├─ Return: current active subscription OR null
   └─ Action: If null → suggest buy package

4. BUY SUBSCRIPTION
   POST /payments/create
   ├─ Data: {package_id, payment_method: "vnpay"}
   ├─ Xử lý:
   │  ├─ Create payment record (status='pending')
   │  ├─ Generate VNPay payment URL
   │  └─ Redirect to VNPay
   │
   ├─ VNPay Callback:
   │  ├─ GET /payments/vnpay-return
   │  ├─ GET /payments/vnpay-ipn
   │  └─ Create tourist_subscription if success
   │
   └─ Response: redirect to /payment-result?status=success

5. VIEW PACKAGES
   GET /packages/get-packages
   ├─ GUARD: get_current_user (login required)
   ├─ Filter: WHERE target_role = 'tourist'
   ├─ Cache by role (packages_list:tourist)
   └─ Response: list of available packages

6. EXPLORE POIs
   GET /pois/get-pois?search=""
   ├─ GUARD: verify_active_subscription()
   │  └─ If no active subscription → 403
   │
   ├─ Filter:
   │  ├─ p.is_Active = TRUE
   │  ├─ p.is_Deleted = FALSE
   │  ├─ owner is Admin OR (owner is Vendor with active subscription)
   │  └─ Language: use x_language_code header (default 'vi')
   │
   ├─ Cache: all_pois:tourist:{lang}:{search}
   ├─ Apply search filter on localized_data.name
   └─ Response: list of active POIs with localized data

7. VIEW POI DETAIL
   GET /pois/get-poi-by-id/{poi_id}
   ├─ GUARD: verify_active_subscription()
   │  └─ If expired → 403
   │
   ├─ Filter:
   │  ├─ p.id = {poi_id}
   │  ├─ p.is_Active = TRUE
   │  ├─ p.is_Deleted = FALSE
   │  ├─ owner is Admin OR (owner is Vendor AND vendor_sub.end_time > NOW())
   │  └─ Fetch localized data in requested language
   │
   ├─ Return:
   │  ├─ POI details (id, name, description, thumbnail, banner)
   │  ├─ Position (latitude, longitude, audio_range, access_range)
   │  ├─ Audio URL (for TTS playback)
   │  └─ Localized data in requested language
   │
   └─ Cache: poi_detail:{poi_id}:{lang}

8. EXPLORE NEARBY POIs (Map Feature)
   GET /pois/nearby?latitude=10.76&longitude=106.66&radius=5
   ├─ GUARD: verify_active_subscription()
   │
   ├─ Parameters:
   │  ├─ latitude: -90 to 90
   │  ├─ longitude: -180 to 180
   │  └─ radius: 0.1 to 50 km
   │
   ├─ Xử lý:
   │  ├─ Validate coordinates
   │  ├─ Calculate distance using Haversine formula
   │  ├─ Fetch POIs within radius
   │  ├─ Apply same filter as get-pois (active + vendor subscription)
   │  └─ Order by distance
   │
   ├─ Cache: nearby_pois:{lat}:{lng}:{radius}:{lang}:{role}:{user_id}
   └─ Response: nearby POIs with distance

9. VIEW TOURS
   GET /tours/
   ├─ GUARD: verify_active_subscription()
   │
   ├─ Filter:
   │  ├─ is_Active = TRUE
   │  ├─ Only for tourists
   │  └─ Include tour_points (POI details + coords)
   │
   └─ Response: list of active tours with POI details

10. VIEW TOUR DETAIL
    GET /tours/{tour_id}
    ├─ GUARD: verify_active_subscription()
    │
    ├─ Filter:
    │  ├─ Fetch tour with id = {tour_id}
    │  ├─ Include all tour_points (POI details in order)
    │  └─ Include coordinates for map display
    │
    └─ Response: tour detail with POI sequence

11. VIEW PAYMENT HISTORY
    GET /payments/my-payments
    ├─ GUARD: require_role("tourist")
    ├─ Filter: WHERE user_id = tourist_id
    ├─ Join: payments → subscription_packages
    ├─ Return: list of past payments/subscriptions
    └─ Response: [
       {
         "package_name": "Gói du khách 1 tháng",
         "amount": 49000,
         "payment_method": "vnpay",
         "duration": 730,
         "bought_at": "2026-04-17T10:30:00"
       }
     ]

12. UPDATE PROFILE
    PUT /users/me
    ├─ Data: {name, phoneNumber}
    ├─ Update users table + session
    └─ Response: success

13. CHANGE PASSWORD
    PUT /users/change-password
    ├─ Data: {current_password, new_password}
    ├─ Verify current_password
    ├─ Update password, invalidate session
    └─ Response: success, redirect to login

14. LOGOUT
    POST /auth/logout
    ├─ Delete session from Redis
    ├─ Clear session_id cookie
    └─ Response: "Logged out successfully"

KEY CONSTRAINTS:
✗ Cannot create/edit/delete POI or Tour
✗ Cannot create tours
✗ Cannot manage packages
✓ Can only view active POIs (is_Active=TRUE)
✓ Can only see vendors with active subscriptions
✓ Require active subscription to view content
```

**Important Logic:**

- 📌 Tourist visibility filter: **Only sees POI if:**
  1. POI is_Active = TRUE
  2. AND (owner is Admin OR (owner is Vendor with active subscription))
- 📌 This means if vendor subscription expires → their POI becomes invisible!
- ⚠️ **ISSUE**: Endpoint `/pois/get-pois` requires `verify_active_subscription()` but registering is free
  - Tourist cannot view any POI unless they buy subscription first!

---

## 4. LOGIC VALIDATION & CONSISTENCY CHECK

### 4.1 Business Rule Validation

| BR #   | Rule                                         | Status     | Explanation                                                                                                                                        |
| ------ | -------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-001 | Admin can CRUD everything                    | ✓ OK       | require_role("admin") on all admin endpoints                                                                                                       |
| BR-002 | Vendor can CRUD own POI only                 | ✓ OK       | Check owner_id == vendor_id                                                                                                                        |
| BR-003 | Cascade delete: POI → tour_points            | ⚠️ PARTIAL | DB constraint: ON DELETE CASCADE set in schema, BUT soft delete (is_Deleted=TRUE) doesn't trigger cascade. tour_points still reference deleted POI |
| BR-004 | Tourist cannot CRUD POI/Tour                 | ✓ OK       | require_role excludes tourist                                                                                                                      |
| BR-005 | Vendor daily POI limit                       | ✓ OK       | check_vendor_poi_limit() enforces daily_limit from subscription                                                                                    |
| BR-006 | Vendor POI inactive by default               | ✓ OK       | is_Active=FALSE on vendor create                                                                                                                   |
| BR-007 | Tourist only sees active POI + active vendor | ✓ OK       | Filter in getPois()                                                                                                                                |
| BR-008 | Tourist requires active subscription         | ⚠️ ISSUE   | verify_active_subscription() blocks free access, but auth allows free registration                                                                 |
| BR-009 | Vendor requires active subscription          | ✓ OK       | verify_active_subscription() on vendor create/edit/delete                                                                                          |
| BR-010 | Tour must have ≥1 POI                        | ❌ MISSING | No validation in createTour()                                                                                                                      |
| BR-011 | Tour points must reference active POI        | ❌ MISSING | No validation when creating tour_points                                                                                                            |

### 4.2 Security Validation

| SEC #   | Issue                                | Status   | Impact | Fix                                                                                               |
| ------- | ------------------------------------ | -------- | ------ | ------------------------------------------------------------------------------------------------- |
| SEC-001 | Vendor can delete other vendor's POI | ⚠️ FOUND | Medium | Line: `if user["role"] == "vendor" and poi["owner_id"] != user["id"]: return False` - **CORRECT** |
| SEC-002 | Vendor can edit other vendor's POI   | ⚠️ FOUND | Medium | Check in updatePOI() - **CORRECT**                                                                |
| SEC-003 | Tourist can call admin endpoints     | ✓ OK     | -      | require_role("admin") blocks tourists                                                             |
| SEC-004 | Unauthorized role escalation         | ✓ OK     | -      | cannot change own role in /users/me                                                               |
| SEC-005 | Session hijacking                    | ⚠️ RISK  | High   | session_id stored in Redis with 1 hour TTL, but httponly cookie is good                           |
| SEC-006 | SQLi via search parameter            | ⚠️ RISK  | Medium | Using parameterized queries (safe)                                                                |
| SEC-007 | Soft delete can be bypassed          | ⚠️ RISK  | Medium | Always check is_Deleted = FALSE in queries                                                        |

### 4.3 Data Consistency Checks

| Check                               | Current                                  | Expected                   | Status     |
| ----------------------------------- | ---------------------------------------- | -------------------------- | ---------- |
| POI without owner                   | owner_id = NULL (if vendor deleted)      | Should handle orphaned POI | ⚠️ ISSUE   |
| POI without position                | LEFT JOIN → null values                  | Should require position    | ⚠️ RISK    |
| POI without localized_data          | LEFT JOIN → null name                    | Should have at least vi    | ⚠️ RISK    |
| Tour without points                 | Allowed (no validation)                  | Should have ≥1 point       | ❌ MISSING |
| Duplicate POI                       | No unique constraint                     | Should prevent duplicates? | ⚠️ DESIGN  |
| Invalid lat/lng                     | Validated in schema (-90..90, -180..180) | Correct                    | ✓ OK       |
| Expired subscription POI visibility | is_Expired=TRUE, invisible to tourist    | Correct                    | ✓ OK       |

---

## 5. EDGE CASES & POTENTIAL ISSUES

### 5.1 Deletion Edge Cases

#### EC-001: Delete POI in Active Tour

**Scenario:** Admin deletes POI that's used in 2 active tours

**Current Behavior:**

```sql
-- soft delete POI
UPDATE pois SET is_Deleted = TRUE WHERE id = {poi_id}

-- tour_points still reference this POI (not deleted)
SELECT * FROM tour_points WHERE poi_id = {poi_id}  -- Still returns records!
```

**Problem:**

- ❌ When Tourist views tour, JOIN with pois will fail (is_Deleted=TRUE)
- ❌ Tour becomes "broken" with missing POI
- ❌ No cascade delete of tour_points

**Solution Options:**

1. **Hard delete instead of soft delete** (loses history)
2. **Cascade delete tour_points when POI is deleted** (update tour logic)
3. **Mark tour as incomplete** when POI is deleted
4. **Implement tour validation** on read (skip deleted POI)

---

#### EC-002: Vendor Deleted, POI Becomes Orphaned

**Scenario:** Admin deletes vendor → vendor POI becomes orphaned

**Current Behavior:**

```sql
-- pois table: FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
-- Result: pois.owner_id = NULL
```

**Problem:**

- ❌ Tourist can no longer see this POI (owner = NULL, filter expects Admin or Vendor)
- ❌ POI lost from system
- ⚠️ Is this intended? Should admin inherit these POI?

**Solution:** Add trigger to transfer POI to admin account when vendor deleted

---

#### EC-003: Delete Last POI from Tour

**Scenario:** Tour has 1 POI, admin deletes that POI

**Result:**

- Tour still exists but has 0 points
- violates BR-010 (should have ≥1)

**Fix:** Validate and possibly auto-delete empty tour

---

#### EC-004: Vendor's POI Being Used in Admin's Tour

**Scenario:** Admin creates tour with vendor's POI, then vendor deletes POI

**Result:**

- tour_points still references deleted POI (is_Deleted=TRUE)
- Tour becomes broken
- Tourist cannot view tour (is_Deleted filter kicks in)

---

### 5.2 Subscription Edge Cases

#### EC-005: Vendor Subscription Expires During POI Creation

**Scenario:**

1. Vendor has active subscription
2. API call `/pois/vendor/create` receives request
3. Subscription expires while processing (async create POI + TTS)
4. POI inserted with vendor who now has no subscription

**Problem:**

- ❌ POI may become invisible to tourist immediately after creation
- ❌ Vendor might not know why POI disappeared

**Fix:** Cache subscription status at request time, validate POI owner still has subscription before commit

---

#### EC-006: Free Tourist (No Subscription)

**Scenario:** New tourist registers, tries to view POI

**Current Behavior:**

```
verify_active_subscription() → 403 SUBSCRIPTION_EXPIRED
```

**Problem:**

- ❌ Cannot access ANY content without paid subscription
- ❌ No free tier / trial period
- ❌ UX issue: register → 403 immediately

**Design Questions:**

- Should tourists have free limited access?
- Should tourist subscriptions be different (free tier with limited POI)?

---

### 5.3 Data Validation Edge Cases

#### EC-007: Invalid Coordinates (Boundary Cases)

**Scenario:** Creating POI with edge coordinates

**Current:**

```python
latitude: float = Field(..., ge=-90, le=90)  # ✓ Validated
longitude: float = Field(..., ge=-180, le=180)  # ✓ Validated
```

**Status:** ✓ OK - properly validated

---

#### EC-008: Duplicate POI Names

**Scenario:** Two POI with same name and location

**Current:** No constraint, allowed

**Question:** Is this a business rule violation?

- Might be intentional (franchises, branches)
- Or should enforce unique (name, owner_id, location)?

---

#### EC-009: Audio/Image Upload Failures

**Scenario:** Image upload fails, but POI record already inserted

**Current Behavior:**

```python
try:
    # 1. Save images
    thumbnail_path = image_service.save_image(...)  # Fails!
    # Never reaches here
except Exception as e:
    conn.rollback()
    if poi_id: audio_service.delete_poi_audios(poi_id)
    # But poi_id is None (transaction rolled back)
```

**Status:** ✓ OK - transaction rolled back, but could leak files

---

### 5.4 Permission Edge Cases

#### EC-010: Vendor Can Delete Other Vendor's Deleted POI?

**Scenario:** Vendor2 tries to delete Vendor1's POI that's already soft-deleted

**Current:**

```python
cursor.execute("SELECT * FROM pois WHERE id = %s AND is_Deleted = FALSE", (poi_id,))
poi = cursor.fetchone()

if not poi:
    return False, f"POI không tồn tại hoặc đã bị xóa"
```

**Status:** ✓ OK - returns error before ownership check

---

#### EC-011: Admin Editing Vendor POI

**Scenario:** Admin edits vendor POI created 3 days ago

**Current:**

```python
if user["role"] != "admin" and old_poi["owner_id"] != user["id"]:
    return False, "Bạn không có quyền chỉnh sửa POI này"
```

**Status:** ✓ OK - Admin can always edit

---

### 5.5 Cache Consistency Issues

#### EC-012: Cache Invalidation Race Condition

**Scenario:**

1. Tourist caches POI (cache key: `all_pois:tourist:vi`)
2. Vendor updates their POI
3. `invalidate_poi_cache()` called
4. New tourist request → cache miss, rebuilds
5. But old cached version was served to first tourist

**Current:**

```python
invalidate_poi_cache()  # Just clears pattern
```

**Status:** ⚠️ Could use better cache key invalidation

---

#### EC-013: Expired Subscription Cache Update

**Scenario:**

1. Vendor's POI cached as "is_Expired=FALSE"
2. Subscription expires exactly at 00:00:00
3. Cache still valid with old status

**Current:**

```python
set_cache(cache_key, pois)  # Default TTL?
```

**Status:** ⚠️ Cache TTL should align with subscription end time

---

## 6. IDENTIFIED BUGS & SECURITY ISSUES

### 6.1 Critical Issues (Must Fix)

| Priority | Issue                                                  | Location                         | Severity | Fix                                                                       |
| -------- | ------------------------------------------------------ | -------------------------------- | -------- | ------------------------------------------------------------------------- |
| 🔴 P0    | BR-010: Tour can be created without POI                | `tour_services.py::createTour()` | High     | Add validation: `if not data.points or len(data.points) < 1: raise error` |
| 🔴 P0    | EC-001: POI soft delete doesn't cascade to tour_points | `poi_services.py::deletePOI()`   | High     | Option 1: Hard delete POI; Option 2: Add trigger to delete tour_points    |
| 🔴 P0    | BR-008: Free tourist blocked from all content          | `roi_router.py`                  | High     | Design decision: Add free tier or trial period                            |

### 6.2 High Priority Issues

| Priority | Issue                                                      | Location                         | Severity | Impact                       |
| -------- | ---------------------------------------------------------- | -------------------------------- | -------- | ---------------------------- |
| 🟠 P1    | EC-005: Vendor subscription expires mid-transaction        | `poi_services.py::createPOI()`   | Medium   | POI invisible after creation |
| 🟠 P1    | EC-002: Orphaned POI when vendor deleted                   | `user_services.py`               | Medium   | Lost POI data                |
| 🟠 P1    | BR-011: No validation that tour_points reference valid POI | `tour_services.py::createTour()` | Medium   | Broken tours possible        |
| 🟠 P1    | EC-012: Cache invalidation not atomic                      | `poi_router.py`                  | Medium   | Stale cache served           |

### 6.3 Medium Priority Issues

| Priority | Issue                                                      | Location                       | Severity   | Impact                  |
| -------- | ---------------------------------------------------------- | ------------------------------ | ---------- | ----------------------- |
| 🟡 P2    | SEC-005: Session only 1 hour TTL                           | `auth_router.py::login()`      | Low-Medium | Short session expiry    |
| 🟡 P2    | EC-009: Partial file uploads on failure                    | `poi_services.py::createPOI()` | Low        | Disk space leak         |
| 🟡 P2    | EC-004: Admin tour with vendor POI not validated on delete | `poi_services.py::deletePOI()` | Low        | Orphaned tour reference |

---

## 7. WORKFLOW SEQUENCE DIAGRAMS

### 7.1 Admin Creating POI & Tour

```
┌──────────┐          ┌────────────┐          ┌─────────────┐
│  Admin   │          │  Backend   │          │  Database   │
└──────────┘          └────────────┘          └─────────────┘
     │                      │                        │
     │ POST /pois/admin/create                       │
     ├─────────────────────>│                        │
     │                      │ Check: require_role    │
     │                      │ ✓ Admin verified       │
     │                      │                        │
     │                      │ Save images            │
     │                      │ Translate (Gemini)     │
     │                      │ Generate TTS (Gemini)  │
     │                      │                        │
     │                      │ INSERT pois            │
     │                      ├───────────────────────>│
     │                      │ (is_Active=TRUE)       │
     │                      │<───────────────────────┤
     │                      │ poi_id returned        │
     │                      │                        │
     │                      │ INSERT poi_position    │
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │                        │
     │                      │ INSERT poi_localized   │
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │                        │
     │                      │ INSERT poi_knowledge   │
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │                        │
     │                      │ COMMIT                 │
     │                      ├───────────────────────>│
     │                      │ ✓ All success         │
     │                      │<───────────────────────┤
     │                      │                        │
     │     ✓ 200 OK         │                        │
     │<─────────────────────┤                        │
     │ {poi_id: 123}        │                        │
     │                      │ invalidate_cache       │
     │                      │                        │

     ║ --- LATER: CREATE TOUR --- ║

     │ POST /tours/admin/create                      │
     ├─────────────────────>│                        │
     │                      │ Check: require_role    │
     │                      │ ✓ Admin verified       │
     │                      │                        │
     │                      │ ⚠️  NO VALIDATION      │
     │                      │  (should check poi_ids exist)
     │                      │                        │
     │                      │ INSERT tours           │
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │ tour_id returned       │
     │                      │                        │
     │                      │ INSERT tour_points (×n)
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │                        │
     │                      │ COMMIT                 │
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │                        │
     │     ✓ 200 OK         │                        │
     │<─────────────────────┤                        │
     │ {id: tour_id}        │                        │
```

---

### 7.2 Vendor Creating POI (with Daily Limit Check)

```
┌──────────┐          ┌────────────┐          ┌─────────────────┐
│  Vendor  │          │  Backend   │          │  Database/Cache │
└──────────┘          └────────────┘          └─────────────────┘
     │                      │                        │
     │ POST /pois/vendor/create                      │
     ├─────────────────────>│                        │
     │                      │ Check: require_role    │
     │                      │ ✓ Vendor verified      │
     │                      │                        │
     │                      │ verify_active_subscription()
     │                      ├───────────────────────>│
     │                      │ Check vendor_subscriptions
     │                      │ end_time > NOW()?      │
     │                      │<───────────────────────┤
     │                      │ ✓ Active               │
     │                      │                        │
     │                      │ check_vendor_poi_limit()
     │                      ├───────────────────────>│
     │                      │ Get daily_poi_limit    │
     │                      │ from subscription      │
     │                      │<───────────────────────┤
     │                      │ daily_limit = 5        │
     │                      │                        │
     │                      │ Count POI created TODAY
     │                      ├───────────────────────>│
     │                      │ SELECT COUNT(*)        │
     │                      │ WHERE DATE(created_at) │
     │                      │  = CURDATE()           │
     │                      │<───────────────────────┤
     │                      │ today_count = 4        │
     │                      │                        │
     │                      │ today_count < daily_limit?
     │                      │ 4 < 5 ✓ YES            │
     │                      │ → Can create 1 more    │
     │                      │                        │
     │                      │ Save images, TTS, etc. │
     │                      │                        │
     │                      │ INSERT pois            │
     │                      ├───────────────────────>│
     │                      │ (is_Active=FALSE)      │
     │                      │ (owner_id=vendor_id)   │
     │                      │<───────────────────────┤
     │                      │ poi_id = 456           │
     │                      │                        │
     │                      │ [... insert related tables ...]
     │                      │                        │
     │                      │ COMMIT                 │
     │                      ├───────────────────────>│
     │                      │<───────────────────────┤
     │                      │                        │
     │     ✓ 200 OK         │                        │
     │<─────────────────────┤                        │
     │ {                    │                        │
     │   poi_id: 456,       │ invalidate_cache       │
     │   quota: {           │                        │
     │     daily_limit: 5,  │                        │
     │     today_created: 5,│                        │
     │     remaining: 0     │                        │
     │   }                  │                        │
     │ }                    │                        │
     │                      │                        │

     ║ --- NEXT REQUEST SAME DAY --- ║

     │ POST /pois/vendor/create (2nd POI)            │
     ├─────────────────────>│                        │
     │                      │ ...verify_active_subscription()
     │                      ├───────────────────────>│
     │                      │ ✓ Active               │
     │                      │                        │
     │                      │ ...check_vendor_poi_limit()
     │                      ├───────────────────────>│
     │                      │ Count today = 5        │
     │                      │ daily_limit = 5        │
     │                      │ 5 < 5? ✗ NO            │
     │                      │<───────────────────────┤
     │                      │                        │
     │  ✗ 429 Too Many Req  │                        │
     │<─────────────────────┤                        │
     │ {                    │                        │
     │   daily_limit: 5,    │                        │
     │   today_created: 5,  │                        │
     │   remaining: 0       │                        │
     │ }                    │                        │
```

---

### 7.3 Tourist Viewing POI List with Visibility Filter

```
┌──────────┐          ┌────────────┐          ┌────────────────────┐
│ Tourist  │          │  Backend   │          │  Database          │
└──────────┘          └────────────┘          └────────────────────┘
     │                      │                        │
     │ GET /pois/get-pois?search="coffee"            │
     ├─────────────────────>│                        │
     │                      │ Check: get_current_user
     │                      │ ✓ Tourist logged in    │
     │                      │                        │
     │                      │ verify_active_subscription()
     │                      ├───────────────────────>│
     │                      │ Check tourist_subscriptions
     │                      │ end_time > NOW()?      │
     │                      │<───────────────────────┤
     │                      │ ✓ Has subscription     │
     │                      │ (exp: 2026-06-06)      │
     │                      │                        │
     │                      │ Check cache            │
     │                      │ Key: "all_pois:tourist:vi:coffee"
     │                      │ → MISS                 │
     │                      │                        │
     │                      │ Build SQL query:       │
     │                      │ SELECT p.*, pos.*,     │
     │                      │   ld.name, ld.audio_url│
     │                      │ FROM pois p            │
     │                      │ JOIN users u ON p.owner_id = u.id
     │                      │ LEFT JOIN vendor_subscriptions vs
     │                      │  ON p.owner_id = vs.user_id
     │                      │ WHERE                  │
     │                      │   p.is_Deleted = FALSE │
     │                      │   AND p.is_Active = TRUE
     │                      │   AND (                │
     │                      │     u.role = 'admin'  │
     │                      │     OR                 │
     │                      │     (u.role = 'vendor' │
     │                      │      AND vs.end_time > NOW())
     │                      │   )                    │
     │                      │   AND ld.name LIKE "%coffee%"
     │                      │<───────────────────────┤
     │                      │ Results:               │
     │                      │ - Coffee POI (Owner=Admin) ✓
     │                      │ - Cafe A (Owner=Vendor1, sub active) ✓
     │                      │ - Cafe B (Owner=Vendor2, sub EXPIRED) ✗
     │                      │ - Bakery (is_Active=FALSE) ✗
     │                      │                        │
     │                      │ Cache results (TTL 1h) │
     │                      │                        │
     │  ✓ 200 OK            │                        │
     │<─────────────────────┤                        │
     │ {                    │                        │
     │   success: true,     │                        │
     │   source: "database",│                        │
     │   data: [            │                        │
     │     {poi_id, name, desc, audio_url, ...},
     │     ...              │                        │
     │   ]                  │                        │
     │ }                    │                        │
     │                      │                        │

     ║ --- SAME QUERY, DIFFERENT USER --- ║

     │ GET /pois/get-pois?search="coffee"            │
     ├─────────────────────>│                        │
     │ (Different Admin)    │ Check: Admin role      │
     │                      │ ✓ Admin verified       │
     │                      │                        │
     │                      │ Check cache            │
     │                      │ Key: "all_pois:admin:vi:coffee"
     │                      │ → MISS (different role)
     │                      │                        │
     │                      │ Query: NO subscription filter
     │                      │ (Admin sees all POI)   │
     │                      │├───────────────────────>│
     │                      │ Results:               │
     │                      │ - Coffee POI ✓         │
     │                      │ - Cafe A ✓             │
     │                      │ - Cafe B (expired) ✓   │
     │                      │ - Bakery (inactive) ✓  │
     │                      │ - Vendor2's draft POI ✓
     │                      │ (All 5 POI)            │
     │                      │                        │
     │  ✓ 200 OK            │                        │
     │<─────────────────────┤                        │
     │ (5 results for admin)│                        │
     │ vs (2 results for tourist)
```

---

## 8. ĐỀ XUẤT CẢI THIỆN HỆ THỐNG

### 8.1 Features Cần Thêm

| #     | Feature                                          | Priority | Effort | Benefit                |
| ----- | ------------------------------------------------ | -------- | ------ | ---------------------- |
| F-001 | Tour validation (POI count ≥1, valid references) | 🔴 P0    | Low    | Prevent broken tours   |
| F-002 | Free tier subscription                           | 🟠 P1    | Medium | Better UX, more users  |
| F-003 | POI versioning (edit history)                    | 🟡 P2    | Medium | Audit trail            |
| F-004 | Tour draft mode                                  | 🟡 P2    | Medium | Better UX for admin    |
| F-005 | Bulk operations (export POI, tours)              | 🟡 P3    | High   | Admin efficiency       |
| F-006 | POI approval workflow                            | 🟠 P1    | High   | Better quality control |
| F-007 | Favorites/wishlist for tourist                   | 🟡 P2    | Low    | Engagement             |
| F-008 | Rating/review system                             | 🟡 P3    | High   | Social features        |

### 8.2 Improvements Cần Làm

| #     | Improvement                       | Current                     | Proposed                               | Priority         |
| ----- | --------------------------------- | --------------------------- | -------------------------------------- | ---------------- |
| I-001 | Cascade delete handling           | Soft delete doesn't cascade | Hard delete OR trigger + cascade logic | 🔴 P0            |
| I-002 | Subscription-based POI visibility | Binary (active/inactive)    | Add "pending approval" status          | 🟠 P1            |
| I-003 | Cache invalidation                | Pattern-based               | Event-driven with TTL sync             | 🟠 P1            |
| I-004 | Error messages                    | Vietnamese only             | Bilingual with error codes             | 🟡 P2            |
| I-005 | Pagination                        | No pagination               | Implement offset/limit                 | 🟡 P2            |
| I-006 | Rate limiting                     | No rate limit               | Implement IP-based rate limiter        | 🔴 P0 (Security) |
| I-007 | Audit logging                     | No audit log                | Log all user actions                   | 🟠 P1            |
| I-008 | Soft delete vs hard delete        | Inconsistent                | Define clear policy                    | 🟠 P1            |

### 8.3 Security Improvements

| #     | Improvement             | Current                | Proposed                                 | Priority |
| ----- | ----------------------- | ---------------------- | ---------------------------------------- | -------- |
| S-001 | Session timeout         | 1 hour                 | Configurable + remember-me               | 🟡 P2    |
| S-002 | Password strength       | No validation          | Implement strength meter                 | 🟠 P1    |
| S-003 | CSRF protection         | httponly cookie        | Add CSRF token                           | 🟠 P1    |
| S-004 | Input sanitization      | Relying on Pydantic    | Add additional validation                | 🟡 P2    |
| S-005 | File upload validation  | Basic type check       | Validate file content, size limit        | 🔴 P0    |
| S-006 | API key for integration | Cookie-based auth only | Add API key for third-party integrations | 🟡 P2    |
| S-007 | Two-factor auth         | Not implemented        | Optional 2FA for admin                   | 🟡 P3    |
| S-008 | DDoS protection         | None                   | Implement Cloudflare or similar          | 🟡 P2    |

### 8.4 Database Schema Improvements

| #      | Change                                           | Benefit                     |
| ------ | ------------------------------------------------ | --------------------------- |
| DB-001 | Add POI.approval_status (draft/pending/approved) | Better workflow control     |
| DB-002 | Add User.is_deleted (soft delete)                | Audit trail                 |
| DB-003 | Add audit_logs table                             | Full audit trail of changes |
| DB-004 | Add Tour.description                             | Better UX                   |
| DB-005 | Add unique index on (owner_id, lat, lng)         | Prevent exact duplicates    |
| DB-006 | Add indexed on is_Active, is_Deleted             | Better query performance    |
| DB-007 | Add created_by to tours                          | Track who created tour      |

---

## 9. SUMMARY & RECOMMENDATIONS

### 9.1 Current System State

**Strengths:**

- ✅ Clear role-based access control (3 roles well-defined)
- ✅ Proper authentication with session management (Redis)
- ✅ Subscription-based access control (daily POI limit enforcement)
- ✅ Multi-language support (Gemini translation + TTS)
- ✅ Image & audio management
- ✅ Caching layer for performance
- ✅ Proper soft delete implementation (mostly)

**Weaknesses:**

- ❌ No tour validation (can create tour without POI)
- ❌ Free tourist blocked from all content (no free tier)
- ⚠️ Soft delete doesn't cascade properly
- ⚠️ Cache invalidation could be atomic
- ⚠️ No audit logging
- ⚠️ Missing error handling for edge cases

### 9.2 Action Items (Priority Order)

#### **Must Fix (Week 1):**

1. **BR-010 Validation:** Add tour validation - must have ≥1 POI
   - File: `tour_services.py::createTour()`
   - Code: `if not data.points or len(data.points) < 1: raise HTTPException(...)`

2. **EC-001 Cascade Delete:** Fix POI deletion cascade
   - Option: Add database trigger or use hard delete instead of soft delete
   - File: `poi_services.py::deletePOI()`

3. **Rate Limiting:** Implement API rate limiting
   - File: `main.py` (add middleware)

#### **Should Fix (Week 2-3):**

4. **Free Tier:** Design free tier subscription or trial period
   - Reduce barrier to entry for tourists
5. **BR-011 Validation:** Validate tour_points reference valid POI
   - File: `tour_services.py::createTour()` & `updateTour()`

6. **EC-002 Orphaned POI:** Handle vendor deletion
   - Add trigger or logic to transfer POI to admin on vendor delete

#### **Nice to Have (Week 4+):**

7. Audit logging system
8. Improved error handling & messages
9. Pagination on list endpoints
10. Favorites/wishlist feature

### 9.3 Risk Assessment

| Risk                                 | Likelihood | Impact | Mitigation                             |
| ------------------------------------ | ---------- | ------ | -------------------------------------- |
| Lost tour due to deleted POI         | HIGH       | HIGH   | Fix EC-001 immediately                 |
| Free user cannot register (UX issue) | HIGH       | MEDIUM | Add free tier                          |
| Vendor quota bypass (edge case)      | LOW        | HIGH   | Add transaction-level validation       |
| Cache serving stale data             | MEDIUM     | MEDIUM | Implement event-driven cache           |
| SQL injection (unlikely)             | LOW        | HIGH   | Already using parameterized queries ✓  |
| Session hijacking                    | LOW        | MEDIUM | Already using httponly + secure cookie |

---

## 10. APPENDIX

### 10.1 API Endpoint Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                        API ENDPOINT MATRIX                       │
├────────────────────────────────┬──────────────────────────────────┤
│ ENDPOINT                       │ ADMIN | VENDOR | TOURIST        │
├────────────────────────────────┼──────┬────────┬─────────────────┤
│ Auth                           │      │        │                 │
│  POST /auth/register           │  ✓   │  ✓     │  ✓              │
│  POST /auth/login              │  ✓   │  ✓     │  ✓              │
│  GET /auth/me                  │  ✓   │  ✓     │  ✓              │
│  POST /auth/logout             │  ✓   │  ✓     │  ✓              │
├────────────────────────────────┼──────┼────────┼─────────────────┤
│ POI                            │      │        │                 │
│  POST /pois/admin/create       │  ✓   │  ✗     │  ✗              │
│  POST /pois/vendor/create      │  ✗   │  ✓*   │  ✗              │
│  GET /pois/get-pois            │  ✓   │  ✓*   │  ✓*             │
│  GET /pois/get-poi-by-id/{id}  │  ✓   │  ✓*   │  ✓*             │
│  PUT /pois/admin/update/{id}   │  ✓   │  ✗     │  ✗              │
│  PUT /pois/vendor/update/{id}  │  ✗   │  ✓*   │  ✗              │
│  DELETE /pois/delete/{id}      │  ✓   │  ✓*   │  ✗              │
│  PUT /pois/activate            │  ✓   │  ✗     │  ✗              │
│  GET /pois/nearby              │  ✓   │  ✓*   │  ✓*             │
├────────────────────────────────┼──────┼────────┼─────────────────┤
│ Tour                           │      │        │                 │
│  POST /tours/admin/create      │  ✓   │  ✗     │  ✗              │
│  GET /tours/admin              │  ✓   │  ✗     │  ✗              │
│  PUT /tours/admin/update/{id}  │  ✓   │  ✗     │  ✗              │
│  DELETE /tours/admin/delete/{id}│ ✓   │  ✗     │  ✗              │
│  GET /tours/                   │  ✗   │  ✗     │  ✓*             │
│  GET /tours/{id}               │  ✗   │  ✗     │  ✓*             │
├────────────────────────────────┼──────┼────────┼─────────────────┤
│ User                           │      │        │                 │
│  GET /users/get-users          │  ✓   │  ✗     │  ✗              │
│  POST /users/create            │  ✓   │  ✗     │  ✗              │
│  PUT /users/update/{id}        │  ✓   │  ✗     │  ✗              │
│  DELETE /users/delete/{id}     │  ✓   │  ✗     │  ✗              │
│  PUT /users/me                 │  ✓   │  ✓     │  ✓              │
│  PUT /users/change-password    │  ✓   │  ✓     │  ✓              │
│  GET /users/dashboard-stats    │  ✓   │  ✗     │  ✗              │
├────────────────────────────────┼──────┼────────┼─────────────────┤
│ Package & Payment              │      │        │                 │
│  GET /packages/get-all         │  ✓   │  ✗     │  ✗              │
│  GET /packages/get-packages    │  ✓   │  ✓     │  ✓              │
│  GET /packages/get-my-package  │  ✗   │  ✓     │  ✓              │
│  POST /packages/create         │  ✓   │  ✗     │  ✗              │
│  PUT /packages/update/{id}     │  ✓   │  ✗     │  ✗              │
│  DELETE /packages/delete/{id}  │  ✓   │  ✗     │  ✗              │
│  POST /payments/create         │  ✗   │  ✓     │  ✓              │
│  GET /payments/my-payments     │  ✗   │  ✓     │  ✓              │
│  GET /payments/all             │  ✓   │  ✗     │  ✗              │
└────────────────────────────────┴──────┴────────┴─────────────────┘

Legend:
  ✓ = Full access
  ✓* = Access with filters (subscription, ownership)
  ✗ = No access (403 Forbidden)
```

### 10.2 Database Relationships

```
users (id, role, is_Blocked, is_Deleted)
  ├─ pois (owner_id) → users.id [ON DELETE SET NULL]
  │  ├─ poi_position (poi_id)
  │  ├─ poi_localized_data (poi_id)
  │  ├─ poi_knowledge_base (poi_id)
  │  └─ tour_points (poi_id) ← tour references
  │
  ├─ vendor_subscriptions (user_id)
  │  └─ payments (id) ← payment_id
  │     └─ subscription_packages (package_id)
  │
  └─ tourist_subscriptions (user_id)
     └─ payments (id) ← payment_id
        └─ subscription_packages (package_id)

tours (id)
  └─ tour_points (tour_id) → pois(poi_id) [ON DELETE CASCADE]
```

### 10.3 Glossary

| Term           | Definition                                     |
| -------------- | ---------------------------------------------- |
| POI            | Point of Interest - địa điểm du lịch           |
| Vendor         | Chủ cửa hàng / POI owner                       |
| Tourist        | Khách du lịch / người dùng cuối                |
| Admin          | Quản trị viên hệ thống                         |
| RBAC           | Role-Based Access Control                      |
| BR             | Business Rule                                  |
| EC             | Edge Case                                      |
| soft delete    | Đánh dấu xóa (is_Deleted=TRUE), không xóa thực |
| hard delete    | Xóa hoàn toàn từ database                      |
| Cascade delete | Xóa tự động các bản ghi liên kết               |
| Subscription   | Gói dịch vụ có thời hạn                        |
| TTS            | Text-to-Speech (chuyển văn bản thành audio)    |

---

**END OF REPORT**

Generated: 2026-05-06  
Analyzer: Senior System Analyst  
Status: ✅ Complete and Review-Ready
