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

## 📈 Roadmap

### Phase 1: Foundation Setup (Completed)
- [x] Project initialization and dependency setup
- [x] Express server configuration
- [x] Database connection and models
- [x] Basic authentication system
- [x] EJS template structure

### Phase 2: Core E-commerce Features
- [ ] Product management (CRUD operations)
- [ ] Shopping cart functionality
- [ ] Checkout process
- [ ] Order processing

### Phase 3: Admin Dashboard
- [ ] Admin interface completion
- [ ] Product management interface
- [ ] Order management interface
- [ ] Customer management

### Phase 4: Advanced Features
- [ ] Email notifications
- [ ] Coupon system
- [ ] Inventory management
- [ ] Payment gateway integration

### Phase 5: Polish & Deployment
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Deployment preparation

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- SQL injection prevention
- XSS protection
- CSRF protection
- Helmet.js security headers
- Input validation with express-validator

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- **Roo** - *Initial architecture and implementation*

## 🙏 Acknowledgments

- Bootstrap 5 for responsive UI components
- Express.js team for the robust web framework
- MySQL for reliable database storage
- All open-source contributors whose packages made this possible

---

**Note**: This is a foundational implementation. Full functionality will be implemented in subsequent phases according to the architecture plan in `plans/architecture-plan.md`.