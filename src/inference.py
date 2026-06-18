import torch
import numpy as np
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

from .model import model, device
from .preprocess import transform

CLASSES = ["Emphysema", "Normal", "Other"]


def run_prediction(image: Image.Image):
    """Returns (diagnosis, confidence, all_scores, input_tensor)."""
    input_tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(input_tensor)
        probs   = torch.softmax(outputs, dim=1)[0]
        pred    = probs.argmax().item()

    diagnosis  = CLASSES[pred]
    confidence = round(probs[pred].item() * 100, 2)
    all_scores = {
        "Emphysema": round(probs[0].item() * 100, 2),
        "Normal"   : round(probs[1].item() * 100, 2),
        "Other"    : round(probs[2].item() * 100, 2),
    }
    return diagnosis, confidence, all_scores, input_tensor


def run_gradcam(image: Image.Image, input_tensor) -> Image.Image:
    """Returns a PIL Image of the Grad-CAM heatmap overlay."""
    image_resized = image.resize((224, 224))
    image_np      = np.array(image_resized).astype(np.float32) / 255.0

    with GradCAM(model=model, target_layers=[model.features.denseblock4]) as cam:
        grayscale_cam = cam(input_tensor=input_tensor)[0]

    result = show_cam_on_image(image_np, grayscale_cam, use_rgb=True)
    return Image.fromarray(result)
