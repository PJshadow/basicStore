# BasicStore - WooCommerce-like E-commerce SaaS Platform

A scalable, maintainable e-commerce platform built with Node.js, Express, EJS, and MySQL, designed as a single-store architecture that can be extended to multi-tenant later.

## 🚀 Features

- **Modern E-commerce Platform**: Product catalog, shopping cart, order processing
- **Admin Dashboard**: Comprehensive management interface
- **User Authentication**: Secure login/registration with role-based access
- **Responsive Design**: Mobile-friendly Bootstrap 5 interface
- **MySQL Database**: Robust data storage with proper relationships
- **Email Integration**: Nodemailer for order notifications
- **Security**: Helmet.js, bcrypt password hashing, express-session
- **Image Optimization**: Automated background task for WebP image conversion and link synchronization

## 📁 Project Structure

```
basicStore/
├── src/                    # Source code
│   ├── app.js             # Main Express application
│   ├── server.js          # Server entry point
│   ├── config/            # Configuration files
│   ├── controllers/       # Business logic controllers
│   ├── models/            # Database models
│   ├── routes/            # Express routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   ├── public/            # Static assets
│   └── views/             # EJS templates
├── database/              # Database scripts
├── tests/                 # Test files
├── docs/                  # Documentation
└── plans/                 # Architecture plans
```

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Step 1: Clone and Install Dependencies
```bash
git clone <repository-url>
cd basicStore
npm install
```

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### Step 3: Database Setup
1. Ensure MySQL is running
2. Update `.env` with your MySQL credentials (default: root with no password)
3. Initialize the database:
```bash
npm run db:init
```

### Step 4: Start the Application
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Default Credentials

- **Admin Panel**: `http://localhost:3000/admin`
- **Admin User**: `admin@basicstore.com` / `admin123` (needs proper password hashing setup)

## 📊 Database Schema

The database includes the following tables:
- `users` - Admin and staff authentication
- `customers` - Customer information
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Order information
- `order_items` - Order line items
- `coupons` - Discount coupons
- `email_logs` - Email notification tracking

## 🚀 Development Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run db:init` - Initialize database with schema and sample data
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- SQL injection prevention
- XSS protection
- CSRF protection
- Helmet.js security headers
- Input validation with express-validator

## 🖼️ Image Optimization System

The platform includes an automated system to ensure all product images are served in the modern WebP format for better performance.

- **Automated Detection**: A background task periodically scans the `src/public` directory for `.png`, `.jpg`, and `.jpeg` files.
- **WebP Conversion**: Uses the `sharp` library to convert non-WebP images to optimized `.webp` format.
- **Global Link Sync**: Automatically updates all links to the new `.webp` format in:
  - **Database**: Scans every column of every table to replace old paths.
  - **Source Code**: Updates paths in `.ejs`, `.css`, `.js`, and `.html` files.
- **Configuration**: Controlled by `WEBP_CONVERSION_INTERVAL` in the `.env` file (milliseconds, default: 300000 / 5 minutes).
- **Cleanup**: Removes original files after successful conversion to save disk space.

## 📦 Stock Management & Reservation

The platform implements a smart stock reservation system to prevent inventory leakage from abandoned checkouts.

- **Immediate Reservation**: Stock is reduced the moment an order is created with a `pending` status.
- **Automated Stock Release**:
  - A background cron job runs every 15 minutes to identify abandoned orders.
  - Orders that remain in `pending` status for longer than the configured threshold are automatically moved to `cancelled`.
  - Upon cancellation (manual or automatic), the system automatically returns the reserved stock to the products.
- **Configuration**:
  - `ORDER_EXPIRATION_MINUTES`: Set this in your `.env` file to control the abandonment threshold (default: 30 minutes).
- **Manual Control**: Admins can manually cancel or refund orders through the dashboard, which also triggers the automatic stock return logic.

## 💳 Payment Integration

The platform features a modular, "plugin-like" payment system that allows for easy integration of multiple payment gateways. Currently, **Mercado Pago** is fully integrated.

### How it Works (Provider Pattern)

The system uses a **Provider Architecture** to decouple business logic from specific gateway APIs:

1.  **PaymentService (`src/services/payment/PaymentService.js`)**: Acts as a manager. It detects the active provider via the `PAYMENT_PROVIDER` environment variable and delegates all calls to it.
2.  **Providers (`src/services/payment/MercadoPagoProvider.js`)**: Individual files containing the specific logic for each gateway (Mercado Pago, Stripe, etc.). Each provider must implement a standard interface (`createCheckout`, `handleWebhook`).
3.  **Webhook Flow**:
    *   The gateway sends a POST request to `/payment/webhook/:provider`.
    *   The **PaymentController** receives it and passes it to the `PaymentService`.
    *   The service identifies the provider and processes the notification.
    *   The order status is automatically updated in the database.

### Key Integration Files

- `src/routes/paymentRoutes.js`: Defines checkout and webhook endpoints.
- `src/controllers/paymentController.js`: Manages the flow between the request and the service.
- `src/services/payment/`: Contains the core logic and provider implementations.
- `.env`: Configures `MP_ACCESS_TOKEN`, `WEBHOOK_URL`, and `PAYMENT_PROVIDER`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Pierre Junior

## 🙏 Acknowledgments

- Bootstrap 5 for responsive UI components
- Express.js team for the robust web framework
- MySQL for reliable database storage
- All open-source contributors whose packages made this possible
