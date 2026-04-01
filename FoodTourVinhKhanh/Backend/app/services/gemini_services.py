import os
import json
import base64
import io
import wave
import hashlib
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY không tồn tại trong file .env")
        
        self.client = genai.Client(api_key=api_key)
        self.model_id = 'models/gemini-2.5-flash'
        self.tts_model_id = 'models/gemini-2.5-flash-preview-tts'
        
        # Cấu hình thư mục lưu trữ âm thanh
        self.audio_storage = os.path.join("uploads", "audio", "tts")
        
        # Tự động tạo thư mục nếu chưa có để tránh lỗi
        os.makedirs(self.audio_storage, exist_ok=True)

    async def translate_to_multiple_languages(self, text: str):
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[types.Content(parts=[types.Part(text=text)])],
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "Bạn là chuyên gia dịch thuật. "
                        "Dịch văn bản sang Tiếng Anh (en), Tiếng Hàn (kr), Tiếng Pháp (fr). "
                        "Các bản dịch phải giữ nguyên tên riêng, tên đường và thương hiệu. "
                        "Dịch dựa trên ngữ cảnh để đảm bảo tự nhiên. "
                        "Tự động sửa các lỗi chính tả hoặc ngữ pháp trong bản gốc nếu có. "
                        "Trả về JSON: {'en': '...', 'kr': '...', 'fr': '...'}. "
                    ),
                    response_mime_type="application/json",
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Translation Error: {e}")
            raise e

    async def text_to_speech(self, text: str):
        """
        Xử lý TTS, lưu file vào Backend và trả về đường dẫn file.
        """
        try:
            # 1. Tạo tên file duy nhất dựa trên nội dung (MD5 Hash)
            file_hash = hashlib.md5(text.encode()).hexdigest()
            file_name = f"{file_hash}.wav"
            file_path = os.path.join(self.audio_storage, file_name)

            db_path = f"/uploads/audio/tts/{file_name}"

            # 2. Nếu đã có file (Cache), không gọi API, trả về path luôn
            if os.path.exists(file_path):
                return db_path

            # 3. Gọi Gemini TTS nếu chưa có file
            instruction = "Instruction: Read the following text in a warm, welcoming, and natural tour guide voice. Only read the text provided. Text: "
            response = self.client.models.generate_content(
                model=self.tts_model_id,
                contents=instruction + text,
                config=types.GenerateContentConfig(response_modalities=["AUDIO"])
            )
            
            raw_audio = response.candidates[0].content.parts[0].inline_data.data
            
            # 4. Ghi file WAV xuống ổ cứng backend
            with wave.open(file_path, "wb") as wf:
                wf.setnchannels(1) 
                wf.setsampwidth(2)
                wf.setframerate(24000)
                wf.writeframes(raw_audio)
            
            return db_path
                
        except Exception as e:
            print(f"TTS Storage Error: {e}")
            raise e

    async def chat_with_guide(self, user_query: str, history: list = []):
        """
        Tính năng Chatbot tư vấn du lịch Vĩnh Khánh.
        history: Danh sách các tin nhắn cũ để AI nhớ ngữ cảnh.
        """
        try:
            # Cấu hình vai trò cho Chatbot
            system_prompt = (
                "Bạn là 'Vinh Khanh Guide' - chuyên gia về ẩm thực đường phố tại phố ẩm thực Vĩnh Khánh, Quận 4. "
                "Bạn vui vẻ, nhiệt tình và am hiểu về các quán ốc, lẩu và món ăn vặt tại đây. "
                "Hãy trả lời ngắn gọn, gợi ý các món ăn hấp dẫn và luôn chào đón du khách."
            )

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=history + [types.Content(parts=[types.Part(text=user_query)])],
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7 # Độ sáng tạo vừa phải
                )
            )
            return response.text
        except Exception as e:
            print(f"Chatbot Error: {e}")
            raise e

gemini_service = GeminiService()