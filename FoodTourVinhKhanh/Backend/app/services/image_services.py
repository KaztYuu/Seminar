import os
import uuid
import base64

class ImageService:
    def __init__(self):
        self.image_storage = os.path.join("uploads", "images")
        os.makedirs(self.image_storage, exist_ok=True)

    def save_image(self, base64_data: str, prefix: str = "img") -> str:
        """
        Giải mã Base64 và lưu thành file ảnh, trả về đường dẫn để lưu DB.
        """
        try:
            if not base64_data or base64_data.startswith("http"):
                return base64_data # Nếu đã là URL thì giữ nguyên
            
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]

            file_name = f"{prefix}_{uuid.uuid4().hex}.png"
            file_path = os.path.join(self.image_storage, file_name)

            with open(file_path, "wb") as f:
                f.write(base64.b64decode(base64_data))

            return f"/uploads/images/{file_name}"
        except Exception as e:
            print(f"Image Save Error: {e}")
            return None

image_service = ImageService()