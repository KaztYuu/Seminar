# MULTILINGUAL REFACTORING - EXECUTION CHECKLIST

**Started**: May 8, 2026  
**Target Completion**: May 8, 2026  
**Scope**: Complete refactor from backend TTS to browser SpeechSynthesis

---

## 📊 Progress Overview

```
PHASE 1: Backend Refactoring        [████░░░░░░░░░░░░░░░░░░]  0%
PHASE 2: Frontend Refactoring       [░░░░░░░░░░░░░░░░░░░░░░░]  0%
PHASE 3: Testing & Migration        [░░░░░░░░░░░░░░░░░░░░░░░]  0%
OVERALL                             [████░░░░░░░░░░░░░░░░░░]  0%
```

---

## PHASE 1: Backend Refactoring

### 1.1 Database Migration

- [ ] Create migration file: `Backend/migrations/remove_audio_from_localized.sql`
- [ ] Run migration on dev DB
- [ ] Verify schema change (audio_url removed)
- [ ] Update `Backend/config/db/db.sql` with new schema
- [ ] Update `Backend/config/db/seed.sql` to remove audio references

### 1.2 Cleanup Services

#### 1.2.1 Delete audio_services.py

- [ ] Review file: `Backend/app/services/audio_services.py`
- [ ] Remove import from `Backend/app/services/__init__.py`
- [ ] Check for remaining references in code
- [ ] Delete file

#### 1.2.2 Refactor gemini_services.py

- [ ] Remove `text_to_speech()` method
- [ ] Remove `backup_text_to_speech()` method
- [ ] Remove `gtts_fallback()` method
- [ ] Remove TTS-related imports (edge_tts, wave, gTTS)
- [ ] Keep `translate_to_multiple_languages()` method
- [ ] Keep `translate_single_language()` method
- [ ] Remove `edge_voices` dictionary
- [ ] Remove audio storage configuration
- [ ] Verify remaining functions compile and test

#### 1.2.3 Refactor poi_services.py

- [ ] Update `createPOI()` method
  - [ ] Remove pre-generation loop for en/kr/fr
  - [ ] Only insert VI localized_data
  - [ ] Remove audio_service calls
  - [ ] Remove gemini_service.translate_to_multiple_languages() call
- [ ] Update `updatePOI()` method
  - [ ] When VI changes: delete other language records
  - [ ] Don't regenerate translations
  - [ ] Don't call TTS generation
  - [ ] Remove audio_service calls
- [ ] Update `deletePOI()` method
  - [ ] Remove audio file deletion logic
  - [ ] Keep image deletion
- [ ] Test createPOI creates only VI
- [ ] Test updatePOI VI change clears translations

### 1.3 Update Routes

#### 1.3.1 Refactor poi_router.py

- [ ] Review `/pois` endpoints for audio_url references
- [ ] Remove audio_url from response serialization
- [ ] Verify endpoints don't call audio generation
- [ ] Test endpoints return correct data

#### 1.3.2 Update Schemas

- [ ] Remove `audio_url` field from `poi_schema.py` (if exists)
- [ ] Update localized data schema if needed

### 1.4 Backend Testing

- [ ] Test: `POST /pois/admin/create` doesn't generate TTS
- [ ] Test: Only VI in poi_localized_data after create
- [ ] Test: `PUT /pois/admin/update/{id}` with VI change clears other languages
- [ ] Test: `DELETE /pois/admin/{id}` doesn't error on audio cleanup
- [ ] Test: `/pois/map` returns correct localized data
- [ ] Verify no TTS service calls in logs

---

## PHASE 2: Frontend Refactoring

### 2.1 Create New Hooks

- [ ] Create `Frontend/src/hooks/useSpeechSynthesis.js`
  - [ ] Implement `speak()` function
  - [ ] Implement `pause()` function
  - [ ] Implement `resume()` function
  - [ ] Implement `stop()` function
  - [ ] Add state management (isSpeaking, isPaused)
  - [ ] Add language mapping (vi→vi-VN, en→en-US, etc.)

### 2.2 Refactor TouristMapPublic.jsx

