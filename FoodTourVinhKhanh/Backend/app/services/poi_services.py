from app.database import get_db_connection
from app.services.image_services import image_service

from datetime import datetime, date
from math import radians, sin, cos, sqrt, atan2
from fastapi import HTTPException

# FEATURE 1: MAP API - Get map data with scope support
def getMapData(user, scope: str = "all", lang: str = "vi"):
    """
    FEATURE 1: Map API - Return POIs for map visualization.
    
    Args:
        user: Current authenticated user
        scope: "all" (public map) or "vendor" (vendor's own POIs)
        lang: Language code for localized data
        
    Returns:
        list: POI data with location info (latitude, longitude, etc.)
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # FEATURE 1: Base query returns: id, owner_id, status, coordinates, name
        query = """
            SELECT DISTINCT 
                p.id, p.owner_id, p.status, p.thumbnail, p.banner,
                pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                ld.name, ld.description,
                u.name as vendor_name, u.role
            FROM pois p
            LEFT JOIN poi_position pos ON p.id = pos.poi_id
            LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
            LEFT JOIN users u ON p.owner_id = u.id
            WHERE p.is_Deleted = FALSE
        """
        params = [lang]
        
        # FEATURE 1: Handle different scopes
        if scope == "vendor":
            # Vendor scope: Only vendor can see, returns all their POIs (approved, pending, rejected)
            if user["role"] != "vendor":
                raise HTTPException(status_code=403, detail="Only vendors can access vendor scope map")
            query += " AND p.owner_id = %s"
            params.append(user["id"])
        else:
            # "all" scope: Public map - return only approved POIs
            query += " AND p.status = 'approved'"
        
        query += " ORDER BY p.created_at DESC"
        
        cursor.execute(query, params)
        pois = cursor.fetchall()
        
        return pois
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching map data: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


def get_vendor_subscription_limit(vendor_id: int):
    """
    Get the maximum total POI limit from vendor's active subscription.
    Returns the configured package limit.
    
    Args:
        vendor_id: The vendor user ID
        
    Returns:
        int: The maximum total POI limit (default 1 for FREE tier)
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT sp.daily_poi_limit, sp.name
            FROM vendor_subscriptions vs
            LEFT JOIN payments p ON vs.payment_id = p.id
            LEFT JOIN subscription_packages sp ON p.package_id = sp.id
            WHERE vs.user_id = %s 
              AND vs.end_time > NOW()
            ORDER BY vs.end_time DESC
            LIMIT 1
        """
        cursor.execute(sql, (vendor_id,))
        result = cursor.fetchone()
        
        if not result:
            return 1

        package_name = (result.get("name") or "").upper()
        if package_name in ["FREE", "FREE_VENDOR"]:
            return 1
        if package_name == "BASIC":
            return 3
        if package_name == "VIP":
            return 10

        return result['daily_poi_limit'] if result else 1
    except Exception as e:
        print(f"Error fetching vendor subscription limit: {e}")
        return 1  # Default to FREE tier limit
    finally:
        cursor.close()
        conn.close()

def check_vendor_poi_limit(vendor_id: int):
    """
    Check if vendor can create another POI.
    
    Fetches the max POI limit from vendor's active subscription and counts
    TOTAL active POIs (not daily).
    
    Args:
        vendor_id: The vendor user ID
        
    Returns:
        bool: True if vendor can create another POI, False if limit reached
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get the max POI limit from vendor's subscription
        max_pois = get_vendor_subscription_limit(vendor_id)
        
        # Count TOTAL active POIs (not daily)
        cursor.execute("""
            SELECT COUNT(*) as total_count 
            FROM pois 
            WHERE owner_id = %s AND is_Deleted = FALSE
        """, (vendor_id,))
        
        result = cursor.fetchone()
        total_count = result['total_count'] if result else 0
        
        # Can create if total count is less than max limit
        return total_count < max_pois
    finally:
        cursor.close()
        conn.close()

