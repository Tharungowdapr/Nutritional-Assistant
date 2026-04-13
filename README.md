# 🧬 AaharAI NutriSync

### **Uncompromising Precision. Minimal Luxury Design.**
A state-of-the-art, AI-powered Indian nutritional assistant grounded in **IFCT 2017** and **ICMR-NIN 2024** guidelines.

---

## 🎨 Minimal Luxury UI/UX
The platform has undergone a complete visual overhaul, moving away from "plain" interfaces to a **Minimal Luxury** design system.
- **Glassmorphic Interfaces**: Refined transparency, subtle blurs, and premium typography.
- **Micro-Animations**: Fluid transitions and interactive elements for a premium feel.
- **Dark Mode Excellence**: Optimized for high contrast and modern aesthetics.

---

## 🚀 Key Features

### 🧠 Scientific Intelligence Hub
Deep analytical insights derived from **12+ verified nutritional datasets**:
- **Regional Food Culture**: Traditional culinary wisdom across India.
- **Clinical Precision**: Nutritional protocols for various health conditions.
- **Medicine Impacts**: Real-time tracking of drug-nutrient interactions.
- **Occupational Guidance**: Tailored calorie targets based on profession intensity.

### 📅 Advanced Meal Planner
- **AI-Driven Personalization**: Hyper-local recommendations based on your unique profile.
- **Structured Tables**: Clean, readable composition and calorie breakdowns for every meal.
- **Dynamic Grocery Lists**: Instant generation of Shopping lists from your plans.

### 📊 Health & Macro Tracker
- **Historical Analysis**: Apple Health-style visualization of your nutritional journey.
- **Real-Time Progress**: Dynamic macro rings tracked against ICMR-NIN 2024 targets.
- **Intelligent Food Search**: Fast, filterable access to over 7,000+ IFCT food items.

---

## 🛠️ Technical Excellence
- **RAG Architecture**: Retrieval-Augmented Generation ensures every AI response is fact-checked against official databases.
- **Local-First Privacy**: Run LLMs locally (Ollama) to keep your health data private.
- **Full-Stack Performance**: FastAPI backend for speed, Next.js for a fluid frontend.

---

## 📦 Getting Started

1. **Docker Quickstart**:
   ```bash
   docker compose up --build -d
   ```
2. **Manual Setup**:
   - Backend: `uvicorn backend.main:app --reload`
   - Frontend: `npm run dev`

For detailed setup, see [SETUP.md](SETUP.md).

---

## ⚖️ License
Grounding data sourced from IFCT & ICMR-NIN. Project licensed under MIT.
Built with ❤️ for a healthier India.