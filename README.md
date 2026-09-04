# 🚀 Smart Hire - a advanced resume screening tool

An AI-powered recruitment platform that automates resume screening, ranking, and candidate evaluation using Machine Learning, NLP, and LLM-based insights.

---

## 🧠 Overview

Smart Recruitment SaaS helps recruiters quickly identify the best candidates by:

* 📄 Parsing resumes (PDF/DOCX)
* 🤖 Ranking candidates using hybrid AI scoring
* 🧾 Extracting contact details automatically
* 💡 Generating intelligent explanations using LLMs
* ⚡ Handling background tasks asynchronously

---

## ✨ Features

* 🔍 **Resume Parsing** (PDF, DOCX)
* 📊 **Hybrid Scoring System**

  * Semantic similarity (Sentence Transformers)
  * Keyword matching (TF-IDF)
* 📌 **Auto Candidate Ranking**
* 📞 **Contact Extraction (Email + Phone)**
* 🧠 **LLM-based Explanation**

  * Explains why a candidate is ranked higher/lower
* ⚙️ **Asynchronous Processing**

  * Powered by Celery + Redis
* 🧑‍💼 **Job Management Dashboard**
* 📂 **Resume Upload & Tracking**
* 🎯 **Top Candidate Report Generation**

---

## 🏗️ Tech Stack

### Backend

* 🐍 Django + Django REST Framework
* 🤖 Sentence Transformers (NLP)
* 📊 Scikit-learn (TF-IDF)
* 🧠 Gemini API (LLM explanations)

### Frontend

* ⚛️ React.js

### Infrastructure

* 🐳 Docker (containerization)
* 🛢️ MySQL (via MySQL Workbench)
* 🔴 Redis (message broker)
* ⚡ Celery (background task queue)

---

## ⚙️ System Architecture

```
User → React Frontend → Django DRF API → Celery → Redis Queue
                                     ↓
                                  MySQL DB
                                     ↓
                              Resume Processing
                                     ↓
                        AI Ranking + LLM Explanation
```

---

## 🚀 How It Works

1. User creates a job description
2. Uploads multiple resumes
3. Backend:

   * Extracts text
   * Computes semantic similarity
   * Matches keywords
   * Generates hybrid score
4. Resumes are ranked automatically
5. On-demand:

   * LLM generates explanation for ranking

---

## 📦 Setup Instructions

### 1️⃣ Clone the repo

```bash
git clone https://github.com/your-username/smart-recruitment-saas.git
cd smart-recruitment-saas
```

---

### 2️⃣ Setup Environment Variables

Create a `.env` file in root:

```env
DB_PASSWORD=your_mysql_password
GEMINI_API_KEY=your_api_key
```

---

### 3️⃣ Run with Docker

```bash
docker-compose up --build
```

---

### 4️⃣ Apply Migrations

```bash
python manage.py migrate
```

---

### 5️⃣ Run Server

```bash
python manage.py runserver
```

---

### 6️⃣ Start Celery Worker

```bash
celery -A config worker -l info
```

---

## 📊 Core Modules

* **Resume Processing Engine**
* **Hybrid Scoring System**
* **LLM Explanation Engine**
* **Job & Candidate Management API**
* **Async Task Queue (Celery)**

---

## 🧠 AI Logic

### Hybrid Score

```
Final Score = (0.6 × Semantic Similarity) + (0.4 × Keyword Match)
```

### LLM Explanation

* Highlights strengths
* Identifies missing skills
* Gives final verdict (Strong / Moderate / Weak)

---

## 📸 Screens (Optional)

<img width="1365" height="636" alt="image" src="https://github.com/user-attachments/assets/c01a6b68-a2e1-49b1-8a1c-4a78daa85faa" />

<img width="1356" height="725" alt="image" src="https://github.com/user-attachments/assets/33152f9e-c1b6-481f-b1eb-1286fed861be" />





---

## 🔐 Security

* Environment variables for secrets
* JWT-based authentication
* CORS enabled for frontend integration

---






