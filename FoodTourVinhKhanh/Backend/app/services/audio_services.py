import os
import wave

class AudioService:
    def __init__(self):
        self.audio_storage = os.path.join("uploads", "audio", "tts")
        os.makedirs(self.audio_storage, exist_ok=True)

    def save_audio(self, audio_bytes: bytes, poi_id: int, lang_code: str) -> str:
        try:
            file_name = f"poi_{poi_id}_{lang_code}.wav"
            file_path = os.path.join(self.audio_storage, file_name)
            
            with wave.open(file_path, "wb") as wf:
                wf.setnchannels(1) 
                wf.setsampwidth(2)
                wf.setframerate(24000)
                wf.writeframes(audio_bytes)
            
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