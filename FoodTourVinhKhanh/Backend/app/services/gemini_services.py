import json
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from groq import Groq

load_dotenv()

LANGUAGE_PROMPTS = {
    "en": "English",
    "fr": "French",
    "kr": "Korean",
    "ja": "Japanese",
    "vi": "Vietnamese",
}

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY không tồn tại trong file .env")

        self.client = genai.Client(api_key=api_key)
        self.model_id = "models/gemini-2.5-flash"
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    async def translate_single_language(self, name: str, description: str, target_lang: str):
        """Draft vendor-managed POI narration translation from VI to 1 target language."""

        target_language = LANGUAGE_PROMPTS.get(target_lang, target_lang)

        prompt = (
            "You are a tourism narration drafting assistant. "
            "Translate the POI narration from Vietnamese into the target language.\n\n"
            "Rules:\n"
            "1) Prioritize natural tourism narration over literal translation.\n"
            "2) Preserve Vietnamese proper nouns, food names, brands, and place names (do not translate them unless there is a widely used natural equivalent).\n"
            "3) The result should sound natural, concise, and travel-guide friendly.\n"
            "4) Avoid literal/word-for-word translation and unnatural phrasing.\n"
            "5) Return ONLY valid JSON.\n"
            "Return only JSON with keys: name, description.\n"
            f"\n\nPOI Name (VI): {name}\nDescription (VI): {description}\n"
            f"Target language: {target_language} ({target_lang})"
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[types.Content(parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            payload = json.loads(response.text)
            return {
                "lang_code": target_lang,
                "name": payload.get("name", name),
                "description": payload.get("description", description),
            }
        except Exception as exc:
            print(f"Gemini single-language translation failed, fallback to Groq: {exc}")
            return self.translate_single_language_backup_groq(name, description, target_lang)

    def translate_single_language_backup_groq(self, name: str, description: str, target_lang: str):
        try:
            prompt = (
                "You are a tourism narration drafting assistant. "
                "Translate Vietnamese POI name and description into the target language naturally. "
                "Prioritize natural tourism narration over literal translation. "
                "Preserve Vietnamese proper nouns, food names, brands, and place names. "
                "Return ONLY valid JSON with keys: name, description."
            )

            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": (
                            f"Target language: {LANGUAGE_PROMPTS.get(target_lang, target_lang)} ({target_lang})\n"
                            f"POI Name (VI): {name}\n"
                            f"POI Description (VI): {description}"
                        ),
                    },
                ],
                response_format={"type": "json_object"},
            )

            payload = json.loads(completion.choices[0].message.content)
            return {
                "lang_code": target_lang,
                "name": payload.get("name", name),
                "description": payload.get("description", description),
            }
        except Exception as groq_exc:
            print(f"Groq single-language fallback failed: {groq_exc}")
            return {
                "lang_code": target_lang,
                "name": name,
                "description": description,
            }

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
            "7. ALWAYS respond in the SAME language as the user's question, regardless of the language used in the provided CONTEXT. "
            "Translate all menu items, prices, and descriptions from the CONTEXT into the target language naturally."
        )

        try:
            user_prompt = (
                "I will provide you with a CONTEXT and a QUESTION.\n"
                "STRICT RULE: You must answer in the SAME language as my question.\n"
                "If the CONTEXT is in Vietnamese and my question is in English, you MUST translate the information into English.\n\n"
                f"CONTEXT:\n{context}\n\nQUESTION:\n{user_query}"
            )

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[types.Part(text=user_prompt)],
                config=types.GenerateContentConfig(
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_HARASSMENT",
                            threshold="BLOCK_NONE",
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_HATE_SPEECH",
                            threshold="BLOCK_NONE",
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold="BLOCK_NONE",
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold="BLOCK_NONE",
                        ),
                    ],
                    system_instruction=system_instruction,
                    temperature=0.2,
                ),
            )
            return response.text
        except Exception:
            try:
                completion = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {
                            "role": "user",
                            "content": (
                                "[IMPORTANT RULE: IDENTIFY THE LANGUAGE OF THE QUESTION BELOW "
                                "AND ANSWER ONLY IN THAT LANGUAGE]\n\n"
                                f"CONTEXT:\n{context}\n\nQUESTION:\n{user_query}"
                            ),
                        },
                    ],
                    temperature=0.2,
                    max_tokens=500,
                )
                return completion.choices[0].message.content
            except Exception as groq_exc:
                print(f"Chat fallback failed: {groq_exc}")
                return "Xin lỗi, hệ thống AI đang quá tải. Bạn vui lòng thử lại sau giây lát nhé!"


gemini_service = GeminiService()

