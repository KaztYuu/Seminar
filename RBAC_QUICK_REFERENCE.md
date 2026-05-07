# QUICK REFERENCE - RBAC PERMISSION MATRIX

## 1. PERMISSIONS OVERVIEW

```
╔═══════════════════════════════════════════════════════════════════════╗
║                      ROLE PERMISSION MATRIX                          ║
║                     (Quick Decision Table)                           ║
╠════════════════════════════╦════════╦════════╦════════════════════════╣
║ OPERATION                  ║ ADMIN  ║ VENDOR ║ TOURIST                ║
╠════════════════════════════╬════════╬════════╬════════════════════════╣
║ POI CREATE                 ║  ✅   ║  ✅*   ║  ❌                    ║
║   - Can set is_Active      ║  ✅   ║  ❌    ║  ❌                    ║
║   - Daily limit enforced   ║  ❌   ║  ✅    ║  ❌                    ║
║                            ║       ║        ║                        ║
║ POI VIEW                   ║  ALL  ║  OWN   ║  ACTIVE+VENDOR_SUB     ║
║ POI EDIT                   ║  ALL  ║  OWN*  ║  ❌                    ║
║ POI DELETE                 ║  ALL  ║  OWN   ║  ❌                    ║
║                            ║       ║        ║                        ║
║ TOUR CREATE                ║  ✅   ║  ❌    ║  ❌                    ║
║ TOUR VIEW                  ║  ALL  ║  ❌    ║  ACTIVE                ║
║ TOUR EDIT                  ║  ✅   ║  ❌    ║  ❌                    ║
║ TOUR DELETE                ║  ✅   ║  ❌    ║  ❌                    ║
║                            ║       ║        ║                        ║
║ USER MANAGE                ║  ✅   ║  ❌    ║  ❌                    ║
║ PROFILE UPDATE             ║  ✅   ║  ✅    ║  ✅                    ║
║ PASSWORD CHANGE            ║  ✅   ║  ✅    ║  ✅                    ║
║                            ║       ║        ║                        ║
║ PACKAGE MANAGE             ║  ✅   ║  ❌    ║  ❌                    ║
║ PACKAGE BUY                ║  ❌   ║  ✅    ║  ✅                    ║
║ PAYMENT VIEW               ║  ALL  ║  OWN   ║  OWN                   ║
║                            ║       ║        ║                        ║
║ DASHBOARD                  ║  ✅   ║  ❌    ║  ❌                    ║
║ AUDIT LOG                  ║  ✅   ║  ❌    ║  ❌                    ║
╚════════════════════════════╩════════╩════════╩════════════════════════╝

Legend:
  ✅ = Allowed
  ❌ = Denied (403 Forbidden)
  * = Conditional (e.g., only own POI, cannot set is_Active)
  ALL = All records
  OWN = Only own records
  ACTIVE+VENDOR_SUB = POI must be active AND vendor must have active subscription
```

---

## 2. KEY ACCESS CONTROL RULES

### 2.1 POI Access Rules

#### Create POI

```javascript
if (user.role === "admin") {
  // ✅ Can create POI
  // ✅ Can set is_Active = true/false
  // ✅ NO daily limit
  // ✅ NO subscription required
} else if (user.role === "vendor") {
  // ✅ Can create POI
  // ❌ Cannot set is_Active (always false initially)
  // ✅ Daily limit enforced (daily_poi_limit from subscription)
  // ✅ Subscription REQUIRED (verify_active_subscription)
  // Result: 429 Too Many Requests if over limit
} else {
  // ❌ Tourist cannot create
  // Result: 403 Forbidden
}
```

#### View POI

```javascript
if (user.role === "admin") {
  // ✅ See ALL POI (including inactive, expired, deleted)
  // ✓ SELECT * FROM pois WHERE is_Deleted = FALSE
} else if (user.role === "vendor") {
  // ✅ See own POI ONLY
  // ✓ WHERE owner_id = user.id AND is_Deleted = FALSE
  // ✓ See both active and inactive POI
} else {
  // ✅ See active POI from active vendors
  // ✓ WHERE is_Active = TRUE AND is_Deleted = FALSE
  // ✓ AND (owner.role = 'admin' OR vendor_sub.end_time > NOW)
  // Requires: verify_active_subscription()
}
```

