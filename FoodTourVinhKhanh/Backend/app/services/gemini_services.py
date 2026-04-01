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
                        "You are a professional translation expert. "
                        "Translate the text into English (en), Korean (kr), and French (fr). "
                        "The translations must preserve proper nouns, street names, and brand names. "
                        "Translate based on context to ensure natural and fluent results. "
                        "Automatically correct any spelling or grammatical errors in the original text if necessary. "
                        "Return the result in JSON format: {'en': '...', 'kr': '...', 'fr': '...'}. "
                    ),
                    response_mime_type="application/json",
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Translation Error: {e}")
            raise e

    async def text_to_speech(self, text: str) -> bytes:
        """
        Thực hiện gọi API Gemini và trả về nội dung audio thô (bytes).
        """
        try:
            instruction = "Instruction: Read the following text in a warm, welcoming, and natural tour guide voice. Only read the text provided. Text: "
            response = self.client.models.generate_content(
                model=self.tts_model_id,
                contents=instruction + text,
                config=types.GenerateContentConfig(response_modalities=["AUDIO"])
            )
            
            # Trả về dữ liệu audio thô
            return response.candidates[0].content.parts[0].inline_data.data
                
        except Exception as e:
            print(f"Gemini TTS API Error: {e}")
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