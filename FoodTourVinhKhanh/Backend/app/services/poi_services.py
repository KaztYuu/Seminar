from app.database import get_db_connection
from app.services.subscription_services import is_vendor_active


# ========================
# ACTIVATE POIS
# ========================
def activate_pois(user_id: int):
    if not is_vendor_active(user_id):
        return False, "Bạn chưa kích hoạt gói dịch vụ hoặc gói dịch vụ đã hết hạn"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE pois 
        SET is_Active = TRUE 
        WHERE owner_id = %s 
        AND is_Deleted = FALSE
    """, (user_id,))

    affected = cursor.rowcount

    conn.commit()
    cursor.close()
    conn.close()

    return True, f"Đã kích hoạt {affected} POIs"


# ========================
# GET POIS
# ========================
def getPois(user, lang="vi"):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # ===== ADMIN =====
    if user["role"] == "admin":
        cursor.execute("""
            SELECT 
                p.*,
                pos.latitude,
                pos.longitude,
                pos.range_meter,
                ld.name,
                ld.description,
                ld.audio_url

            FROM pois p
            LEFT JOIN poi_position pos ON p.id = pos.poi_id
            LEFT JOIN poi_localized_data ld 
                ON p.id = ld.poi_id AND ld.lang_code = %s

            WHERE p.is_Deleted = FALSE
        """, (lang,))

    # ===== VENDOR =====
    elif user["role"] == "vendor":
        cursor.execute("""
            SELECT 
                p.*,
                pos.latitude,
                pos.longitude,
                pos.range_meter,
                ld.name,
                ld.description,
                ld.audio_url

            FROM pois p
            LEFT JOIN poi_position pos ON p.id = pos.poi_id
            LEFT JOIN poi_localized_data ld 
                ON p.id = ld.poi_id AND ld.lang_code = %s

            WHERE 
                p.owner_id = %s
                AND p.is_Deleted = FALSE
        """, (lang, user["id"]))

    # ===== TOURIST =====
    else:
        cursor.execute("""
            SELECT DISTINCT 
                p.id,
                p.thumbnail,
                p.banner,
                p.created_at,

                pos.latitude,
                pos.longitude,
                pos.range_meter,

                ld.name,
                ld.description,
                ld.audio_url

            FROM pois p

            JOIN users u ON p.owner_id = u.id

            LEFT JOIN (
                SELECT user_id, MAX(end_time) AS end_time
                FROM vendor_subscriptions
                GROUP BY user_id
            ) vs ON p.owner_id = vs.user_id

            LEFT JOIN poi_position pos ON p.id = pos.poi_id

            LEFT JOIN poi_localized_data ld 
                ON p.id = ld.poi_id AND ld.lang_code = %s

            WHERE 
                p.is_Active = TRUE
                AND p.is_Deleted = FALSE
                AND (
                    u.role = 'admin'
                    OR (u.role = 'vendor' AND vs.end_time > NOW())
                )
        """, (lang,))

    pois = cursor.fetchall()

    cursor.close()
    conn.close()

    return pois

def create_poi(user, data):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # =========================
        # 1. XỬ LÝ ROLE
        # =========================
        if user["role"] == "admin":
            is_active = data.is_active
            range_meter = data.position.range_meter
        else:
            is_active = False
            range_meter = None

        # =========================
        # 2. INSERT POIS
        # =========================
        cursor.execute("""
            INSERT INTO pois (owner_id, thumbnail, banner, is_Active)
            VALUES (%s, %s, %s, %s)
        """, (
            user["id"],
            data.thumbnail,
            data.banner,
            is_active
        ))

        poi_id = cursor.lastrowid

        # =========================
        # 3. INSERT POSITION
        # =========================
        cursor.execute("""
            INSERT INTO poi_position (poi_id, latitude, longitude, range_meter)
            VALUES (%s, %s, %s, %s)
        """, (
            poi_id,
            data.position.latitude,
            data.position.longitude,
            range_meter
        ))

        # =========================
        # 4. INSERT LOCALIZED
        # =========================
        cursor.execute("""
            INSERT INTO poi_localized_data 
            (poi_id, lang_code, name, description, audio_url)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            poi_id,
            data.localized.lang_code,
            data.localized.name,
            data.localized.description,
            data.localized.audio_url
        ))

        # =========================
        # 5. COMMIT
        # =========================
        conn.commit()

        return True, "Tạo POI thành công", poi_id

    except Exception as e:
        conn.rollback()
        return False, str(e), None

    finally:
        cursor.close()
        conn.close()