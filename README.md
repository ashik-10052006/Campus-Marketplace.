# Campus Marketplace for Students

A modern, functional, production-grade full-stack web application designed specifically for college and university students to buy and sell items (textbooks, electronics, dorm furniture, stationery, bicycles, etc.) within their campus community, complete with integrated Claude AI assistance and an administrative management suite.

---

## 🌟 Features

- **Authentication & Security**: JWT-based authentication stored in HTTP-Only, Secure, SameSite cookies with bcryptjs password hashing.
- **Role-based Access Control**: Distinct `student` (buyer/seller) and `admin` roles enforced both at API route and middleware level.
- **Marketplace Browsing**: Real-time product search (case-insensitive across name and description), multi-facet filtering (category, condition, price ranges, status), dynamic sorting, and server-side pagination.
- **Product Management**: Multi-part image upload with local filesystem and Cloudinary storage provider abstraction, edit, soft delete (`REMOVED`), and mark sold (`SOLD`).
- **Direct Student Messaging**: Conversations and message threads linked directly to product listings with participant authorization.
- **Listing Violation Reporting**: Moderation reporting system with admin review, resolve, reject, and removal workflows.
- **Claude AI Integration**:
  - *Product Description Generator*: Generates structured, engaging marketplace listings.
  - *Improve Description*: Polishes seller drafts to be clear, trustworthy, and student-focused.
  - *Category Suggestion*: Auto-recommends valid marketplace categories.
  - *Listing Assistant*: Parses natural language notes into structured listing fields.
  - *Contextual Message Suggestions*: Fast-response suggestions for buyer/seller chats.
  - *Report Classification*: AI classification to assist admins in categorizing violation reports.
- **Admin Management Panel**: Dashboard analytics, user moderation, product listing management, category CRUD, and report resolution.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (CSS Variables, Flexbox, Grid, Responsive Design), Vanilla JavaScript (ES6+, Fetch API, DOM manipulation).
- **Backend**: Node.js, Express.js (Modular Controllers, Routes, Middleware, Services).
- **Database**: MongoDB & Mongoose ODM.
- **Authentication**: JSON Web Tokens (JWT), HTTP-Only cookies, bcryptjs.
- **File Storage**: Multer with Dual Storage Provider (Local File System & Cloudinary).
- **AI Service**: Anthropic Claude API (`@anthropic-ai/sdk`).
- **Security**: Helmet, CORS, Express Rate Limiter, Input Sanitization.

---

## 📁 Project Structure

```text
campus-marketplace/
├── client/
│   ├── index.html               # Landing page
│   ├── login.html               # User & admin login
│   ├── register.html            # Student registration
│   ├── products.html            # Marketplace catalog
│   ├── product-details.html     # Single product view & seller contact
│   ├── create-product.html      # Create listing with AI assistance
│   ├── edit-product.html        # Update product listing
│   ├── dashboard.html           # Student dashboard & metrics
│   ├── my-listings.html         # User's listings management
│   ├── profile.html             # Profile view and editor
│   ├── messages.html            # In-app messaging interface
│   ├── admin.html               # Admin overview & stats
│   ├── admin-users.html         # Admin user moderation
│   ├── admin-products.html      # Admin product management
│   ├── admin-reports.html       # Admin reports review
│   ├── admin-categories.html   # Admin category management
│   ├── 404.html                 # Not found page
│   ├── css/
│   │   ├── style.css            # Core design system & utilities
│   │   ├── responsive.css       # Breakpoint adaptations
│   │   ├── auth.css             # Authentication styles
│   │   ├── products.css         # Catalog & card styling
│   │   ├── dashboard.css        # Dashboard & tables styling
│   │   ├── messages.css         # Chat layout & bubble styles
│   │   └── admin.css            # Admin panels & metrics
│   └── js/
│       ├── api.js               # Centralized fetch client
│       ├── auth.js              # Auth state & route guards
│       ├── navbar.js            # Dynamic responsive navigation
│       ├── home.js              # Landing page interactions
│       ├── products.js          # Catalog search/filter/pagination
│       ├── product-details.js   # Product viewer & report modal
│       ├── create-product.js    # Create product with Claude AI
│       ├── edit-product.js      # Edit listing logic
│       ├── dashboard.js         # Student stats & quick links
│       ├── my-listings.js       # User listing management
│       ├── profile.js           # Profile view and avatar upload
│       ├── messages.js          # Chat interactions & AI suggestions
│       ├── admin.js             # Admin dashboard statistics
│       ├── admin-users.js       # User management
│       ├── admin-products.js    # Product moderation
│       ├── admin-reports.js     # Report review & actions
│       ├── admin-categories.js  # Category management
│       └── utils.js             # Reusable UI components & toasts
├── server/
│   ├── server.js                # Server entry point
│   ├── app.js                   # Express app configuration
│   ├── config/
│   │   ├── db.js                # MongoDB connection
│   │   └── cloudinary.js        # Cloudinary configuration
│   ├── models/                  # Mongoose schemas
│   ├── controllers/             # Business logic handlers
│   ├── routes/                  # Express REST routes
│   ├── middleware/              # Auth, Admin, Multer, Error handlers
│   ├── services/                # Storage & Claude AI services
│   ├── utils/                   # Token generators & seeders
│   └── uploads/                 # Local uploads (products, profiles)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster URI)
- (Optional) Cloudinary account for cloud image storage
- (Optional) Anthropic Claude API key for AI features

### 1. Clone & Install Dependencies
```bash
cd "Campus Marketplace"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your settings:
```bash
cp .env.example .env
```
Key configuration items:
- `MONGODB_URI`: e.g. `mongodb://127.0.0.1:27017/campus_marketplace` or your Atlas connection string.
- `JWT_SECRET`: A secure 32+ character random string.
- `STORAGE_PROVIDER`: `local` (default) or `cloudinary`.
- `ANTHROPIC_API_KEY`: Your Anthropic API key.

### 3. Seed Initial Categories and Admin Account
```bash
npm run seed
```
This populates standard categories (Books, Electronics, Furniture, etc.) and creates a default administrator account.

### 4. Run the Application
Development mode (with nodemon):
```bash
npm run dev
```
Production mode:
```bash
npm start
```
Access the application at: `http://localhost:5000`