def get_remaining_poi_quota(vendor_id: int):
    """
    Get remaining POI creation quota (based on total POI limit, not daily).
    
    Args:
        vendor_id: The vendor user ID
        
    Returns:
        dict: {
            'max_pois': int,
            'total_count': int,
            'remaining': int
        }
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get max POI limit from subscription
        max_pois = get_vendor_subscription_limit(vendor_id)
        
        # Count TOTAL active POIs
        cursor.execute("""
            SELECT COUNT(*) as total_count
            FROM pois
            WHERE owner_id = %s AND is_Deleted = FALSE
        """, (vendor_id,))
        
        result = cursor.fetchone()
        total_count = result['total_count'] if result else 0
        
        remaining = max(0, max_pois - total_count)
        
        return {
            'max_pois': max_pois,
            'total_count': total_count,
            'remaining': remaining
        }
    finally:
        cursor.close()
        conn.close()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    
    Args:
        lat1, lon1: User location (degrees)
        lat2, lon2: POI location (degrees)
        
    Returns:
        float: Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)
    
    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad
    
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    distance = R * c
    return distance

def activate_poi_single(poi_id: int):
    """
    Duyệt một POI riêng lẻ.
    
    Args:
        poi_id: ID của POI cần duyệt
        
    Returns:
        tuple: (success: bool, message: str)
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Kiểm tra POI tồn tại và đang chờ duyệt
        cursor.execute("SELECT id, is_Active FROM pois WHERE id = %s AND is_Deleted = FALSE", (poi_id,))
        poi = cursor.fetchone()
        
        if not poi:
            return False, "Không tìm thấy POI"
        
        if poi["is_Active"]:
            return False, "POI này đã được duyệt rồi"
        
        # Cập nhật trạng thái
        cursor.execute("UPDATE pois SET is_Active = TRUE WHERE id = %s", (poi_id,))
        conn.commit()
        
        return True, "Đã duyệt POI thành công"
    except Exception as e:
        conn.rollback()
        print(f"Lỗi duyệt POI: {str(e)}")
        return False, "Có lỗi xảy ra khi duyệt POI"
    finally:
        cursor.close()
        conn.close()

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
                pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                ld.name, ld.description, ld.audio_url,
                CASE 
                    WHEN u.role = 'admin' THEN FALSE
                    WHEN u.role = 'vendor' AND (vs.end_time IS NULL OR vs.end_time < NOW()) THEN TRUE
                    ELSE FALSE
                END AS is_Expired,
                vs.end_time as subscription_end
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

        # Filter theo Role
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

        # Tích hợp Tìm kiếm
        if searchTxt.strip():
            query += " AND ld.name LIKE %s"
            params.append(f"%{searchTxt}%")

        query += " ORDER BY p.created_at DESC"

        cursor.execute(query, params)
        pois = cursor.fetchall()
        for poi in pois:
            poi['is_Expired'] = bool(poi['is_Expired'])
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
                SELECT p.*, pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                    ld.name, ld.description, ld.audio_url, ld.lang_code
                FROM pois p
                JOIN users u ON p.owner_id = u.id
                LEFT JOIN vendor_subscriptions vs ON u.id = vs.user_id
                LEFT JOIN poi_position pos ON p.id = pos.poi_id
                LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
                WHERE p.id = %s 
                AND p.is_Deleted = FALSE 
                AND p.is_Active = TRUE
                AND (
                    u.role = 'admin' 
                    OR (u.role = 'vendor' AND vs.end_time > NOW())
                )
                ORDER BY vs.end_time DESC
                LIMIT 1
            """, (lang, poi_id))
        else:
            # Vendor/Admin sửa bài: Lấy bản 'vi' chuẩn
            cursor.execute("""
                SELECT p.*, pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                    ld.name, ld.description
                FROM pois p
                LEFT JOIN poi_position pos ON p.id = pos.poi_id
                LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = 'vi'
                WHERE p.id = %s AND p.is_Deleted = FALSE
            """, (poi_id,))
        
        poi = cursor.fetchone()

        if poi and user["role"] != "tourist":
            cursor.execute(
                """
                    SELECT id, category, content 
                    FROM poi_knowledge_base 
                    WHERE poi_id = %s
                """
            , (poi_id,))
            poi['knowledge'] = cursor.fetchall()

    except Exception as e:
        print(f"Get POI Error: {e}")
    finally:

        cursor.close()
        conn.close()
        
    return poi

async def createPOI(user, data):
    conn = get_db_connection()
    cursor = conn.cursor()

    poi_id = None

    try:
        # 1. Lưu ảnh
        thumbnail_path = image_service.save_image(data.thumbnail, "thumb")
        banner_path = image_service.save_image(data.banner, "banner")

        # 2. Vietnamese is the official source. No backend auto-translation here.
        # - vi is stored in `data.localized`
        # - other languages are stored in `data.localized_data` (vendor-selected)
        localized_items = []

        # Ensure we don't allow `vi` inside localized_data
        localized_data_items = data.localized_data or []
        for item in localized_data_items:
            if item.lang_code.lower() == "vi":
                raise HTTPException(status_code=400, detail="localized_data must not include 'vi'")
            localized_items.append({
                "lang_code": item.lang_code,
                "name": item.name,
                "description": item.description,
            })

        # Add official VI source
        localized_items.insert(
            0,
            {"lang_code": "vi", "name": data.localized.name, "description": data.localized.description},
        )



        # 3. Insert bảng POI trước ĐỂ LẤY poi_id
        cursor.execute("""
            INSERT INTO pois (owner_id, thumbnail, banner, is_Active)
            VALUES (%s, %s, %s, %s)
        """, (user["id"], thumbnail_path, banner_path, data.is_active if user["role"]=="admin" else False))
        
        poi_id = cursor.lastrowid # <--- ĐÃ CÓ ID

        # 4. Insert Vị trí
        audio_range = data.position.audio_range if user["role"] == "admin" else 30
        access_range = data.position.access_range if user["role"] == "admin" else 10
        cursor.execute("""
            INSERT INTO poi_position (poi_id, latitude, longitude, audio_range, access_range)
            VALUES (%s, %s, %s, %s, %s)
        """, (poi_id, data.position.latitude, data.position.longitude, audio_range, access_range))

        # 5. Insert knowledge của POI
        knowledge_list = data.knowledge if isinstance(data.knowledge, list) else [data.knowledge]
        for kn in knowledge_list:
            cursor.execute("""
                INSERT INTO poi_knowledge_base (poi_id, category, content)
                VALUES (%s, %s, %s)
            """, (poi_id, kn.category, kn.content))

        # 6. Store localized data (vendor-approved). Backend does not generate audio.
        for item in localized_items:
            cursor.execute("""
                INSERT INTO poi_localized_data (poi_id, lang_code, name, description, audio_url)
                VALUES (%s, %s, %s, %s, NULL)
            """, (poi_id, item["lang_code"], item["name"], item["description"]))


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
        old_poi = cursor.fetchone() # Lấy dữ liệu POI cũ
        
        if not old_poi:
            return False, "Không tìm thấy POI", None
        
        # Kiểm tra quyền
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
                SET latitude = %s, longitude = %s, audio_range = %s, access_range = %s
                WHERE poi_id = %s
            """, (data.position.latitude, data.position.longitude, data.position.audio_range, data.position.access_range, poi_id))
        else:
            cursor.execute("""
                UPDATE poi_position 
                SET latitude = %s, longitude = %s
                WHERE poi_id = %s
            """, (data.position.latitude, data.position.longitude, poi_id))

        if data.knowledge:
            cursor.execute("DELETE FROM poi_knowledge_base WHERE poi_id = %s", (poi_id,))
            knowledge_list = data.knowledge if isinstance(data.knowledge, list) else [data.knowledge]
            for kn in knowledge_list:
                cursor.execute("""
                    INSERT INTO poi_knowledge_base (poi_id, category, content)
                    VALUES (%s, %s, %s)
                """, (poi_id, kn.category, kn.content))

        # If vendor edits the official Vietnamese narration, reset all other languages.
        if data.localized and data.localized.description != old_poi['old_desc']:
            cursor.execute(
                """DELETE FROM poi_localized_data WHERE poi_id = %s AND lang_code <> 'vi'""",
                (poi_id,),
            )

            cursor.execute(
                """UPDATE poi_localized_data
                   SET name = %s, description = %s
                   WHERE poi_id = %s AND lang_code = 'vi'""",
                (data.localized.name, data.localized.description, poi_id),
            )

            # Ensure VI row exists (in case it was missing)
            cursor.execute(
                """INSERT INTO poi_localized_data (poi_id, lang_code, name, description, audio_url)
                   SELECT %s, 'vi', %s, %s, NULL
                   WHERE NOT EXISTS (
                       SELECT 1 FROM poi_localized_data WHERE poi_id = %s AND lang_code = 'vi'
                   )""",
                (poi_id, data.localized.name, data.localized.description, poi_id),
            )

        elif data.localized:
            # Update only Vietnamese
            cursor.execute(
                """UPDATE poi_localized_data
                   SET name = %s, description = %s
                   WHERE poi_id = %s AND lang_code = 'vi'""",
                (data.localized.name, data.localized.description, poi_id),
            )


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



        # FIX P0-2: Cascade delete - delete from tour_points first
        cursor.execute("SELECT DISTINCT tour_id FROM tour_points WHERE poi_id = %s", (poi_id,))
        affected_tours = cursor.fetchall()
        
        cursor.execute("DELETE FROM tour_points WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_position WHERE poi_id = %s", (poi_id,))
        cursor.execute("DELETE FROM poi_knowledge_base WHERE poi_id = %s", (poi_id,))
        
        cursor.execute("UPDATE pois SET is_Deleted = TRUE WHERE id = %s", (poi_id,))

        # FIX P0-2: Check if any tour now has 0 POI and delete them
        for tour in affected_tours:
            tour_id = tour['tour_id']
            cursor.execute("SELECT COUNT(*) as count FROM tour_points WHERE tour_id = %s", (tour_id,))
            result = cursor.fetchone()
            if result['count'] == 0:
                cursor.execute("DELETE FROM tours WHERE id = %s", (tour_id,))

        conn.commit()


        
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

