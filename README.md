# Huddo ERP — Footwear distribution and operations system

Huddo ERP is a full-featured, full-stack Enterprise Resource Planning (ERP) platform designed specifically for managing footwear distribution brands (like Huddo Shoes), territory hierarchies, commissions, stock logs, and communications. 

The application is built with a modern React + Vite frontend and a secure Node/Express/MongoDB backend featuring Role-Based Access Control (RBAC).

---

## 🚀 Key Features

*   **Role-Based Access Control (RBAC)**: Secure multi-role support (`Founder`, `CEO`, `Admin`, `Country Manager`, `State Manager`, `City Manager`, `Sales Executive`, `Promoter`, `Retailer`).
*   **Organizational Hierarchy**: Interactive geographic visual tree node routing mapping countries, states, and cities.
*   **Commissions & Margin Ledger**: Retailer margin adjustments, dynamic employee slab calculators, and promoter royalty settlements.
*   **Sales Analytics**: YoY monthly comparative logs, state sales distribution tracking, and sales rep performance leaderboards.
*   **Inventory & Logistics**: Facility node mapping, real-time stock balances tracking, QR code simulation for inbound/outbound stocks, and return stock queue logs.
*   **Approval Workflows**: Multi-stage approval queue configurations for retail registrations and large volume sales orders.
*   **Communication Center**: Broadcast configurations, message templates adjustments, and email/SMS/WhatsApp test dispatch gates.

---

## 🛠️ Technology Stack

### Frontend
*   **React** (Vite bundler)
*   **Styling**: Custom CSS and utility components
*   **Charts**: Recharts (for revenue, commission, and targets analysis)
*   **Icons**: Lucide React
*   **Barcode Scanner**: Html5QrcodeScanner

### Backend
*   **Runtime**: Node.js & Express.js
*   **Database**: MongoDB (Mongoose Object Document Mapper)
*   **Security**: JSON Web Tokens (JWT), bcryptjs password hashing, authorization middleware
*   **File Uploads**: Multer base64 and binary upload routers
*   **Communications**: Nodemailer SMTP integration

---

## ⚙️ Prerequisites

Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18.0.0 or higher)
*   [MongoDB](https://www.mongodb.com/) (Local community edition or MongoDB Atlas URL)

---

## 🔧 Installation & Setup

Follow these steps to set up and run the application locally on your machine.

### Step 1: Clone the Repository
```bash
git clone https://github.com/Riddhi-Ladva/huddo-erp.git
cd huddo-erp
```

### Step 2: Backend Setup
1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file from the example configuration:
    ```bash
    cp .env.example .env
    ```
4.  Configure the variables in `.env` (adjust `MONGODB_URI` if using a custom MongoDB instance):
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/huddo-erp
    JWT_ACCESS_SECRET=change_me_to_something_secure_in_production
    JWT_REFRESH_SECRET=change_me_to_something_secure_in_production
    ```
5.  Seed default database records (creates roles, permissions, geography zones, and seed users):
    ```bash
    npm run seed
    ```
6.  Start the backend development server:
    ```bash
    npm run dev
    ```
    The server will run at `http://localhost:5000`.

### Step 3: Frontend Setup
1.  Open a new terminal session and navigate back to the repository root directory:
    ```bash
    cd ..
    ```
2.  Install frontend dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    The frontend will run at `http://localhost:5173`. Open this URL in your web browser.

---

## 👤 Default Login Credentials

After seeding the database with `npm run seed`, you can log in using one of the pre-configured system roles:

| Role | Default Email | Password |
|---|---|---|
| **Founder (Owner)** | `rohan@huddoerp.in` | `password123` |
| **Country Manager** | `rajesh@huddoerp.in` | `password123` |
| **State Manager** | `preeti@huddoerp.in` | `password123` |
| **City Manager** | `sanjay@huddoerp.in` | `password123` |
| **Sales Executive** | `arjun@huddoerp.in` | `password123` |
| **Retailer** | `dinesh@walkeasy.in` | `password123` |

*   *Note: Choose the matching role in the login screen dropdown to auto-fill these credentials for quick demo testing.*
