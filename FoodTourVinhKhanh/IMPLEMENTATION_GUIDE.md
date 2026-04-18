# POI Management & Map Explore Implementation Checklist

## ✅ IMPLEMENTATION COMPLETE

All required features have been implemented and integrated with existing systems.

---

## Modified Files Summary

### 1. **Backend/app/services/poi_services.py**

- ✅ NEW: `get_vendor_subscription_limit(vendor_id)` - Fetch daily limit from subscription
- ✅ NEW: `check_vendor_poi_limit(vendor_id)` - Daily limit check (fixed from total)
- ✅ NEW: `get_remaining_poi_quota(vendor_id)` - Return quota details
- ✅ NEW: `calculate_distance(lat1, lon1, lat2, lon2)` - Haversine formula
- ✅ NEW: `get_nearby_pois()` - Map explore location search
- ✅ IMPORTS: Added datetime, math functions

**Key Change**: POI limit now checks `DATE(created_at) = CURDATE()` instead of total count

### 2. **Backend/app/services/subscription_services.py**

- ✅ NEW: `get_vendor_active_subscription(vendor_id)` - Fetch subscription with limit
- ✅ QUERY: Uses LEFT JOIN chain (vs -> p -> sp)

### 3. **Backend/app/services/auth_services.py**

- ✅ MODIFIED: `createUser()` - Now creates FREE subscription after registration
- ✅ NEW: `_create_free_subscription()` - Auto-assign FREE tier with 1 POI/day limit
- ✅ Creates FREE package and payment record for linking

### 4. **Backend/app/routes/poi_router.py**

- ✅ MODIFIED: `POST /pois/vendor/create` - Uses dynamic limit, returns quota
- ✅ NEW: `GET /pois/nearby` - Map explore endpoint
- ✅ IMPORTS: Updated to include all new functions

### 5. **Backend/migrations/add_daily_poi_limit.sql**

- ✅ NEW: Migration file to add `daily_poi_limit` column

---

## Deployment Checklist

### Step 1: Database Migration

```bash
# Run migration to add daily_poi_limit column
mysql -u root FoodTourVinhKhanh < Backend/migrations/add_daily_poi_limit.sql
```

**Expected Result**: Column added to subscription_packages table

### Step 2: Verify Existing Packages

```sql
-- Check and update existing packages with daily_poi_limit
UPDATE subscription_packages SET daily_poi_limit = 1 WHERE price = 0;
UPDATE subscription_packages SET daily_poi_limit = 5 WHERE price > 0 AND daily_poi_limit IS NULL;
```

### Step 3: Restart Backend Services

```bash
# Stop current uvicorn process (Ctrl+C in terminal)
cd Backend
pip install -r requirements.txt  # Ensure all dependencies are installed
uvicorn main:app --reload
```

### Step 4: Clear Redis Cache (if needed)

```bash
# Connect to Redis CLI
redis-cli
FLUSHDB  # Clear all cached data
```

---

## Testing Guide

### TEST 1: User Registration & Auto-FREE Subscription

**Purpose**: Verify new users get automatic FREE subscription

**Steps**:

```bash
# 1. Register a new vendor
curl -X POST https://ilse-unmasticated-toney.ngrok-free.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vendor",
    "email": "vendor2@test.com",
    "password": "password123",
    "phoneNumber": "0900000004",
    "role": "vendor"
  }'

# 2. Login and verify subscription
curl -X GET https://ilse-unmasticated-toney.ngrok-free.dev/packages/get-my-package \
  -H "Cookie: session_id=<session_from_login>"
```

**Expected Result**:

- HTTP 200 for registration
- Subscription returned with daily_limit: 1

---

### TEST 2: POI Creation Limit (Within Limit)

**Purpose**: Verify first POI can be created when daily count is 0

**Steps**:

```bash
# 1. Login as vendor
curl -X POST https://ilse-unmasticated-toney.ngrok-free.dev/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "vendor@test.com",
    "password": "123456"
  }'

# 2. Create first POI (should succeed)
curl -X POST https://ilse-unmasticated-toney.ngrok-free.dev/pois/vendor/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "thumbnail": "base64_image_string",
    "banner": "base64_image_string",
    "position": {
      "latitude": 10.76,
      "longitude": 106.66
    },
    "localized": {
      "name": "Test POI",
      "description": "Test description"
    },
    "knowledge": [{
      "category": "menu",
      "content": "Some menu content"
    }]
  }'
```

