from app.database import get_db_connection
from app.services.subscription_services import is_vendor_active
from app.services.gemini_services import gemini_service
from app.services.image_services import image_service
from app.services.audio_services import audio_service

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
        # 1. Lưu ảnh
        thumbnail_path = image_service.save_image(data.thumbnail, "thumb")
        banner_path = image_service.save_image(data.banner, "banner")

        # 2. Dịch thuật
        translations = await gemini_service.translate_to_multiple_languages(data.localized.description)
        localized_items = [{"lang_code": "vi", "name": data.localized.name, "description": data.localized.description}]
        for lang, text in translations.items():
            localized_items.append({"lang_code": lang, "name": data.localized.name, "description": text})

        # 3. Insert bảng POI chính ĐỂ LẤY poi_id
        cursor.execute("""
            INSERT INTO pois (owner_id, thumbnail, banner, is_Active)
            VALUES (%s, %s, %s, %s)
        """, (user["id"], thumbnail_path, banner_path, data.is_active if user["role"]=="admin" else False))
        
        poi_id = cursor.lastrowid # <--- ĐÃ CÓ ID ĐỂ ĐẶT TÊN FILE AUDIO

        # 4. Insert Vị trí
        cursor.execute("""
            INSERT INTO poi_position (poi_id, latitude, longitude, range_meter)
            VALUES (%s, %s, %s, %s)
        """, (poi_id, data.position.latitude, data.position.longitude, data.position.range_meter if user["role"]=="admin" else 20))

        # 5. Xử lý Audio và Localized Data
        for item in localized_items:
            # Gọi Gemini lấy bytes
            audio_bytes = await gemini_service.text_to_speech(item["description"])
            
            # Lưu file thông qua AudioService
            audio_url = audio_service.save_audio(audio_bytes, poi_id, item["lang_code"])
            
            cursor.execute("""
                INSERT INTO poi_localized_data (poi_id, lang_code, name, description, audio_url)
                VALUES (%s, %s, %s, %s, %s)
            """, (poi_id, item["lang_code"], item["name"], item["description"], audio_url))

        conn.commit()
        return True, "Thành công", poi_id

    except Exception as e:
        conn.rollback()
        image_service.delete_image(thumbnail_path)
        image_service.delete_image(banner_path)
        return False, str(e), None
    finally:
        cursor.close()
        conn.close()

def getPOIById(user, poi_id, lang="vi"):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    poi = None

    try:
        if user["role"] == 'tourist':
            # Dùng LEFT JOIN để an toàn nếu thiếu bản dịch
            cursor.execute("""
                SELECT p.*, pos.latitude, pos.longitude, pos.range_meter,
                       ld.name, ld.description, ld.audio_url, ld.lang_code
                FROM pois p
                LEFT JOIN poi_position pos ON p.id = pos.poi_id
                LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
                WHERE p.id = %s AND p.is_Deleted = FALSE
            """, (lang, poi_id))
        else:
            # Vendor/Admin sửa bài: Lấy bản 'vi' chuẩn
            cursor.execute("""
                SELECT p.*, pos.latitude, pos.longitude, pos.range_meter,
                       ld.name, ld.description
                FROM pois p
                LEFT JOIN poi_position pos ON p.id = pos.poi_id
                LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = 'vi'
                WHERE p.id = %s AND p.is_Deleted = FALSE
            """, (poi_id,))
        
        poi = cursor.fetchone()

    except Exception as e:
        print(f"Get POI Error: {e}")
    finally:

        cursor.close()
        conn.close()
        
    return poi

