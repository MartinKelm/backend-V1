# SMK Authentication Backend

Secure authentication and user management system for the Social Media Kampagnen platform.

## 🚀 Features

### ✅ **Authentication**
- User registration with email validation
- Secure login with JWT tokens
- Password strength validation
- Account lockout protection
- Refresh token rotation
- Session management

### ✅ **Authorization**
- Role-based access control (CUSTOMER, ADMIN, SUPER_ADMIN)
- Protected routes with middleware
- Permission-based endpoints

### ✅ **Security**
- Password hashing with bcrypt
- JWT token signing and verification
- Rate limiting on all endpoints
- CORS protection
- Helmet security headers
- Audit logging for all actions

### ✅ **User Management**
- Profile management
- Password changes
- Session tracking
- Admin user management

## 🏗️ Architecture

### **Database Schema**
- **Users**: Core user data with roles and security fields
- **Sessions**: JWT refresh token storage
- **AuditLogs**: Complete audit trail of all actions

### **Security Layers**
1. **Rate Limiting**: Prevents brute force attacks
2. **Input Validation**: Joi schema validation
3. **Authentication**: JWT token verification
4. **Authorization**: Role-based permissions
5. **Audit Logging**: Complete action tracking

## 📡 API Endpoints

### **Authentication**
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login user
POST /api/auth/refresh     - Refresh access token
POST /api/auth/logout      - Logout user
```

### **User Management**
```
GET  /api/users/me         - Get current user profile
PUT  /api/users/me         - Update user profile
PUT  /api/users/me/password - Change password
GET  /api/users/me/sessions - Get user sessions
DELETE /api/users/me/sessions - Revoke all sessions
```

### **Admin Endpoints**
```
GET  /api/users            - Get all users (Admin only)
PUT  /api/users/:id/role   - Update user role (Admin only)
```

### **Health Check**
```
GET  /health               - Health check
GET  /api/health           - API health check
```

## 🔧 Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3001
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:5173"
PRODUCTION_FRONTEND_URL="https://vorschau.socialmediakampagnen.com"

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=1800000
```

## 🚀 Getting Started

### **1. Install Dependencies**
```bash
npm install
```

### **2. Setup Environment**
```bash
cp .env.example .env
# Edit .env with your values
```

### **3. Setup Database**
```bash
npx prisma generate
npx prisma db push
```

### **4. Create Admin User**
```bash
# Register admin user first
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@socialmediakampagnen.com",
    "password": "AdminPassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "company": "SMK GmbH"
  }'

# Promote to admin
node scripts/setup-admin.js
```

### **5. Start Server**
```bash
npm start          # Production
npm run dev        # Development with nodemon
```

## 🧪 Testing

### **Health Check**
```bash
curl http://localhost:3001/api/health
```

### **Register User**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### **Login User**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### **Get Profile (Protected)**
```bash
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔐 Security Features

### **Password Requirements**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not a common password

### **Rate Limiting**
- General API: 100 requests per 15 minutes
- Authentication: 10 requests per 15 minutes
- Registration: 5 requests per hour
- Password Reset: 3 requests per hour

### **Account Security**
- Account lockout after 5 failed login attempts
- 30-minute lockout duration
- Session tracking with IP and User-Agent
- Audit logging for all security events

## 📊 Database Schema

### **User Model**
```prisma
model User {
  id                String     @id @default(cuid())
  email             String     @unique
  password          String
  firstName         String?
  lastName          String?
  role              UserRole   @default(CUSTOMER)
  status            UserStatus @default(PENDING_VERIFICATION)
  emailVerified     Boolean    @default(false)
  
  // Profile
  company           String?
  phone             String?
  website           String?
  avatar            String?
  bio               String?
  
  // Security
  lastLoginAt       DateTime?
  loginAttempts     Int        @default(0)
  lockedUntil       DateTime?
  
  // Relations
  sessions          Session[]
  auditLogs         AuditLog[]
  
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}
```

### **Roles**
- **CUSTOMER**: Regular users
- **ADMIN**: Platform administrators
- **SUPER_ADMIN**: Full system access

### **User Status**
- **ACTIVE**: Can use the platform
- **INACTIVE**: Temporarily disabled
- **SUSPENDED**: Banned from platform
- **PENDING_VERIFICATION**: Awaiting email verification

## 🔗 Frontend Integration

### **API Base URL**
```javascript
const API_BASE_URL = 'http://localhost:3001/api'
```

### **Authentication Headers**
```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### **Error Handling**
```javascript
if (response.status === 401) {
  // Token expired, try refresh
  await refreshToken()
} else if (response.status === 403) {
  // Insufficient permissions
  redirectToLogin()
}
```

## 📝 Audit Logging

All user actions are logged with:
- User ID and email
- Action type and resource
- IP address and User-Agent
- Timestamp
- Additional details (JSON)

### **Logged Actions**
- User registration/login/logout
- Profile updates
- Password changes
- Role changes (admin actions)
- Session management
- Security events

## 🚀 Deployment

### **Production Environment**
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up SSL/TLS
5. Use environment-specific database
6. Enable proper logging
7. Set up monitoring

### **Environment Variables for Production**
```env
NODE_ENV=production
JWT_SECRET="very-long-random-production-secret"
FRONTEND_URL="https://your-frontend-domain.com"
DATABASE_URL="postgresql://prod-connection-string"
```

## 📞 Support

For questions or issues:
- Check the API documentation
- Review error logs
- Test with provided curl examples
- Verify environment configuration

## 🔄 Version

**Version**: 1.0.0  
**Last Updated**: September 18, 2025  
**Node.js**: 22.13.0  
**Database**: PostgreSQL (Neon)  
**Framework**: Express.js  