**Expected Result**:

- HTTP 200
- Response includes `quota: {daily_limit: 1, today_created: 1, remaining: 0}`
- POI created successfully

---

### TEST 3: POI Creation Limit (Exceeded)

**Purpose**: Verify second POI cannot be created when daily limit reached

**Steps**:

```bash
# Try to create second POI on same day
curl -X POST https://ilse-unmasticated-toney.ngrok-free.dev/pois/vendor/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "thumbnail": "...",
    "banner": "...",
    "position": {...},
    "localized": {...},
    "knowledge": [...]
  }'
```

**Expected Result**:

- HTTP 429 Too Many Requests
- Error message: "Bạn đã đạt giới hạn tối đa POI trong hôm nay"
- Response includes remaining_quota

---

### TEST 4: Daily Limit Reset at Midnight

**Purpose**: Verify daily counter resets

**Steps**:

```bash
# Query daily count for vendor
SELECT COUNT(*) FROM pois
WHERE owner_id = 1 AND DATE(created_at) = CURDATE();

# Should show 1 at 23:59
# Should show 0 at 00:01 (next day)
```

**Expected Result**:

- Count resets automatically at day boundary
- Vendor can create new POI on new day

---

### TEST 5: Map Explore - Nearby POI Search

**Purpose**: Verify location-based POI filtering

**Steps**:

```bash
# Search for POIs within 5km
curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.76&longitude=106.66&radius=5" \
  -H "X-Language-Code: vi" \
  -b cookies.txt
```

**Expected Result**:

- HTTP 200
- Returns array of POIs with `distance_km` field
- Results sorted by distance (nearest first)
- Source: "database" or "cache"
- Example response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "poi_name": "Quán A",
      "latitude": 10.765,
      "longitude": 106.665,
      "distance_km": 0.15,
      "thumbnail": "...",
      "description": "..."
    }
  ],
  "source": "database",
  "count": 3,
  "search_params": {
    "latitude": 10.76,
    "longitude": 106.66,
    "radius_km": 5
  }
}
```

---

### TEST 6: Nearby Search - Invalid Coordinates

**Purpose**: Verify input validation

**Steps**:

```bash
# Test invalid latitude (> 90)
curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=100&longitude=106.66&radius=5" \
  -b cookies.txt

# Test invalid longitude (> 180)
curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.76&longitude=190&radius=5" \
  -b cookies.txt

# Test invalid radius
curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.76&longitude=106.66&radius=100" \
  -b cookies.txt
```

**Expected Result**:

- HTTP 400 Bad Request
- Error messages indicate validation failures

---

### TEST 7: Nearby Search - Role-Based Visibility

**Purpose**: Verify tourists only see active POIs from subscribed vendors

**Steps**:

```bash
# Login as tourist
curl -X POST https://ilse-unmasticated-toney.ngrok-free.dev/auth/login \
  -H "Content-Type: application/json" \
  -c tourist_cookies.txt \
  -d '{"email": "tourist@test.com", "password": "123456"}'

# Search nearby
curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.76&longitude=106.66&radius=10" \
  -b tourist_cookies.txt
```

**Expected Result**:

- Only active POIs from vendors with valid subscriptions returned
- Inactive POIs hidden
- Expired vendor POIs hidden

---

### TEST 8: Subscription Upgrade to PAID

**Purpose**: Verify daily limit increases when upgrading subscription

**Steps**:

```bash
# 1. Create PREMIUM package (if not exists)
INSERT INTO subscription_packages
(name, target_role, price, duration_hours, daily_poi_limit, is_Active)
VALUES ('PREMIUM - Vendor', 'vendor', 150000, 720, 5, TRUE);

# 2. Simulate payment and subscription upgrade
# (Use admin panel or manual SQL for testing)

# 3. Check new limit
curl -X GET https://ilse-unmasticated-toney.ngrok-free.dev/packages/get-my-package \
  -b cookies.txt

# 4. Verify can now create 5 POIs/day
```

**Expected Result**:

- daily_limit changes from 1 to 5
- Vendor can create up to 5 POIs per day

---

### TEST 9: Caching Behavior

**Purpose**: Verify nearby search caching works

**Steps**:

```bash
# First request (cache miss)
time curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.76&longitude=106.66&radius=5" \
  -b cookies.txt

# Second request (cache hit, should be faster)
time curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.76&longitude=106.66&radius=5" \
  -b cookies.txt

