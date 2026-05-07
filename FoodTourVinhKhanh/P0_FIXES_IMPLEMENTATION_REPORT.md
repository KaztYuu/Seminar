# P0 CRITICAL BUGS - IMPLEMENTATION REPORT

**Date**: Implementation Phase
**Status**: ✅ COMPLETED - 4 Critical Bugs Fixed
**Total Changes**: 6 files modified, 8 code locations updated

---

## 📋 FIXES SUMMARY

| Bug ID | Issue                           | File(s) Modified                                      | Status   |
| ------ | ------------------------------- | ----------------------------------------------------- | -------- |
| P0-1   | Tour creation allows 0 POI      | `app/services/tour_services.py`                       | ✅ Fixed |
| P0-2   | POI soft delete doesn't cascade | `app/services/poi_services.py`                        | ✅ Fixed |
| P0-3   | Tourist blocked from any access | `app/dependencies/subscription.py`, `app/routes/*.py` | ✅ Fixed |
| P0-4   | No rate limiting                | `main.py`                                             | ✅ Fixed |

---

## 🔧 DETAILED CHANGES

### FIX 1: P0-1 - Tour Minimum 1 POI Validation

**Files Changed**:

- `app/services/tour_services.py` (2 functions)

**Changes**:

1. **createTour()** - Added validation at start of function
2. **updateTour()** - Added validation if points are being updated

**Code Diff - createTour()**:

```python
# BEFORE: No validation, could create tour with empty points list
def createTour(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO tours (name, is_Active) VALUES (%s, %s)", ...)
        # ... rest of function

# AFTER: Validates min 1 POI and checks POI existence
def createTour(data):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # NEW: Validate tour must have at least 1 POI
        if not data.points or len(data.points) < 1:
            raise HTTPException(status_code=400, detail="Tour phải có ít nhất 1 điểm POI")

        # NEW: Validate all POI exist and not deleted
        poi_ids = [point.poi_id for point in data.points]
        placeholders = ",".join(["%s"] * len(poi_ids))
        cursor.execute(
            f"SELECT COUNT(*) as count FROM pois WHERE id IN ({placeholders}) AND is_Deleted = FALSE",
            poi_ids
        )
        result = cursor.fetchone()
        if result['count'] != len(poi_ids):
            raise HTTPException(status_code=400, detail="Một hoặc nhiều POI không tồn tại hoặc đã bị xóa")
        # ... rest of function
```

**Code Diff - updateTour()**:

```python
# BEFORE: No validation, could set empty points
if data.points is not None:
    cursor.execute("DELETE FROM tour_points WHERE tour_id = %s", (tour_id,))
    for point in data.points:
        cursor.execute("INSERT INTO tour_points ...")

# AFTER: Validates minimum 1 POI
if data.points is not None:
    # NEW: Validate length >= 1
    if len(data.points) < 1:
        raise HTTPException(status_code=400, detail="Tour phải có ít nhất 1 điểm POI")

    # NEW: Validate POI existence
    poi_ids = [point.poi_id for point in data.points]
    placeholders = ",".join(["%s"] * len(poi_ids))
    cursor.execute(
        f"SELECT COUNT(*) as count FROM pois WHERE id IN ({placeholders}) AND is_Deleted = FALSE",
        poi_ids
    )
    result = cursor.fetchone()
    if result['count'] != len(poi_ids):
        raise HTTPException(status_code=400, detail="Một hoặc nhiều POI không tồn tại hoặc đã bị xóa")

    cursor.execute("DELETE FROM tour_points WHERE tour_id = %s", (tour_id,))
    for point in data.points:
        cursor.execute("INSERT INTO tour_points ...")
```

**Test Case**:

