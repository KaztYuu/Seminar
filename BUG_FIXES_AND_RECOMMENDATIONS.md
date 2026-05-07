# BUG FIXES & RECOMMENDATIONS - CODE EXAMPLES

## 1. CRITICAL FIXES (Must Implement)

### 1.1 FIX BR-010: Tour Validation (Empty Tour Prevention)

**Problem:** Tour can be created without any POI (0 points)

**File:** `app/services/tour_services.py`

**Current Code:**

```python
def createTour(data):
    """Tạo tour mới kèm các điểm POI"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # ❌ NO VALIDATION - data.points could be empty
        cursor.execute(
            "INSERT INTO tours (name, is_Active) VALUES (%s, %s)",
            (data.name, data.is_Active)
        )
        tour_id = cursor.lastrowid

        # Thêm từng điểm POI vào tour
        for point in data.points:  # ❌ Could iterate 0 times
            cursor.execute(
                "INSERT INTO tour_points (tour_id, poi_id, point_order) VALUES (%s, %s, %s)",
                (tour_id, point.poi_id, point.point_order)
            )

        conn.commit()
        return tour_id
```

**Fixed Code:**

```python
def createTour(data):
    """Tạo tour mới kèm các điểm POI"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # ✅ VALIDATE: Must have at least 1 POI
        if not data.points or len(data.points) < 1:
            raise HTTPException(
                status_code=400,
                detail="Tour phải có ít nhất 1 điểm POI"
            )

        # ✅ VALIDATE: All POI must exist and not be deleted
        poi_ids = [point.poi_id for point in data.points]
        placeholders = ",".join(["%s"] * len(poi_ids))

        cursor.execute(
            f"""SELECT COUNT(*) as count FROM pois
               WHERE id IN ({placeholders}) AND is_Deleted = FALSE""",
            poi_ids
        )
        result = cursor.fetchone()
        if result['count'] != len(poi_ids):
            raise HTTPException(
                status_code=400,
                detail="Một hoặc nhiều POI không tồn tại hoặc đã bị xóa"
            )

        # ✅ Check for duplicate POI in same tour
        unique_pois = set(poi_ids)
        if len(unique_pois) != len(poi_ids):
            raise HTTPException(
                status_code=400,
                detail="Tour không được có POI trùng lặp"
            )

        # Insert tour
        cursor.execute(
            "INSERT INTO tours (name, is_Active) VALUES (%s, %s)",
            (data.name, data.is_Active)
        )
        tour_id = cursor.lastrowid

        # Insert points with validation
        for point in data.points:
            cursor.execute(
                "INSERT INTO tour_points (tour_id, poi_id, point_order) VALUES (%s, %s, %s)",
                (tour_id, point.poi_id, point.point_order)
            )

        conn.commit()
        return tour_id

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi tạo tour: {str(e)}")
    finally:
        cursor.close()
        conn.close()
```

**Also Fix updateTour:**

```python
def updateTour(tour_id: int, data):
    """Cập nhật thông tin tour"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # ✅ VALIDATE: If points are being updated
        if data.points is not None:
            if len(data.points) < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Tour phải có ít nhất 1 điểm POI"
                )

            # ✅ Validate all POI exist
            poi_ids = [point.poi_id for point in data.points]
            placeholders = ",".join(["%s"] * len(poi_ids))

            cursor.execute(
                f"""SELECT COUNT(*) as count FROM pois
                   WHERE id IN ({placeholders}) AND is_Deleted = FALSE""",
                poi_ids
            )
            result = cursor.fetchone()
            if result['count'] != len(poi_ids):
                raise HTTPException(
                    status_code=400,
                    detail="Một hoặc nhiều POI không tồn tại hoặc đã bị xóa"
                )

        # Cập nhật tên và trạng thái
        if data.name is not None or data.is_Active is not None:
            cursor.execute(
                "UPDATE tours SET name = COALESCE(%s, name), is_Active = COALESCE(%s, is_Active) WHERE id = %s",
                (data.name, data.is_Active, tour_id)
            )

        # Update points
        if data.points is not None:
            cursor.execute("DELETE FROM tour_points WHERE tour_id = %s", (tour_id,))
            for point in data.points:
                cursor.execute(
                    "INSERT INTO tour_points (tour_id, poi_id, point_order) VALUES (%s, %s, %s)",
                    (tour_id, point.poi_id, point.point_order)
                )

        conn.commit()
        return True

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật tour: {str(e)}")
    finally:
        cursor.close()
        conn.close()
```