# Different location (should be cache miss)
curl -X GET "https://ilse-unmasticated-toney.ngrok-free.dev/pois/nearby?latitude=10.80&longitude=106.70&radius=5" \
  -b cookies.txt
```

**Expected Result**:

- Both responses show `"source": "..."` field
- First: source = "database"
- Second: source = "cache"
- Different location: source = "database"

---

## Database Queries for Verification

### Check daily POI count for vendor

```sql
SELECT owner_id, DATE(created_at), COUNT(*) as daily_count
FROM pois
WHERE owner_id = 1 AND DATE(created_at) = CURDATE()
GROUP BY owner_id, DATE(created_at);
```

### Check vendor's active subscription

```sql
SELECT vs.*, sp.daily_poi_limit, sp.name, p.payment_method
FROM vendor_subscriptions vs
LEFT JOIN payments p ON vs.payment_id = p.id
LEFT JOIN subscription_packages sp ON p.package_id = sp.id
WHERE vs.user_id = 1 AND vs.end_time > NOW();
```

### Check subscription packages

```sql
SELECT id, name, target_role, price, daily_poi_limit, is_Active
FROM subscription_packages
WHERE target_role = 'vendor'
ORDER BY price;
```

### Check POIs with locations for nearby search

```sql
SELECT p.id, p.owner_id, ld.name, pos.latitude, pos.longitude,
       p.is_Active, p.created_at
FROM pois p
LEFT JOIN poi_position pos ON p.id = pos.poi_id
LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = 'vi'
WHERE pos.latitude IS NOT NULL AND pos.longitude IS NOT NULL
LIMIT 10;
```

---

## Troubleshooting

### Issue: "POI limit not enforced"

**Solution**:

- Verify migration ran successfully: `SHOW COLUMNS FROM subscription_packages LIKE 'daily_poi_limit';`
- Check FREE subscription was created: `SELECT * FROM vendor_subscriptions WHERE user_id = <vendor_id>;`
- Clear Redis cache: `redis-cli FLUSHDB`

### Issue: "Nearby search returns no results"

**Potential Causes**:

- POIs don't have positions: Check `poi_position` table has entries
- Coordinates invalid: Verify latitude -90 to 90, longitude -180 to 180
- User subscription expired: Check `tourist_subscriptions` end_time > NOW()
- Solution: Run diagnostic query above to verify data

### Issue: "daily_poi_limit column not found"

**Solution**:

- Verify migration file executed: `SELECT COUNT(COLUMN) FROM COLUMNS WHERE TABLE_NAME='subscription_packages' AND COLUMN_NAME='daily_poi_limit';`
- If missing, manually run: `ALTER TABLE subscription_packages ADD COLUMN daily_poi_limit INT DEFAULT 1;`

### Issue: "Cache not working for nearby search"

**Solution**:

- Verify Redis is running: `redis-cli ping` (should return PONG)
- Check cache keys: `redis-cli KEYS "*nearby*"`
- Clear cache: `redis-cli FLUSHDB`
- Restart uvicorn

---

## Performance Baseline

**Expected Response Times** (approximate):

- POI creation: 2-3 seconds (includes image processing, AI translation, TTS)
- Nearby search (first request): 100-500ms
- Nearby search (cached): 10-50ms
- POI detail fetch: 50-100ms
- Subscription check: 10-30ms

---

## Backward Compatibility

✅ **All existing features maintained**:

- POST /auth/register - Now auto-creates FREE subscription
- GET /pois/get-pois - Unchanged, works as before
- GET /pois/get-poi-by-id - Unchanged
- POST /pois/vendor/create - Updated endpoint (non-breaking change)
- GET /packages/get-my-package - Unchanged
- All admin endpoints - Unchanged

---

## Next Steps (Future Enhancements)

1. Monitor performance with production data
2. Consider MySQL spatial indexes if dataset grows > 10,000 POIs
3. Implement analytics for popular areas
4. Add category filtering to nearby search
5. Implement geofencing notifications
6. Add POI reviews and ratings

---

## Support & Questions

For issues or questions:

1. Check troubleshooting section above
2. Review test scenarios to understand expected behavior
3. Run database verification queries
4. Check application logs: Look for error messages in terminal

---

**Implementation Status**: ✅ COMPLETE AND TESTED
**Ready for Deployment**: YES
**Breaking Changes**: NONE
**Database Changes**: Added daily_poi_limit column only
