import os
import json
import base64
import re
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
        try:
            # Nếu text rỗng hoặc quá ngắn, trả về lỗi sớm
            if not text or len(text.strip()) < 2:
                raise ValueError("Văn bản quá ngắn để chuyển thành giọng nói")

            instruction = "Read the following text in a warm, welcoming, and natural tour guide voice. Text: "
            
            response = self.client.models.generate_content(
                model=self.tts_model_id,
                contents=instruction + text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    # Nới lỏng bộ lọc an toàn để dễ tạo audio hơn
                    safety_settings=[
                        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                    ]
                )
            )
            
            if not response.candidates or not response.candidates[0].content:
                finish_reason = response.candidates[0].finish_reason if response.candidates else "UNKNOWN"
                print(f"Gemini từ chối tạo Audio. Lý do: {finish_reason}")
                raise ValueError(f"Không thể tạo âm thanh (Lý do: {finish_reason})")

            return response.candidates[0].content.parts[0].inline_data.data
                
        except Exception as e:
            print(f"Gemini TTS API Error: {e}")
            raise e

    async def chat_with_rag(self, user_query: str, context: str):
            
            try:
                # System prompt này giúp AI chỉ trả lời dựa trên dữ liệu bạn cung cấp
                system_instruction = (
                    f"Bạn là trợ lý ảo thông minh của Phố ẩm thực Vĩnh Khánh. "
                    f"Dưới đây là thông tin thực tế về POI quán ăn được cung cấp: ### {context} ###. "
                    f"Hãy dựa VÀO DUY NHẤT thông tin trên để trả lời khách hàng. "
                    f"Nếu thông tin không có trong văn bản, hãy lịch sự từ chối. "
                    f"Trả lời ngắn gọn, thân thiện."
                )

                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=[types.Part(text=user_query)],
                    config=types.GenerateContentConfig(
                        safety_settings=[
                            types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                            types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                            types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                            types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                        ],
                        system_instruction=system_instruction,
                        temperature=0.4 # Giảm độ sáng tạo để AI không "chém gió" ngoài dữ liệu
                    )
                )
                return response.text
            except Exception as e:
                print(f"RAG Error: {e}")
                raise e
            
    async def generate_voice_audio(self, text: str):
        try:

            raw_audio_data = await self.text_to_speech(text=text)
        
            # TẠO HEADER WAV CHO DỮ LIỆU THÔ
            with io.BytesIO() as wav_buffer:
                with wave.open(wav_buffer, "wb") as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(24000)
                    wav_file.writeframes(raw_audio_data)
                
                wav_bytes = wav_buffer.getvalue()
                
            return base64.b64encode(wav_bytes).decode('utf-8')
                
        except Exception as e:
            print(f"Gemini TTS Error: {e}")
            raise e

gemini_service = GeminiService()