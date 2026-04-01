from app.database import get_db_connection
from app.services.subscription_services import is_vendor_active
from app.services.gemini_services import gemini_service
from app.services.image_services import image_service


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

async def createPOI(user, data):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        thumbnail_path = image_service.save_image(data.thumbnail, "thumb")
        banner_path = image_service.save_image(data.banner, "banner")

        if user["role"] == "admin":
            is_active = data.is_active
            range_meter = data.position.range_meter
        else:
            is_active = False
            range_meter = None

        translations = await gemini_service.translate_to_multiple_languages(data.localized.description)
        
        # Tạo danh sách các bản ghi localized (Gồm bản gốc + các bản dịch)
        localized_items = [
            {
                "lang_code": "vi", 
                "name": data.localized.name, 
                "description": data.localized.description
            }
        ]
        
        # Thêm các bản dịch từ Gemini vào danh sách (en, kr, fr)
        for lang, text in translations.items():
            localized_items.append({
                "lang_code": lang,
                "name": data.localized.name,
                "description": text
            })

        cursor.execute("""
            INSERT INTO pois (owner_id, thumbnail, banner, is_Active)
            VALUES (%s, %s, %s, %s)
        """, (user["id"], thumbnail_path, banner_path, is_active))
        
        poi_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO poi_position (poi_id, latitude, longitude, range_meter)
            VALUES (%s, %s, %s, %s)
        """, (poi_id, data.position.latitude, data.position.longitude, range_meter))

        for item in localized_items:
            # Tạo file âm thanh cho từng ngôn ngữ dựa trên mô tả tương ứng
            audio_url = await gemini_service.text_to_speech(item["description"])
            
            cursor.execute("""
                INSERT INTO poi_localized_data 
                (poi_id, lang_code, name, description, audio_url)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                poi_id, 
                item["lang_code"], 
                item["name"], 
                item["description"], 
                audio_url
            ))

        conn.commit()
        return True, "Tạo POI và bản dịch đa ngôn ngữ thành công", poi_id

    except Exception as e:
        conn.rollback()
        print(f"Create POI Error: {e}")
        return False, str(e), None

    finally:
        cursor.close()
        conn.close()