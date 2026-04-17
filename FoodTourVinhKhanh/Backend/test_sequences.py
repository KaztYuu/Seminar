import urllib.request, json, http.cookiejar

base = 'http://localhost:8000'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

def post(path, body):
    req = urllib.request.Request(base+path, data=json.dumps(body).encode(), headers={'Content-Type':'application/json'})
    try:
        r = opener.open(req)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def put(path, body):
    req = urllib.request.Request(base+path, data=json.dumps(body).encode(), headers={'Content-Type':'application/json'}, method='PUT')
    try:
        r = opener.open(req)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(path):
    req = urllib.request.Request(base+path)
    try:
        r = opener.open(req)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

print("=" * 50)
print("LOGIN ADMIN")
print("=" * 50)
s, r = post('/auth/login', {'email': 'admin@test.com', 'password': '123456'})
print(f"  Status: {s} | Response: {r}")

print()
print("=" * 50)
print("SEQ 3 — Create User")
print("=" * 50)

# Case 1: Tạo user mới thành công
s, r = post('/users/create', {
    'name': 'Test Seq3',
    'email': 'testseq3_new@test.com',
    'password': '123456',
    'phoneNumber': '0911111119',
    'role': 'tourist'
})
print(f"  [CREATE OK]           {s} -> {r}")

# Case 2: Email trùng
s, r = post('/users/create', {
    'name': 'Test Seq3 Dup',
    'email': 'testseq3_new@test.com',
    'password': '123456',
    'phoneNumber': '0922222229',
    'role': 'tourist'
})
print(f"  [CREATE DUPE EMAIL]   {s} -> {r}")

# Case 3: Phone trùng
s, r = post('/users/create', {
    'name': 'Test Seq3 Dup2',
    'email': 'testseq3_unique@test.com',
    'password': '123456',
    'phoneNumber': '0911111119',
    'role': 'tourist'
})
print(f"  [CREATE DUPE PHONE]   {s} -> {r}")

print()
print("=" * 50)
print("SEQ 4 — Block User")
print("=" * 50)

# Lấy danh sách user
s, r = get('/users/get-users')
users = r.get('data', [])
print(f"  [GET USERS]           {s} -> {len(users)} users")

target = next((u for u in users if u['email'] == 'testseq3_new@test.com'), None)
if target:
    uid = target['id']
    print(f"  [TARGET]              id={uid} email={target['email']} is_Blocked={target['is_Blocked']}")

    # Block user
    s, r = put(f'/users/update/{uid}', {'is_Blocked': True})
    print(f"  [BLOCK USER]          {s} -> {r}")

    # Verify bị block
    s, r = get(f'/users/get-user-by-id/{uid}')
    print(f"  [VERIFY]              is_Blocked={r['data']['is_Blocked']} (expected: True)")

    # Unblock lại để không ảnh hưởng data
    put(f'/users/update/{uid}', {'is_Blocked': False})
    print(f"  [CLEANUP]             Unblocked user")

print()
print("=" * 50)
print("SEQ 12/13 — Subscription packages")
print("=" * 50)

s, r = get('/packages/get-packages')
pkgs = r.get('data', [])
print(f"  [GET PACKAGES]        {s} -> {len(pkgs)} packages")
for p in pkgs:
    print(f"    id={p['id']} | {p['name']} | role={p['target_role']} | {p['price']} VND | {p['duration_hours']}h")

print()
print("=" * 50)
print("ALL TESTS DONE")
print("=" * 50)