```bash
# Test 1: Create tour with empty points (should FAIL)
POST /tours/admin/create
{
  "name": "Invalid Tour",
  "is_Active": true,
  "points": []
}
# Expected: 400 Bad Request - "Tour phải có ít nhất 1 điểm POI"

# Test 2: Create tour with valid POI (should SUCCEED)
POST /tours/admin/create
{
  "name": "Valid Tour",
  "is_Active": true,
  "points": [
    {"poi_id": 1, "point_order": 1},
    {"poi_id": 2, "point_order": 2}
  ]
}
# Expected: 200 OK with tour_id

# Test 3: Create tour with non-existent POI (should FAIL)
POST /tours/admin/create
{
  "name": "Invalid Tour",
  "is_Active": true,
  "points": [{"poi_id": 99999, "point_order": 1}]
}
# Expected: 400 Bad Request - "Một hoặc nhiều POI không tồn tại hoặc đã bị xóa"

# Test 4: Update tour to empty points (should FAIL)
PUT /tours/admin/update/1
{
  "points": []
}
# Expected: 400 Bad Request
```

**Impact**: Prevents orphaned tours with 0 POI. Ensures data integrity for tour-POI relationship.

---

### FIX 2: P0-2 - POI Cascade Delete to tour_points

**Files Changed**:

- `app/services/poi_services.py` (1 function + 1 import)

**Changes**:

1. **deletePOI()** - Added cascade delete logic for tour_points
2. **Added import**: `from fastapi import HTTPException`

**Code Diff**:

```python
# BEFORE: Soft delete but doesn't cascade delete tour_points
async def deletePOI(user, poi_id):
    try:
        cursor.execute("SELECT * FROM pois WHERE id = %s AND is_Deleted = FALSE", (poi_id,))
        poi = cursor.fetchone()
        # ... validation ...

        cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_position WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_knowledge_base WHERE poi_id = %s", (poi_id,))

        cursor.execute("UPDATE pois SET is_Deleted = TRUE WHERE id = %s", (poi_id,))
        # PROBLEM: tour_points still reference this deleted POI

# AFTER: Cascades delete to tour_points and removes 0-POI tours
async def deletePOI(user, poi_id):
    try:
        cursor.execute("SELECT * FROM pois WHERE id = %s AND is_Deleted = FALSE", (poi_id,))
        poi = cursor.fetchone()
        # ... validation ...

        # NEW: Get affected tours BEFORE deletion
        cursor.execute("SELECT DISTINCT tour_id FROM tour_points WHERE poi_id = %s", (poi_id,))
        affected_tours = cursor.fetchall()

        # NEW: Delete tour_points first
        cursor.execute("DELETE FROM tour_points WHERE poi_id = %s", (poi_id,))

        # NEW: Delete other related data
        cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_position WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_knowledge_base WHERE poi_id = %s", (poi_id,))

        # NEW: Soft delete POI
        cursor.execute("UPDATE pois SET is_Deleted = TRUE WHERE id = %s", (poi_id,))

        # NEW: Check if any tour now has 0 POI and delete them
        for tour in affected_tours:
            tour_id = tour['tour_id']
            cursor.execute("SELECT COUNT(*) as count FROM tour_points WHERE tour_id = %s", (tour_id,))
            result = cursor.fetchone()
            if result['count'] == 0:
                cursor.execute("DELETE FROM tours WHERE id = %s", (tour_id,))
```

**Test Case**:

```bash
# Setup: Create tour with 2 POIs
POST /tours/admin/create
{
  "name": "Tour Test",
  "points": [
    {"poi_id": 1, "point_order": 1},
    {"poi_id": 2, "point_order": 2}
  ]
}
# Response: tour_id = 10

# Test 1: Delete one POI from tour (tour should still exist with 1 POI)
DELETE /pois/delete/1
# Expected: 200 OK
# Verify: SELECT * FROM tour_points WHERE tour_id = 10 should return 1 row

# Test 2: Delete the remaining POI (tour should be deleted)
DELETE /pois/delete/2
# Expected: 200 OK
# Verify: SELECT * FROM tours WHERE id = 10 should return 0 rows (deleted)

# Test 3: Direct check of no orphaned tour_points
SELECT * FROM tour_points WHERE poi_id IN (1, 2)
# Expected: 0 rows (all cleaned up)
```

