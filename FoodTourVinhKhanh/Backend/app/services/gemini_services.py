import os
import json
import base64
import re
import io
import wave
import edge_tts
import asyncio
from gtts import gTTS
from google import genai
from google.genai import types
from groq import Groq
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
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.edge_voices = {
            "vi": "vi-VN-HoaiMyNeural",
            "en": "en-US-EmmaNeural",
            "fr": "fr-FR-DeniseNeural",
            "kr": "ko-KR-SunHiNeural"
        }        
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
            print(f"Gemini lỗi, đang dùng Groq dự phòng: {e}")
            return self.translate_backup_groq(text)
        
    def translate_backup_groq(self, text: str):
        """Dịch thuật dự phòng bằng Llama 3 trên Groq"""
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a professional translation expert. Translate the text into English (en), Korean (kr), and French (fr). The translations must preserve proper nouns, street names, and brand names. Translate based on context to ensure natural and fluent results. Automatically correct any spelling or grammatical errors in the original text if necessary. Return ONLY JSON: {'en': '...', 'kr': '...', 'fr': '...'}"},
                    {"role": "user", "content": text}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as groq_e:
            print(f"Lỗi cả Groq: {groq_e}")
            return {"en": text, "kr": text, "fr": text}

    async def text_to_speech(self, text: str, lang: str = "vi") -> bytes:

        clean_text = text # self.clean_text_for_tts(text)
    
        if not clean_text:
            print(f"clean_text: {clean_text}")
            return b""

        try:
            # Nếu text rỗng hoặc quá ngắn, trả về lỗi sớm
            if not text or len(text.strip()) < 2:
                raise ValueError("Văn bản quá ngắn để chuyển thành giọng nói")

            instruction = "Read the following text in a warm, welcoming, and natural tour guide voice. Text: "
            
            response = self.client.models.generate_content(
                model=self.tts_model_id,
                contents=instruction + clean_text,
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
            print(f"Gemini TTS API Error, chuyển sang Edge-TTS: {e}")

        try:
            audio_data = await self.backup_text_to_speech(text, lang)
            if audio_data: return audio_data
        except Exception as e:
            print(f"Edge-TTS lỗi, chuyển sang gTTS: {e}")

        try:
            return await self.gtts_fallback(text, lang)
        except Exception as e:
            print(f"Tất cả các dịch vụ TTS đều thất bại: {e}")
            return b""

    
    async def gtts_fallback(self, text: str, lang: str = "vi") -> bytes:
        tts = gTTS(text=text, lang=lang)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        return fp.getvalue()

    async def backup_text_to_speech(self, text: str, lang: str = "vi") -> bytes:
        print(text)
        """Dự phòng bằng Edge TTS (Miễn phí & Tự nhiên)"""
        for attempt in range(3):
            try:
                voice = self.edge_voices.get(lang, self.edge_voices["vi"])
                communicate = edge_tts.Communicate(text, voice, rate="-15%")
                audio_data = b""
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_data += chunk["data"]
                
                if not audio_data:
                    print("Edge-TTS không trả về dữ liệu")
                    return b""
                    
                return audio_data

            except Exception as e:
                print(f"Lần thử {attempt+1} cho {lang} thất bại: {e}")
                await asyncio.sleep(1.5)
        return b""

    async def chat_with_rag(self, user_query: str, context: str):

        system_instruction = (
                "Your name is Laura. "
                "You are a virtual assistant for this POI.\n\n"

                "RULES:\n"
                "1. ONLY use information from the provided CONTEXT.\n"
                "2. DO NOT make up or assume any information not present in the CONTEXT.\n"
                "3. If the answer is not in the CONTEXT, reply this sentence in user's language: "
                "'Sorry, I don't have information about this.'\n"
                "4. If the question is casual, respond politely and naturally.\n"
                "5. Keep responses short, clear, and friendly.\n"
                "6. When appropriate, describe food in an appealing and vivid way.\n"
                "7. Try to make the response works fine with edge-tts and gemini-tts to create audio file.\n"
                "8. ALWAYS respond in the SAME language as the user's question, regardless of the language used in the provided CONTEXT. Translate all menu items, prices, and descriptions from the CONTEXT into the target language naturally."
                
            )

        try:

            user_prompt = (
                f"I will provide you with a CONTEXT and a QUESTION.\n"
                f"STRICT RULE: You must answer in the SAME language as my question.\n"
                f"If the CONTEXT is in Vietnamese and my question is in English, you MUST translate the information into English.\n\n"
                f"CONTEXT:\n{context}\n\n"
                f"QUESTION:\n{user_query}"
            )

            contents = [
                types.Part(text=user_prompt)
            ]

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=types.GenerateContentConfig(
                    safety_settings=[
                        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                    ],
                    system_instruction=system_instruction,
                    temperature=0.2
                ),
            )
            print('Answer from gemini!')
            return response.text

        except Exception as e:
            print("Chat với Gemini lỗi, chuyển sang Groq...")
            try:
                # Sử dụng mô hình Llama 3 mã nguồn mở trên Groq
                completion = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": f"[IMPORTANT RULE: IDENTIFY THE LANGUAGE OF THE QUESTION BELOW AND ANSWER ONLY IN THAT LANGUAGE]\n\nCONTEXT:\n{context}\n\nQUESTION:\n{user_query}\n\nREMINDER: Answer strictly in the same language as the QUESTION above, regardless of the language used in the provided context."}
                    ],
                    temperature=0.2,
                    max_tokens=500
                )
                print('Answer from Groq')
                return completion.choices[0].message.content
            except Exception as groq_e:
                print(f"Lỗi cả Groq: {groq_e}")
                return "Xin lỗi, hệ thống AI đang quá tải. Bạn vui lòng thử lại sau giây lát nhé!"
            
    async def generate_voice_audio(self, text: str, lang: str = "vi"):
        try:

            raw_audio_data = await self.text_to_speech(text=text, lang=lang)
            if not raw_audio_data:
                return None
            
            if self.is_mp3_data(raw_audio_data):
                return base64.b64encode(raw_audio_data).decode('utf-8')
        
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
            print(f"Lỗi nghiêm trọng trong generate_voice_audio: {e}")
            return None
    
    def clean_text_for_tts(self, text: str):
        if not text: 
            return ""
        text = re.sub(r'<[^>]*>', '', text)
        text = re.sub(r'(\d+)([a-zA-Z]+)', r'\1 \2', text)
        text = re.sub(r'(?<!\d)[,.](?!\d)|[,.](?!\d)|(?<!\d)[,.]', r'\g<0> ', text)
        text = text.replace('<', '').replace('>', '')
        text = re.sub(r'(\d)\.(\d{3})', r'\1\2', text)
        text = re.sub(r'[•●▪\-+*~/_|]', ', ', text)
        text = re.sub(r'\s+', ' ', text)
        text = ''.join(c for c in text if ord(c) < 0x2000 or 0x2060 <= ord(c) < 0x1F600)
        
        return text.strip()
    
    def is_mp3_data(self, data: bytes) -> bool:
        if not data or len(data) < 4:
            return False
        
        if data.startswith(b'ID3'):
            return True
            
        if data[0] == 0xFF and (data[1] & 0xE0) == 0xE0:
            return True
        
        is_mp3 = (
                data.startswith(b'\xff\xfb') or 
                data.startswith(b'\xff\xf3') or
                data.startswith(b'\xff\xf2')
            )
        
        if is_mp3: return True
            
        return False

gemini_service = GeminiService()