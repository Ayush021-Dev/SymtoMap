<div align="center">

# ✚ SymtoMap

### AI-Powered Multi-Organ Disease Risk Predictor

*Comprehensive health risk assessment across **5 major organs** with interactive 3D visualization*

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Three.js](https://img.shields.io/badge/Three.js-3D-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org)

</div>

---

## 🧬 Overview

SymtoMap is a full-stack health diagnostic tool that uses **machine learning models** to predict organ failure risk based on comprehensive patient data. It features a sleek **dark-blue HUD interface** with an interactive **3D human body** that visualizes risk levels through color-coded organ highlighting and detailed popups.

### Organs Analyzed
| Organ | Model | Key Inputs |
|-------|-------|------------|
| 🫀 **Heart** | XGBoost | Age, BP, cholesterol, glucose, BMI, smoking, alcohol |
| 🫁 **Lungs** | XGBoost (Calibrated) | Smoking, pollution exposure, breathing issues, stress |
| 🟤 **Liver** | XGBoost (Calibrated) | Bilirubin, SGPT, SGOT, albumin, A/G ratio |
| 🟢 **Kidneys** | XGBoost | Creatinine, BUN, GFR, electrolytes, proteinuria |
| 🟠 **Pancreas** (Diabetes) | XGBoost | BMI, BP, cholesterol, activity, family history |

---

## ✨ Features

- **40+ Input Fields** — Comprehensive health questionnaire covering vitals, lifestyle, lab results, and medical history
- **Real-time ML Predictions** — 5 pre-trained XGBoost models for organ-specific risk assessment
- **3D Human Body Viewer** — Interactive Three.js visualization with clickable organs
- **Risk Color Coding** — Green (Low), Orange (Moderate), Red (High) with glowing effects
- **Organ Detail Popups** — Spinning 3D organ models with risk breakdown and potential issues
- **Connector Arrows** — Animated SVG arrows linking organs to their detail panels
- **BMI Auto-Calculation** — Automatically computed from height and weight
- **BP Status Indicator** — Real-time Normal/Elevated/High badge
- **Dark HUD Theme** — Animated canvas background with particles, scanlines, and grid

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + Vite 7 |
| **3D Engine** | Three.js + React Three Fiber + Drei |
| **Backend** | Flask 3.0 + Flask-CORS |
| **ML Models** | XGBoost + Scikit-learn |
| **Styling** | Custom CSS (dark-blue glassmorphic HUD) |
| **Fonts** | Rajdhani + Exo 2 (Google Fonts) |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** with pip
- **Node.js 18+** with npm

### Option 1: One-Click Launch (Windows)
```
Double-click start.bat
```
This starts both servers and opens your browser automatically.

### Option 2: Manual Setup

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/SymtoMap.git
cd SymtoMap
```

**2. Install & start the backend**
```bash
cd backend
pip install -r requirements.txt
python app.py
```
> Flask server starts on http://localhost:5000

**3. Install & start the frontend** (new terminal)
```bash
cd SymtoMap
npm install
npm run dev
```
> Vite dev server starts on http://localhost:5173

**4. Open** http://localhost:5173 **in your browser**

---

## 📁 Project Structure

```
SymtoMap/
├── backend/
│   ├── app.py                 # Flask API — prediction endpoint
│   ├── requirements.txt       # Python dependencies
│   └── model/                 # Pre-trained ML models (.pkl)
│       ├── diabetes_model_gpu.pkl
│       ├── heart_model_gpu.pkl
│       ├── kidney_model_gpu.pkl
│       ├── liver_model_gpu_calibrated.pkl
│       ├── lung_model_gpu_calibrated.pkl
│       └── *_scaler.pkl       # Feature scalers
├── public/models/             # 3D organ models (.glb)
├── src/
│   ├── App.jsx                # Root — form ↔ 3D view toggle
│   ├── main.jsx               # React entry point
│   ├── api/predict.js         # API client
│   └── components/
│       ├── Layout.jsx/css     # Animated HUD shell
│       ├── HealthForm.jsx/css # 9-section health form
│       └── HumanBody.jsx/css  # 3D body + organ popups
├── vite.config.js             # Vite + API proxy config
├── start.bat                  # Windows one-click launcher
└── package.json
```

---

## 🔌 API Reference

### `POST /predict`

Accepts patient health data and returns risk predictions for all 5 organs.

**Request Body** (JSON):
```json
{
  "age": 50, "gender": 1, "height": 170, "weight": 70, "bmi": 24.2,
  "systolic_bp": 120, "diastolic_bp": 80,
  "cholesterol": 1, "glucose": 1,
  "smoker": 0, "alcohol": 0, "active": 1,
  "serum_creatinine": 1.0, "gfr": 90,
  "total_bilirubin": 0.8, "sgpt": 25, "sgot": 30
}
```

**Response** (JSON):
```json
{
  "heart":    { "risk_percentage": 24.63, "risk_level": "Low" },
  "lung":     { "risk_percentage": 7.58,  "risk_level": "Low" },
  "liver":    { "risk_percentage": 70.0,  "risk_level": "High" },
  "kidney":   { "risk_percentage": 15.82, "risk_level": "Low" },
  "diabetes": { "risk_percentage": 51.4,  "risk_level": "Moderate" }
}
```

---

## 📄 License

This project is for educational and research purposes.

---

<div align="center">
<sub>Built with ❤️ using React, Flask, and Machine Learning</sub>
</div>