#### Edit/Delete POI

```javascript
if (user.role === "admin") {
  // ✅ Can edit/delete ANY POI
} else if (user.role === "vendor") {
  // ✅ Can edit/delete ONLY OWN POI
  // ❌ Cannot change is_Active status (admin only)
  // Requires: verify_active_subscription()
  // if (poi.owner_id !== user.id) return 403
} else {
  // ❌ Tourist cannot edit/delete
  // Result: 403 Forbidden
}
```

### 2.2 Tour Access Rules

```javascript
if (user.role === "admin") {
  // ✅ Create, view all, edit, delete tours
  // Route: POST /tours/admin/create
  // Route: GET /tours/admin
  // Route: PUT /tours/admin/update/{id}
  // Route: DELETE /tours/admin/delete/{id}
} else if (user.role === "vendor") {
  // ❌ Cannot access any tour endpoints
  // All tour endpoints require admin role
} else {
  // ✅ View active tours only
  // Route: GET /tours/ (returns is_Active=TRUE only)
  // Route: GET /tours/{id}
  // Requires: verify_active_subscription()
}
```

### 2.3 Package & Subscription Rules

```javascript
if (user.role === "admin") {
  // ✅ CRUD all packages
  // ✅ View all subscriptions/payments
  // Route: POST /packages/create
  // Route: PUT /packages/update/{id}
  // Route: DELETE /packages/delete/{id}
} else if (user.role === "vendor" || user.role === "tourist") {
  // ✅ View packages for their role
  // ✅ Buy packages
  // ✅ View own subscription
  // ✅ View own payments
  // ❌ Cannot manage packages
} else {
  // ❌ No access
}
```

---

## 3. CRITICAL WORKFLOWS

### 3.1 Vendor POI Creation Workflow

```
1. Vendor calls POST /pois/vendor/create
   ↓
2. Check: require_role("vendor") ✓ (must be vendor)
   ↓
3. Check: verify_active_subscription()
   → if expired: 403 SUBSCRIPTION_EXPIRED
   ↓
4. Check: check_vendor_poi_limit()
   - Fetch vendor's subscription.daily_poi_limit
   - Count POI created today: SELECT COUNT(*) WHERE DATE(created_at) = CURDATE()
   - if today_count >= daily_poi_limit: 429 Too Many Requests
   ↓
5. Create POI with:
   - owner_id = vendor_id
   - is_Active = FALSE (pending admin approval)
   - audio_range = 30m (hardcoded)
   - access_range = 10m (hardcoded)
   ↓
6. Return: poi_id + remaining quota
```

### 3.2 Tourist POI View Workflow

```
1. Tourist calls GET /pois/get-pois
   ↓
2. Check: get_current_user() ✓ (must be logged in)
   ↓
3. Check: verify_active_subscription()
   - Query tourist_subscriptions WHERE end_time > NOW()
   - if not found or expired: 403 SUBSCRIPTION_EXPIRED
   ↓
4. Build filtered query:
   WHERE p.is_Deleted = FALSE
     AND p.is_Active = TRUE
     AND (
       owner.role = 'admin'
       OR (owner.role = 'vendor' AND vendor_sub.end_time > NOW())
     )
   ↓
5. Return: list of visible POI (with language localization)
   - Include audio_url for TTS playback
   - Filter applied server-side (not at DB)
```

### 3.3 Subscription Expiration Cascade

```
Vendor Scenario:
- Vendor has active subscription with end_time = 2026-05-06 10:00:00
- At 2026-05-06 10:00:01:
  - Vendor can still create POI?
    → NO (verify_active_subscription fails)
  - Vendor's existing POI still visible to tourist?
    → NO (is_Expired filter kicks in)
  - Vendor can edit own POI?
    → NO (verify_active_subscription blocks)
  - Vendor can view own POI?
    → YES (GetPois filters by owner_id, no subscription check)

Tourist Scenario:
- Tourist views POI list with Vendor1's POI visible
- Vendor1's subscription expires (end_time < NOW)
- At next GET /pois/get-pois:
  - Vendor1's POI disappears from list (visibility filter)
  - POI data still in DB (not deleted)
  - If tourist bookmarks URL to specific POI:
    → GET /pois/get-poi-by-id/{id} returns 404
    → because query checks vendor_sub.end_time > NOW
```

