# API Reference Guide

## Base URL
- **Development**: `http://localhost:8080/api`
- **Production**: `https://api.expensetracker.com/api`

## Authentication

All endpoints except `/auth/**` require JWT token in Authorization header:
```
Authorization: Bearer {token}
```

## Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/login/{accountId}` | Login with specific account | No |
| GET | `/auth/validate` | Validate token | Yes |

**Register Request:**
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "email": "john@example.com",
  "password": "secure_password"
}
```

**Login Request:**
```json
{
  "mobile": "9876543210",
  "password": "secure_password"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "userId": 1,
  "user": {
    "id": 1,
    "name": "John Doe",
    "mobile": "9876543210",
    "email": "john@example.com",
    "active": true
  },
  "accounts": [
    {
      "id": 1,
      "userId": 1,
      "accountType": "INDIVIDUAL",
      "accountName": "My Expenses",
      "role": "OWNER"
    }
  ]
}
```

---

### Expense Categories (`/expenses/categories`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all active categories | Yes |
| GET | `/type/{categoryType}` | Get categories by type | Yes |
| GET | `/{categoryId}` | Get single category | Yes |
| POST | `/` | Create category | Yes |
| PUT | `/{categoryId}` | Update category | Yes |
| DELETE | `/{categoryId}` | Delete category (soft) | Yes |

**Category Types:** `PERSONAL`, `SOCIETY_REGULAR`, `FESTIVAL`, `STORE`

**Create Category Request:**
```json
{
  "categoryName": "Food",
  "accountType": "INDIVIDUAL",
  "categoryType": "PERSONAL"
}
```

---

### Expenses (`/expenses`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all expenses | Yes |
| GET | `/today` | Get today's expenses | Yes |
| GET | `/range?startDate=2024-01-01&endDate=2024-01-31` | Get by date range | Yes |
| GET | `/{expenseId}` | Get single expense | Yes |
| POST | `/` | Create expense | Yes |
| PUT | `/{expenseId}` | Update expense | Yes |
| DELETE | `/{expenseId}` | Delete expense (soft) | Yes |
| POST | `/{expenseId}/approve` | Approve expense | Yes |
| POST | `/{expenseId}/reject` | Reject expense | Yes |

**Create Expense Request:**
```json
{
  "expenseDate": "2024-01-15",
  "categoryId": 1,
  "vendorName": "Local Store",
  "description": "Weekly groceries",
  "amount": 1500.50,
  "paymentMode": "CASH",
  "paidBy": "user@example.com",
  "remarks": "Household items"
}
```

**Payment Modes:** `CASH`, `BANK`, `UPI`, `CARD`, `NEFT`, `CHEQUE`, `CREDIT`, `MIXED`

**Expense Status:** `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `PAID`

---

## Response Format

### Success Response (200, 201)
```json
{
  "id": 1,
  "accountId": 1,
  "expenseDate": "2024-01-15",
  "categoryId": 1,
  "categoryName": "Food",
  "amount": 1500.50,
  "status": "DRAFT",
  "createdAt": "2024-01-15T10:30:00"
}
```

### Error Response (4xx, 5xx)
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "error": "Validation Error",
  "message": "Amount must be greater than 0",
  "path": "/expenses"
}
```

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Successful delete |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 404 | Not Found - Resource not found |
| 500 | Server Error |

---

## Validation Rules

### Expenses
- Amount > 0
- Payment mode required
- UTR required for UPI/NEFT
- Cheque number required for CHEQUE
- Category must exist

### Dates
- Format: YYYY-MM-DD
- startDate <= endDate

---

## Rate Limiting
- No rate limiting (can be added later)

---

## Pagination
- Not yet implemented
- Coming in Phase 2

---

## Filtering & Sorting
- Filters: date range, category, payment mode, status
- Sorting: by date, amount
- Full implementation coming in Phase 2

---

## Examples

### Example 1: Create an Expense

**Request:**
```bash
curl -X POST http://localhost:8080/api/expenses \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "expenseDate": "2024-01-15",
    "categoryId": 1,
    "amount": 500,
    "paymentMode": "CASH",
    "description": "Lunch",
    "status": "DRAFT"
  }'
```

**Response:**
```json
{
  "id": 5,
  "accountId": 1,
  "expenseDate": "2024-01-15",
  "categoryId": 1,
  "categoryName": "Food",
  "amount": 500.00,
  "paymentMode": "CASH",
  "description": "Lunch",
  "status": "DRAFT",
  "createdAt": "2024-01-15T10:30:00"
}
```

### Example 2: Get Today's Expenses

**Request:**
```bash
curl http://localhost:8080/api/expenses/today \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
[
  {
    "id": 1,
    "accountId": 1,
    "expenseDate": "2024-01-15",
    "amount": 500.00,
    "categoryName": "Food"
  },
  {
    "id": 2,
    "accountId": 1,
    "expenseDate": "2024-01-15",
    "amount": 200.00,
    "categoryName": "Travel"
  }
]
```

---

## Future Endpoints (Phase 2)

- Personal Budget Management
- Society Flat Management
- Festival Collection Tracking
- Kirana Product & Sales Management
- Reports Generation (Excel/PDF)
- Receipt Upload
- Data Import/Export
- Analytics & Dashboards

---

**Last Updated**: 2024-01-15