---

### 1.2 FIX EC-001: POI Soft Delete Doesn't Cascade

**Problem:** When POI is soft deleted, tour_points still reference it → broken tours

**Scenario:**

```
1. Create Tour with POI #123
2. Delete POI #123 (soft delete: is_Deleted = TRUE)
3. tourist.GET /tours/{tour_id}
   → JOIN with pois WHERE is_Deleted = FALSE
   → POI #123 not found
   → Tour displays with missing POI
```

**Solution Option 1: Hard Delete Instead of Soft Delete**

**File:** `app/services/poi_services.py`

```python
async def deletePOI(user, poi_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM pois WHERE id = %s", (poi_id,))  # No is_Deleted check
        poi = cursor.fetchone()

        if not poi:
            return False, f"POI không tồn tại. ID: {poi_id}"

        if user["role"] == "vendor" and poi["owner_id"] != user["id"]:
            return False, "Bạn không phải chủ sở hữu của POI này."

        # Get audio files before deletion
        cursor.execute("SELECT audio_url FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        audio_rows = cursor.fetchall()

        # ✅ HARD DELETE (CASCADE handled by DB)
        # This will trigger ON DELETE CASCADE for:
        # - poi_position (CASCADE)
        # - poi_localized_data (CASCADE)
        # - poi_knowledge_base (CASCADE)
        # - tour_points (CASCADE)
        cursor.execute("DELETE FROM pois WHERE id = %s", (poi_id,))

        conn.commit()

        # Delete files after successful commit
        for row in audio_rows:
            if row['audio_url']:
                audio_service.delete_audio(row['audio_url'])

        image_service.delete_image(poi["thumbnail"])
        image_service.delete_image(poi["banner"])

        return True, "Xóa POI thành công"

    except Exception as e:
        conn.rollback()
        print(f"Delete POI Error: {e}")
        return False, f"Lỗi hệ thống: {str(e)}"
    finally:
        cursor.close()
        conn.close()
```

**Also update getPois() to remove is_Deleted filter:**

```python
def getPois(user, lang="vi", searchTxt=""):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT DISTINCT
                p.*,
                pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                ld.name, ld.description, ld.audio_url,
                vs.end_time as subscription_end
            FROM pois p
            LEFT JOIN poi_position pos ON p.id = pos.poi_id
            LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN (
                SELECT user_id, MAX(end_time) AS end_time
                FROM vendor_subscriptions
                GROUP BY user_id
            ) vs ON p.owner_id = vs.user_id
            WHERE 1=1
        """  # ✅ Removed is_Deleted filter

        params = [lang if user["role"] == "tourist" else 'vi']

        # Filter by role...
        if user["role"] == "admin":
            pass  # See all
        elif user["role"] == "vendor":
            query += " AND p.owner_id = %s"
            params.append(user["id"])
        else:
            query += """
                AND p.is_Active = TRUE
                AND (u.role = 'admin' OR (u.role = 'vendor' AND vs.end_time > NOW()))
            """

        if searchTxt.strip():
            query += " AND ld.name LIKE %s"
            params.append(f"%{searchTxt}%")

        query += " ORDER BY p.created_at DESC"

        cursor.execute(query, params)
        pois = cursor.fetchall()
        return pois

    finally:
        cursor.close()
        conn.close()
```

**And getPOIById():**