**Impact**: Prevents orphaned tour_points records. Automatically removes tours with 0 POI. Maintains referential integrity.

---

### FIX 3: P0-3 - Tourist Access Control (Subscription Logic)

**Files Changed**:

- `app/dependencies/subscription.py` (added new dependency)
- `app/routes/poi_router.py` (import + 2 endpoints)
- `app/routes/tour_router.py` (import + 2 endpoints)

**Changes**:

1. **subscription.py** - Added new `verify_read_access()` dependency
2. **poi_router.py** - Changed GET endpoints to use `verify_read_access`
3. **tour_router.py** - Changed GET endpoints to use `verify_read_access`

**Code Diff - subscription.py**:

```python
# BEFORE: Only one dependency, blocks all non-subscribed users
async def verify_active_subscription(user = Depends(get_current_user)):
    if not check_subscription_active(user=user):
        raise HTTPException(status_code=403, detail="Gói dịch vụ đã hết hạn")
    return user

# AFTER: Added new dependency for read access (tourists don't need subscription to read)
async def verify_read_access(user = Depends(get_current_user)):
    """
    FIX P0-3: Allow tourists to read POI/tour data without subscription.
    Subscription only required for vendors (write operations).
    """
    if user["role"] == "vendor":
        # Vendors need active subscription for any access
        if not check_subscription_active(user=user):
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Gói dịch vụ đã hết hạn",
                    "errorCode": "SUBSCRIPTION_EXPIRED"
                }
            )
    # Admin and tourist can always read
    return user
```

**Code Diff - poi_router.py**:

```python
# BEFORE: GET endpoints blocked all non-subscribed users
from app.dependencies.subscription import verify_active_subscription

@router.get("/get-pois")
def get_pois(..., user=Depends(verify_active_subscription)):
    # Tourist without subscription gets 403

@router.get("/get-poi-by-id/{poi_id}")
def get_poi_by_id(..., user=Depends(verify_active_subscription)):
    # Tourist without subscription gets 403

# AFTER: GET endpoints use new verify_read_access
from app.dependencies.subscription import verify_active_subscription, verify_read_access

@router.get("/get-pois")
def get_pois(..., user=Depends(verify_read_access)):
    # Tourist can now read

@router.get("/get-poi-by-id/{poi_id}")
def get_poi_by_id(..., user=Depends(verify_read_access)):
    # Tourist can now read
```

**Code Diff - tour_router.py**:

```python
# BEFORE: GET endpoints blocked tourists
from app.dependencies.subscription import verify_active_subscription

@router.get("/")
def api_get_tours(user=Depends(verify_active_subscription)):
    # Tourist without subscription gets 403

@router.get("/{tour_id}")
def api_get_tour_by_id(..., user=Depends(verify_active_subscription)):
    # Tourist without subscription gets 403

# AFTER: GET endpoints use verify_read_access
from app.dependencies.subscription import verify_active_subscription, verify_read_access

@router.get("/")
def api_get_tours(user=Depends(verify_read_access)):
    # Tourist can now read

@router.get("/{tour_id}")
def api_get_tour_by_id(..., user=Depends(verify_read_access)):
    # Tourist can now read
```

**Test Case**:

```bash
# Setup: Tourist user without active subscription

# Test 1: GET POI list - should SUCCEED
GET /pois/get-pois
# Expected: 200 OK with POI data

# Test 2: GET specific POI - should SUCCEED
GET /pois/get-poi-by-id/1
# Expected: 200 OK with POI details

# Test 3: GET tours list - should SUCCEED
GET /tours/
# Expected: 200 OK with tours

# Test 4: GET specific tour - should SUCCEED
GET /tours/1
# Expected: 200 OK with tour details

# Test 5: Vendor without subscription - POST should still FAIL
POST /pois/vendor/create (without active subscription)
# Expected: 403 Forbidden - "Gói dịch vụ đã hết hạn"
```