- [ ] Review current audio playback logic
- [ ] Remove `audioRef` element or convert to fallback
- [ ] Add `useSpeechSynthesis` hook
- [ ] Update `playAudio()` to use SpeechSynthesis
- [ ] Update `toggleAudioPlayback()` button logic
- [ ] Test audio playback with text
- [ ] Verify language switching works

### 2.3 Refactor TouristExplore.jsx

- [ ] Remove `prepareAIVoice()` function
- [ ] Remove backend `/pois/ai/tts` call
- [ ] Remove audio_base64 decoding logic
- [ ] Add `useSpeechSynthesis` hook
- [ ] Update `autoPlayNearestPoi()` to use SpeechSynthesis
- [ ] Update play button to use browser speech
- [ ] Remove `audioRef` dependency
- [ ] Test audio playback

### 2.4 Add Voice Settings (Optional)

- [ ] Create `Frontend/src/components/VoiceSettings.jsx`
- [ ] Add speech rate selector (0.5x - 2x)
- [ ] Add pitch selector (optional)
- [ ] Add language selector (synchronized with UI language)
- [ ] Persist settings to localStorage

### 2.5 Frontend Testing

- [ ] Test: Play button speaks text
- [ ] Test: Pause/resume works
- [ ] Test: Language switching changes voice
- [ ] Test: Multiple POIs don't overlap speech
- [ ] Test: Cleanup speechSynthesis on component unmount
- [ ] Test across browsers (Chrome, Firefox, Safari)

---

## PHASE 3: Testing & Migration

### 3.1 Integration Testing

- [ ] Backend + Frontend: Create POI → Tourist loads → Hears narration
- [ ] Update VI description → Other languages deleted → Vendor must retranslate
- [ ] Delete POI → No errors, no orphaned audio files
- [ ] Language switching → Correct language spoken
- [ ] Multiple tourists → No speech overlap issues

### 3.2 Performance Testing

- [ ] Page load time (should be faster without audio files)
- [ ] Storage usage (should be smaller without MP3s)
- [ ] CPU usage during speech synthesis
- [ ] Memory usage with SpeechSynthesis

### 3.3 Data Migration

- [ ] Backup current database
- [ ] Run database migration
- [ ] Verify data integrity
- [ ] Clean up `/uploads/audio/tts/` directory
- [ ] Verify no broken image references

### 3.4 Browser Compatibility

- [ ] Chrome/Chromium - Full support expected
- [ ] Firefox - Full support expected
- [ ] Safari - Full support expected
- [ ] Edge - Full support expected
- [ ] Mobile browsers - Test on iOS/Android

### 3.5 Documentation

- [ ] Update README.md with new architecture
- [ ] Update API documentation (remove TTS endpoints)
- [ ] Document useSpeechSynthesis hook usage
- [ ] Add troubleshooting guide for speech issues

---

## PHASE 4: Optional Enhancements

### 4.1 Vendor Translation Interface (Optional)

- [ ] Create endpoint: `POST /pois/{id}/suggest-translation/{lang}`
- [ ] Returns AI-suggested translation (not saved)
- [ ] Create UI for vendor to review/edit translations
- [ ] Add save/discard buttons for vendor
- [ ] Track translation status (suggested/approved/edited)

### 4.2 Advanced Voice Features (Optional)

- [ ] Voice selection dropdown (if multiple voices available)
- [ ] Speak settings persistence
- [ ] Speech highlighting (show text as spoken)
- [ ] Phonetic guide for difficult words

---

## 🔄 Rollback Plan

If critical issues found:

1. Stop all changes
2. Restore database: `mysql FoodTourVinhKhanh < backup_before_refactor.sql`
3. Revert code: `git reset --hard [previous-commit]`
4. Restart with targeted approach

---

## 📝 Notes

- **Critical**: Remove audio_services.py completely (not used after refactor)
- **Important**: When VI changes, delete all other languages (no auto-sync)
- **Backend TTS must completely disappear** - No gemini TTS calls allowed
- **Frontend must not load audio files** - Use SpeechSynthesis only
- **Keep translation suggestion endpoint** - For vendor workflow
