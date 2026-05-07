#!/usr/bin/env python
"""Verification script to test Redis, Database, and API setup"""

import os
import sys
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_environment():
    """Check environment variables"""
    print("\n" + "="*50)
    print("🔍 CHECKING ENVIRONMENT VARIABLES")
    print("="*50)
    
    required_vars = {
        'JWT_SECRET': 'JWT Authentication',
        'DB_HOST': 'Database Host',
        'DB_USER': 'Database User',
        'DB_NAME': 'Database Name',
        'REDIS_HOST': 'Redis Host',
        'REDIS_PORT': 'Redis Port'
    }
    
    from dotenv import load_dotenv
    load_dotenv()
    
    all_ok = True
    for var, description in required_vars.items():
        value = os.getenv(var)
        status = "✅" if value else "❌"
        print(f"{status} {description:20} ({var}): {value or 'NOT SET'}")
        if not value:
            all_ok = False
    
    return all_ok

def check_database():
    """Check database connectivity and schema"""
    print("\n" + "="*50)
    print("🗄️  CHECKING DATABASE")
    print("="*50)
    
    try:
        from app.database import get_db_connection
        
        conn = get_db_connection()
        if conn.is_connected():
            print("✅ Database connected")
            
            cursor = conn.cursor()
            cursor.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()")
            tables = cursor.fetchall()
            print(f"✅ Found {len(tables)} tables:")
            for table in tables:
                print(f"   - {table[0]}")
            
            cursor.execute("SELECT COUNT(*) FROM pois")
            poi_count = cursor.fetchone()[0]
            print(f"✅ POIs in database: {poi_count}")
            
            conn.close()
            return True
        else:
            print("❌ Database connection failed")
            return False
    except Exception as e:
        print(f"❌ Database check error: {str(e)}")
        return False

def check_redis():
    """Check Redis connectivity and cache status"""
    print("\n" + "="*50)
    print("💾 CHECKING REDIS CACHE")
    print("="*50)
    
    try:
        from app.services.redis_services import redis_client, REDIS_AVAILABLE, get_redis_status
        
        status = get_redis_status()
        
        if REDIS_AVAILABLE:
            print(f"✅ Redis connected: {status['host']}:{status['port']}")
            
            if redis_client:
                keys = redis_client.keys("*")
                print(f"✅ Cache keys in Redis: {len(keys)}")
                
                if keys:
                    print("   Existing cache keys:")
                    for key in keys[:10]:  # Show first 10
                        ttl = redis_client.ttl(key)
                        print(f"   - {key} (TTL: {ttl}s)")
                    if len(keys) > 10:
                        print(f"   ... and {len(keys) - 10} more")
            
            return True
        else:
            print("⚠️  Redis unavailable - API will use database fallback")
            return False
            
    except Exception as e:
        print(f"❌ Redis check error: {str(e)}")
        return False

def check_imports():
    """Check if all required modules can be imported"""
    print("\n" + "="*50)
    print("📦 CHECKING IMPORTS")
    print("="*50)
    
    modules = [
        ('fastapi', 'FastAPI'),
        ('redis', 'Redis'),
        ('mysql.connector', 'MySQL'),
        ('pydantic', 'Pydantic'),
        ('dotenv', 'python-dotenv'),
    ]
    
    all_ok = True
    for module, name in modules:
        try:
            __import__(module)
            print(f"✅ {name:20} ({module})")
        except ImportError:
            print(f"❌ {name:20} ({module}) - NOT INSTALLED")
            all_ok = False
    
    return all_ok

def main():
    """Run all verification checks"""
    print("\n╔" + "="*48 + "╗")
    print("║" + " "*10 + "FOOD TOUR VINH KHANH - SETUP VERIFICATION" + " "*4 + "║")
    print("╚" + "="*48 + "╝")
    
    results = {
        'Environment': check_environment(),
        'Imports': check_imports(),
        'Database': check_database(),
        'Redis': check_redis(),
    }
    
    print("\n" + "="*50)
    print("📊 SUMMARY")
    print("="*50)
    
    for check, result in results.items():
        status = "✅ PASS" if result else "⚠️  WARN"
        print(f"{status}: {check}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n✅ All checks passed! System is ready.")
    else:
        print("\n⚠️  Some checks failed. Please review above.")
    
    print("\n" + "="*50)
    print("Next steps:")
    print("  1. Start backend: python main.py")
    print("  2. Start frontend: npm run dev (in Frontend folder)")
    print("  3. Visit http://localhost:5173")
    print("="*50 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
