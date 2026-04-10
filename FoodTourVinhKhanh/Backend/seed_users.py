"""
Script tạo sẵn 3 user mẫu (admin, vendor, tourist) trong database.
Chạy: python seed_users.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_connection
from app.services.auth_services import hash_password
from datetime import datetime

USERS = [
    {
        "name": "Admin",
        "email": "admin@test.com",
        "password": "123456",
        "phoneNumber": "0900000001",
        "role": "admin",
    },
    {
        "name": "Vendor",
        "email": "vendor@test.com",
        "password": "123456",
        "phoneNumber": "0900000002",
        "role": "vendor",
    },
    {
        "name": "Tourist",
        "email": "tourist@test.com",
        "password": "123456",
        "phoneNumber": "0900000003",
        "role": "tourist",
    },
]

def seed():
    conn = get_db_connection()
    cursor = conn.cursor()

    inserted = 0
    skipped = 0

    for u in USERS:
        # Kiểm tra email đã tồn tại chưa
        cursor.execute("SELECT id FROM users WHERE email = %s", (u["email"],))
        if cursor.fetchone():
            print(f"  [skip]  {u['email']} đã tồn tại")
            skipped += 1
            continue

        hashed = hash_password(u["password"])
        cursor.execute(
            """
            INSERT INTO users (name, email, password, phoneNumber, role, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (u["name"], u["email"], hashed, u["phoneNumber"], u["role"], datetime.now()),
        )
        print(f"  [ok]    {u['role']:8s}  {u['email']}  (password: {u['password']})")
        inserted += 1

    conn.commit()
    cursor.close()
    conn.close()

    print(f"\nXong: {inserted} user mới, {skipped} bỏ qua.")

if __name__ == "__main__":
    seed()