```python
def getPOIById(user, poi_id, lang="vi"):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    poi = None

    try:
        if user["role"] == 'tourist':
            cursor.execute("""
                SELECT p.*, pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                       ld.name, ld.description, ld.audio_url, ld.lang_code
                FROM pois p
                JOIN users u ON p.owner_id = u.id
                LEFT JOIN vendor_subscriptions vs ON u.id = vs.user_id
                LEFT JOIN poi_position pos ON p.id = pos.poi_id
                LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
                WHERE p.id = %s
                  AND p.is_Active = TRUE
                  AND (
                      u.role = 'admin'
                      OR (u.role = 'vendor' AND vs.end_time > NOW())
                  )
                ORDER BY vs.end_time DESC
                LIMIT 1
            """, (lang, poi_id))
        else:
            cursor.execute("""
                SELECT p.*, pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                       ld.name, ld.description
                FROM pois p
                LEFT JOIN poi_position pos ON p.id = pos.poi_id
                LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = 'vi'
                WHERE p.id = %s
            """, (poi_id,))  # ✅ Removed is_Deleted filter

        poi = cursor.fetchone()

        if poi and user["role"] != "tourist":
            cursor.execute(
                """SELECT id, category, content FROM poi_knowledge_base WHERE poi_id = %s""",
                (poi_id,)
            )
            poi['knowledge'] = cursor.fetchall()

    except Exception as e:
        print(f"Get POI Error: {e}")
    finally:
        cursor.close()
        conn.close()

    return poi
```

**Alternative Option 2: Keep Soft Delete but Add Trigger**

If you want to keep soft delete, add a database trigger:

```sql
-- Option 2: Add trigger to delete tour_points when POI is soft-deleted
CREATE TRIGGER delete_tour_points_on_poi_delete
AFTER UPDATE ON pois
FOR EACH ROW
WHEN NEW.is_Deleted = TRUE AND OLD.is_Deleted = FALSE
BEGIN
    DELETE FROM tour_points WHERE poi_id = NEW.id;
END;
```

**Recommendation:** Use Option 1 (hard delete) because:

- ✅ Simpler logic
- ✅ Database-enforced cascade delete
- ✅ No orphaned data
- ❌ Trade-off: Lose deletion history (no soft delete audit)

If you need audit trail of deleted POI, use soft delete + trigger.

---

### 1.3 FIX BR-008: Free Tourist Access (No Subscription Required)

**Problem:** Tourist cannot view ANY content without paid subscription

- Tourist registers → tries to view POI → 403 SUBSCRIPTION_EXPIRED
- Bad UX: paywall immediately after registration

**Solution: Create Free Tier Package**

**File:** `config/db/db.sql` (Add to data seeding)

```sql
-- Add free tier packages
INSERT INTO subscription_packages
(name, target_role, price, duration_hours, is_Active, daily_poi_limit)
VALUES
('Gói Du Khách Miễn Phí', 'tourist', 0, 8760, 1, 100),  -- 365 days
('Gói Vendor Miễn Phí', 'vendor', 0, 8760, 1, 1);         -- 1 POI/day

-- When user registers, auto-create free subscription
```

**File:** `app/services/auth_services.py`

```python
def createUser(user: UserRegister):
    """Create new user with auto free subscription"""
    try:
        # ... existing code ...

        # INSERT user
        cursor.execute("""
            INSERT INTO users (name, email, password, phoneNumber, role)
            VALUES (%s, %s, %s, %s, %s)
        """, (...))

        user_id = cursor.lastrowid

        # ✅ NEW: Auto-create free subscription for new user
        # Find free tier package for this role
        cursor.execute("""
            SELECT id FROM subscription_packages
            WHERE target_role = %s AND price = 0 AND is_Active = TRUE
            LIMIT 1
        """, (user.role,))

        free_package = cursor.fetchone()
        if free_package:
            pkg_id = free_package['id']

            # Create dummy payment record
            cursor.execute("""
                INSERT INTO payments
                (user_id, amount, package_id, transaction_ref, payment_method, status)
                VALUES (%s, 0, %s, %s, 'free_tier', 'success')
            """, (user_id, pkg_id, f"FREE-{user_id}-{int(time.time())}"))

            payment_id = cursor.lastrowid

            # Create subscription based on role
            if user.role == 'tourist':
                cursor.execute("""
                    INSERT INTO tourist_subscriptions
                    (user_id, payment_id, start_time, end_time)
                    VALUES (%s, %s, NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY))
                """, (user_id, payment_id))
            elif user.role == 'vendor':
                cursor.execute("""
                    INSERT INTO vendor_subscriptions
                    (user_id, payment_id, start_time, end_time)
                    VALUES (%s, %s, NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY))
                """, (user_id, payment_id))

        conn.commit()
        return True

    except Exception as e:
        conn.rollback()
        print(f"Error creating user: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
```

**Alternative: Remove Subscription Check for Tourist View**

If you don't want auto-subscription, just remove the guard:

