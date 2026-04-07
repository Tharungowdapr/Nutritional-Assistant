# 🧬 AaharAI NutriSync

A production-ready, AI-powered Indian nutritional assistant. Built with **Retrieval-Augmented Generation (RAG)** over the **IFCT 2017 (Indian Food Composition Tables)** and **ICMR-NIN 2024 RDA guidelines**.

It features a **Zero-Config SQLite** backend, a **"Minimal Luxury"** Next.js frosted-glass interface, and **fully local, private AI** via Ollama.

![NutriSync Dashboard](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkles.svg)

---

## 🌟 Key Features
- **RAG Knowledge Base:** 2,900+ data chunks derived directly from Indian dietary standards automatically stored and vectorized in a local ChromaDB instance.
- **Inference Engine:** Mathematically scales macros & micros based on life-stage, gender, weight, health conditions (T2DM, PCOS), and GLP-1 medication constraints.
- **AI Tooling (Gemma4):** Agent workflow that automatically creates Indian meal plans, generates shopping lists, and builds recipes based on physical constraints using local LLMs.
- **Persistent Memory:** Complete JWT Authentication, profile tracking, and Chat/Meal Plan history auto-saving via SQLite. No Docker containers or messy configurations required.
- **Luxury UI:** A stunning backend mapped to a meticulously designed Next.js 16 (React 19) frontend utilizing native Tailwind v4 and framer-motion micro-interactions.

---

## 🛠️ Tech Stack
- **Backend/AI:** Python 3.12, FastAPI, SQLAlchemy (SQLite), ChromaDB, PyMuPDF, Pandas, bcrypt.
- **Frontend:** TypeScript, Next.js 16 (App Router), React 19, Tailwind CSS v4, base-ui, Lucide.
- **LLM Context:** Ollama (default: `gemma4:e2b`). 

---

## 🚀 Getting Started

Follow these steps to run the application entirely locally on your system.

### Prerequisites
1. **Python 3.10+**
2. **Node.js 18+**
3. **Ollama:** Installed and running locally.
   - Pull the required model by running:
     ```bash
     ollama run gemma4:e2b
     ```
     *(Note: If you wish to use a different model like `llama3` or `gemma:2b`, you can easily change `OLLAMA_MODEL` in the backend `.env`)*

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Tharungowdapr/Nutritional-Assistant.git
cd Nutritional-Assistant
```

### Step 2: Backend Setup & Vector DB Generation
The backend houses the RAG engine and API.

1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy the `.env.example` file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
   *(No API keys are required for local LLM usage via Ollama! Check `config.py` for default variables.)*

4. **Initialize the Vector Database:**
   Parse the 26MB IFCT database and Excel rules engine into ChromaDB. (This only needs to be run once):
   ```bash
   python -m rag.ingest
   ```

5. **Start the Backend Server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The API will establish the SQLite database natively and bind to Ollama.*

---

### Step 3: Frontend Setup
The frontend hosts the Next.js luxury application interface.

1. Open a **new terminal window/tab** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js Development Server:
   ```bash
   npm run dev -- -p 3001
   ```
   *(We suggest port `3001` to avoid common collisions with services like OpenWebUI).*

### Step 4: Explore
Navigate to **[http://localhost:3001](http://localhost:3001)** in your web browser. 

Create a local account, define your clinical parameters inside the onboarding flow, and begin generating personalized Indian nutrition strategies immediately!

---

## 🛡️ Privacy First
All medical conditions, weight logs, dietary choices, and historical conversations remain **100% locally isolated** securely within `backend/nutrisync.db`. The external RAG requests solely communicate via the local Ollama instance on your machine, ensuring complete privacy mapping.

## 🤝 Roadmap / Future Contributions
- [ ] Push Notifications Integration (Twilio/Resend architecture is scaffolded).
- [ ] Native Mobile App (React Native migration logic).
- [ ] Direct web-scraping for live Indian grocery price estimation (Blinkit/Zepto).