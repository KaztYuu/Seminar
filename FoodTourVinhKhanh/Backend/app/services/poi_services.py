from app.database import get_db_connection
from app.services.gemini_services import gemini_service
from app.services.image_services import image_service
from app.services.audio_services import audio_service

def activate_pois():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = """
            UPDATE pois p
            JOIN users u ON p.owner_id = u.id
            SET p.is_Active = TRUE 
            WHERE p.is_Active = FALSE 
            AND p.is_Deleted = FALSE
            AND (
                u.role = 'admin' 
                OR 
                (u.role = 'vendor' AND EXISTS (
                    SELECT 1 
                    FROM vendor_subscriptions vs 
                    WHERE vs.user_id = p.owner_id 
                        AND vs.end_time > NOW()
                ))
            )
        """
        cursor.execute(sql)
        affected = cursor.rowcount # Lấy số lượng POIs đã được duyệt
        conn.commit()
        
        return True, f"Đã duyệt thành công {affected} POIs."
    except Exception as e:
        conn.rollback()
        print(f"Lỗi activate hàng loạt: {str(e)}")
        return False, "Có lỗi xảy ra khi duyệt POIs."
    finally:
        cursor.close()
        conn.close()

def getPois(user, lang="vi", searchTxt=""):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        
        query = """
            SELECT DISTINCT 
                p.*,
                pos.latitude, pos.longitude, pos.range_meter,
                ld.name, ld.description, ld.audio_url
            FROM pois p
            LEFT JOIN poi_position pos ON p.id = pos.poi_id
            LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN (
                SELECT user_id, MAX(end_time) AS end_time
                FROM vendor_subscriptions
                GROUP BY user_id
            ) vs ON p.owner_id = vs.user_id
            WHERE p.is_Deleted = FALSE
        """
        params = [lang if user["role"] == "tourist" else 'vi']

        #Phân quyền (Filter theo Role)
        if user["role"] == "admin":
            # Admin thấy tất cả
            pass 
        elif user["role"] == "vendor":
            # Vendor chỉ thấy đồ của mình
            query += " AND p.owner_id = %s"
            params.append(user["id"])
        else:
            # Tourist chỉ thấy POIs Active và Vendor còn hạn sub
            query += """ 
                AND p.is_Active = TRUE 
                AND (u.role = 'admin' OR (u.role = 'vendor' AND vs.end_time > NOW()))
            """

        #Tích hợp Tìm kiếm (Search logic)
        if searchTxt.strip():
            query += " AND ld.name LIKE %s"
            params.append(f"%{searchTxt}%")

        query += " ORDER BY p.created_at DESC"

        cursor.execute(query, params)
        pois = cursor.fetchall()
        return pois

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
        audio_service.delete_poi_audios(poi_id=poi_id)
        return False, str(e), None
    finally:
        cursor.close()
        conn.close()



# async def updatePOI(user, poi_id, data):
#     conn = get_db_connection()
#     cursor = conn.cursor(dictionary=True)

#     try:
#         # 1. Kiểm tra quyền sở hữu
#         cursor.execute("SELECT owner_id, thumbnail, banner FROM pois WHERE id = %s", (poi_id,))
#         old_poi = cursor.fetchone()
        
#         if not old_poi:
#             return False, "Không tìm thấy POI", None
            
#         if user["role"] != "admin" and old_poi["owner_id"] != user["id"]:
#             return False, "Bạn không có quyền chỉnh sửa POI này", None

#         # 2. Xử lý Ảnh (Nếu có ảnh mới thì lưu, nếu không thì giữ đường dẫn cũ)
#         new_thumbnail_path = image_service.save_image(data.thumbnail, "thumb")
#         new_banner_path = image_service.save_image(data.banner, "banner")

#         # 3. Dịch thuật lại
#         translations = await gemini_service.translate_to_multiple_languages(data.localized.description)
        
#         localized_items = [
#             {"lang_code": "vi", "name": data.localized.name, "description": data.localized.description}
#         ]
#         for lang, text in translations.items():
#             localized_items.append({"lang_code": lang, "name": data.localized.name, "description": text})
        
#         # 4. Cập nhật bảng POI chính
#         is_active = data.is_active if user["role"] == "admin" else old_poi["is_Active"]
#         cursor.execute("""
#             UPDATE pois 
#             SET thumbnail = %s, banner = %s, is_Active = %s 
#             WHERE id = %s
#         """, (new_thumbnail_path, new_banner_path, is_active, poi_id))

#         # 5. Cập nhật Vị trí
#         cursor.execute("""
#             UPDATE poi_position 
#             SET latitude = %s, longitude = %s, range_meter = IF(%s = 'admin', %s, poi_position.range_meter) 
#             WHERE poi_id = %s
#         """, (data.position.latitude, data.position.longitude, user["role"], data.position.range_meter, poi_id))

#         # 6. Cập nhật Localized Data & Audio
#         # Cách sạch nhất: Xóa các bản dịch cũ và file audio cũ của POI này, sau đó insert mới
        
#         # Lấy danh sách audio cũ để xóa sau khi commit thành công
#         cursor.execute("SELECT audio_url FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
#         old_audios = cursor.fetchall()

