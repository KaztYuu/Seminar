# Quick Reference Guide - Food Tour Vinh Khanh Backend

## 🚀 Getting Started

### Initial Setup (One-time)

```bash
# 1. Reset everything (database + cache)
cd Backend
python reset_environment.py

# 2. Verify all systems are ready
python verify_setup.py

# Expected output:
# ✅ PASS: Environment
# ✅ PASS: Imports
# ✅ PASS: Database
# ✅ PASS: Redis
```

### Start Backend Server

```bash
cd Backend
python main.py

# Expected startup output:
# ==================================================
# 🚀 Application starting...
# ==================================================
# ✅ Redis: Connected (localhost:6379)
# ✅ Database: Connected
# ==================================================
# Backend API is ready!
```

### Start Frontend (in another terminal)

```bash
cd Frontend
npm install  # (only first time)
npm run dev

# Visit: http://localhost:5173
```

---

## 📊 Monitoring & Debugging

### Check System Status

```bash
# Terminal 1: Backend
python main.py
# Watch logs for:
# 📦 Cache HIT: ...
# 🗄️  Cache MISS: ...

# Terminal 2: View Redis keys
redis-cli keys "*"
redis-cli info stats
```

### View Cache Contents

```bash
# Connect to Redis CLI
redis-cli

# See all cache keys
KEYS cache:*

# See specific cache key
GET "cache:all_pois:admin:vi:"

# Clear specific pattern
DEL cache:all_pois:*

# Exit
EXIT
```

### Check Database State

```bash
# Connect to MySQL
mysql -u root -p foodtourvinhkhanh

# View tables
SHOW TABLES;

# Check POI count
SELECT COUNT(*) FROM pois;

# View all POIs
SELECT id, title, is_active FROM pois;

# Exit
EXIT
```

---

## 🔄 Common Tasks

### Reset Everything (Database + Cache)

```bash
cd Backend
python reset_environment.py
# This will:
# 1. Drop database
# 2. Create fresh database
# 3. Run SQL migrations
# 4. Clear Redis cache
# 5. Seed admin account
```

### Clear Cache Only

```bash
# Option 1: Using redis-cli
redis-cli FLUSHALL

# Option 2: Using Python
python -c "from app.services.redis_services import clear_all_cache; clear_all_cache()"
```

### Verify Setup Without Starting Server

```bash
cd Backend
python verify_setup.py
```

### Test a Single Endpoint (Python)

```bash
# Create test_api.py
import requests
import json

# Get POIs (should query database first time)
response = requests.get(
    "http://localhost:8000/pois/get-pois",
    headers={
        "x-language-code": "vi",
        "session-id": "test-session-123"
    }
)

print(json.dumps(response.json(), indent=2))
# Look for: "source": "database" or "source": "cache"
```

---

## 🛠️ Environment Variables

### Development (.env file)

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=           # (empty for XAMPP default)
DB_NAME=foodtourvinhkhanh
DB_PORT=3306

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
ENVIRONMENT=development   # Cache TTL = 300s (5 min)

# Authentication
JWT_SECRET=9f3c7b1d6e8a4b2f9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Payment Gateway
VNPAY_TMN_CODE=F5DZKW5R
VNPAY_HASH_SECRET=FNIKCLMXJHBOBDODGDNMRISRHXSFRHDQ
RETURN_URL=http://localhost:5173/payment/return
IPN_URL=http://localhost:8000/api/payment/ipn

