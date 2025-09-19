# SMK Authentication Backend

Secure authentication backend for socialmediakampagnen.com with JWT-based authentication, role-based access control, and comprehensive audit logging.

## 🚀 Features

### Authentication & Security
- **JWT-based Authentication** with secure token management
- **Role-based Access Control** (USER, ADMIN, SUPER_ADMIN)
- **Password Strength Validation** with comprehensive requirements
- **Rate Limiting** to prevent brute force attacks
- **CORS Protection** with configurable origins
- **Helmet Security** headers for production safety

### User Management
- **User Registration** with email validation
- **Secure Login** with bcrypt password hashing
- **Profile Management** for authenticated users
- **Admin User Creation** (Super Admin only)
- **User Role Management** (Super Admin only)
- **Account Activation/Deactivation** (Admin only)

### Audit & Monitoring
- **Comprehensive Audit Logging** for all user actions
- **Failed Authentication Tracking**
- **User Statistics** for admin dashboard
- **Health Check Endpoint** for monitoring

## 🛠️ Tech Stack

- **Node.js** with Express.js framework
- **PostgreSQL** database with Prisma ORM
- **JWT** for authentication tokens
- **bcryptjs** for password hashing
- **Joi** for input validation
- **Helmet** for security headers
- **Morgan** for request logging

## 📦 Installation

### Local Development

1. **Clone and Install**
   ```bash
   git clone [repository-url]
   cd smk-backend-fixed
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and secrets
   ```

3. **Database Setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run setup-admin
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Production Deployment (Railway)

1. **Deploy to Railway**
   - Connect your GitHub repository to Railway
   - Railway will automatically detect and deploy

2. **Set Environment Variables in Railway**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-super-secret-key
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=SecurePassword123!
   ```

3. **Run Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

4. **Setup Admin User**
   ```bash
   npm run setup-admin
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `3600000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `ADMIN_EMAIL` | Default admin email | `admin@socialmediakampagnen.com` |
| `ADMIN_PASSWORD` | Default admin password | `AdminPass123!` |

### Rate Limiting

- **General API**: 100 requests per hour per IP
- **Authentication**: 5 attempts per hour per IP
- **Registration**: 3 attempts per hour per IP
- **Password Reset**: 3 attempts per hour per IP

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "company": "Example Corp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "jwt-token"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt-token"
  }
}
```

#### GET `/api/auth/me`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

### User Management Endpoints (Admin Only)

#### GET `/api/users`
Get all users with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term
- `role`: Filter by role
- `isActive`: Filter by status

#### POST `/api/users/admin`
Create admin user (Super Admin only).

#### PUT `/api/users/:id/role`
Update user role (Super Admin only).

#### PUT `/api/users/:id/status`
Activate/deactivate user (Admin only).

## 🔐 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not a common weak password

### JWT Token Security
- Signed with strong secret
- Includes issuer and audience claims
- Configurable expiration time
- Automatic token validation

### Rate Limiting
- IP-based rate limiting
- Different limits for different endpoints
- Automatic blocking of excessive requests

## 🗄️ Database Schema

### Users Table
- `id`: Unique identifier (CUID)
- `email`: Unique email address
- `firstName`: User's first name
- `lastName`: User's last name
- `company`: Company name (optional)
- `password`: Hashed password
- `role`: User role (USER, ADMIN, SUPER_ADMIN)
- `isActive`: Account status
- `createdAt`: Registration timestamp
- `updatedAt`: Last update timestamp

### Audit Logs Table
- `id`: Unique identifier
- `userId`: User who performed the action
- `action`: Action type
- `details`: Action details (JSON)
- `ipAddress`: Client IP address
- `userAgent`: Client user agent
- `createdAt`: Action timestamp

## 📊 Monitoring & Health Checks

### Health Check
```bash
GET /api/health
```

Returns server status and environment information.

### Audit Logs
All user actions are logged for security and compliance:
- User registration and login
- Profile updates
- Role changes
- Account status changes
- Failed authentication attempts

## 🚀 Deployment

### Railway Deployment

1. **Connect Repository**
   - Link your GitHub repository to Railway
   - Railway will auto-detect the Node.js project

2. **Configure Environment**
   - Set all required environment variables
   - Ensure DATABASE_URL points to your PostgreSQL instance

3. **Deploy**
   - Railway will automatically build and deploy
   - Health check endpoint will verify deployment

### Custom Domain Setup

1. **Add Domain in Railway**
   - Go to your service settings
   - Add your custom domain
   - Configure DNS records

2. **Update CORS Origins**
   - Add your domain to ALLOWED_ORIGINS
   - Redeploy the service

## 🛠️ Development

### Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm run setup-admin`: Create admin user
- `npm run migrate`: Run database migrations
- `npm run generate`: Generate Prisma client

### Testing
```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123!","company":"Test Co"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Support

For support and questions, please contact the development team.
