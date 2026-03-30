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