async def updatePOI(user, poi_id, data):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Kiểm tra quyền sở hữu
        cursor.execute("SELECT owner_id, thumbnail, banner FROM pois WHERE id = %s", (poi_id,))
        old_poi = cursor.fetchone()
        
        if not old_poi:
            return False, "Không tìm thấy POI", None
            
        if user["role"] != "admin" and old_poi["owner_id"] != user["id"]:
            return False, "Bạn không có quyền chỉnh sửa POI này", None

        # 2. Xử lý Ảnh (Nếu có ảnh mới thì lưu, nếu không thì giữ đường dẫn cũ)
        new_thumbnail_path = image_service.save_image(data.thumbnail, "thumb")
        new_banner_path = image_service.save_image(data.banner, "banner")

        # 3. Dịch thuật lại
        translations = await gemini_service.translate_to_multiple_languages(data.localized.description)
        
        localized_items = [
            {"lang_code": "vi", "name": data.localized.name, "description": data.localized.description}
        ]
        for lang, text in translations.items():
            localized_items.append({"lang_code": lang, "name": data.localized.name, "description": text})
        
        # 4. Cập nhật bảng POI chính
        is_active = data.is_active if user["role"] == "admin" else old_poi["is_Active"]
        cursor.execute("""
            UPDATE pois 
            SET thumbnail = %s, banner = %s, is_Active = %s 
            WHERE id = %s
        """, (new_thumbnail_path, new_banner_path, is_active, poi_id))

        # 5. Cập nhật Vị trí
        cursor.execute("""
            UPDATE poi_position 
            SET latitude = %s, longitude = %s, range_meter = IF(%s = 'admin', %s, poi_position.range_meter) 
            WHERE poi_id = %s
        """, (data.position.latitude, data.position.longitude, user["role"], data.position.range_meter, poi_id))

        # 6. Cập nhật Localized Data & Audio
        # Cách sạch nhất: Xóa các bản dịch cũ và file audio cũ của POI này, sau đó insert mới
        
        # Lấy danh sách audio cũ để xóa sau khi commit thành công
        cursor.execute("SELECT audio_url FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        old_audios = cursor.fetchall()

        cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))

        for item in localized_items:
            # Sinh Audio mới từ Gemini
            audio_bytes = await gemini_service.text_to_speech(item["description"])
            # Lưu file audio mới (AudioService sẽ tự ghi đè hoặc tạo file mới theo poi_id)
            audio_url = audio_service.save_audio(audio_bytes, poi_id, item["lang_code"])
            
            cursor.execute("""
                INSERT INTO poi_localized_data (poi_id, lang_code, name, description, audio_url)
                VALUES (%s, %s, %s, %s, %s)
            """, (poi_id, item["lang_code"], item["name"], item["description"], audio_url))

        conn.commit()
        
        # Xóa ảnh cũ nếu đường dẫn đã thay đổi
        if new_thumbnail_path != old_poi["thumbnail"]:
            image_service.delete_image(old_poi["thumbnail"])
            
        if new_banner_path != old_poi["banner"]:
            image_service.delete_image(old_poi["banner"])

        return True, "Cập nhật POI thành công", poi_id

    except Exception as e:
        conn.rollback()
        print(f"Update POI Error: {e}")
        return False, f"Lỗi cập nhật: {str(e)}", None
    finally:
        cursor.close()
        conn.close()

async def deletePOI(user, poi_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM pois WHERE id = %s AND is_Deleted = FALSE", (poi_id,))
        poi = cursor.fetchone()

        if not poi:
            return False, f"POI không tồn tại hoặc đã bị xóa. ID: {poi_id}"

        if user["role"] == "vendor" and poi["owner_id"] != user["id"]:
            return False, "Bạn không phải chủ sở hữu của POI này."

        cursor.execute("SELECT audio_url FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        audio_rows = cursor.fetchall()

        cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_position WHERE poi_id = %s", (poi_id,))
        
        cursor.execute("UPDATE pois SET is_Deleted = TRUE WHERE id = %s", (poi_id,))

        conn.commit()

        for row in audio_rows:
            if row['audio_url']:
                audio_service.delete_audio(row['audio_url'])
        
        image_service.delete_image(poi["thumbnail"])
        image_service.delete_image(poi["banner"])

        return True, "Xóa POI thành công"

    except Exception as e:
        conn.rollback()
        print(f"Delete POI Error: {e}")
        return False, f"Lỗi hệ thống: {str(e)}"
    finally:
        cursor.close()
        conn.close()
            