from app.database import get_db_connection
from app.database import get_db_connection
from app.services.auth_services import verify_password, hash_password

def update_profile(user_id: int, name: str, phoneNumber: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = "UPDATE users SET name = %s, phoneNumber = %s WHERE id = %s"
    cursor.execute(sql, (name, phoneNumber, user_id))

    conn.commit()

    cursor.close()
    conn.close()

    return True

def change_password(user_id: int, current_password: str, new_password: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # lấy user
    cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return False, "Người dùng không tồn tại"

    # check mật khẩu hiện tại
    if not verify_password(current_password, user["password"]):
        cursor.close()
        conn.close()
        return False, "Mật khẩu hiện tại không đúng"

    # hash password mới
    new_hashed = hash_password(new_password)

    # update DB
    cursor.execute(
        "UPDATE users SET password = %s WHERE id = %s",
        (new_hashed, user_id)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return True, "Đổi mật khẩu thành công"

def getUsers(searchTxt: str = None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        sql = "SELECT id, name, email, phoneNumber, role, is_Blocked, last_login FROM users WHERE is_Deleted = FALSE"
        params = []

        if searchTxt:
            sql += " AND (name LIKE %s OR email LIKE %s OR phoneNumber LIKE %s)"
            search_val = f"%{searchTxt}%"
            params = [search_val, search_val, search_val]

        sql += " ORDER BY id DESC"

        cursor.execute(sql, tuple(params))
        users = cursor.fetchall()
        return users

    except Exception as e:
        print(f"Get users service error: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def getUserById(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "SELECT id, name, email, phoneNumber, role, is_Blocked, last_login FROM users WHERE id = %s AND is_Deleted = FALSE"
        cursor.execute(sql, (user_id,))
        user = cursor.fetchone()
        if not user:
            return None
        return user
    finally:
        cursor.close()
        conn.close()

def createUser(data):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        check_sql = "SELECT id FROM users WHERE email=%s"
        cursor.execute(check_sql, (data.email,))
        existed = cursor.fetchone() 
        if existed:
            return False, "Email đã tồn tại"
        hashed_password = hash_password(data.password)

        cursor.execute("""
                        INSERT INTO users(name, email, password, phoneNumber, role)
                        VALUES(%s, %s, %s, %s, %s)
                       """, (data.name, data.email, hashed_password. data.phoneNumber, data.role,))
        conn.commit()

        return True, "Thêm người dùng thành công."
    except Exception as e:
        conn.rollback()
        print(f'Create user error: {e}')
        return False, f'Thêm người dùng thất bại: {str(e)}'
    finally:
        cursor.close()
        conn.close()

def updateUser(user_id, data):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT id FROM users WHERE id = %s AND is_Deleted = FALSE", (user_id,))
        if not cursor.fetchone():
            return False, "Người dùng không tồn tại."

        update_data = data.dict(exclude_unset=True) # Chỉ lấy các trường user có gửi lên
        if not update_data:
            return False, "Không có dữ liệu nào để cập nhật."

        # Hash lại password khi đổi
        if "password" in update_data:
            update_data["password"] = hash_password(update_data["password"])

        fields = []
        values = []
        for key, value in update_data.items():
            fields.append(f"{key} = %s")
            values.append(value)
        
        sql = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"
        values.append(user_id)

        cursor.execute(sql, tuple(values))
        conn.commit()

        return True, "Cập nhật thành công."

    except Exception as e:
        conn.rollback()
        print(f"Update user error: {e}")
        return False, f"Lỗi hệ thống: {str(e)}"
    finally:
        cursor.close()
        conn.close()