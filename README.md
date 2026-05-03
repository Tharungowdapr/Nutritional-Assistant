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
- **Next.js 16** (App Router) - Webpack-powered high-performance framework
- **TypeScript** - Full type safety across the stack
- **Tailwind CSS & Shadcn UI** - "Imperial Luxury" design system with deep glassmorphism and motion
- **next-pwa** - Service worker and manifest integration
- **react-markdown** - For rendering AI-generated health analysis

### Backend
- **FastAPI** - High-performance Python API
- **LangChain / LangGraph** - Agentic orchestration for nutritional reasoning
- **XLSX / Pandas** - Robust handling of IFCT 2017 nutrient data
- **Ollama** - Local LLM support for privacy-focused users
- **ChromaDB** - Vector database for RAG (Retrieval-Augmented Generation)

---

## 🏥 Health Disclaimer
NutriSync provides general nutritional information for educational purposes based on ICMR-NIN guidelines. Always consult a healthcare professional for personalized medical advice.

---

Built with ❤️ for a healthier, high-performance India.

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **Python 3.12+**
- **Ollama** (optional, for local LLM)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/nutrisync.git
cd nutrisync
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your API keys and settings

# (Optional) Populate ChromaDB vector store
python -m rag.initest

# Start backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local if needed

# Start development server (webpack mode)
npx next dev --webpack --hostname 0.0.0.0 --port 3001
```

### 4. Access Application
Open **http://localhost:3001** in your browser.

---

## 🐳 Docker Deployment (Recommended)

```bash
# Build and start all services
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f backend

# Health check
curl http://localhost:8000/api/health
```

---

## 🌐 Environment Configuration

### Backend (.env)
```bash
# API Keys
GROQ_API_KEY=gsk_your_groq_key_here
GEMINI_API_KEY=AIza_your_gemini_key_here
OPENAI_API_KEY=sk_your_openai_key_here

# Ollama Settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b

# Database
DATABASE_URL=sqlite:///./nutrisync.db
# Or use PostgreSQL:
# DATABASE_URL=postgresql://user:pass@localhost:5432/nutrisync

# Security
SECRET_KEY=your_secret_key_here
JWT_EXPIRE_MINUTES=1440

# Resend (for password reset emails)
RESEND_API_KEY=re_your_resend_key
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GROQ_FALLBACKS=llama-3.1-8b-instant,mixtral-8x7b-32768
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest -q
```

### Frontend Build Test
```bash
cd frontend
npm run build
```

---

## 🚢 Production Deployment

### Frontend (Vercel/Netlify)
1. Connect your GitHub repository
2. Set environment variables in deployment settings
3. Deploy with `npm run build` command

### Backend (Railway/Render/DigitalOcean)
1. Set environment variables in deployment platform
2. Use `uvicorn main:app --host 0.0.0.0 --port $PORT` as start command
3. Ensure PostgreSQL add-on is connected (if not using SQLite)

### Docker Production
```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

---

## 📂 Project Structure

```
nutrisync/
├── backend/                 # FastAPI backend
│   ├── main.py            # FastAPI application entry
│   ├── routes/            # API route handlers
│   ├── auth/              # Authentication & security
│   ├── models/            # Database models
│   ├── rag/               # RAG implementation
│   ├── data/              # IFCT 2017 dataset
│   ├── requirements.txt    # Python dependencies
│   └── .env              # Backend environment vars
│
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Utilities & API clients
│   │   └── hooks/         # Custom React hooks
│   ├── public/            # Static assets
│   ├── package.json      # Node.js dependencies
│   ├── next.config.js    # Next.js configuration
│   └── .env.local        # Frontend environment vars
│
├── data/                   # Shared data files
├── docs/                   # Documentation
├── docker-compose.yml       # Docker orchestration
├── .env                    # Root environment (shared)
├── .gitignore             # Git ignore rules
├── README.md               # This file
└── SETUP.md               # Detailed setup guide
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/yourusername/nutrisync/issues)
- **Discussions**: Join the community at [GitHub Discussions](https://github.com/yourusername/nutrisync/discussions)

---

**NutriSync** - Empowering healthier lives through AI-driven nutritional intelligence.
