import os
import wave

class AudioService:
    def __init__(self):
        self.audio_storage = os.path.join("uploads", "audio", "tts")
        os.makedirs(self.audio_storage, exist_ok=True)

    def save_audio(self, audio_bytes: bytes, poi_id: int, lang_code: str) -> str:

        if not audio_bytes or len(audio_bytes) < 10:
            print(f"LỖI: Dữ liệu audio cho {lang_code} bị rỗng hoặc quá ngắn. Không lưu file.")
            return None

        try:
            is_mp3 = (
                audio_bytes.startswith(b'ID3') or 
                audio_bytes.startswith(b'\xff\xfb') or 
                audio_bytes.startswith(b'\xff\xf3') or
                audio_bytes.startswith(b'\xff\xf2')
            )
            
            extension = "mp3" if is_mp3 else "wav"
            file_name = f"poi_{poi_id}_{lang_code}.{extension}"
            file_path = os.path.join(self.audio_storage, file_name)
            
            if is_mp3:
                # Nếu là MP3, ghi trực tiếp ra file
                with open(file_path, "wb") as f:
                    f.write(audio_bytes)
                print(f"DEBUG: Saved as MP3 (Edge-TTS/Fallback)")
            else:
                # Nếu là Raw PCM từ Gemini, đóng gói vào WAV header
                with wave.open(file_path, "wb") as wf:
                    wf.setnchannels(1) 
                    wf.setsampwidth(2)
                    wf.setframerate(24000)
                    wf.writeframes(audio_bytes)
                print(f"DEBUG: Saved as WAV (Gemini TTS)")
            
            return f"/uploads/audio/tts/{file_name}"
        except Exception as e:
            print(f"Audio Save Error: {e}")
            return None

    def delete_poi_audios(self, poi_id: int):
        # Xóa tất cả file audio liên quan đến một POI (dùng khi xóa POI)
        try:
            for file in os.listdir(self.audio_storage):
                if file.startswith(f"poi_{poi_id}_"):
                    os.remove(os.path.join(self.audio_storage, file))
        except Exception as e:
            print(f"Delete Audio Error: {e}")


    def delete_audio(self, file_path):
        # Xóa theo đường dẫn
        if not file_path:
            return
        try:
            wd = os.getcwd()
            clean_path = file_path.lstrip("/")
            full_path = os.path.join(wd, clean_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                print(f"Successfully deleted: {full_path}")
            else:
                print(f"File not found, skipping delete: {full_path}")
                
        except Exception as e:
            print(f"Delete Audio Error: {e}")

audio_service = AudioService()