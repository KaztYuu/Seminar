from app.database import get_db_connection

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