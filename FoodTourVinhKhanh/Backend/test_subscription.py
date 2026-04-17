import urllib.request, json, http.cookiejar, hmac, hashlib, urllib.parse, sys
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()
HASH_SECRET = os.getenv("VNPAY_HASH_SECRET", "")
TMN_CODE = os.getenv("VNPAY_TMN_CODE", "")

base = 'http://localhost:8000'

def make_opener():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

def req(opener, method, path, body=None):
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'} if data else {}
    r = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        resp = opener.open(r)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def make_vnpay_ipn_params(txn_ref, amount, response_code="00"):
    """Tạo params giả lập VNPay callback với chữ ký hợp lệ"""
    params = {
        "vnp_Amount": str(int(float(amount) * 100)),
        "vnp_BankCode": "NCB",
        "vnp_CardType": "ATM",
        "vnp_OrderInfo": f"Thanh toan goi test",
        "vnp_PayDate": datetime.now().strftime("%Y%m%d%H%M%S"),
        "vnp_ResponseCode": response_code,
        "vnp_TmnCode": TMN_CODE,
        "vnp_TransactionNo": "14191946",
        "vnp_TransactionStatus": response_code,
        "vnp_TxnRef": txn_ref,
    }
    # Tạo chữ ký HMAC-SHA512
    sorted_params = "&".join(f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted(params.items()))
    sig = hmac.new(HASH_SECRET.encode(), sorted_params.encode(), hashlib.sha512).hexdigest()
    params["vnp_SecureHash"] = sig
    return params

# ============ SETUP ============
admin = make_opener()
tourist = make_opener()

req(admin, 'POST', '/auth/login', {'email': 'admin@test.com', 'password': '123456'})
req(tourist, 'POST', '/auth/login', {'email': 'tourist@test.com', 'password': '123456'})
print("[SETUP] Admin + Tourist logged in")

# Tao package neu chua co
s, r = req(admin, 'GET', '/packages/get-all')
print(f"[SETUP] get-all: {s} -> {r}")
pkgs = r.get('data', [])
tourist_pkgs = [p for p in pkgs if p['target_role'] == 'tourist' and p['is_Active']]
if tourist_pkgs:
    pkg_id = tourist_pkgs[0]['id']
    amount = tourist_pkgs[0]['price']
    print(f"[SETUP] Using existing package id={pkg_id} price={amount}")
else:
    s, r = req(admin, 'POST', '/packages/create', {
        'name': 'Goi tourist 1 ngay', 'target_role': 'tourist',
        'price': 10000, 'duration_hours': 24, 'is_Active': True
    })
    print(f"[SETUP] create package: {s} -> {r}")
    if s != 200 or 'data' not in r:
        print(f"[ERROR] Cannot create package! Aborting Seq 12/13 tests.")
        import sys; sys.exit(1)
    pkg_id = r['data']['id']
    amount = 10000
    print(f"[SETUP] Created package id={pkg_id}")

# ============ SEQ 12: Activate Subscription (lan dau) ============
print()
print("=" * 55)
print("SEQ 12 — Activate Subscription (lan dau mua goi)")
print("=" * 55)

# Xoa subscription cu cua tourist neu co (reset)
sys.path.insert(0, '.')
from app.database import get_db_connection
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("DELETE FROM tourist_subscriptions WHERE user_id=(SELECT id FROM users WHERE email='tourist@test.com')")
cursor.execute("UPDATE payments SET status='failed' WHERE user_id=(SELECT id FROM users WHERE email='tourist@test.com') AND status='pending'")
conn.commit()
conn.close()
print("[12.1] Reset tourist subscription")

# Tourist tao payment
s, r = req(tourist, 'POST', '/payments/create', {'package_id': pkg_id, 'payment_method': 'vnpay'})
print(f"[12.2] Create payment: {s} -> has payment_url: {'payment_url' in r}")

# Lay txn_ref tu DB
conn = get_db_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM payments WHERE status='pending' ORDER BY id DESC LIMIT 1")
pay = cursor.fetchone()
conn.close()
txn_ref = pay['transaction_ref']
print(f"[12.3] Payment in DB: id={pay['id']} ref={txn_ref[:8]}... status={pay['status']}")

# Gia lap VNPay IPN callback (thanh cong)
ipn_params = make_vnpay_ipn_params(txn_ref, pay['amount'], "00")
query = "&".join(f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in ipn_params.items())
r2 = urllib.request.Request(f"{base}/payments/vnpay-ipn?{query}")
try:
    resp = urllib.request.urlopen(r2)
    ipn_result = json.loads(resp.read())
except urllib.error.HTTPError as e:
    ipn_result = json.loads(e.read())
print(f"[12.4] VNPay IPN callback: {ipn_result}")

# Kiem tra subscription duoc tao
conn = get_db_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM tourist_subscriptions WHERE user_id=(SELECT id FROM users WHERE email='tourist@test.com') ORDER BY id DESC LIMIT 1")
sub = cursor.fetchone()
conn.close()
if sub:
    print(f"[12.5] Subscription CREATED: start={sub['start_time']} end={sub['end_time']}")
    print(f"[12.6] SEQ 12 PASS ✓")
else:
    print(f"[12.5] SEQ 12 FAIL ✗ — no subscription created")

# ============ SEQ 13: Extend Subscription ============
print()
print("=" * 55)
print("SEQ 13 — Extend Subscription (gia han khi con han)")
print("=" * 55)

# Lay end_time hien tai
conn = get_db_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT end_time FROM tourist_subscriptions WHERE user_id=(SELECT id FROM users WHERE email='tourist@test.com') ORDER BY id DESC LIMIT 1")
before = cursor.fetchone()
conn.close()
end_before = before['end_time']
print(f"[13.1] Current end_time: {end_before}")

# Tourist mua them lan nua
s, r = req(tourist, 'POST', '/payments/create', {'package_id': pkg_id, 'payment_method': 'vnpay'})
print(f"[13.2] Create 2nd payment: {s}")

conn = get_db_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM payments WHERE status='pending' ORDER BY id DESC LIMIT 1")
pay2 = cursor.fetchone()
conn.close()
txn_ref2 = pay2['transaction_ref']

# IPN lan 2
ipn_params2 = make_vnpay_ipn_params(txn_ref2, pay2['amount'], "00")
query2 = "&".join(f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in ipn_params2.items())
r3 = urllib.request.Request(f"{base}/payments/vnpay-ipn?{query2}")
try:
    resp = urllib.request.urlopen(r3)
    ipn_result2 = json.loads(resp.read())
except urllib.error.HTTPError as e:
    ipn_result2 = json.loads(e.read())
print(f"[13.3] VNPay IPN callback 2: {ipn_result2}")

# Kiem tra end_time tang len
conn = get_db_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT end_time FROM tourist_subscriptions WHERE user_id=(SELECT id FROM users WHERE email='tourist@test.com') ORDER BY id DESC LIMIT 1")
after = cursor.fetchone()
conn.close()
end_after = after['end_time']
print(f"[13.4] New end_time: {end_after}")

if end_after > end_before:
    diff_hours = (end_after - end_before).total_seconds() / 3600
    print(f"[13.5] end_time tang them {diff_hours:.0f}h — SEQ 13 PASS ✓")
else:
    print(f"[13.5] SEQ 13 FAIL ✗ — end_time khong tang")

print()
print("=" * 55)
print("ALL SEQUENCE TESTS DONE")
print("=" * 55)
