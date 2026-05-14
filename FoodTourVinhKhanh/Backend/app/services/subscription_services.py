from app.database import get_db_connection

def check_subscription_active(user):
    """
    Kiểm tra hạn sử dụng dựa trên Role của người dùng.
    """

    if user["role"] == "admin":
        return True

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        sql = f"""
            SELECT id FROM vendor_subscriptions
            WHERE user_id = %s
            AND end_time > NOW()
            ORDER BY end_time DESC
            LIMIT 1
        """
        cursor.execute(sql, (user["id"],))
        sub = cursor.fetchone()
        return sub is not None
    except Exception as e:
        print(f"Check sub error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()