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
* Drop and Import database (if provided)

---

## ⚡ Redis

* Redis is required for session management and cache

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
* If you want to experience the payment feature (VNPay for now only):
    1. Register VNPay Sandbox account
        - Visit: https://sandbox.vnpayment.vn/
        - Create a merchant account and obtain:
            + vnp_TmnCode
            + vnp_HashSecret
    2. Configure environment variables
        - VNPAY_TMN_CODE=your_tmn_code
        - VNPAY_HASH_SECRET=your_hash_secret
        - VNPAY_RETURN_URL=https://your-ngrok-url/payments/vnpay-return
        - VNPAY_IPN_URL=https://your-ngrok-url/payments/vnpay-ipn
    3. Run ngrok to expose local server
    4. Configure VNPay Sandbox dashboard
        - Return URL: https://your-ngrok-url/payments/vnpay-return
        - IPN URL: https://your-ngrok-url/payments/vnpay-ipn
* If you do not use VNPay, you can simulate payment and subscription by updating the database manually

---

## 📌 Features

* Interactive food map (WIP)
* Payment / transaction tracking (Removed if needed)

---