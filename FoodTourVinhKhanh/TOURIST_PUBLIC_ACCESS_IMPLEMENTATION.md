# Tourist Public Access Implementation

## Overview
Modified the system to allow public access to the tourist map without requiring authentication. Users can now click "Khám phá bản đồ với Tourist" button and view the map/POIs without logging in.

---

## Backend Changes

### 1. New Optional Authentication Dependency
**File:** `Backend/app/dependencies/auth.py`

Added `get_optional_user()` function that:
- Checks for session_id in cookies
- Returns authenticated user if session exists
- Returns a public tourist user object if no session (role="tourist", id=0)
- Does NOT throw 401 error

```python
def get_optional_user(request: Request):
    """
    Optional authentication for public access (tourist map).
    Returns authenticated user if session exists, otherwise returns public tourist user.
    """
    # Returns: {"id": 0, "role": "tourist", "email": "public@tourist.local", "is_authenticated": False}
```

### 2. New Public Read Access Dependency
**File:** `Backend/app/dependencies/subscription.py`

Added `verify_read_access_public()` function that:
- Uses `get_optional_user` instead of `get_current_user`
- Allows public tourists to read POI data
- Still requires subscription check for vendors
- Allows all authenticated users to read

```python
async def verify_read_access_public(user = Depends(get_optional_user)):
    """PUBLIC ACCESS: Allow unauthenticated users to read POI data."""
```

### 3. Updated POI Routes for Public Access
**File:** `Backend/app/routes/poi_router.py`

Modified two endpoints to use public access dependency:

#### a) GET /pois/get-pois
**Before:** `user=Depends(verify_read_access)` (required authentication)
**After:** `user=Depends(verify_read_access_public)` (allows public access)

#### b) GET /pois/get-poi-by-id/{poi_id}
**Before:** `user=Depends(verify_read_access)` (required authentication)
**After:** `user=Depends(verify_read_access_public)` (allows public access)

**Import Updated:**
```python
from app.dependencies.subscription import verify_active_subscription, verify_read_access, verify_read_access_public
```

**Result:** These endpoints now return:
- 200 OK with POI data for public tourists
- 200 OK with filtered POI data for authenticated tourists
- 200 OK with vendor's own POIs for vendors
- 200 OK with all POIs for admins

---

## Frontend Changes

### 1. API Interceptor Exception
**File:** `Frontend/src/utils/api.jsx`

Added `/tourist-map` to auth bypass list:

**Before:**
```javascript
const isAuthPage = ["/login", "/", "/signup"].includes(window.location.pathname);
```

**After:**
```javascript
const isAuthPage = ["/login", "/", "/signup", "/tourist-map"].includes(window.location.pathname);
```

**Result:** When on `/tourist-map`, the 401 error interceptor will NOT:
- Show error toast
- Redirect to login page

### 2. New Public Map Component (Already Created)
**File:** `Frontend/src/pages/public/TouristMapPublic.jsx`

Features:
- No authentication required
- Display map with POI markers
- Show nearby POIs list
- Play audio for POIs
- Search POIs
- View POI details (read-only)

---

## Data Flow

### Public Tourist Flow
```
1. User visits Login page
2. Clicks "🗺️ Khám phá bản đồ với Tourist" button
3. Navigates to /tourist-map
4. Frontend calls GET /pois/get-pois (no Authorization header)
5. Backend receives request:
   - No session_id in cookies
   - get_optional_user returns: {"id": 0, "role": "tourist", ...}
   - verify_read_access_public allows access
   - getPois filters for public POIs
6. Returns 200 OK with POI data
7. Map displays POIs successfully
```

### Authenticated Tourist Flow (Unchanged)
```
1. User logs in with email/password
2. Session created, session_id in cookies
3. Navigates to /tourist
4. Frontend calls GET /pois/get-pois (has session_id in cookies)
5. Backend receives request:
   - session_id found in cookies
   - get_optional_user returns: authenticated user object
   - verify_read_access_public allows access
   - getPois filters for tourist POIs
6. Returns 200 OK with POI data
7. Dashboard displays POIs with full features
```

