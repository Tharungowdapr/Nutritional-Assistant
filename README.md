# 🧬 AaharAI NutriSync

**Uncompromising Precision. Minimal Luxury Design.**

A state-of-the-art, AI-powered Indian nutritional assistant grounded in **IFCT 2017** and **ICMR-NIN 2024** guidelines.

---

## 📋 Table of Contents

- [Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Database](#-database)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🚀 Key Features

### 🍽️ Food Database
- Comprehensive Indian food nutrition data (86+ foods)
- Advanced search and filtering by region, diet type, calories, protein
- Excel data import support (IFCT 2017 compliant)
- Detailed nutrient information (Energy, Protein, Fat, Carbs, Fibre, Iron, Calcium, Vitamin C)

### 📅 Meal Planner
- Multi-day meal planning (1, 3, 7, 14 days)
- AI-driven recipe generation
- Budget-based planning (₹100-5000 INR)
- Health goal optimization (weight loss, muscle gain, maintenance)
- Cuisine and allergy preferences

### 🍲 Recipe Crafter
- AI-powered recipe generation using local LLMs (Ollama)
- Detailed ingredient lists and step-by-step instructions
- Nutrition information per serving
- Indian cuisine specialization

### 💬 Chat Assistant
- AI-powered nutrition chat
- Context-aware conversations
- RAG (Retrieval Augmented Generation) for accurate responses
- Chat history persistence

### 👤 Profile & Health Tracking
- Comprehensive user profiles (Basic Info, Health, Lifestyle, Wellness)
- BMI calculator with automatic categorization
- Profile completeness tracking
- Health condition tracking
- Allergy management

### 📊 Analytics Dashboard
- Food group distribution charts
- Nutrient analysis (Calories, Protein, Iron, Vitamin B12)
- Diet type visualization (Veg/Non-Veg)
- Calorie density analysis

### 🔧 Admin Panel
- User management
- Database statistics
- System health monitoring

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Local database
- **Pandas** - Data processing
- **OpenPyXL** - Excel file handling
- **LangChain/LangGraph** - AI agent orchestration
- **ChromaDB** - Vector database for RAG
- **Ollama** - Local LLM inference

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Lucide React** - Icons
- **React Hook Form** - Form handling
- **Sonner** - Toast notifications
- **Recharts** - Data visualization

---

## 📁 Project Structure

```
Nutritional-Assistant/
├── backend/
│   ├── main.py                 # FastAPI application entry
│   ├── config.py               # Configuration settings
│   ├── requirements.txt       # Python dependencies
│   ├── auth/                  # Authentication模块
│   │   ├── database.py        # SQLite operations
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── security.py      # Password hashing
│   │   └── dependencies.py # Auth dependencies
│   ├── routes/               # API routes
│   │   ├── auth.py         # Authentication endpoints
│   │   ├── nutrition.py    # Food database endpoints
│   │   ├── meal_plan.py    # Meal planning endpoints
│   │   ├── chat.py       # Chat endpoints
│   │   ├── tracker.py    # Health tracking
│   │   └── analysis.py   # Analytics endpoints
���   ├── database/            # Database utilities
│   │   ├── loader.py     # Excel data loader
│   │   └── models.py   # SQLAlchemy models
│   ├── agent/             # AI agents
│   │   ├── langgraph_meal_agent.py
│   │   └── tools/
│   ├── rag/              # RAG service
│   │   ├── service.py
│   │   └── llm_router.py
│   └── engines/           # Inference engines
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── chat/
│   │   │   ├── foods/
│   │   │   ├── recipes/
│   │   │   ├── profile/
│   │   │   ├── meal-plan/
│   │   │   ├── tracker/
│   │   │   ├── analysis/
│   │   │   ├── settings/
│   │   │   └── admin/
│   │   ├── components/      # React components
│   │   ├── lib/          # Utilities
│   │   │   ├── api.ts    # API client
│   │   │   ├── auth-context.tsx
│   │   │   └── utils.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   └── tailwind.config.ts
├── data/
│   └── AaharAI_NutriSync_Enhanced.xlsx
└── docker-compose.yml
```

---

## 📦 Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **npm** or **yarn**
- **Ollama** (optional, for local AI)

### Docker Quickstart (Recommended)

```bash
# Clone the repository
git clone https://github.com/Tharungowdapr/Nutritional-Assistant.git
cd Nutritional-Assistant

# Start all services
docker compose up --build -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Manual Setup

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
PYTHONPATH=backend uvicorn main:app --reload --port 8000
```

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 3. Ollama Setup (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull gemma3:4b

# Start Ollama server
ollama serve
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|---------|------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Nutrition
| Method | Endpoint | Description |
|--------|---------|------------|
| GET | `/api/nutrition/foods` | List all foods |
| GET | `/api/nutrition/foods/{id}` | Get food details |
| GET | `/api/nutrition/search` | Search foods |
| GET | `/api/nutrition/analysis` | Get analytics data |

### Meal Planning
| Method | Endpoint | Description |
|--------|---------|------------|
| POST | `/api/meal-plan/generate` | Generate meal plan |
| POST | `/api/meal-plan/recipe` | Generate recipe |
| GET | `/api/meal-plan/history` | Get meal plan history |

### Chat
| Method | Endpoint | Description |
|--------|---------|------------|
| POST | `/api/chat/message` | Send chat message |
| GET | `/api/chat/history` | Get chat history |

### Recipes
| Method | Endpoint | Description |
|--------|---------|------------|
| GET | `/api/recipes/list` | List all recipes |
| GET | `/api/recipes/{id}` | Get recipe details |
| POST | `/api/recipes/save` | Save recipe |

---

## 🗄️ Database

### SQLite Database

The application uses SQLite for local data storage:
- **users.db** - User accounts and profiles
- **foods.db** - Food nutrition data

### Excel Data Import

Food data is loaded from:
```
data/AaharAI_NutriSync_Enhanced.xlsx
```

Contains 86+ Indian foods with full nutrient information.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=sqlite:///./users.db

# JWT Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Ollama (optional)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b

# Groq (optional fallback)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=mixtral-8x7b-32768
```

### Frontend Environment

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🚢 Deployment

### Production Build

```bash
# Frontend
cd frontend
npm run build

# The output will be in frontend/.next
```

### Docker Production

```bash
docker compose -f docker-compose.yml up -d --build
```

### Railway/Render Deployment

1. Connect your GitHub repository
2. Set environment variables
3. Configure build commands:
   - Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app:app --host 0.0.0.0 --port $PORT`
   - Frontend: `cd frontend && npm install && npm run build`

---

## 📱 Pages

| Route | Description |
|------|-------------|
| `/` | Landing page |
| `/login` | User login |
| `/signup` | User registration |
| `/onboarding` | Initial profile setup |
| `/dashboard` | User dashboard (redirects to chat) |
| `/chat` | AI chat assistant |
| `/foods` | Food database explorer |
| `/recipes` | Recipe collection |
| `/recipe/:id` | Recipe details |
| `/meal-plan` | Meal planner |
| `/profile` | User profile |
| `/tracker` | Health tracker |
| `/analysis` | Analytics dashboard |
| `/settings` | App settings |
| `/admin` | Admin panel |
| `/database` | Database viewer |

---

## ⚖️ License

MIT License - See [LICENSE](LICENSE) for details.

Nutritional data sourced from:
- **IFCT 2017** - Indian Food Composition Tables
- **ICMR-NIN 2024** - Indian Council of Medical Research - National Institute of Nutrition

---

## 🏥 Health Disclaimer

This application provides general nutritional information for educational purposes only. It is not a substitute for professional medical advice. Always consult a qualified healthcare provider for personalized nutrition guidance.

---

Built with ❤️ for a healthier India