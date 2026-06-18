import os
import torch
import torch.nn as nn
from torchvision import models

BASE   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = models.densenet121(weights=None)
model.classifier = nn.Linear(model.classifier.in_features, 3)
model.load_state_dict(torch.load(
    os.path.join(BASE, "saved_models", "best_model.pth"),
    map_location=device,
))
model.to(device)
model.eval()
