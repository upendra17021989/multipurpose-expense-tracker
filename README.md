# Multi-Purpose Expense Tracker

A comprehensive expense tracking application for individuals, housing societies, and kirana stores.

## Project Structure

```
multipurpose-expense-tracker/
├── backend/               # Spring Boot REST API
│   ├── src/
│   │   ├── main/java/com/app/
│   │   │   ├── config/               # Spring configuration
│   │   │   ├── controller/           # REST endpoints
│   │   │   ├── entity/              # JPA entities
│   │   │   ├── dto/                 # Data transfer objects
│   │   │   ├── repository/          # Spring Data JPA repositories
│   │   │   ├── service/             # Business logic
│   │   │   ├── security/            # JWT authentication
│   │   │   ├── exception/           # Custom exceptions
│   │   │   ├── util/                # Utility classes
│   │   │   └── ExpenseTrackerApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/        # Flyway SQL migrations
│   └── pom.xml
└── frontend/              # React + Vite
    ├── src/
    │   ├── api/                    # API client and endpoints
    │   ├── store/                  # Zustand stores
    │   ├── pages/                  # Page components
    │   ├── components/             # Reusable components
    │   ├── utils/                  # Utility functions
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── .gitignore
```

## Tech Stack

### Backend
- **Framework**: Spring Boot 3.2.0
- **Database**: PostgreSQL
- **Authentication**: JWT
- **ORM**: Spring Data JPA
- **Build Tool**: Maven
- **Java Version**: 17

### Frontend
- **Library**: React 18.2.0
- **Build Tool**: Vite 5.0
- **Routing**: React Router 6
- **State Management**: Zustand 4
- **HTTP Client**: Axios 1.6
- **UI Notifications**: React Toastify
- **Data Visualization**: Recharts

## Deploy Backend to Cloud Run

The repository-level `Dockerfile` builds the Spring Boot API from the `backend`
directory, which lets Cloud Run source deployments build from the repository
root.

```bash
gcloud run deploy expense-tracker-api --source . --region YOUR_REGION
```

Deploy the frontend separately to a static hosting provider and configure it to
use the deployed Cloud Run service URL.

## Setup Instructions

### Prerequisites
- Java 17 or higher
- Maven 3.8+
- PostgreSQL 12+
- Node.js 18+ and npm 9+

### Backend Setup

1. **Create PostgreSQL Database**
```sql
CREATE DATABASE expense_tracker;
```

2. **Configure Database Connection**
Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/expense_tracker
spring.datasource.username=postgres
spring.datasource.password=your_password
```

3. **Build and Run Backend**
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/login/{accountId}` - Login with specific account
- `GET /api/auth/validate` - Validate token

### Expense Categories
- `GET /api/expenses/categories` - Get all categories
- `GET /api/expenses/categories/type/{categoryType}` - Get categories by type
- `GET /api/expenses/categories/{categoryId}` - Get category
- `POST /api/expenses/categories` - Create category
- `PUT /api/expenses/categories/{categoryId}` - Update category
- `DELETE /api/expenses/categories/{categoryId}` - Delete category

## Account Types

1. **INDIVIDUAL**: Personal expense tracking
2. **SOCIETY**: Housing society expense management
3. **KIRANA_STORE**: Small store inventory and sales management

## Features

### Individual Module
- Daily expense tracking
- Monthly budget management
- Category-wise budgets
- Spending alerts
- Monthly savings targets
- Expense reports and analytics

### Society Module
- Regular expense tracking
- Festival expense management
- Flat master management
- Festival collection tracking
- Flat-wise collection demand
- Collection receipts and reports

### Kirana Store Module
- Product inventory management
- Daily sales tracking
- Purchase management
- Supplier dues tracking
- Customer credit tracking
- Stock alerts
- Profit/loss calculations

## Database Schema

Created using Flyway migrations in `backend/src/main/resources/db/migration/`:
- Users and Accounts
- Expense Categories and Expenses
- Personal Budgets and Category Budgets
- Flats, Flat Members, and Festival Events
- Festival Collections and Receipts
- Products, Suppliers, and Customers
- Sales and Purchases
- Credit and Payment Ledgers

## Security

- JWT token-based authentication
- Role-based access control
- Account-wise data isolation
- Password encryption with BCrypt
- CORS configuration for cross-origin requests

## Next Steps

1. **Implement Expense Service** - Complete CRUD operations for expenses
2. **Implement Personal Budget Module** - Budget management features
3. **Implement Society Module** - Flat management and festival tracking
4. **Implement Kirana Module** - Product and inventory management
5. **Add Report Generation** - Excel and PDF exports
6. **Add File Upload** - Receipt image uploads
7. **Mobile Responsiveness** - Ensure mobile compatibility
8. **Capacitor Integration** - Android app wrapper

## Default Categories

### Individual
- Food, Grocery, Rent, Travel, Fuel, Shopping, Medical, Education, Bills, Entertainment, Miscellaneous

### Society
- Maintenance, Security, Cleaning, Electricity, Plumbing, Lift, Garden, Office/Admin, Festival, Miscellaneous

### Kirana Store
- Shop Rent, Electricity, Staff Salary, Transport, Packaging, Maintenance, Miscellaneous

## Testing

### Backend
```bash
cd backend
mvn test
```

### Frontend
```bash
cd frontend
npm test
```

## Deployment

### Backend (Docker)
```dockerfile
FROM openjdk:17-jdk-slim
COPY backend/target/expense-tracker-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy dist folder
```

## License

This project is private and proprietary.

## Support

For issues or feature requests, please contact the development team.