```python
# OLD (file: poi_router.py)
@router.get("/get-pois")
def get_pois(x_language_code: Optional[str] = Header(None),
             search: str = "",
             user=Depends(verify_active_subscription)):  # ❌ Blocks free access
    ...

# NEW
@router.get("/get-pois")
def get_pois(x_language_code: Optional[str] = Header(None),
             search: str = "",
             user=Depends(get_current_user)):  # ✅ Just needs login, not subscription
    ...
```

**Recommendation:** Use auto free subscription approach because:

- ✅ Better UX (immediate access)
- ✅ Can still track usage (payment record exists)
- ✅ Can later upgrade to paid tier
- ✅ Consistent with current architecture
- ⚠️ Make sure to limit free tier (e.g., 100 POI/day, 50 km search radius)

---

## 2. HIGH PRIORITY FIXES

### 2.1 FIX EC-005: Vendor Subscription Expires Mid-Transaction

**Problem:** Vendor subscription expires while POI is being created (long async process)

**Scenario:**

```
1. 10:00:00 - Vendor subscription expires (end_time = 10:00:00)
2. 09:59:58 - Vendor calls POST /pois/vendor/create
   - verify_active_subscription() passes (sub still valid at request time)
3. 09:59:58-10:00:05 - Long processing:
   - Save images (0.5s)
   - Translate with Gemini (2s)
   - Generate TTS (1s)
   - Insert to DB (0.5s)
4. 10:00:05 - POI is created and visible
5. 10:00:06 - Subscription expires
6. Tourist tries to view POI
   - is_Expired filter triggers → POI invisible
```

**Solution: Cache subscription status at request time**

**File:** `app/routes/poi_router.py`

```python
@router.post("/vendor/create")
async def create_poi_vendor(
    data: POICreateVendor,
    user=Depends(require_role("vendor")),
    active_user=Depends(verify_active_subscription)
):
    """
    Create a new POI with daily limit enforcement based on subscription tier.

    ✅ NEW: Cache subscription info at request time
    """

    # ✅ NEW: Get subscription details NOW and cache
    sub_info = get_subscription_info(user["id"])
    if not sub_info['is_active']:
        raise HTTPException(
            status_code=403,
            detail={"message": "Gói dịch vụ đã hết hạn", "errorCode": "SUBSCRIPTION_EXPIRED"}
        )

    # Store in user context for later use
    user['_subscription_cached'] = sub_info

    # Check if vendor can create another POI today
    can_create = check_vendor_poi_limit(user["id"], sub_info['daily_limit'])

    if not can_create:
        quota = get_remaining_poi_quota(user["id"], sub_info['daily_limit'])
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Bạn đã đạt giới hạn tối đa POI trong hôm nay",
                "daily_limit": quota['daily_limit'],
                "today_created": quota['today_created'],
                "remaining": 0
            }
        )

    # ✅ Use cached subscription info
    success, message, poi_id = await createPOI(user, data, sub_info)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    invalidate_poi_cache()
    quota = get_remaining_poi_quota(user["id"], sub_info['daily_limit'])

    return {
        "success": True,
        "message": message,
        "poi_id": poi_id,
        "quota": quota
    }
```

**File:** `app/services/poi_services.py`

```python
def get_subscription_info(vendor_id: int):
    """Get vendor subscription info at request time"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                vs.id, sp.daily_poi_limit, vs.end_time,
                CASE WHEN vs.end_time > NOW() THEN TRUE ELSE FALSE END as is_active
            FROM vendor_subscriptions vs
            LEFT JOIN payments p ON vs.payment_id = p.id
            LEFT JOIN subscription_packages sp ON p.package_id = sp.id
            WHERE vs.user_id = %s
            ORDER BY vs.end_time DESC
            LIMIT 1
        """, (vendor_id,))

        result = cursor.fetchone()

        if not result:
            # Default free tier
            return {
                'is_active': True,
                'daily_limit': 1,
                'end_time': None,
                'id': None
            }

        return {
            'is_active': result['is_active'],
            'daily_limit': result['daily_poi_limit'] or 1,
            'end_time': result['end_time'],
            'id': result['id']
        }
    finally:
        cursor.close()
        conn.close()

async def createPOI(user, data, sub_info=None):
    """Create POI with optional subscription info"""
    conn = get_db_connection()
    cursor = conn.cursor()

    poi_id = None

    try:
        # ✅ If subscription info provided, use it
        # This prevents race conditions where sub expires mid-transaction
        if sub_info:
            daily_limit = sub_info['daily_limit']
        else:
            daily_limit = get_vendor_subscription_limit(user["id"])

        # ... rest of creation logic ...
```

