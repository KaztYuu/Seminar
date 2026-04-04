import uuid
from datetime import datetime, timedelta
from app.database import get_db_connection
from app.services.vnpay_services import create_vnpay_url, verify_vnpay

def create_payment_service(user_id, package_id, payment_method):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Lấy package
    cursor.execute("""
        SELECT * FROM subscription_packages 
        WHERE id = %s AND is_Active = TRUE
    """, (package_id,))
    pkg = cursor.fetchone()

    if not pkg:
        cursor.close()
        conn.close()
        return {"message": "Package not found"}

    txn_ref = str(uuid.uuid4())

    # Tạo payment
    cursor.execute("""
        INSERT INTO payments (user_id, package_id, amount, transaction_ref, payment_method, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
    """, (user_id, package_id, pkg["price"], txn_ref, payment_method))

    conn.commit()

    cursor.close()
    conn.close()

    # Tạo URL chuyển hướng đến VNPay
    payment_url = create_vnpay_url({
        "amount": pkg["price"],
        "transaction_ref": txn_ref,
        "package_id": package_id
    })

    return {"payment_url": payment_url}

#HANDLE IPN (Kiểm tra kết quả trả về và activate gói cho user)
def handle_vnpay_ipn(params: dict):
    # Kiểm tra chữ ký đầu tiên
    if not verify_vnpay(params):
        return {"RspCode": "97", "Message": "Invalid Signature"}

    txn_ref = params.get("vnp_TxnRef")
    # VNPay gửi vnp_Amount đã nhân 100, ví dụ 1000000 cho 10,000 VND
    vnp_amount = int(params.get("vnp_Amount", 0)) 
    response_code = params.get("vnp_ResponseCode")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Kiểm tra payment có tồn tại không
        cursor.execute("SELECT * FROM payments WHERE transaction_ref = %s", (txn_ref,))
        payment = cursor.fetchone()

        if not payment:
            return {"RspCode": "01", "Message": "Order not found"}

        # Kiểm tra số tiền (Quy đổi tiền trong DB ra đơn vị VNPay để so sánh int)
        # Giả sử payment["amount"] trong DB lưu là 10000.0
        db_amount_vnp_format = int(float(payment["amount"]) * 100)
        if db_amount_vnp_format != vnp_amount:
            return {"RspCode": "04", "Message": "Invalid amount"}

        # Kiểm tra trạng thái đơn hàng
        # Chỉ xử lý nếu trạng thái là 'pending'
        if payment["status"] != "pending":
            return {"RspCode": "02", "Message": "Order already confirmed"}

        # Cập nhật kết quả thanh toán
        if response_code == "00":
            # Giao dịch thành công
            cursor.execute(
                "UPDATE payments SET status = 'success' WHERE transaction_ref = %s", 
                (txn_ref,)
            )
            # Kích hoạt gói dịch vụ
            activate_package(cursor, payment["user_id"], payment["package_id"], payment["id"])
        else:
            # Giao dịch lỗi/hủy
            cursor.execute(
                "UPDATE payments SET status = 'failed' WHERE transaction_ref = %s", 
                (txn_ref,)
            )

        conn.commit()
        return {"RspCode": "00", "Message": "Confirm Success"}

    except Exception as e:
        conn.rollback()
        print(f"IPN Error: {str(e)}")
        return {"RspCode": "99", "Message": "Unknown error"}
    
    finally:
        cursor.close()
        conn.close()

# Kích hoạt gói dịch vụ sau khi kiểm tra thanh toán hợp lệ
def activate_package(cursor, user_id, package_id, payment_id):

    # Lấy package
    cursor.execute("""
        SELECT target_role, duration_hours 
        FROM subscription_packages 
        WHERE id = %s
    """, (package_id,))
    pkg = cursor.fetchone()

    if not pkg:
        return

    now = datetime.now()
    duration = timedelta(hours=pkg["duration_hours"])

    if pkg["target_role"] == "tourist":

        cursor.execute("""
            SELECT * FROM tourist_subscriptions
            WHERE user_id = %s AND end_time > NOW()
            ORDER BY end_time DESC LIMIT 1
        """, (user_id,))
        current = cursor.fetchone()

        if current:
            # Nếu còn hạn của gói cũ thì gia hạn
            new_end = current["end_time"] + duration

            cursor.execute("""
                UPDATE tourist_subscriptions
                SET end_time = %s, payment_id = %s
                WHERE id = %s
            """, (new_end, payment_id, current["id"]))
        else:
            # Tạo sub mới
            cursor.execute("""
                INSERT INTO tourist_subscriptions (user_id, start_time, end_time, payment_id)
                VALUES (%s, %s, %s, %s)
            """, (user_id, now, now + duration, payment_id))

    elif pkg["target_role"] == "vendor":

        cursor.execute("""
            SELECT * FROM vendor_subscriptions
            WHERE user_id = %s AND end_time > NOW()
            ORDER BY end_time DESC LIMIT 1
        """, (user_id,))
        current = cursor.fetchone()

        if current:
            # Nếu còn hạn của gói cũ thì gia hạn
            new_end = current["end_time"] + duration

            cursor.execute("""
                UPDATE vendor_subscriptions
                SET end_time = %s, payment_id = %s
                WHERE id = %s
            """, (new_end, payment_id, current["id"]))
        else:
            # Tạo sub mới
            cursor.execute("""
                INSERT INTO vendor_subscriptions (user_id, start_time, end_time, payment_id)
                VALUES (%s, %s, %s, %s)
            """, (user_id, now, now + duration, payment_id))

def get_payment_history(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT p.*, sp.name AS package_name, sp.duration_hours AS duration_hours
        FROM payments p
        JOIN subscription_packages sp ON p.package_id = sp.id
        WHERE p.user_id = %s AND p.status="success"
        ORDER BY p.created_at DESC
    """, (user_id,))

    payments = cursor.fetchall()

    cursor.close()
    conn.close()

    return payments