from app.database import get_db_connection
from fastapi import HTTPException

def normalize_package_limits(package_row):
    if not package_row:
        return package_row

    normalized = dict(package_row)
    name = (normalized.get("name") or "").upper()
    role = normalized.get("target_role")

    if role == "vendor":
        if name in ["FREE", "FREE_VENDOR"]:
            normalized["daily_poi_limit"] = 1
        elif name == "BASIC":
            normalized["daily_poi_limit"] = 3
        elif name == "VIP":
            normalized["daily_poi_limit"] = 10
    elif role == "tourist":
        normalized["daily_poi_limit"] = 0

    return normalized

def getMyPackage(user_id: int, role: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    target_table = "tourist_subscriptions" if role == "tourist" else "vendor_subscriptions"

    try:
        query = f"""
            SELECT sp.*, ts.start_time, ts.end_time, p.status as payment_status
            FROM subscription_packages sp
            JOIN payments p ON sp.id = p.package_id
            JOIN {target_table} ts ON p.id = ts.payment_id
            WHERE ts.user_id = %s 
              AND ts.end_time > NOW()
            ORDER BY ts.end_time DESC
            LIMIT 1
        """
        
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        return normalize_package_limits(result)
        
    except Exception as e:
        print(f"Lỗi lấy gói của tôi: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def getPackages(user):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)   

    if user["role"] == "admin":
        cursor.execute("""
            SELECT * 
            FROM subscription_packages
                       """)
    elif user["role"] == "vendor":
        cursor.execute("""
            SELECT * 
            FROM subscription_packages
            WHERE is_Active = TRUE
              AND target_role = 'vendor'
              AND price > 0
            ORDER BY price ASC
                       """)
    else:
        packages = []
        cursor.close()
        conn.close()
        return packages

    packages = cursor.fetchall()
    packages = [normalize_package_limits(pkg) for pkg in packages]

    cursor.close()
    conn.close()

    return packages

def createPackage(data: dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO subscription_packages 
            (name, price, duration_hours, target_role, daily_poi_limit, is_Active)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (
            data['name'], 
            data['price'], 
            data['duration_hours'], 
            data['target_role'], 
            data.get('daily_poi_limit', 0),
            data.get('is_Active', True)
        )
        cursor.execute(query, params)
        conn.commit()
        return cursor.lastrowid # Trả về ID của bản ghi vừa tạo
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi tạo gói: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def updatePackage(package_id: int, data: dict):
    if not data:
        return False

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        set_clause = ", ".join([f"{key} = %s" for key in data.keys()])
        params = list(data.values())
        params.append(package_id)

        query = f"UPDATE subscription_packages SET {set_clause} WHERE id = %s"
        
        cursor.execute(query, params)
        conn.commit()
        
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def deletePackage(package_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM subscription_packages WHERE id = %s", (package_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=400, detail="Không thể xóa gói này vì đang có dữ liệu liên quan!")
    finally:
        cursor.close()
        conn.close()
