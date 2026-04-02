from app.database import get_db_connection
from fastapi import HTTPException

def getPackages(user):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)   

    if user["role"] == "admin":
        cursor.execute("""
            SELECT * 
            FROM subscription_packages
            WHERE is_Active = TRUE
                       """)
    else:
        cursor.execute("""
            SELECT * 
            FROM subscription_packages
            WHERE is_Active = TRUE AND target_role = %s
                       """, (user["role"],))

    packages = cursor.fetchall()

    cursor.close()
    conn.close()

    return packages

def createPackage(data: dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO subscription_packages 
            (name, price, duration_hours, target_role, is_Active)
            VALUES (%s, %s, %s, %s, %s)
        """
        params = (
            data['name'], 
            data['price'], 
            data['duration_hours'], 
            data['target_role'], 
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
        # Lỗi thường gặp: Gói này đang được dùng ở bảng khác (Foreign Key Constraint)
        raise HTTPException(status_code=400, detail="Không thể xóa gói này vì đang có dữ liệu liên quan!")
    finally:
        cursor.close()
        conn.close()