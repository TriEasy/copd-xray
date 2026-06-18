import torchvision.transforms as T
from fastapi import UploadFile, HTTPException

transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

ALLOWED_TYPES  = {"image/jpeg", "image/png", "image/bmp"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

def validate_image(file: UploadFile, data: bytes):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}. Upload a JPEG, PNG, or BMP.")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
