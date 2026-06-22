# Quick Start Guide

## Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 18+
- PostgreSQL 12+
- Git

## Initial Setup (One-time)

### Option 1: Automated Setup

**Windows:**
```bash
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

1. **Create PostgreSQL Database**
```bash
psql -U postgres -c "CREATE DATABASE expense_tracker;"
```

2. **Build Backend**
```bash
cd backend
mvn clean install
cd ..
```

3. **Install Frontend Dependencies**
```bash
cd frontend
npm install
cd ..
```

## Running the Application

### Terminal 1: Start Backend
```bash
cd backend
mvn spring-boot:run
```
Backend will start at: `http://localhost:8080`

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```
Frontend will start at: `http://localhost:5173`

## Default Test Credentials

After database initialization, you can register a new user or use seed data (to be added in Phase 2).

## Project Structure at a Glance

```
Backend: Spring Boot + PostgreSQL
├── Controllers: Handle HTTP requests
├── Services: Business logic
├── Entities: Database models
├── Repositories: Data access layer
└── Security: JWT authentication

Frontend: React + Vite
├── Pages: User-facing screens
├── Components: Reusable UI components
├── API: Backend communication
├── Store: State management (Zustand)
└── Routing: Client-side routing
```

## Key Features Implemented

✅ User authentication with JWT
✅ Account management with role-based access
✅ Expense tracking with approval workflow
✅ Expense categories management
✅ Personal budget planning
✅ Flat management for societies
✅ Product inventory for kirana stores
✅ Account isolation & data security
✅ Comprehensive error handling
✅ CORS configuration for frontend

## Common Commands

### Backend
```bash
# Build
mvn clean install

# Run
mvn spring-boot:run

# Run tests
mvn test

# Check for issues
mvn checkstyle:check
```

### Frontend
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Database Access

### Connect to Database
```bash
psql -U postgres -d expense_tracker
```

### Useful SQL Queries
```sql
-- List all users
SELECT * FROM users;

-- List all accounts
SELECT * FROM accounts;

-- List all expenses
SELECT e.* FROM expenses e WHERE e.soft_deleted = false;

-- Check database size
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) 
FROM pg_database;
```

## Troubleshooting

### Backend Issues

**Database Connection Error**
- Check if PostgreSQL is running: `psql --version`
- Verify database exists: `psql -U postgres -l`
- Check `application.properties` for correct credentials

**Port 8080 Already in Use**
```bash
# Change port in application.properties
server.port=8081
```

**Maven Build Failure**
```bash
# Clear cache and rebuild
mvn clean install -U
```

### Frontend Issues

**Port 5173 Already in Use**
```bash
# Specify different port
npm run dev -- --port 5174
```

**API Connection Error**
- Check if backend is running on port 8080
- Check `vite.config.js` proxy configuration
- Check CORS settings in backend SecurityConfig

**npm dependencies error**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Environment Configuration

### Backend (.env or application.properties)
```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/expense_tracker
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
APP_JWT_SECRET=your-secret-key-here
```

### Frontend (.env.local)
```
VITE_API_BASE_URL=http://localhost:8080/api
```

## Git Workflow

```bash
# Clone repository
git clone <repo-url>
cd multipurpose-expense-tracker

# Create feature branch
git checkout -b feature/feature-name

# Commit changes
git add .
git commit -m "Add feature description"

# Push to remote
git push origin feature/feature-name

# Create Pull Request
```

## Production Deployment

### Backend Deployment (Docker)
```dockerfile
FROM maven:3.8-openjdk-17 AS builder
WORKDIR /app
COPY . .
RUN mvn clean package

FROM openjdk:17-jdk-slim
COPY --from=builder /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Frontend Deployment (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel/Netlify
```

## Useful Resources

- **Spring Boot Documentation**: https://spring.io/projects/spring-boot
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **JWT Guide**: https://jwt.io/introduction

## Performance Tuning

### Database Optimization
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_expenses_account_date ON expenses(account_id, expense_date);
CREATE INDEX idx_products_low_stock ON products(account_id, low_stock_alert_qty);
```

### Backend Optimization
- Enable query caching in application.properties
- Use pagination for large datasets
- Add connection pooling

### Frontend Optimization
- Enable code splitting in Vite
- Lazy load routes
- Optimize bundle size

## Support & Documentation

- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **API Reference**: See `API_REFERENCE.md`
- **Full Documentation**: See `README.md`
- **Database Schema**: See `backend/src/main/resources/db/migration/V1__Initial_Schema.sql`

## Next Steps

1. **Test the setup**
   - Create user account
   - Login with credentials
   - Create some expenses
   - Verify data in database

2. **Review code structure**
   - Understand entity relationships
   - Review security configuration
   - Check service layer implementation

3. **Continue development**
   - Implement remaining pages
   - Add reports generation
   - Enhance UI with styling
   - Add mobile responsiveness

## Contact & Support

For issues, questions, or contributions:
- Check existing documentation
- Review API Reference
- Check implementation summary
- Debug using browser console (frontend)
- Check application logs (backend)

---

**Happy Coding! 🚀**