# AI Services
GEMINI_API_KEY=<YOUR_API_KEY>
GROQ_API_KEY=<YOUR_API_KEY>
```

### Production Changes

Change in `.env` for production:

```env
ENVIRONMENT=production   # Cache TTL = 3600s (1 hour)
REDIS_HOST=[your-redis-host]
RETURN_URL=https://yourdomain.com/payment/return
```

---

## 📁 Important Files

### Startup & Health

- `main.py` - FastAPI app entry point with health checks
- `verify_setup.py` - System verification script
- `reset_environment.py` - Database + cache reset script

### Cache Management

- `app/services/redis_services.py` - Redis cache operations
  - Functions: `get_cache()`, `set_cache()`, `invalidate_poi_cache()`, `clear_all_cache()`
- `app/routes/poi_router.py` - POI endpoints with cache logging

### Database

- `app/database.py` - Database connection
- `config/db/db.sql` - Database schema and migrations

### Frontend Config

- `Frontend/src/utils/api.jsx` - Axios API client
- `Frontend/.env` - Frontend environment variables (if needed)

---

## 🔍 Log Examples

### Successful Startup

```
2024-04-18 07:40:52 - app.main - INFO - ==================================================
2024-04-18 07:40:52 - app.main - INFO - 🚀 Application starting...
2024-04-18 07:40:52 - app.main - INFO - ==================================================
2024-04-18 07:40:52 - app.services.redis_services - INFO - ✅ Redis connected: localhost:6379
2024-04-18 07:40:52 - app.main - INFO - ✅ Redis: Connected (localhost:6379)
2024-04-18 07:40:52 - app.main - INFO - ✅ Database: Connected
2024-04-18 07:40:52 - app.main - INFO - ==================================================
2024-04-18 07:40:52 - app.main - INFO - Backend API is ready!
```

### Cache Hit/Miss in Request

```
2024-04-18 07:41:15 - app.routes.poi_router - INFO - 📦 Cache HIT: cache:all_pois:admin:vi: (User: 1, Role: admin)
2024-04-18 07:41:20 - app.routes.poi_router - INFO - 🗄️  Cache MISS: cache:all_pois:admin:vi: (User: 1, Role: admin) - querying database
2024-04-18 07:41:20 - app.services.redis_services - DEBUG - Cache set: cache:all_pois:admin:vi: (TTL: 300s)
```

### Cache Invalidation

```
2024-04-18 07:42:00 - app.services.redis_services - INFO - Cache invalidated: cache:all_pois:* (3 keys deleted)
```

---

## 🎯 API Testing

### Test Cache Hit/Miss

```bash
# First request (miss - queries database)
curl http://localhost:8000/pois/get-pois \
  -H "x-language-code: vi" \
  -H "session-id: test-123"
# Response: "source": "database"

# Second request (hit - from cache)
curl http://localhost:8000/pois/get-pois \
  -H "x-language-code: vi" \
  -H "session-id: test-123"
# Response: "source": "cache"

# After 5 minutes in development, cache expires
# Next request will miss cache again
```

### Test Cache Invalidation

```bash
# 1. Create new POI (invalidates cache)
curl -X POST http://localhost:8000/pois/admin/create \
  -H "x-language-code: vi" \
  -H "session-id: admin-123" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", ...}'

# 2. Next GET request will query fresh database
curl http://localhost:8000/pois/get-pois \
  -H "x-language-code: vi" \
  -H "session-id: admin-123"
# Response: "source": "database" (not cache!)
```

---

## 🚨 Troubleshooting

### Redis Connection Error

```
⚠️ Redis: Unavailable
```

**Solution:**

1. Check if Redis is running: `redis-cli ping`
2. Verify REDIS_HOST and REDIS_PORT in .env
3. API will use database fallback (slower but functional)

### Database Connection Error

```
❌ Database: Connection failed
```

**Solution:**

1. Check XAMPP MySQL is running
2. Verify DB_HOST, DB_USER, DB_PASSWORD in .env
3. Run: `python reset_environment.py`

### Port Already in Use

```
Address already in use on port 8000
```

**Solution:**

1. Kill previous Python process: `taskkill /IM python.exe /F`
2. Or specify different port: `python -m uvicorn main:app --port 8001`

### Phantom Data Appearing

```
Old POI data shows after database reset
```

**Solution:**

1. Run: `python reset_environment.py` (clears both DB + cache)
2. Verify Redis keys are cleared: `redis-cli FLUSHALL`
3. Check logs for cache hits: `📦 Cache HIT`

---

## 📋 Pre-Deployment Checklist

- [ ] Run `python reset_environment.py` - no errors
- [ ] Run `python verify_setup.py` - all checks pass
- [ ] Start `python main.py` - startup logs show no errors
- [ ] Test API endpoints - responses include "source" field
- [ ] Check frontend works at `http://localhost:5173`
- [ ] Verify no old data in responses
- [ ] Check all 9 database tables created
- [ ] Confirm Redis cache working (keys appear after requests)

---

## 📞 Key Contacts/Resources

- Backend logs: `python main.py` - watch terminal
- Redis logs: `redis-cli` - use CLI for inspection
- Database logs: MySQL error logs in XAMPP
- API documentation: Check route files in `app/routes/`

---

## 🎓 Learning Resources

- **FastAPI Docs**: http://localhost:8000/docs (when server running)
- **Redis Commands**: `redis-cli --help`
- **MySQL Queries**: Check `config/db/db.sql`
- **Python Logging**: Check `app/services/*.py` for examples
