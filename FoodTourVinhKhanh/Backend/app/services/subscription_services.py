from app.database import get_db_connection

def check_subscription_active(user):
    """
    Kiểm tra hạn sử dụng dựa trên Role của người dùng.
    """

    if user["role"] == "admin":
        return True

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Xác định bảng cần truy vấn dựa trên role
    table_name = "vendor_subscriptions" if user["role"] == "vendor" else "tourist_subscriptions"

    try:
        sql = f"""
            SELECT id FROM {table_name}
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

def get_vendor_active_subscription(vendor_id: int):
    """
    Get vendor's currently active subscription with all details including daily_poi_limit.
    
    Args:
        vendor_id: The vendor user ID
        
    Returns:
        dict: Subscription details including package_id, daily_poi_limit, end_time
        None: If no active subscription found
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        sql = """
            SELECT vs.id, sp.id as package_id, sp.name as package_name, sp.daily_poi_limit,
                sp.price, vs.start_time, vs.end_time
            FROM vendor_subscriptions vs
            LEFT JOIN payments p ON vs.payment_id = p.id
            LEFT JOIN subscription_packages sp ON p.package_id = sp.id
            WHERE vs.user_id = %s
                AND vs.end_time > NOW()
            ORDER BY vs.end_time DESC
            LIMIT 1
        """
        cursor.execute(sql, (vendor_id,))
        subscription = cursor.fetchone()
        return subscription
    finally:
        cursor.close()
        conn.close()