import uuid
from datetime import datetime, timedelta
from app.database import get_db_connection
from app.services.vnpay_services import create_vnpay_url, verify_vnpay


# =========================================================
# 🔥 1. CREATE PAYMENT
# =========================================================
def create_payment_service(user_id, package_id, payment_method):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 🔹 lấy package
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

    # 🔹 insert payment
    cursor.execute("""
        INSERT INTO payments (user_id, package_id, amount, transaction_ref, payment_method, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
    """, (user_id, package_id, pkg["price"], txn_ref, payment_method))

    conn.commit()

    cursor.close()
    conn.close()

    # 🔥 tạo URL VNPay
    payment_url = create_vnpay_url({
        "amount": pkg["price"],
        "transaction_ref": txn_ref,
        "package_id": package_id
    })

    return {"payment_url": payment_url}

# =========================================================
# 🔥 4. HANDLE IPN (QUAN TRỌNG NHẤT)
# =========================================================
def handle_vnpay_ipn(params: dict):
    if not verify_vnpay(params):
        return {"RspCode": "97", "Message": "Invalid Signature"}

    txn_ref = params.get("vnp_TxnRef")
    amount = int(params.get("vnp_Amount", 0)) / 100
    response_code = params.get("vnp_ResponseCode")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM payments WHERE transaction_ref = %s
    """, (txn_ref,))
    payment = cursor.fetchone()

    if not payment:
        cursor.close()
        conn.close()
        return {"RspCode": "01", "Message": "Order not found"}

    # 🔹 check amount
    if float(payment["amount"]) != float(amount):
        cursor.close()
        conn.close()
        return {"RspCode": "04", "Message": "Invalid amount"}

    # 🔹 tránh update nhiều lần
    if payment["status"] == "success":
        cursor.close()
        conn.close()
        return {"RspCode": "02", "Message": "Order already confirmed"}

    # 🔹 update DB
    if response_code == "00":
        cursor.execute("""
            UPDATE payments 
            SET status = 'success'
            WHERE transaction_ref = %s
        """, (txn_ref,))

        activate_package(cursor, payment["user_id"], payment["package_id"])

    else:
        cursor.execute("""
            UPDATE payments 
            SET status = 'failed'
            WHERE transaction_ref = %s
        """, (txn_ref,))

    conn.commit()

    cursor.close()
    conn.close()

    return {"RspCode": "00", "Message": "Confirm Success"}


# =========================================================
# 🔥 5. HANDLE RETURN (CHỈ HIỂN THỊ)
# =========================================================
def handle_vnpay_return(params: dict):
    if not verify_vnpay(params):
        return {"message": "Invalid signature"}

    if params.get("vnp_ResponseCode") == "00":
        return {"message": "Thanh toán thành công"}
    else:
        return {"message": "Thanh toán thất bại"}


# =========================================================
# 🔥 6. ACTIVATE PACKAGE
# =========================================================
def activate_package(cursor, user_id, package_id):
    cursor.execute("""
        SELECT duration_hours FROM subscription_packages WHERE id = %s
    """, (package_id,))
    pkg = cursor.fetchone()

    start = datetime.now()
    end = start + timedelta(hours=pkg["duration_hours"])

    cursor.execute("""
        INSERT INTO subscriptions (user_id, package_id, start_date, end_date)
        VALUES (%s, %s, %s, %s)
    """, (user_id, package_id, start, end))