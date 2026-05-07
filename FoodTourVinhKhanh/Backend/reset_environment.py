"""
Reset Database & Cache Environment Script

Thực hiện:
1. Drop database
2. Create database
3. Run migrations (db.sql)
4. Clear Redis cache
5. Seed initial data

Chạy: python reset_environment.py
"""

import sys
import os
import mysql.connector
import redis
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_services import hash_password
from datetime import datetime

# Configuration
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "foodtourvinhkhanh"
DB_PORT = 3306
REDIS_HOST = "localhost"
REDIS_PORT = 6379

# Colors for terminal output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log_info(msg):
    print(f"{BLUE}[INFO]{RESET} {msg}")

def log_success(msg):
    print(f"{GREEN}[SUCCESS]{RESET} {msg}")

def log_warning(msg):
    print(f"{YELLOW}[WARNING]{RESET} {msg}")

def log_error(msg):
    print(f"{RED}[ERROR]{RESET} {msg}")

def step(num, title):
    print(f"\n{BLUE}═══════════════════════════════════════{RESET}")
    print(f"{BLUE}BƯỚC {num}: {title}{RESET}")
    print(f"{BLUE}═══════════════════════════════════════{RESET}")

def reset_mysql_database():
    """Drop và tạo lại database"""
    try:
        # Connect without database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        cursor = conn.cursor()
        
        # Drop existing database
        log_info(f"Dropping database {DB_NAME}...")
        cursor.execute(f"DROP DATABASE IF EXISTS {DB_NAME}")
        log_success(f"Database {DB_NAME} dropped")
        
        # Create new database
        log_info(f"Creating database {DB_NAME}...")
        cursor.execute(f"CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")
        log_success(f"Database {DB_NAME} created")
        
        cursor.close()
        conn.close()
        
        return True
    except Exception as e:
        log_error(f"MySQL Error: {str(e)}")
        return False

def run_migrations():
    """Chạy migration từ db.sql"""
    try:
        # Read SQL file
        sql_file = Path(__file__).parent / "config" / "db" / "db.sql"
        
        if not sql_file.exists():
            log_error(f"SQL file not found: {sql_file}")
            return False
        
        log_info(f"Reading SQL migrations from {sql_file}...")
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Connect and execute
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT
        )
        cursor = conn.cursor()
        
        # Split statements by semicolon and execute
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        
        for i, statement in enumerate(statements, 1):
            try:
                cursor.execute(statement)
                log_info(f"Executed statement {i}/{len(statements)}")
            except Exception as e:
                # Skip errors for duplicate inserts
                if "already exists" not in str(e).lower():
                    log_warning(f"Statement {i} warning: {str(e)}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        log_success("All migrations executed successfully")
        return True
        
    except Exception as e:
        log_error(f"Migration Error: {str(e)}")
        return False

def clear_redis_cache():
    """Clear tất cả Redis cache"""
    try:
        log_info("Connecting to Redis...")
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True
        )
        
        # Test connection
        redis_client.ping()
        log_success("Redis connected")
        
        # Clear all keys
        log_info("Clearing all Redis keys...")
        redis_client.flushall()
        
        # Verify
        count = redis_client.dbsize()
        if count == 0:
            log_success(f"Redis cache cleared (0 keys remaining)")
            return True
        else:
            log_warning(f"Redis still has {count} keys")
            return False
            
    except Exception as e:
        log_error(f"Redis Error: {str(e)}")
        log_warning("Continuing without Redis clear...")
        return False

def seed_initial_data():
    """Tạo dữ liệu ban đầu"""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT
        )
        cursor = conn.cursor()
        
        # Check and insert admin account
        cursor.execute("SELECT id FROM users WHERE email = 'admin@test.com'")
        if not cursor.fetchone():
            log_info("Seeding admin account...")
            admin_pass = hash_password("admin123")
            cursor.execute("""
                INSERT INTO users (name, email, password, phoneNumber, role, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, ("System Admin", "admin@test.com", admin_pass, "0900000001", "admin", datetime.now()))
            conn.commit()
            log_success("Admin account created")
        else:
            log_info("Admin account already exists")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        log_error(f"Seed Error: {str(e)}")
        return False

def main():
    print(f"\n{BLUE}╔═══════════════════════════════════════╗{RESET}")
    print(f"{BLUE}║  DATABASE & CACHE RESET ENVIRONMENT   ║{RESET}")
    print(f"{BLUE}╚═══════════════════════════════════════╝{RESET}\n")
    
    results = {}
    
    # Step 1: Reset MySQL
    step(1, "RESET MYSQL DATABASE")
    results['mysql'] = reset_mysql_database()
    
    # Step 2: Run Migrations
    step(2, "RUN DATABASE MIGRATIONS")
    results['migrations'] = run_migrations() if results['mysql'] else False
    
    # Step 3: Clear Redis Cache
    step(3, "CLEAR REDIS CACHE")
    results['redis'] = clear_redis_cache()
    
    # Step 4: Seed Initial Data
    step(4, "SEED INITIAL DATA")
    results['seed'] = seed_initial_data() if results['migrations'] else False
    
    # Summary
    step(0, "SUMMARY")
    print(f"\n{BLUE}Results:{RESET}")
    print(f"  MySQL Reset:      {'✅ SUCCESS' if results['mysql'] else '❌ FAILED'}")
    print(f"  Migrations:       {'✅ SUCCESS' if results['migrations'] else '❌ FAILED'}")
    print(f"  Redis Clear:      {'✅ SUCCESS' if results['redis'] else '⚠️  SKIPPED'}")
    print(f"  Initial Seed:     {'✅ SUCCESS' if results['seed'] else '❌ FAILED'}")
    
    if all(results.values()):
        log_success("\n✅ Environment reset completed successfully!\n")
        return 0
    else:
        log_error("\n❌ Some steps failed. Please check errors above.\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