#         cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))

#         for item in localized_items:
#             # Sinh Audio mới từ Gemini
#             audio_bytes = await gemini_service.text_to_speech(item["description"])
#             # Lưu file audio mới (AudioService sẽ tự ghi đè hoặc tạo file mới theo poi_id)
#             audio_url = audio_service.save_audio(audio_bytes, poi_id, item["lang_code"])
            
#             cursor.execute("""
#                 INSERT INTO poi_localized_data (poi_id, lang_code, name, description, audio_url)
#                 VALUES (%s, %s, %s, %s, %s)
#             """, (poi_id, item["lang_code"], item["name"], item["description"], audio_url))

#         conn.commit()
        
#         # Xóa ảnh cũ nếu đường dẫn đã thay đổi
#         if new_thumbnail_path != old_poi["thumbnail"]:
#             image_service.delete_image(old_poi["thumbnail"])
            
#         if new_banner_path != old_poi["banner"]:
#             image_service.delete_image(old_poi["banner"])

#         return True, "Cập nhật POI thành công", poi_id

#     except Exception as e:
#         conn.rollback()
#         print(f"Update POI Error: {e}")
#         return False, f"Lỗi cập nhật: {str(e)}", None
#     finally:
#         cursor.close()
#         conn.close()

async def updatePOI(user, poi_id, data):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    new_thumbnail_path = None
    new_banner_path = None

    try:
        cursor.execute("""
            SELECT p.owner_id, p.thumbnail, p.banner, p.is_Active, ld.description as old_desc
            FROM pois p
            JOIN poi_localized_data ld ON p.id = ld.poi_id
            WHERE p.id = %s AND ld.lang_code = 'vi'
        """, (poi_id,))
        old_poi = cursor.fetchone()
        
        if not old_poi:
            return False, "Không tìm thấy POI", None
            
        if user["role"] != "admin" and old_poi["owner_id"] != user["id"]:
            return False, "Bạn không có quyền chỉnh sửa POI này", None

        new_thumbnail_path = image_service.save_image(data.thumbnail, "thumb") if data.thumbnail else old_poi["thumbnail"]
        new_banner_path = image_service.save_image(data.banner, "banner") if data.banner else old_poi["banner"]

        is_active = data.is_active if user["role"] == "admin" else old_poi["is_Active"]
        
        cursor.execute("""
            UPDATE pois 
            SET thumbnail = %s, banner = %s, is_Active = %s 
            WHERE id = %s
        """, (new_thumbnail_path, new_banner_path, is_active, poi_id))

        if user["role"] == "admin":
            cursor.execute("""
                UPDATE poi_position 
                SET latitude = %s, longitude = %s, range_meter = %s 
                WHERE poi_id = %s
            """, (data.position.latitude, data.position.longitude, data.position.range_meter, poi_id))
        else:
            cursor.execute("""
                UPDATE poi_position 
                SET latitude = %s, longitude = %s
                WHERE poi_id = %s
            """, (data.position.latitude, data.position.longitude, poi_id))

        # Nếu mô tả mới khác mô tả cũ, chúng ta mới dịch lại và sinh audio mới
        if data.localized and data.localized.description != old_poi['old_desc']:
            
            translations = await gemini_service.translate_to_multiple_languages(data.localized.description)
            localized_items = [{"lang_code": "vi", "name": data.localized.name, "description": data.localized.description}]
            for lang, text in translations.items():
                localized_items.append({"lang_code": lang, "name": data.localized.name, "description": text})

            # Xóa các bản dịch và audio cũ trong DB
            cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))

            for item in localized_items:
                # Sinh Audio mới từ Gemini
                audio_bytes = await gemini_service.text_to_speech(item["description"])
                # Lưu file audio mới (Ghi đè file cũ của POI này)
                audio_url = audio_service.save_audio(audio_bytes, poi_id, item["lang_code"])
                
                cursor.execute("""
                    INSERT INTO poi_localized_data (poi_id, lang_code, name, description, audio_url)
                    VALUES (%s, %s, %s, %s, %s)
                """, (poi_id, item["lang_code"], item["name"], item["description"], audio_url))
        
        elif data.localized:
            cursor.execute("""
                UPDATE poi_localized_data 
                SET name = %s 
                WHERE poi_id = %s
            """, (data.localized.name, poi_id))

        conn.commit()

        if data.thumbnail and new_thumbnail_path != old_poi["thumbnail"]:
            image_service.delete_image(old_poi["thumbnail"])
        if data.banner and new_banner_path != old_poi["banner"]:
            image_service.delete_image(old_poi["banner"])

        return True, "Cập nhật POI thành công", poi_id

    except Exception as e:
        conn.rollback()
        # Nếu có lỗi, xóa ảnh mới vừa tạo (nếu có)
        if data.thumbnail and new_thumbnail_path and new_thumbnail_path != old_poi["thumbnail"]:
            image_service.delete_image(new_thumbnail_path)
        if data.banner and new_banner_path and new_banner_path != old_poi["banner"]:
            image_service.delete_image(new_banner_path)
            
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
            