---

## 4. CONDITIONAL ACCESS DECISION TREE

```
User tries to access resource
├─ Is user logged in?
│  ├─ NO → 401 Unauthorized (redirect to login)
│  └─ YES → continue
│
├─ Does user have correct role?
│  ├─ NO → 403 Forbidden
│  └─ YES → continue
│
├─ Does user's subscription exist and is active?
│  ├─ NO (if required by endpoint)
│  │  └─ 403 SUBSCRIPTION_EXPIRED
│  └─ YES or NOT REQUIRED → continue
│
├─ Is resource owned by user (if applicable)?
│  ├─ NO (for vendor-only-own-resource)
│  │  └─ 403 Forbidden (not owner)
│  └─ YES or NOT APPLICABLE → continue
│
├─ Is resource in correct state (active, not deleted)?
│  ├─ NO (if required by endpoint)
│  │  └─ 404 Not Found or skip from results
│  └─ YES or NOT REQUIRED → continue
│
└─ ✅ GRANT ACCESS
```

---

## 5. ERROR RESPONSES

### 5.1 Common HTTP Status Codes

```
200 OK
└─ Success

201 Created
└─ Resource created

400 Bad Request
├─ Validation error (invalid lat/lng, missing fields)
├─ Business logic error (tour empty)
└─ Example: "Bạn đã đạt giới hạn tối đa POI trong hôm nay"

401 Unauthorized
├─ Not logged in (no session_id)
├─ Session expired
└─ Invalid credentials

403 Forbidden
├─ Wrong role (tourist trying to create POI)
├─ Subscription expired (SUBSCRIPTION_EXPIRED)
├─ Not owner of resource
└─ Blocked user

404 Not Found
├─ Resource doesn't exist
├─ Resource is soft-deleted
├─ Resource doesn't belong to user
└─ Example: "Không tìm thấy POI hoặc bạn không có quyền truy cập"

429 Too Many Requests
└─ Exceeded daily POI limit

500 Internal Server Error
└─ Server error (should not happen in normal operation)
```

---

## 6. DEPENDENCY CHAIN

```
All endpoints (except auth):
  ↓
  get_current_user() [checks session_id cookie]
    ↓
    If 401 → Redirect to /auth/login
    ↓

Endpoints that modify/view sensitive data (POI, Tour, User):
  ↓
  require_role([...]) [checks user.role]
    ↓
    If wrong role → 403 Forbidden
    ↓

Endpoints for Vendor/Tourist (POI create, Tour view):
  ↓
  verify_active_subscription() [checks subscription]
    ↓
    If no active subscription → 403 SUBSCRIPTION_EXPIRED
    ↓

Vendor POI creation:
  ↓
  check_vendor_poi_limit() [checks daily quota]
    ↓
    If over limit → 429 Too Many Requests
```

---

## 7. QUICK DECISION MATRIX (Copy-Paste Reference)

### Can User X do Action Y?

**Action: Create POI**

```
if role == 'admin': return ALLOW
if role == 'vendor' and has_active_subscription: return ALLOW (daily_limit check)
else: return 403 FORBIDDEN
```

**Action: View POI List**

```
if role == 'admin': return ALL_POI
if role == 'vendor': return OWN_POI
if role == 'tourist' and has_active_subscription:
    return ACTIVE_POI_WITH_ACTIVE_VENDORS
else: return 403 FORBIDDEN
```

**Action: Edit POI**

```
if role == 'admin': return ALLOW
if role == 'vendor' and is_owner and has_active_subscription: return ALLOW (no is_Active change)
else: return 403 FORBIDDEN
```

**Action: Delete POI**

```
if role == 'admin': return ALLOW
if role == 'vendor' and is_owner and has_active_subscription: return ALLOW
else: return 403 FORBIDDEN
```

**Action: Create Tour**

```
if role == 'admin' and poi_count >= 1: return ALLOW
else: return 403 FORBIDDEN
```

**Action: View Tours**

```
if role == 'admin': return ALL_TOURS
if role == 'tourist' and has_active_subscription: return ACTIVE_TOURS
else: return 403 FORBIDDEN
```

**Action: Manage Users/Packages**