---

### 2.2 FIX EC-002: Orphaned POI When Vendor Deleted

**Problem:** When admin deletes vendor, their POI becomes orphaned (owner_id = NULL)

**File:** `app/services/user_services.py`

```python
def deleteUser(user_id: int):
    """Delete user and handle orphaned POI"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if user exists
        cursor.execute("SELECT id, role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            return False, "Không tìm thấy người dùng này."

        # ✅ NEW: If vendor, transfer POI to admin account (id=1)
        if user['role'] == 'vendor':
            admin_id = 1  # Assuming admin has id=1

            # Find or verify admin exists
            cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
            admin = cursor.fetchone()

            if admin:
                # Transfer all vendor POIs to admin
                cursor.execute("""
                    UPDATE pois
                    SET owner_id = %s
                    WHERE owner_id = %s AND is_Deleted = FALSE
                """, (admin['id'], user_id))

                transferred_count = cursor.rowcount
                print(f"Transferred {transferred_count} POI from vendor {user_id} to admin {admin['id']}")
            else:
                # If no admin found, deactivate POI instead
                cursor.execute("""
                    UPDATE pois
                    SET is_Active = FALSE
                    WHERE owner_id = %s AND is_Deleted = FALSE
                """, (user_id,))
                print(f"Deactivated {cursor.rowcount} POI from deleted vendor {user_id}")

        # ✅ NEW: Soft delete user instead of hard delete (keeps history)
        cursor.execute("""
            UPDATE users
            SET is_Deleted = TRUE, is_Blocked = TRUE
            WHERE id = %s
        """, (user_id,))

        conn.commit()
        return True, "Xóa người dùng thành công"

    except Exception as e:
        conn.rollback()
        print(f"Error deleting user: {e}")
        return False, str(e)
    finally:
        cursor.close()
        conn.close()
```

**Update DB Schema to add is_Deleted to users:**

```sql
ALTER TABLE users ADD COLUMN is_Deleted BOOLEAN DEFAULT FALSE AFTER is_Blocked;

-- Update getPois to check is_Deleted
-- WHERE owner.is_Deleted = FALSE
```

---

### 2.3 FIX SEC-005: Implement Rate Limiting

**Problem:** No rate limiting → vulnerable to brute force attacks, API abuse

**Solution: Add Middleware**

**File:** `main.py` or `app.py` (main FastAPI app)

```python
from fastapi import FastAPI
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda r, e: JSONResponse(
    status_code=429,
    content={"detail": "Quá nhiều yêu cầu. Vui lòng thử lại sau."}
))

# Apply global rate limit to all endpoints
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    # Check IP-based rate limit
    # e.g., 100 requests per minute per IP
    response = await call_next(request)
    return response

# Per-endpoint limits
@router.post("/auth/login")
@limiter.limit("5/minute")  # 5 attempts per minute
def login(user: UserLogin, request: Request, response: Response):
    ...

@router.post("/pois/vendor/create")
@limiter.limit("100/hour")  # 100 POI creates per hour per IP
async def create_poi_vendor(data: POICreateVendor, user=Depends(...)):
    ...

@router.get("/pois/get-pois")
@limiter.limit("200/hour")  # 200 requests per hour
def get_pois(...):
    ...
```

**Install SlowAPI:**

```bash
pip install slowapi
```

---

## 3. MEDIUM PRIORITY IMPROVEMENTS

### 3.1 Add Audit Logging

**File:** `app/services/audit_service.py` (new)

