from app.database import get_db_connection

def is_vendor_active(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM vendor_subscriptions
        WHERE user_id = %s
        AND end_time > NOW()
        ORDER BY end_time DESC
        LIMIT 1
    """, (user_id,))

    sub = cursor.fetchone()

    cursor.close()
    conn.close()

    return sub is not None