### Admin/Vendor Flow (Unchanged)
```
1. User logs in with email/password
2. Session created
3. Navigates to /admin or /vendor
4. Protected routes require authentication
5. API calls include session_id
6. All endpoints work as before
```

---

## Security Considerations

### What's Protected
✅ **CRUD Operations** - Still require authentication
- POST /pois/admin/create
- POST /pois/vendor/create
- PUT /pois/admin/update/{poi_id}
- PUT /pois/vendor/update/{poi_id}
- DELETE /pois/delete/{poi_id}

✅ **Admin Routes** - Still protected by `require_role("admin")`

✅ **Vendor Routes** - Still protected by `require_role("vendor")`

### What's Public (Read-Only)
📖 **GET /pois/get-pois** - Returns filtered list
- Public tourists: See approved POIs with active vendor subscriptions
- Authenticated tourists: Same as public tourists
- Vendors: See only their own POIs
- Admins: See all POIs

📖 **GET /pois/get-poi-by-id/{poi_id}** - Returns specific POI
- Public tourists: See approved POIs with active vendor subscriptions
- Authenticated tourists: Same as public tourists
- Vendors: See only their own POIs
- Admins: See all POIs

✅ **POI Service Logic Unchanged** - The getPois and getPOIById functions still apply:
- Role-based filtering
- Subscription status checks
- Language localization
- Caching

---

## Testing Checklist

### 1. Public Tourist Flow
- [ ] Navigate to http://localhost:5173/login
- [ ] Click "🗺️ Khám phá bản đồ với Tourist" button
- [ ] Verify navigation to /tourist-map (no redirect to login)
- [ ] Verify map displays
- [ ] Verify POIs load on map (no 401 error in console)
- [ ] Click on POI marker
- [ ] Verify nearby POIs list appears
- [ ] Click on POI card to view details
- [ ] Verify details modal shows POI information
- [ ] Verify no "Unauthorized" error appears

### 2. Console Checks
- [ ] No 401 errors in browser console
- [ ] No "Not logged in" errors
- [ ] Network tab shows GET /pois/get-pois returning 200 OK
- [ ] Response includes POI data

### 3. Authenticated Tourist Flow (Unchanged)
- [ ] Log in with tourist account
- [ ] Navigate to /tourist
- [ ] Verify map displays
- [ ] Verify POIs load
- [ ] Verify QR scanner works
- [ ] Verify AI chat works
- [ ] All authenticated features work as before

### 4. Admin/Vendor Flow (Unchanged)
- [ ] Log in with admin account
- [ ] Verify admin dashboard works
- [ ] Verify CRUD operations work
- [ ] No unexpected changes to functionality
- [ ] Log in with vendor account
- [ ] Verify vendor dashboard works
- [ ] Verify CRUD operations work

### 5. Edge Cases
- [ ] Clear localStorage and cookies, then access /tourist-map
- [ ] Map still loads without errors
- [ ] Open /tourist-map in incognito window
- [ ] Map loads and POIs display
- [ ] Close and reopen browser, access /tourist-map
- [ ] Public access still works

---

## Files Modified

### Backend
1. `Backend/app/dependencies/auth.py` - Added get_optional_user()
2. `Backend/app/dependencies/subscription.py` - Added verify_read_access_public()
3. `Backend/app/routes/poi_router.py` - Updated two endpoints to use public dependency

### Frontend
1. `Frontend/src/utils/api.jsx` - Added /tourist-map to auth bypass list
2. `Frontend/src/pages/public/TouristMapPublic.jsx` - Already created
3. `Frontend/src/pages/auth/Login.jsx` - Already updated with Tourist button
4. `Frontend/src/App.jsx` - Already added public route

---

## Rollback Plan

If issues arise, you can:

1. **Revert backend changes:**
   - Change `/pois/get-pois` back to `verify_read_access`
   - Change `/pois/get-poi-by-id` back to `verify_read_access`
   - Remove get_optional_user and verify_read_access_public

2. **Revert frontend changes:**
   - Remove `/tourist-map` from isAuthPage list in api.jsx
   - User will be redirected to login when accessing map

---

## Next Steps

1. Test the public access flow completely
2. Verify console has no 401 errors
3. Check that admin/vendor flows still work
4. Monitor for any unexpected behavior
5. Deploy to production when confident

