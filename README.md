# 🧬 NutriSync: Nutritional Intelligence

**Uncompromising Precision. Imperial Luxury Design.**

NutriSync is a state-of-the-art, AI-powered Indian nutritional assistant grounded in **IFCT 2017** and **ICMR-NIN 2024** guidelines. It combines a high-fidelity "Imperial Luxury" aesthetic with robust analytical capabilities to provide the ultimate personalized health experience.

---

## 💎 Premium Features

### 🍲 100+ Detailed Procedural Recipes
- **Culinary Depth**: Beyond simple steps. Each recipe features professional culinary phases like *Aromatics Extraction*, *Spice Maturation*, and *Dum Cooking*.
- **High-Precision Ingredients**: Detailed measurements (e.g., "1 tbsp Kasuri Methi, lightly roasted") for 100+ uniquely generated Indian dishes.
- **AI Customization**: Generate new recipes instantly using LLMs, which are then auto-saved to your local collection.

### 📅 AI Meal Planner & Weather-Aware Intelligence
- **Hyper-Personalized**: Generates plans based on health goals, budget, and cravings.
- **Seasonal Context**: Automatically detects your local weather and location to recommend seasonally appropriate Indian ingredients.
- **Multi-Provider LLM**: Native support for **Gemini Pro**, **Groq (Llama 3)**, and local **Ollama** models.

### 📊 Advanced Data Exploration
- **Excel-Driven Analytics**: Interact with the core **AaharAI NutriSync** dataset (IFCT 2017 compliant).
- **Dynamic Filtering**: Column-aware toggles allow you to show/hide specific nutrients across 28+ analytical data points.
- **Export Capabilities**: Instantly download your generated meal plans or grocery lists as **Professional PDF** or **Excel** files.

### 📱 PWA & Offline Resilience
- **Native Experience**: Install NutriSync as a **Progressive Web App (PWA)** on your phone.
- **Offline Fallback**: Uses a robust local JSON fallback system to allow meal planning even without an active internet connection.

### 💰 LLM Cost & Token Transparency
- **Usage Tracker**: Integrated token counter and cost estimator for personal API keys (Gemini/Groq), visible directly in the sidebar.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16 (App Router)** - Turbopack-powered high-performance framework.
- **TypeScript** - Full type safety across the stack.
- **Tailwind CSS & Shadcn UI** - "Imperial Luxury" design system with deep glassmorphism and motion.
- **next-pwa** - Service worker and manifest integration.

### Backend
- **FastAPI** - High-performance Python API.
- **LangChain / LangGraph** - Agentic orchestration for nutritional reasoning.
- **XLSX / Pandas** - Robust handling of IFCT 2017 nutrient data.

---

## 📁 Getting Started

### Prerequisites
- **Node.js 20+**
- **Python 3.12+**

### Quick Launch
```bash
# 1. Setup Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# 2. Setup Frontend
cd ../frontend
npm install
npm run dev # Access at http://localhost:3000
```

---

## 🏥 Health Disclaimer
NutriSync provides general nutritional information for educational purposes based on ICMR-NIN guidelines. Always consult a healthcare professional for personalized medical advice.

---
Built with ❤️ for a healthier, high-performance India.