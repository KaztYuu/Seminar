import os
import uuid
import base64

class ImageService:
    def __init__(self):
        self.base_dir = os.getcwd()
        self.image_storage = os.path.join("uploads", "images")
        os.makedirs(self.image_storage, exist_ok=True)

    def save_image(self, base64_data: str, prefix: str = "img") -> str:

        if not base64_data:
            return None
        
        data_lower = base64_data.lower()
        if data_lower.startswith("/uploads") or data_lower.startswith("http"):
            return base64_data

        """
        Giải mã Base64 và lưu thành file ảnh, trả về đường dẫn để lưu DB.
        """
        try:
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
        
    def delete_image(self, db_path: str):
        if not db_path or db_path.startswith("http"):
            return False

        try:
            relative_path = db_path.lstrip("/") 
            full_path = os.path.join(self.base_dir, relative_path)

            if os.path.exists(full_path):
                os.remove(full_path)
                print(f"Successfully deleted: {full_path}")
                return True
            return False
        except Exception as e:
            print(f"Delete Image Error: {e}")
            return False

image_service = ImageService()