```
if role == 'admin': return ALLOW
else: return 403 FORBIDDEN
```

---

## 8. EDGE CASES & GOTCHAS

| Case                                            | What Happens                       | Result                                               |
| ----------------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| Vendor subscription expires while uploading POI | Request in-flight when sub expires | POI may be created but then invisible                |
| Tourist has no subscription, tries to view POI  | verify_active_subscription() fails | 403 SUBSCRIPTION_EXPIRED                             |
| Vendor deletes POI that's in active tour        | Soft delete (is_Deleted=TRUE)      | Tour becomes broken (tour_points still reference it) |
| Admin creates tour without POI (0 points)       | ⚠️ NO VALIDATION                   | Tour created but may cause errors                    |
| Vendor with deleted account                     | owner_id = NULL                    | POI orphaned, invisible to tourists                  |
| Tourist visits POI URL when vendor sub expires  | is_Expired filter triggers         | 404 "không tìm thấy"                                 |
| Cache not invalidated after POI update          | Old data served                    | Stale data shown to users                            |
| Duplicate POI (same location, same vendor)      | ⚠️ ALLOWED                         | No unique constraint                                 |

---

## 9. IMPLEMENTATION CHECKLIST

### For Backend Developers

- [ ] Always use `require_role()` guard on admin-only endpoints
- [ ] Always use `verify_active_subscription()` on vendor/tourist content endpoints
- [ ] Check ownership before allowing edit/delete on vendor resources
- [ ] Validate tour has ≥1 POI before creation
- [ ] Validate POI exists and is active before adding to tour
- [ ] Invalidate cache after mutations
- [ ] Use parameterized queries (protection against SQL injection)
- [ ] Log all sensitive operations (for audit trail)

### For Frontend Developers

- [ ] Hide admin buttons if user.role !== 'admin'
- [ ] Show "subscription expired" message if 403 with SUBSCRIPTION_EXPIRED
- [ ] Check remaining POI quota after successful POI creation
- [ ] Handle 404 gracefully (POI might be deleted)
- [ ] Redirect to subscription page if 403 SUBSCRIPTION_EXPIRED
- [ ] Clear sensitive data from browser cache on logout

### For QA Testers

- [ ] Test all endpoints with each role (admin, vendor, tourist)
- [ ] Test subscription expiration scenarios
- [ ] Test POI daily limit edge cases (quota = 0, quota = 1, quota > 1)
- [ ] Test cache invalidation (data consistency)
- [ ] Test cascade delete (tour with deleted POI)
- [ ] Test soft delete (is_Deleted flag)
- [ ] Test concurrent requests (race conditions)

---

## 10. QUICK LINKS TO SOURCE CODE

| Component          | File                           | Key Functions                                                 |
| ------------------ | ------------------------------ | ------------------------------------------------------------- |
| Auth               | `dependencies/auth.py`         | `get_current_user()`, `require_role()`                        |
| POI Routes         | `routes/poi_router.py`         | `/pois/admin/create`, `/pois/vendor/create`, `/pois/get-pois` |
| POI Services       | `services/poi_services.py`     | `createPOI()`, `updatePOI()`, `deletePOI()`, `getPois()`      |
| POI Quota          | `services/poi_services.py`     | `check_vendor_poi_limit()`, `get_remaining_poi_quota()`       |
| Tour Routes        | `routes/tour_router.py`        | `/tours/admin/create`, `/tours/`, `/tours/{id}`               |
| Tour Services      | `services/tour_services.py`    | `createTour()`, `getTours()`, `deleteTour()`                  |
| User Routes        | `routes/user_router.py`        | `/users/get-users`, `/users/create`, `/users/delete`          |
| User Services      | `services/user_services.py`    | `createUser()`, `updateUser()`, `deleteUser()`                |
| Package Routes     | `routes/package_router.py`     | `/packages/get-all`, `/packages/create`                       |
| Payment Routes     | `routes/payment_router.py`     | `/payments/create`, `/payments/my-payments`                   |
| Subscription Check | `dependencies/subscription.py` | `verify_active_subscription()`                                |
| Database           | `config/db/db.sql`             | Table schemas, FK relationships                               |

---

**Last Updated:** 2026-05-06  
**Status:** ✅ Ready for Implementation
