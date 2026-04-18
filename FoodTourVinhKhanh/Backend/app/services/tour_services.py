from app.database import get_db_connection
from fastapi import HTTPException


def getTours():
    """Lấy tất cả tour kèm danh sách POI (cho tourist xem)"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy danh sách tour đang hoạt động
        cursor.execute("SELECT * FROM tours WHERE is_Active = TRUE ORDER BY created_at DESC")
        tours = cursor.fetchall()

        for tour in tours:
            # Lấy các điểm POI trong từng tour, kèm tọa độ để hiển thị trên map
            cursor.execute("""
                SELECT tp.point_order, p.id as poi_id, pld.name, pp.latitude, pp.longitude, pld.audio_url
                FROM tour_points tp
                JOIN pois p ON tp.poi_id = p.id
                JOIN poi_position pp ON p.id = pp.poi_id
                LEFT JOIN poi_localized_data pld ON p.id = pld.poi_id AND pld.lang_code = 'vi'
                WHERE tp.tour_id = %s
                ORDER BY tp.point_order ASC
            """, (tour["id"],))
            tour["points"] = cursor.fetchall()

        return tours
    finally:
        cursor.close()
        conn.close()


def getToursAdmin():
    """Lấy tất cả tour (kể cả ẩn) cho admin quản lý"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM tours ORDER BY created_at DESC")
        tours = cursor.fetchall()

        for tour in tours:
            cursor.execute("""
                SELECT tp.point_order, p.id as poi_id, pld.name, pp.latitude, pp.longitude
                FROM tour_points tp
                JOIN pois p ON tp.poi_id = p.id
                JOIN poi_position pp ON p.id = pp.poi_id
                LEFT JOIN poi_localized_data pld ON p.id = pld.poi_id AND pld.lang_code = 'vi'
                WHERE tp.tour_id = %s
                ORDER BY tp.point_order ASC
            """, (tour["id"],))
            tour["points"] = cursor.fetchall()

        return tours
    finally:
        cursor.close()
        conn.close()


def getTourById(tour_id: int):
    """Lấy chi tiết 1 tour theo id"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM tours WHERE id = %s", (tour_id,))
        tour = cursor.fetchone()
        if not tour:
            raise HTTPException(status_code=404, detail="Tour không tồn tại")

        cursor.execute("""
SELECT tp.point_order, p.id as poi_id, pld.name, pp.latitude, pp.longitude, pld.audio_url
            FROM tour_points tp
            JOIN pois p ON tp.poi_id = p.id
            JOIN poi_position pp ON p.id = pp.poi_id
            LEFT JOIN poi_localized_data pld ON p.id = pld.poi_id AND pld.lang_code = 'vi'
            WHERE tp.tour_id = %s
            ORDER BY tp.point_order ASC
        """, (tour_id,))
        tour["points"] = cursor.fetchall()

        return tour
    finally:
        cursor.close()
        conn.close()


def createTour(data):
    """Tạo tour mới kèm các điểm POI"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Tạo tour
        cursor.execute(
            "INSERT INTO tours (name, is_Active) VALUES (%s, %s)",
            (data.name, data.is_Active)
        )
        tour_id = cursor.lastrowid

        # Thêm từng điểm POI vào tour
        for point in data.points:
            cursor.execute(
                "INSERT INTO tour_points (tour_id, poi_id, point_order) VALUES (%s, %s, %s)",
                (tour_id, point.poi_id, point.point_order)
            )

        conn.commit()
        return tour_id
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi tạo tour: {str(e)}")
    finally:
        cursor.close()
        conn.close()


def updateTour(tour_id: int, data):
    """Cập nhật thông tin tour"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Cập nhật tên và trạng thái nếu có
        if data.name is not None or data.is_Active is not None:
            cursor.execute(
                "UPDATE tours SET name = COALESCE(%s, name), is_Active = COALESCE(%s, is_Active) WHERE id = %s",
                (data.name, data.is_Active, tour_id)
            )

        # Nếu có danh sách điểm mới → xóa cũ rồi thêm lại
        if data.points is not None:
            cursor.execute("DELETE FROM tour_points WHERE tour_id = %s", (tour_id,))
            for point in data.points:
                cursor.execute(
                    "INSERT INTO tour_points (tour_id, poi_id, point_order) VALUES (%s, %s, %s)",
                    (tour_id, point.poi_id, point.point_order)
                )

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật tour: {str(e)}")
    finally:
        cursor.close()
        conn.close()


def deleteTour(tour_id: int):
    """Xóa tour (tour_points tự xóa theo cascade)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tours WHERE id = %s", (tour_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa tour: {str(e)}")
    finally:
        cursor.close()
        conn.close()
