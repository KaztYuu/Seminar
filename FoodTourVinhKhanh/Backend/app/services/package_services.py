from app.database import get_db_connection

def get_packages_by_role(role=None):

    sql = """
        SELECT * 
        FROM subscription_packages 
        WHERE is_Active = TRUE AND target_role = %s
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(sql, (role,))
    packages = cursor.fetchall()

    cursor.close()
    conn.close()

    return packages