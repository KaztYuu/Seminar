# Multilingual Narration Refactoring Plan

**Date**: May 8, 2026  
**Scope**: Complete refactor from backend TTS + pre-generated audio to vendor-controlled text + browser speech synthesis  
**Status**: Planning & Documentation

---

## 📋 Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [New Architecture](#new-architecture)
3. [Database Schema Changes](#database-schema-changes)
4. [Code Removal & Refactoring](#code-removal--refactoring)
5. [Implementation Steps](#implementation-steps)
6. [Frontend Components](#frontend-components)
7. [Migration Strategy](#migration-strategy)

---

## Current State Analysis

### What Exists Now

#### Backend Services
- **gemini_services.py** (210 lines)
  - `translate_to_multiple_languages()` - Bulk translation (VI→EN,KR,FR)
  - `text_to_speech()` - TTS generation with fallback chain (Gemini→Edge→gTTS)
  - `backup_text_to_speech()` - Edge-TTS fallback
  - `gtts_fallback()` - gTTS final fallback
  - Audio storage configuration

- **audio_services.py** (73 lines)
  - `save_audio()` - Saves MP3/WAV to `/uploads/audio/tts/`
  - `delete_poi_audios()` - Deletes all audio files for a POI
  - `delete_audio()` - Deletes specific audio file

#### POI Services
- **poi_services.py**
  - `createPOI()` - Pre-generates translations + TTS for all 4 languages
  - `updatePOI()` - Regenerates all translations + TTS when description changes
  - `deletePOI()` - Deletes audio files

#### Database
- **poi_localized_data table**
  ```sql
  - id, poi_id, lang_code, name, description, audio_url
  - Stores 4 rows per POI (vi, en, kr, fr)
  - audio_url field contains path to pre-generated MP3/WAV
  ```

#### Frontend
- **TouristMapPublic.jsx**
  - `playAudio(url)` - Loads and plays `audio_url` from DB
  - `toggleAudioPlayback()` - Play/pause button using `<audio>` element
  - Language-specific queries with `x-language-code` header

- **TouristExplore.jsx**
  - `playAudio()` - Auto-play nearest POI audio
  - `prepareAIVoice()` - Calls `/pois/ai/tts` endpoint
  - Uses audio element with `audioRef`

### Issues with Current Architecture

1. **Complex TTS Pipeline**: 3-tier fallback chain (Gemini→Edge→gTTS) adds latency
2. **Storage Bloat**: 4 MP3/WAV files per POI, consuming disk space
3. **Maintenance Burden**: Multiple TTS services to maintain
4. **No Vendor Control**: Translations auto-generated, vendor cannot edit
5. **Translation Sync**: Manual regeneration needed when VI changes
6. **Dependency on Backend**: Tourist must wait for MP3 download
7. **Scaling Issues**: Large number of audio files causes storage/performance issues

---

## New Architecture

### Core Principles

1. **Vendor-Controlled Content**: Only Vietnamese is auto, other languages are vendor-managed
2. **Browser-Based Audio**: Use native SpeechSynthesis API (no backend TTS)
3. **Text-Only Storage**: Store descriptions only, no audio files
4. **Simple & Maintainable**: Minimal dependencies, maximum flexibility
5. **Clear Hierarchy**: VI is source of truth → translations → browser audio

### New Data Flow

```
VENDOR SIDE (POI Creation/Edit)
└─ Create POI with VI description
   ├─ Save to DB
   └─ Optional: Generate AI translation suggestions
      ├─ Vendor reviews + edits
      └─ Vendor confirms before saving

TOURIST SIDE (POI Viewing)
└─ Load POI in requested language
   ├─ Get text (VI or translated)
   └─ Click play → Browser reads text using SpeechSynthesis API
      └─ No backend calls, no audio files
```

### Why This Works

- **SpeechSynthesis API**: All modern browsers support it
- **No Storage Cost**: Only text data
- **Instant Playback**: No file download delay
- **Device-Specific Voices**: Uses system voices (better UX)
- **Vendor Control**: Translations are data, not generated artifacts
- **Easier Maintenance**: No TTS service management

---

## Database Schema Changes

### Current Schema

```sql
CREATE TABLE poi_localized_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    lang_code VARCHAR(10),
    name VARCHAR(255),
    description TEXT,
    audio_url VARCHAR(255),              -- REMOVE THIS
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);
```

### New Schema

```sql
CREATE TABLE poi_localized_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    lang_code VARCHAR(10),
    name VARCHAR(255),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
    UNIQUE(poi_id, lang_code)
);
```

### Migration SQL

```sql
-- Step 1: Remove audio_url column
ALTER TABLE poi_localized_data DROP COLUMN audio_url;

-- Step 2: Add timestamps for tracking
ALTER TABLE poi_localized_data 
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Step 3: Verify uniqueness constraint
ALTER TABLE poi_localized_data 
ADD UNIQUE KEY unique_poi_lang (poi_id, lang_code);

-- Step 4: Clean up seed data (remove audio_url references)
UPDATE poi_localized_data SET audio_url = NULL;
```

### Seed Data (Updated)

```sql
INSERT INTO poi_localized_data (poi_id, lang_code, name, description)
VALUES 
  (5, 'vi', 'Gian hàng "tuổi Thần Tiên"', 'Gian hàng của các em học sinh, sinh viên...'),
  (5, 'en', 'Gian hàng "tuổi Thần Tiên"', 'This is a stall run by students...'),
  (5, 'kr', 'Gian hàng "tuổi Thần Tiên"', '학생 및 대학생들이 운영하는 가판대입니다...'),
  (5, 'fr', 'Gian hàng "tuổi Thần Tiên"', 'C\'est le stand des élèves et des étudiants...');
```

---

## Code Removal & Refactoring

### Files to Delete Entirely

1. **Backend/app/services/audio_services.py** - No longer needed
   - Remove `audio_service` instantiation from imports

2. **Backend/uploads/audio/tts/** directory - Clean up old audio files

### Files to Refactor

#### 1. Backend/app/services/gemini_services.py

**KEEP**:
- `translate_to_multiple_languages()` - For vendor translation suggestions (async)
- `translate_single_language()` - For individual language translation
- Keep Groq fallback for translations

**REMOVE**:
- `text_to_speech()` - No longer needed
- `backup_text_to_speech()` - No longer needed  
- `gtts_fallback()` - No longer needed
- `edge_voices` dictionary - Only needed for TTS
- `audio_storage` configuration
- All TTS-related imports (edge_tts, wave, gTTS, etc.)

**NEW METHODS** (Optional, for frontend-triggered translations):
```python
async def translate_single_language_for_vendor(text: str, lang: str):
    """
    Generate AI translation suggestion for vendor to review/edit.
    Used in vendor UI when vendor clicks "Suggest Translation".
    Returns translated text only (no storage, no TTS).
    """
```

#### 2. Backend/app/services/poi_services.py

**REFACTOR createPOI()**:
```python
# OLD: Pre-generates translations + TTS for all 4 languages
# NEW: Only stores VI description, no automatic translations

async def createPOI(user, data):
    # 1. Save images (unchanged)
    # 2. Insert POI record (unchanged)
    # 3. Insert position (unchanged)
    # 4. Insert knowledge base (unchanged)
    # 5. CHANGE: Only insert Vietnamese localized_data
    
    # Don't call:
    # - gemini_service.translate_to_multiple_languages()
    # - gemini_service.text_to_speech()
    # - audio_service.save_audio()
    # - Bulk insert for en, kr, fr
    
    cursor.execute("""
        INSERT INTO poi_localized_data (poi_id, lang_code, name, description)
        VALUES (%s, %s, %s, %s)
    """, (poi_id, 'vi', data.localized.name, data.localized.description))
```

**REFACTOR updatePOI()**:
```python
# OLD: Regenerates all translations + TTS when VI changes
# NEW: Only updates VI, clears other translations when VI changes

async def updatePOI(user, poi_id, data):
    if data.localized and data.localized.description != old_poi['old_desc']:
        # Update Vietnamese
        cursor.execute("""
            UPDATE poi_localized_data 
            SET name = %s, description = %s
            WHERE poi_id = %s AND lang_code = 'vi'
        """, (data.localized.name, data.localized.description, poi_id))
        
        # IMPORTANT: Delete other translations (they're now stale)
        # Vendor must regenerate if needed
        cursor.execute("""
            DELETE FROM poi_localized_data 
            WHERE poi_id = %s AND lang_code != 'vi'
        """, (poi_id,))
        
        # Don't call:
        # - gemini_service.translate_to_multiple_languages()
        # - gemini_service.text_to_speech()
        # - audio_service.save_audio()
```

**REFACTOR deletePOI()**:
```python
# Remove audio file deletion logic (no more audio files)

async def deletePOI(user, poi_id):
    # ... existing code ...
    
    # REMOVE these lines:
    # cursor.execute("SELECT audio_url FROM poi_localized_data WHERE poi_id = %s", (poi_id,))
    # audio_rows = cursor.fetchall()
    # for row in audio_rows:
    #     if row['audio_url']:
    #         audio_service.delete_audio(row['audio_url'])
    
    # Keep image deletion
    image_service.delete_image(poi["thumbnail"])
    image_service.delete_image(poi["banner"])
```

#### 3. Backend/app/routes/poi_router.py

**ADD NEW ENDPOINT** (Optional, for vendor translation suggestions):
```python
@router.post("/suggestions/translate/{lang}")
async def suggest_translation(
    data: TranslationSuggestionRequest,
    lang: str,
    user=Depends(require_role("vendor"))
):
    """
    Suggest translation for vendor review.
    Returns translated text only (not saved to DB yet).
    Vendor must confirm before it's saved.
    """
    # Call gemini_service.translate_single_language()
    # Return suggested translation
    # Vendor reviews in UI and clicks save
```

**MODIFY existing endpoints** - Remove audio_url references from responses:
```python
# Before returning POI data, ensure no audio_url in response
# (or return null/empty if field still exists in serialization)
```

### Files with Minor Changes

#### 4. Backend/app/schemas/poi_schema.py

**REMOVE** (if exists):
```python
audio_url: str | None
```

---

## Implementation Steps

### Phase 1: Backend Refactoring

1. **Create Migration Script**
   - Add to `Backend/migrations/` folder
   - Removes audio_url column
   - Deletes all non-VI localized_data

2. **Update Database Schema**
   - Run migration on dev DB
   - Update seed.sql to remove audio references
   - Update db.sql schema definition

3. **Refactor Services**
   - ✅ Clean gemini_services.py (remove TTS methods)
   - ✅ Delete audio_services.py (or keep for future use, just don't import)
   - ✅ Update poi_services.py (createPOI, updatePOI, deletePOI)

4. **Update Routes**
   - ✅ Update poi_router.py to remove audio generation calls
   - ✅ Update response serialization

5. **Testing**
   - ✅ Test createPOI - should NOT generate TTS
   - ✅ Test updatePOI VI change - should delete translations
   - ✅ Test deletePOI - should NOT delete audio files
   - ✅ Verify only VI in poi_localized_data

### Phase 2: Frontend Refactoring

1. **Replace Audio Playback Logic**
   - ✅ Remove `audioRef` element (or keep for fallback)
   - ✅ Replace with SpeechSynthesis API hook
   - ✅ Create `useSpeechSynthesis` hook

2. **Update Components**
   - ✅ TouristMapPublic.jsx - Replace playAudio() with SpeechSynthesis
   - ✅ TouristExplore.jsx - Remove audio file loading
   - ✅ Remove audio_url dependency

3. **Add Voice Settings UI**
   - ✅ Language selector (affects voice)
   - ✅ Speech rate selector
   - ✅ Pitch selector (optional)
   - ✅ Volume control

4. **Testing**
   - ✅ Test language switching
   - ✅ Test play/pause
   - ✅ Test across browsers

### Phase 3: Optional Vendor Features

1. **Translation Suggestion UI**
   - Create endpoint for AI suggestions
   - Add UI to vendor POI editor
   - Vendor reviews and edits before saving

2. **Translation Management**
   - Show which languages have translations
   - Allow vendor to delete/update translations
   - Track translation status

---

## Frontend Components

### New Hook: useSpeechSynthesis

```javascript
const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef(null);

    const speak = useCallback((text, lang = 'vi-VN', rate = 1, pitch = 1) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            setIsSpeaking(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const pause = useCallback(() => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    }, []);

    const resume = useCallback(() => {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    }, []);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    return { speak, pause, resume, stop, isSpeaking, isPaused };
};
```

### Updated TouristMapPublic.jsx

```javascript
// Remove: audioRef for file playback
// Add: useSpeechSynthesis hook

const { speak, stop, isSpeaking } = useSpeechSynthesis();

const handlePlayDescription = () => {
    const langMap = {
        'vi': 'vi-VN',
        'en': 'en-US',
        'fr': 'fr-FR',
        'kr': 'ko-KR'
    };

    if (isSpeaking) {
        stop();
    } else {
        speak(
            selectedPoi.description,
            langMap[currentLang] || 'vi-VN'
        );
    }
};
```

### Updated TouristExplore.jsx

```javascript
// Remove: prepareAIVoice(), audioRef
// Add: useSpeechSynthesis hook

const { speak, isSpeaking } = useSpeechSynthesis();

const autoPlayNearestPoi = useCallback(() => {
    if (!nearbyPoi) return;
    
    if (lastPlayedPoiId.current !== nearbyPoi.id) {
        speak(nearbyPoi.description, ACCEPT_LANG[currentLang]);
        lastPlayedPoiId.current = nearbyPoi.id;
    }
}, [nearbyPoi, currentLang, speak]);
```

---

## Migration Strategy

### Data Migration

1. **Backup Current Database**
   ```bash
   mysqldump -u root FoodTourVinhKhanh > backup_before_refactor.sql
   ```

2. **Run Migration**
   ```sql
   -- Keep only VI translations
   DELETE FROM poi_localized_data WHERE lang_code != 'vi';
   
   -- Remove audio_url column
   ALTER TABLE poi_localized_data DROP COLUMN audio_url;
   ```

3. **Clean Up Storage**
   ```bash
   # Delete audio files (optional, but recommended for space)
   rm -rf Backend/uploads/audio/tts/
   ```

### Code Migration

1. **Feature Branch**
   ```bash
   git checkout -b refactor/multilingual-to-speechsynthesis
   ```

2. **Commit Strategy**
   - Commit 1: Database migration
   - Commit 2: Backend service cleanup
   - Commit 3: Frontend component updates
   - Commit 4: Tests and documentation

3. **Testing Checklist**
   - [ ] Create POI → Only VI in DB
   - [ ] Update POI VI description → Other languages deleted
   - [ ] Delete POI → No audio file errors
   - [ ] Tourist loads POI → Gets correct language
   - [ ] Click play → Browser speaks text
   - [ ] Language switch → Uses correct voice

### Rollback Plan

If issues arise:
```bash
# Restore database
mysql FoodTourVinhKhanh < backup_before_refactor.sql

# Revert code
git checkout main
git reset --hard [previous-commit]
```

---

## Summary of Changes

### Files to Delete
- `Backend/app/services/audio_services.py`
- `Backend/uploads/audio/` (directory with all MP3/WAV files)

### Files to Remove Code From
- `gemini_services.py` - Remove TTS methods (~100 lines)
- `poi_services.py` - Simplify createPOI, updatePOI, deletePOI (~150 lines)

### Files to Create/Add
- `Backend/migrations/remove_audio_from_localized.sql` - Schema migration
- `Frontend/hooks/useSpeechSynthesis.js` - New speech hook

### Files to Update
- `poi_router.py` - Remove TTS generation endpoints
- `TouristMapPublic.jsx` - Replace audio with SpeechSynthesis
- `TouristExplore.jsx` - Replace audio with SpeechSynthesis
- `db.sql` - Remove audio_url column
- `seed.sql` - Remove audio_url data

### Benefits
- ✅ Simpler architecture
- ✅ Smaller storage (no MP3/WAV files)
- ✅ Faster load times (no file downloads)
- ✅ Better voice quality (device-specific voices)
- ✅ Vendor control over translations
- ✅ Easier to maintain and extend
- ✅ Scales better for production

---

## Success Criteria

1. ✅ No audio files in `/uploads/audio/`
2. ✅ No `audio_url` in database responses
3. ✅ Browser speaks text using SpeechSynthesis API
4. ✅ Vendor can control translations
5. ✅ VI description change → clears other languages
6. ✅ All tests pass
7. ✅ No backend TTS service calls
8. ✅ Tourist UX maintains same or better quality