```python
from datetime import datetime
from app.database import get_db_connection

class AuditLogger:
    """Log all sensitive operations for audit trail"""

    @staticmethod
    def log(user_id: int, action: str, resource_type: str, resource_id: int,
            details: str = None, status: str = "success"):
        """Log action to audit_logs table"""
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO audit_logs
                (user_id, action, resource_type, resource_id, details, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (user_id, action, resource_type, resource_id, details, status))

            conn.commit()
        except Exception as e:
            print(f"Audit log error: {e}")
        finally:
            cursor.close()
            conn.close()

# Usage in services
audit_logger = AuditLogger()

# In createPOI
audit_logger.log(
    user_id=user['id'],
    action='CREATE',
    resource_type='POI',
    resource_id=poi_id,
    details=f"Created POI: {data.localized.name}"
)

# In updatePOI
audit_logger.log(
    user_id=user['id'],
    action='UPDATE',
    resource_type='POI',
    resource_id=poi_id,
    details=f"Updated POI: {data.localized.name}"
)

# In deletePOI
audit_logger.log(
    user_id=user['id'],
    action='DELETE',
    resource_type='POI',
    resource_id=poi_id,
    details="POI deleted"
)
```

**Database Schema:**

```sql
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),  -- CREATE, READ, UPDATE, DELETE
    resource_type VARCHAR(50),  -- POI, Tour, User, Payment
    resource_id INT,
    details TEXT,
    status VARCHAR(20),  -- success, failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

---

### 3.2 Implement Pagination

**File:** `app/schemas/pagination.py` (new)

```python
from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar('T')

class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 20

    @property
    def offset(self):
        return (self.page - 1) * self.limit

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    limit: int
    pages: int

    @classmethod
    def create(cls, data: List[T], total: int, page: int, limit: int):
        return cls(
            data=data,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit  # Ceiling division
        )
```

**Usage in routes:**

```python
from app.schemas.pagination import PaginationParams, PaginatedResponse

@router.get("/get-pois")
def get_pois(
    page: int = 1,
    limit: int = 20,
    search: str = "",
    user=Depends(verify_active_subscription)
):
    params = PaginationParams(page=page, limit=limit)

    # Get total count
    total = count_pois(user, search)

    # Get paginated data
    pois = getPois(user=user, lang="vi", searchTxt=search,
                   offset=params.offset, limit=params.limit)

    return PaginatedResponse.create(pois, total, page, limit)
```

---

## 4. NICE-TO-HAVE FEATURES

### 4.1 POI Versioning (Edit History)

```python
# Create version table
CREATE TABLE poi_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    version_number INT,
    changed_by INT,
    changes JSON,  -- What changed (old_value, new_value)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES pois(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
) CHARSET=utf8mb4;

# When updating POI, create version record
def updatePOI(user, poi_id, data):
    # ... get old POI data ...
    old_data = {...}

    # ... update POI ...

    # Create version
    changes = json.dumps({
        "thumbnail": {"old": old_data["thumbnail"], "new": new_thumbnail},
        "banner": {"old": old_data["banner"], "new": new_banner},
        ...
    })

    cursor.execute("""
        INSERT INTO poi_versions
        (poi_id, version_number, changed_by, changes)
        VALUES (%s, %s, %s, %s)
    """, (poi_id, version_num, user['id'], changes))
```

---

## 5. SUMMARY OF CRITICAL FIXES

| Priority | Issue                           | Fix                                        | Est. Effort |
| -------- | ------------------------------- | ------------------------------------------ | ----------- |
| 🔴 P0    | BR-010: Empty tour              | Add validation (min 1 POI)                 | 0.5 hour    |
| 🔴 P0    | EC-001: Soft delete cascade     | Switch to hard delete or add trigger       | 1 hour      |
| 🔴 P0    | BR-008: Free user blocked       | Add free tier or remove subscription check | 1 hour      |
| 🔴 P0    | Rate limiting missing           | Add slowapi middleware                     | 1 hour      |
| 🟠 P1    | EC-005: Subscription expiration | Cache subscription at request time         | 2 hours     |
| 🟠 P1    | EC-002: Orphaned POI            | Transfer to admin on vendor delete         | 1.5 hours   |
| 🟡 P2    | Audit logging missing           | Add audit_logs table + logger              | 3 hours     |
| 🟡 P2    | No pagination                   | Add pagination to list endpoints           | 2 hours     |

---

**TOTAL ESTIMATED EFFORT: 12 hours**

**RECOMMENDATION: Fix all P0 issues first (4 hours), then P1 (3.5 hours) in Week 2**

---

Generated: 2026-05-06
Status: ✅ Ready for Implementation
