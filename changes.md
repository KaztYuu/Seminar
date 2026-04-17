# Implementation Change Log — POI Management & Map Explore

**Project:** FoodTourVinhKhanh
**Scope:** POI Management, Map Explore, Subscription Integration
**Purpose:** Ghi lại các thay đổi so với hệ thống ban đầu mà Codex đã thực hiện, thể hiện rõ:

* Hàm nào đã được chỉnh sửa
* Dòng logic nào thay đổi
* Vai trò của từng thay đổi
* Ảnh hưởng tới sequence diagram và business rule

---

# 1. Tổng quan thay đổi chính

| Module          | Trạng thái trước  | Trạng thái sau                  | Mục tiêu               |
| --------------- | ----------------- | ------------------------------- | ---------------------- |
| POI Daily Limit | Hardcode limit    | Dynamic limit theo subscription | Đúng business rule     |
| Subscription    | Không auto assign | Auto FREE subscription          | Đảm bảo logic khởi tạo |
| Map Explore     | Chỉ list POI      | Nearby search theo radius       | Hỗ trợ sequence Map    |
| Quota Tracking  | Không tồn tại     | Có remaining quota              | Hiển thị dashboard     |

---

# 2. Database Changes

## File

```text
Backend/migrations/add_daily_poi_limit.sql
```

## Thay đổi

### BEFORE

```sql
CREATE TABLE subscription_packages (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL
);
```

### AFTER

```sql
ALTER TABLE subscription_packages
ADD COLUMN daily_poi_limit INT DEFAULT 1;
```

## Vai trò

```text
Cho phép mỗi subscription định nghĩa số POI tối đa mỗi ngày
```

## Ảnh hưởng

```text
Subscription trở thành nguồn dữ liệu quyết định limit
```

---

# 3. POI Service — Daily Limit Logic

## File

```text
Backend/app/services/poi_services.py
```

---

## Change 1 — Fix Daily Count Logic

### BEFORE

```python
count_query = """
SELECT COUNT(*)
FROM pois
WHERE owner_id = %s
"""
```

### AFTER

```python
count_query = """
SELECT COUNT(*)
FROM pois
WHERE owner_id = %s
AND DATE(created_at) = CURRENT_DATE
"""
```

## Vai trò

```text
Đếm số POI trong ngày thay vì tổng số POI
```

## Business Rule

```text
Vendor chỉ được tạo X POI mỗi ngày
```

---

## Change 2 — Replace Hardcoded Limit

### BEFORE

```python
limit = 3
```

### AFTER

```python
limit = subscription.daily_poi_limit
```

## Vai trò

```text
Lấy limit động từ subscription
```

---

# 4. New Function — Validate Daily Limit

## File

```text
poi_services.py
```

## Function

```python
def validate_daily_poi_limit(vendor_id):

    subscription = get_vendor_subscription(vendor_id)

    today_count = get_today_poi_count(vendor_id)

    limit = subscription.daily_poi_limit

    if today_count >= limit:

        raise Exception("Daily POI limit reached")
```

## Vai trò

```text
Ngăn vendor tạo POI vượt quá quota
```

## Sequence Impact

```text
Create POI
→ Check subscription
→ Check daily limit
→ Allow / Reject
```

---

# 5. New Function — Remaining Quota

## File

```text
poi_services.py
```

## Function

```python
def get_remaining_poi_quota(vendor_id):

    subscription = get_vendor_subscription(vendor_id)

    today_count = get_today_poi_count(vendor_id)

    remaining = subscription.daily_poi_limit - today_count

    return {
        "daily_limit": subscription.daily_poi_limit,
        "today_created": today_count,
        "remaining": remaining
    }
```

## Vai trò

```text
Cho phép dashboard hiển thị số POI còn lại trong ngày
```

---

# 6. Subscription Service — Fetch Limit Logic

## File

```text
Backend/app/services/subscription_services.py
```

## Change — Correct Subscription Join

### BEFORE

```python
SELECT daily_poi_limit
FROM subscription_packages
WHERE vendor_id = %s
```

### AFTER

```python
SELECT sp.daily_poi_limit
FROM subscription_packages sp
JOIN payments p
ON sp.id = p.package_id
WHERE p.vendor_id = %s
ORDER BY p.created_at DESC
LIMIT 1
```

## Vai trò

```text
Lấy subscription hiện tại đúng theo payment mới nhất
```

---

# 7. Auth Service — Auto FREE Subscription

## File

```text
Backend/app/services/auth_services.py
```

---

## Change — Create FREE Subscription After Register

### BEFORE

```python
create_user(user_data)

return success
```

### AFTER

```python
create_user(user_data)

create_subscription(
    user_id=user.id,
    package="FREE",
    daily_poi_limit=1
)

return success
```

## Vai trò

```text
Đảm bảo mọi user đều có subscription
```

## Sequence Impact

```text
Register
→ Create user
→ Assign FREE subscription
```

---

# 8. Router — POI Creation Endpoint Update

## File

```text
Backend/app/routes/poi_router.py
```

---

## Change — Enforce Daily Limit

### BEFORE

```python
create_poi(data)

return success
```

### AFTER

```python
validate_daily_poi_limit(vendor_id)

create_poi(data)

return quota_info
```

## Vai trò

```text
Đảm bảo validation chạy trước khi tạo POI
```

---

# 9. Map Explore — Nearby Search

## File

```text
poi_services.py
```

---

## New Function — Nearby Search

```python
def get_nearby_pois(latitude, longitude, radius):

    query = """
    SELECT *,
    calculate_distance(latitude, longitude, %s, %s) AS distance
    FROM pois
    HAVING distance <= %s
    ORDER BY distance
    """
```

## Vai trò

```text
Trả về POI gần vị trí người dùng
```

## Sequence Impact

```text
User
→ Search nearby POI
→ Calculate distance
→ Filter by radius
→ Return result
```

---

# 10. Router — New API Endpoint

## File

```text
poi_router.py
```

---

## New Endpoint

```python
GET /pois/nearby
```

## Parameters

```text
latitude
longitude
radius
```

## Example

```http
GET /pois/nearby?latitude=10.76&longitude=106.66&radius=5
```

## Vai trò

```text
Cho phép Map Explore tìm POI theo khoảng cách
```

---

# 11. Business Rule — Before vs After

## BEFORE

```text
Vendor
→ Create POI
→ Save POI
```

---

## AFTER

```text
Vendor
→ Create POI
→ Check subscription
→ Get daily limit
→ Count today's POI
→ Compare
→ Save POI
```

---

# 12. Sequence Diagram Impact Summary

## Create POI

```text
Vendor
   ↓
API
   ↓
Validate subscription
   ↓
Check daily limit
   ↓
Save POI
```

---

## Register

```text
User
   ↓
Register
   ↓
Create user
   ↓
Assign FREE subscription
```

---

## Map Explore

```text
User
   ↓
Search nearby POI
   ↓
Calculate distance
   ↓
Filter by radius
   ↓
Return POI list
```

---

# 13. Risk Checklist

Trước khi demo hoặc nộp:

```text
created_at tồn tại trong table pois
subscription_packages có daily_poi_limit
FREE subscription tồn tại
server timezone đúng
```

---

# 14. Final Status

```text
POI Daily Limit: IMPLEMENTED
Subscription Integration: IMPLEMENTED
Map Explore Nearby Search: IMPLEMENTED
Sequence Diagram Support: READY
System Integration Risk: LOW
```
