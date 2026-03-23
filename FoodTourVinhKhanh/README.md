# 🍜 Food Tour Vĩnh Khánh

Interactive food tourism map for Vĩnh Khánh street.

---

## 🚀 Tech Stack

### Backend

* FastAPI
* MySQL
* Redis

### Frontend

* React
* Vite
* Tailwind CSS

---

## ⚙️ Setup & Run

### 1. Clone project

```bash
git clone <your-repo-url>
cd FoodTourVinhKhanh
```

---

### 2. Run Backend

```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

### 3. Run Frontend

```bash
cd Frontend
npm install
npm run dev
```

---

## 🗄️ Database

* Make sure MySQL is running
* Import database (if provided)

---

## ⚡ Redis

* Redis is required for session management

### Install Redis (Windows):

https://github.com/tporadowski/redis/releases

### Run Redis:

```bash
redis-server
```

---

## 👤 Create Account

* The **first registered account** will be assigned as **Admin**

---

## 📝 Notes

* Backend runs at: `http://localhost:8000`
* Frontend runs at: `http://localhost:5173`
* Make sure Redis is running before login

---

## 📌 Features

* Authentication (Session + Redis)
* Role-based access (Admin / Vendor / Tourist) (WIP)
* Interactive food map (WIP)
* Payment / transaction tracking (WIP)

---