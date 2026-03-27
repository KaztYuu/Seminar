import uuid
import hashlib
import hmac
import urllib.parse
import requests
from datetime import datetime
from app.database import get_db_connection
import os
from dotenv import load_dotenv

load_dotenv()

# 🔥 CONFIG (đổi theo của bạn)
VNPAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNPAY_API_URL = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"
VNPAY_TMN_CODE = os.getenv("VNPAY_TMN_CODE")
VNPAY_HASH_SECRET = os.getenv("VNPAY_HASH_SECRET")
RETURN_URL = "http://localhost:8000/payments/vnpay-return"
IPN_URL = "http://localhost:8000/payments/vnpay-ipn"

# =========================================================
# 🔥 2. CREATE VNPAY URL
# =========================================================
def create_vnpay_url(payment):
    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": VNPAY_TMN_CODE,
        "vnp_Amount": int(payment["amount"] * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": payment["transaction_ref"],
        "vnp_OrderInfo": f"Thanh toan goi {payment['package_id']}",
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": RETURN_URL, # Đảm bảo biến này không được để trống/None
        "vnp_CreateDate": datetime.now().strftime("%Y%m%d%H%M%S"),
        "vnp_IpAddr": "127.0.0.1"
    }

    # 1. Sắp xếp params theo alphabet
    sorted_params = sorted(params.items())

    # 2. Tạo query string để hash (quan trọng: phải quote_plus các value)
    hash_data = "&".join([
        f"{k}={urllib.parse.quote_plus(str(v))}" 
        for k, v in sorted_params
    ])

    # 3. Tính toán Secure Hash
    secure_hash = hmac.new(
        VNPAY_HASH_SECRET.encode(),
        hash_data.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()

    # 4. Tạo URL cuối cùng (dùng urlencode để tự động xử lý ký tự đặc biệt)
    query_string = urllib.parse.urlencode(sorted_params)
    
    return f"{VNPAY_URL}?{query_string}&vnp_SecureHash={secure_hash}"

# =========================================================
# 🔥 3. VERIFY SIGNATURE
# =========================================================
def verify_vnpay(params: dict):
    vnp_secure_hash = params.get("vnp_SecureHash")

    if not vnp_secure_hash:
        return False

    filtered_params = {k: v for k, v in params.items() if k != "vnp_SecureHash"}

    sorted_params = sorted(filtered_params.items())
    hash_data = "&".join([f"{k}={v}" for k, v in sorted_params])

    calculated_hash = hmac.new(
        VNPAY_HASH_SECRET.encode(),
        hash_data.encode(),
        hashlib.sha512
    ).hexdigest()

    return calculated_hash == vnp_secure_hash

# =========================================================
# 🔥 7. QUERY TRANSACTION (OPTIONAL)
# =========================================================
def query_vnpay(payment):
    request_id = str(uuid.uuid4())[:32]

    vnp_TxnRef = payment["transaction_ref"]
    vnp_TransactionDate = payment["created_at"].strftime("%Y%m%d%H%M%S")
    vnp_CreateDate = datetime.now().strftime("%Y%m%d%H%M%S")
    vnp_IpAddr = "127.0.0.1"

    data_raw = "|".join([
        request_id,
        "2.1.0",
        "querydr",
        VNPAY_TMN_CODE,
        vnp_TxnRef,
        vnp_TransactionDate,
        vnp_CreateDate,
        vnp_IpAddr,
        "Query"
    ])

    secure_hash = hmac.new(
        VNPAY_HASH_SECRET.encode(),
        data_raw.encode(),
        hashlib.sha512
    ).hexdigest()

    payload = {
        "vnp_RequestId": request_id,
        "vnp_Version": "2.1.0",
        "vnp_Command": "querydr",
        "vnp_TmnCode": VNPAY_TMN_CODE,
        "vnp_TxnRef": vnp_TxnRef,
        "vnp_OrderInfo": "Query",
        "vnp_TransactionDate": vnp_TransactionDate,
        "vnp_CreateDate": vnp_CreateDate,
        "vnp_IpAddr": vnp_IpAddr,
        "vnp_SecureHash": secure_hash
    }

    headers = {"Content-Type": "application/json"}

    response = requests.post(VNPAY_API_URL, json=payload, headers=headers)

    return response.json()