def getPOIData(poi_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        #  Lấy Tên và Mô tả tổng quát của quán
        cursor.execute(
            """
            SELECT name, description 
            FROM poi_localized_data 
            WHERE poi_id = %s AND lang_code = 'vi'
            """,
            (poi_id,)
        )
        poi_info = cursor.fetchone()
        
        #  Lấy chi tiết kiến thức
        cursor.execute(
            """
            SELECT category, content
            FROM poi_knowledge_base
            WHERE poi_id = %s
            """,
            (poi_id,)
        )
        knowledge_rows = cursor.fetchall()

        if not poi_info and not knowledge_rows:
            return True, ""

        context_parts = []
        
        if poi_info:
            context_parts.append(f"Tên địa điểm: {poi_info['name']}.")
            context_parts.append(f"Giới thiệu: {poi_info['description']}.")

        if knowledge_rows:
            knowledge_text = " ".join([f"[{row['category']}]: {row['content']}" for row in knowledge_rows])
            context_parts.append(f"Thông tin chi tiết: {knowledge_text}")

        context_string = " ".join(context_parts)
        print(context_string)

        return True, context_string

    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu POI: {str(e)}")
        return False, None
    finally:
        cursor.close()
        conn.close()

def get_nearby_pois(user, latitude: float, longitude: float, radius: float = 5.0, lang: str = "vi"):
    """
    Get POIs within a specified radius from a location (Map Explore feature).
    
    Uses Haversine formula to calculate distances and filters POIs based on:
    - User's subscription (only see active POIs from subscribed vendors)
    - Role-based visibility
    - Language preference
    
    Args:
        user: Current user object
        latitude: User's latitude
        longitude: User's longitude
        radius: Search radius in kilometers (default 5)
        lang: Language code (default 'vi')
        
    Returns:
        list: POI objects with calculated distance
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get all POIs with positions
        query = """
            SELECT p.id, p.owner_id, p.name, p.thumbnail, p.banner, 
                   p.is_Active, p.is_Deleted, p.created_at,
                   pos.latitude, pos.longitude, pos.audio_range, pos.access_range,
                   ld.name as poi_name, ld.description, ld.audio_url,
                   u.role as owner_role,
                   vs.end_time as subscription_end
            FROM pois p
            LEFT JOIN poi_position pos ON p.id = pos.poi_id
            LEFT JOIN poi_localized_data ld ON p.id = ld.poi_id AND ld.lang_code = %s
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN vendor_subscriptions vs ON u.id = vs.user_id
            WHERE p.is_Deleted = FALSE AND pos.latitude IS NOT NULL AND pos.longitude IS NOT NULL
        """
        
        params = [lang]
        
        # Role-based filtering
        if user["role"] == "tourist":
            # Tourists see only active POIs from vendors with active subscriptions
            query += """
                AND p.is_Active = TRUE 
                AND (u.role = 'admin' OR (u.role = 'vendor' AND vs.end_time > NOW()))
            """
        elif user["role"] == "vendor":
            # Vendors see their own POIs and active POIs from other vendors
            query += """
                AND (p.owner_id = %s OR (p.is_Active = TRUE AND u.role = 'admin') 
                     OR (p.is_Active = TRUE AND u.role = 'vendor' AND vs.end_time > NOW()))
            """
            params.append(user["id"])
        # Admin sees all non-deleted POIs
        
        cursor.execute(query, params)
        all_pois = cursor.fetchall()
        
        # Filter by distance
        nearby_pois = []
        for poi in all_pois:
            if poi['latitude'] and poi['longitude']:
                distance = calculate_distance(
                    latitude, 
                    longitude, 
                    poi['latitude'], 
                    poi['longitude']
                )
                
                if distance <= radius:
                    poi['distance_km'] = round(distance, 2)
                    nearby_pois.append(poi)
        
        # Sort by distance
        nearby_pois.sort(key=lambda x: x['distance_km'])
        
        return nearby_pois
        
    finally:
        cursor.close()
        conn.close()