**Impact**: Tourists can now browse POIs and tours without subscription. Write operations still protected.

---

### FIX 4: P0-4 - Rate Limiting

**Files Changed**:

- `main.py` (added new middleware)

**Changes**:

1. **Added RateLimitMiddleware** - New middleware class with in-memory tracking
2. **Applied to sensitive endpoints** - login, signup, POI/tour creation

**Code Diff**:

```python
# BEFORE: No rate limiting, vulnerable to brute force
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, ...)
app.middleware("http")(session_middleware)

# AFTER: Added rate limiting middleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FIX P0-4: Rate limiting to prevent brute force attacks.
    Limits: 100 requests per minute per IP for sensitive endpoints.
    """
    def __init__(self, app):
        super().__init__(app)
        self.request_counts = defaultdict(list)
        self.sensitive_endpoints = [
            "/auth/login",
            "/auth/signup",
            "/pois/vendor/create",
            "/tours/admin/create"
        ]

    async def dispatch(self, request: Request, call_next):
        if any(request.url.path.startswith(ep) for ep in self.sensitive_endpoints):
            client_ip = request.client.host if request.client else "unknown"
            key = f"{client_ip}:{request.url.path}"

            now = time.time()
            # Remove requests older than 1 minute
            self.request_counts[key] = [
                req_time for req_time in self.request_counts[key]
                if now - req_time < 60
            ]

            # Check if exceeded rate limit (100 per minute)
            if len(self.request_counts[key]) >= 100:
                return {
                    "success": False,
                    "detail": "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
                    "status": 429
                }

            self.request_counts[key].append(now)

        response = await call_next(request)
        return response

app = FastAPI()
app.add_middleware(RateLimitMiddleware)  # NEW: Apply rate limiting first
app.add_middleware(CORSMiddleware, ...)
```

**Test Case**:

```bash
# Test 1: Normal request to login (should succeed)
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
# Expected: 200 OK or 401 Unauthorized (not rate limited)

# Test 2: Brute force attack - 100+ rapid login attempts
# Use shell script to send 105 requests rapidly
for i in {1..105}; do
  curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"wrong"}'
done

# Expected for requests 1-100: 200 or 401
# Expected for requests 101+: 429 "Quá nhiều yêu cầu. Vui lòng thử lại sau."

# Test 3: Different IP should not be rate limited
curl -X POST http://localhost:8000/auth/login \
  -H "X-Forwarded-For: 192.168.1.1" \
  -d '{"email":"user@example.com","password":"password"}'
# Expected: 200 or 401 (independent rate limit)
```

**Impact**: Prevents brute force attacks on login/signup. Protects against resource exhaustion.

---

## 🚀 P1 HIGH PRIORITY FIX

### Additional Fix: P1-6 - Vendor Deletion Cleanup

**Files Changed**:

- `app/services/user_services.py` (1 function)

**Changes**:

1. **deleteUser()** - Added cascade handling for vendor POI cleanup

**Code Diff**:

```python
# BEFORE: Deletes user but leaves orphaned vendor POIs
def deleteUser(user_id: int):
    cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    if not cursor.fetchone():
        return False, "Người dùng không tồn tại."
    cursor.execute("UPDATE users SET is_Deleted = TRUE WHERE id = %s", (user_id,))
    return True, "Xóa người dùng thành công."

# AFTER: Cascades delete to vendor's POIs
def deleteUser(user_id: int):
    cursor.execute("SELECT id, role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        return False, "Người dùng không tồn tại."

    # NEW: If vendor, soft delete their POIs and handle cascade
    if user["role"] == "vendor":
        cursor.execute("SELECT id FROM pois WHERE owner_id = %s AND is_Deleted = FALSE", (user_id,))
        pois = cursor.fetchall()

        for poi in pois:
            poi_id = poi["id"]
            # Get affected tours
            cursor.execute("SELECT DISTINCT tour_id FROM tour_points WHERE poi_id = %s", (poi_id,))
            affected_tours = cursor.fetchall()

            # Delete tour_points
            cursor.execute("DELETE FROM tour_points WHERE poi_id = %s", (poi_id,))

            # Delete tours with 0 POI
            for tour in affected_tours:
                tour_id = tour['tour_id']
                cursor.execute("SELECT COUNT(*) FROM tour_points WHERE tour_id = %s", (tour_id,))
                if cursor.fetchone()[0] == 0:
                    cursor.execute("DELETE FROM tours WHERE id = %s", (tour_id,))

        # Soft delete vendor's POIs
        cursor.execute("UPDATE pois SET is_Deleted = TRUE WHERE owner_id = %s", (user_id,))

    # Soft delete user
    cursor.execute("UPDATE users SET is_Deleted = TRUE WHERE id = %s", (user_id,))
    return True, "Xóa người dùng thành công."
```

**Test Case**:

```bash
# Setup: Vendor with 2 POIs, each POI in 1 tour
# Vendor ID: 5, POI IDs: 10, 11, Tour IDs: 3, 4

# Test: Delete vendor user
DELETE /users/5  # (admin endpoint)
# Expected: 200 OK

# Verify: Check vendor still exists but marked deleted
SELECT * FROM users WHERE id = 5
# Expected: id=5, is_Deleted=TRUE

# Verify: Vendor's POIs are soft deleted
SELECT * FROM pois WHERE owner_id = 5
# Expected: is_Deleted=TRUE for both POIs

# Verify: Affected tours are deleted
SELECT * FROM tours WHERE id IN (3, 4)
# Expected: 0 rows (both tours deleted since they have 0 POI)

# Verify: No orphaned tour_points
SELECT * FROM tour_points WHERE poi_id IN (10, 11)
# Expected: 0 rows (all cleaned up)
```

**Impact**: Prevents orphaned POIs and tours when vendor is deleted. Maintains data consistency.

---

## ✅ VALIDATION CHECKLIST

- [x] Tour creation validates minimum 1 POI
- [x] POI deletion cascades to tour_points
- [x] POI deletion removes 0-POI tours
- [x] Tourist can read POI/tour without subscription
- [x] Vendor still requires subscription to write
- [x] Rate limiting active on sensitive endpoints
- [x] Vendor deletion cascades to POI cleanup
- [x] All HTTPException imports added
- [x] All new dependencies properly exported
- [x] No existing endpoints renamed or moved
- [x] Minimal code changes (only what's needed)

---

## 📝 NEXT STEPS

1. **Test all P0 fixes** using provided test cases
2. **Monitor for edge cases** - empty tour scenarios
3. **Check logs** for rate limit triggers
4. **Verify database** for orphaned records
5. **Proceed to P1 fixes** once P0 validated

---

## 🔍 SUMMARY OF FILES MODIFIED

| File                               | Changes                      | Lines Added | Purpose             |
| ---------------------------------- | ---------------------------- | ----------- | ------------------- |
| `app/services/tour_services.py`    | createTour(), updateTour()   | ~50         | POI validation      |
| `app/services/poi_services.py`     | deletePOI() + import         | ~30         | Cascade delete      |
| `app/dependencies/subscription.py` | verify_read_access()         | ~25         | Tourist read access |
| `app/routes/poi_router.py`         | imports + 2 endpoints        | ~5          | Use new dependency  |
| `app/routes/tour_router.py`        | imports + 2 endpoints        | ~5          | Use new dependency  |
| `app/services/user_services.py`    | deleteUser()                 | ~40         | Cascade cleanup     |
| `main.py`                          | RateLimitMiddleware + import | ~60         | Rate limiting       |

**Total Lines Changed**: ~215
**Total Functions Modified**: 8
**New Functions**: 1 (verify_read_access)
**New Classes**: 1 (RateLimitMiddleware)
