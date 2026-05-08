# Cơ Chế Chuyển Ngôn Ngữ cho Mô Tả Thuyết Minh (Narration)

## 📋 Tổng Quan
Hệ thống của bạn hỗ trợ **4 ngôn ngữ**: VI (Tiếng Việt), EN (English), FR (Français), KR (한국어)

Mỗi POI (Point of Interest) có:
- **1 bản mô tả gốc** (Tiếng Việt)
- **3 bản dịch** (English, French, Korean)
- **Tệp âm thanh cho mỗi ngôn ngữ** (TTS - Text-to-Speech)

---

## 🔄 QUY TRÌNH CHUYỂN NGÔN NGỮ

### 1️⃣ **Frontend - Lưu Trữ Ngôn Ngữ** 
📍 [TouristMapPublic.jsx](FoodTourVinhKhanh/Frontend/src/pages/public/TouristMapPublic.jsx#L38)

```javascript
// Các ngôn ngữ hỗ trợ
const LANGUAGE_OPTIONS = [
    { code: "vi", label: "VI" },  // Tiếng Việt (mặc định)
    { code: "en", label: "EN" },  // English
    { code: "fr", label: "FR" },  // French
    { code: "kr", label: "KR" },  // Korean
];

// Lấy ngôn ngữ từ LocalStorage (mặc định: "vi")
const [currentLang, setCurrentLang] = useState(
    (localStorage.getItem("language") || "vi").toLowerCase(),
);
```

### 2️⃣ **Frontend - Listener Sự Kiện Thay Đổi Ngôn Ngữ**
📍 [TouristMapPublic.jsx](FoodTourVinhKhanh/Frontend/src/pages/public/TouristMapPublic.jsx#L155)

```javascript
useEffect(() => {
    // Bất kỳ khi nào ngôn ngữ thay đổi từ bất kỳ component nào...
    const handleLangChange = () => {
        // 1. Lấy ngôn ngữ mới từ LocalStorage
        const nextLang = (localStorage.getItem("language") || "vi").toLowerCase();
        // 2. Cập nhật state
        setCurrentLang(nextLang);
        // 3. TẢI LẠI DỮ LIỆU từ Backend
        fetchPois();
    };

    // Lắng nghe sự kiện 'languageChange' toàn cầu
    window.addEventListener("languageChange", handleLangChange);
    
    return () => {
        window.removeEventListener("languageChange", handleLangChange);
    };
}, []);
```

### 3️⃣ **Frontend → Backend - Gửi Ngôn Ngữ**
📍 [TouristMapPublic.jsx](FoodTourVinhKhanh/Frontend/src/pages/public/TouristMapPublic.jsx#L160)

Khi `fetchPois()` được gọi:
```javascript
// Gửi ngôn ngữ hiện tại thông qua Header
// x-language-code: "vi" hoặc "en" hoặc "fr" hoặc "kr"
```

### 4️⃣ **Backend - Nhận Ngôn Ngữ từ Header**
📍 [poi_router.py](FoodTourVinhKhanh/Backend/app/routes/poi_router.py#L47)

```python
@router.get("/map")
def api_get_pois_map(
    scope: str = "all",
    x_language_code: Optional[str] = Header(None),  # ← Nhận từ Header
    user: Optional[dict] = Depends(get_current_user)
):
    lang = x_language_code or "vi"  # Mặc định: Tiếng Việt
    
    # Lấy dữ liệu với ngôn ngữ được chỉ định
    map_data = getMapData(user, scope, lang)
```

### 5️⃣ **Backend - Truy Vấn DB với Ngôn Ngữ**
📍 [poi_services.py](FoodTourVinhKhanh/Backend/app/services/poi_services.py#L291)

```sql
-- Lấy mô tả của POI với ngôn ngữ cụ thể
SELECT 
    p.id, p.owner_id, p.status, p.thumbnail,
    pos.latitude, pos.longitude, pos.audio_range,
    ld.name,           -- Tên với ngôn ngữ được chỉ định
    ld.description,    -- MÔ TẢ với ngôn ngữ được chỉ định
    ld.audio_url       -- TỆPLINKING ÂM THANH cho ngôn ngữ này
FROM pois p
LEFT JOIN poi_localized_data ld 
    ON p.id = ld.poi_id 
    AND ld.lang_code = %s    -- ← Lọc theo ngôn ngữ
```

**Cấu trúc Bảng `poi_localized_data`:**
```
+---------------+----------+--------+----------+----------+
| poi_id        | lang_code| name   | description | audio_url |
+---------------+----------+--------+----------+----------+
| 1             | vi       | Bánh Mì| Bánh mì... | /uploads/audio/tts/poi_1_vi.mp3 |
| 1             | en       | Banh Mi| Banh mi is... | /uploads/audio/tts/poi_1_en.mp3 |
| 1             | fr       | Bánh Mì| Bánh mì est... | /uploads/audio/tts/poi_1_fr.mp3 |
| 1             | kr       | 반미   | 반미는... | /uploads/audio/tts/poi_1_kr.mp3 |
+---------------+----------+--------+----------+----------+
```

### 6️⃣ **Frontend - Phát Âm Thanh theo Ngôn Ngữ**
📍 [TouristMapPublic.jsx](FoodTourVinhKhanh/Frontend/src/pages/public/TouristMapPublic.jsx#L220)

```javascript
const toggleAudioPlayback = async () => {
    if (!audioRef.current || !selectedPoi?.audio_url) {
        return;
    }

    // selectedPoi.audio_url là đường dẫn audio_url từ DB
    // VD: /uploads/audio/tts/poi_1_en.mp3 (nếu currentLang = "en")
    
    if (isAudioPlaying) {
        audioRef.current.pause();
    } else {
        audioRef.current.src = `${API_URL}${selectedPoi.audio_url}`;
        await audioRef.current.play();
    }
};
```

---

## 🏗️ QUY TRÌNH TẠO POI VỚI ĐA NGÔN NGỮ

### Khi Admin/Vendor Tạo POI:

📍 [poi_services.py - createPOI()](FoodTourVinhKhanh/Backend/app/services/poi_services.py#L411)

```
1. MÔ TẢ GỐC (Tiếng Việt)
   ↓
2. DỊCH THUẬT (Gemini/Groq)
   → Tạo 3 bản dịch: en, kr, fr
   ↓
3. TẠO ÂM THANH (Gemini TTS → Edge-TTS → gTTS)
   → Tạo 4 tệp MP3/WAV (vi, en, kr, fr)
   ↓
4. LƯU VÀO DATABASE
   → Bảng poi_localized_data
   → 4 hàng (mỗi ngôn ngữ 1 hàng)
```

**Chi tiết:**

```python
async def createPOI(user, data):
    # 2. DỊCH THUẬT - Chỉ dịch description
    translations = await gemini_service.translate_to_multiple_languages(
        data.localized.description
    )
    # Kết quả: {"en": "...", "kr": "...", "fr": "..."}
    
    localized_items = [
        {"lang_code": "vi", "name": data.localized.name, "description": data.localized.description},
        # + 3 mục khác từ translations
    ]
    
    # 6. TẠO AUDIO & LƯU DATA
    for item in localized_items:
        # Tạo âm thanh từ description bằng Gemini
        audio_bytes = await gemini_service.text_to_speech(
            item["description"], 
            lang=item["lang_code"]
        )
        
        # Lưu file (.mp3 hoặc .wav)
        audio_url = audio_service.save_audio(
            audio_bytes, 
            poi_id, 
            item["lang_code"]
        )
        # Kết quả: "/uploads/audio/tts/poi_1_vi.mp3"
        
        # Lưu vào DB
        cursor.execute("""
            INSERT INTO poi_localized_data 
            (poi_id, lang_code, name, description, audio_url)
            VALUES (%s, %s, %s, %s, %s)
        """, (poi_id, item["lang_code"], item["name"], item["description"], audio_url))
```

---

## 🔊 Quy Trình TTS (Text-to-Speech)

📍 [gemini_services.py - text_to_speech()](FoodTourVinhKhanh/Backend/app/services/gemini_services.py#L83)

### Ưu Tiên TTS:

```
1. Gemini TTS API (Premium)
   ↓ (Nếu thất bại)
2. Edge TTS (Miễn phí & Tự nhiên)
   ↓ (Nếu thất bại)
3. gTTS (Google Text-to-Speech)
   ↓ (Nếu thất bại)
4. Trả về bytes rỗng (b"")
```

### Giọng Nói theo Ngôn Ngữ:

```python
self.edge_voices = {
    "vi": "vi-VN-HoaiMyNeural",      # Tiếng Việt - Giọng nữ Hoài My
    "en": "en-US-EmmaNeural",         # English - Giọng nữ Emma
    "fr": "fr-FR-DeniseNeural",       # French - Giọng nữ Denise
    "kr": "ko-KR-SunHiNeural"        # Korean - Giọng nữ Sun-hi
}
```

---

## 🎯 LUỒNG ĐẦY ĐỦ - Từ Frontend đến Phát Âm Thanh

```
FRONTEND (TouristMapPublic.jsx)
   │
   ├─ 1. Người dùng chọn ngôn ngữ → "en"
   │   localStorage.setItem("language", "en")
   │
   ├─ 2. Phát sự kiện toàn cầu
   │   window.dispatchEvent(new Event("languageChange"))
   │
   ├─ 3. Listener nhận sự kiện
   │   setCurrentLang("en")
   │   fetchPois()  ← TẢI LẠI
   │
   └─ 4. Gửi Header
       x-language-code: "en"
       │
       ↓ HTTP GET /pois/map?scope=all
       
BACKEND (poi_router.py)
   │
   ├─ 5. Nhận Header
   │   lang = x_language_code or "vi"  → "en"
   │
   ├─ 6. Gọi getMapData(user, scope, lang)
   │
   └─ 7. Truy vấn DB
       SELECT ... FROM poi_localized_data 
       WHERE lang_code = "en"
       │
       ↓ Lấy audio_url: /uploads/audio/tts/poi_1_en.mp3
       
FRONTEND (Nhận Response)
   │
   ├─ 8. Cập nhật selectedPoi
   │   selectedPoi.audio_url = "/uploads/audio/tts/poi_1_en.mp3"
   │   selectedPoi.description = "Banh mi is a Vietnamese..."
   │
   └─ 9. Phát âm thanh
       audioRef.current.src = "http://localhost:8000" + 
                              "/uploads/audio/tts/poi_1_en.mp3"
       audioRef.current.play()
       │
       ↓ Phát file MP3 (Tiếng Anh)
```

---

## 🔗 Dòng Chảy Dữ Liệu - Sơ Đồ

```
┌─────────────────────────────────────────────────────────┐
│ BẢNG: poi_localized_data                                │
│ ┌──────┬──────────┬──────────┬──────────┬─────────────┐ │
│ │ id   │ poi_id   │lang_code │ name     │ description │ │
│ │ desc │ audio_url│          │          │             │ │
│ └──────┴──────────┴──────────┴──────────┴─────────────┘ │
│                                                         │
│ Hàng 1: poi_id=1, lang_code="vi", audio_url=.../vi.mp3 │
│ Hàng 2: poi_id=1, lang_code="en", audio_url=.../en.mp3 │
│ Hàng 3: poi_id=1, lang_code="fr", audio_url=.../fr.mp3 │
│ Hàng 4: poi_id=1, lang_code="kr", audio_url=.../kr.mp3 │
└─────────────────────────────────────────────────────────┘
         │
         ├─→ Frontend: currentLang="en"
         │   SELECT ... WHERE lang_code="en"
         │   → Trả về: name, description, audio_url (EN)
         │
         ├─→ Frontend: currentLang="vi"
         │   SELECT ... WHERE lang_code="vi"
         │   → Trả về: name, description, audio_url (VI)
         │
         └─→ Frontend: currentLang="kr"
             SELECT ... WHERE lang_code="kr"
             → Trả về: name, description, audio_url (KR)
```

---

## 🔍 Chi Tiết Các Điểm Quan Trọng

| Thành Phần | Vị Trí | Chức Năng |
|-----------|--------|---------|
| **Lưu trữ Ngôn ngữ** | `localStorage.getItem("language")` | Lưu ngôn ngữ người dùng chọn |
| **Sự kiện Thay đổi** | `window.addEventListener("languageChange")` | Phát hiện & cập nhật khi ngôn ngữ thay đổi |
| **Header Ngôn ngữ** | `x-language-code` | Gửi ngôn ngữ từ Frontend → Backend |
| **Bảng Dịch** | `poi_localized_data` | Lưu mô tả & âm thanh cho mỗi ngôn ngữ |
| **Query DB** | `WHERE lang_code = %s` | Lọc dữ liệu theo ngôn ngữ |
| **Dịch Thuật** | `Gemini/Groq API` | Tạo bản dịch từ mô tả gốc |
| **TTS** | `Gemini/Edge/gTTS` | Tạo file âm thanh từ text |
| **Phát Audio** | `audioRef.current.play()` | Phát file âm thanh với ngôn ngữ hiện tại |

---

## 🚀 Tóm Tắt Cơ Chế

1. **Người dùng chọn ngôn ngữ** → Lưu vào `localStorage`
2. **Frontend phát sự kiện** → Tất cả components được thông báo
3. **Frontend gửi header** → `x-language-code: "en"`
4. **Backend lọc dữ liệu** → `WHERE lang_code = "en"`
5. **Backend trả về mô tả & audio_url** → Cho ngôn ngữ này
6. **Frontend phát file audio** → Tệp MP3 của ngôn ngữ hiện tại

✅ **Mỗi POI có 4 bản mô tả + 4 tệp âm thanh**
✅ **Chuyển ngôn ngữ = Chọn bản dịch khác từ DB**
✅ **Không cần tạo lại mô tả hay âm thanh**

