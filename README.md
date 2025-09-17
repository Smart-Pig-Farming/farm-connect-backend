# FarmConnect Backend

Backend API for FarmConnect - A Precision Pig Farming Application

## Features

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Robust database with Sequelize ORM
- **Security** - Helmet.js for security headers, JWT authentication
- **Email Service** - Nodemailer with modern HTML templates
- **Quiz System** - Category-based quizzes with scoring
- **Discussion System** - Community forums with moderation
- **Scoring & Leaderboards** - User engagement tracking

## Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** database running
- **Gmail App Password** (for email service)

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/farmconnect

# Email Service
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# JWT Secrets
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret

# URLs
FRONTEND_URL=http://localhost:5174
PORT=3000
```

### 3. Database Setup & Data Population

Run these commands in order to set up your database with sample data:

```bash
# 1. Run database migrations
npm run migrate

# 2. Update quiz durations (sets appropriate time limits)
npx ts-node src/scripts/updateQuizDuration.ts

# 3. Populate best practice categories (creates 9 farming categories)
node populate-best-practices.js

# 4. Create category-specific quizzes (50 questions per category)
npx ts-node src/scripts/populateCategoryQuizzes.ts
```

### 4. Start Development

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 🎯 Essential Scripts Guide

### Database Setup (Run Once)

```bash
# Set up database schema
npm run migrate

# Configure quiz settings
npx ts-node src/scripts/updateQuizDuration.ts

# Add farming category tags (Environment, Nutrition, Health, etc.)
npx ts-node src/scripts/populateBestPracticeTags.ts

# Create quizzes with questions for each category
npx ts-node src/scripts/populateCategoryQuizzes.ts
```

**💡 Note:** If you get foreign key constraint errors when running `populateBestPracticeTags.ts`, first run `clearAllQuizData.ts` to remove existing quiz data, then re-run the tag population script.

### Essential Scripts (Production-Ready)

#### 🔧 Initial Database Setup

```bash
# Core database setup - run these in order for new deployments
npx ts-node src/scripts/populateBestPracticeTags.ts    # Create farming category tags
npx ts-node src/scripts/populateCategoryQuizzes.ts     # Generate category-specific quizzes
npx ts-node src/scripts/populateComprehensiveQuiz.ts   # Create comprehensive quiz
npx ts-node src/scripts/updateQuizDuration.ts          # Set proper quiz time limits
npx ts-node src/scripts/createAdmin.ts                 # Create admin user account
```

#### 🌱 Content Population

```bash
# Populate with sample data - optional for development
npx ts-node src/scripts/populate_best_practices.ts     # Add farming best practices content
npx ts-node src/scripts/seed.ts                        # Basic user/role seeding
npx ts-node src/scripts/seed_discussions.ts            # Sample discussion posts
```

#### 🔄 Data Management

```bash
# Database maintenance and updates
npx ts-node src/scripts/clearAllQuizData.ts            # Clear quiz data (allows tag recreation)
npx ts-node src/scripts/clearQuizQuestions.ts          # Clear questions only
npx ts-node src/scripts/associate_quiz_tags.ts         # Link quizzes to categories
npx ts-node src/scripts/approve_all_posts.ts           # Bulk approve posts (testing)
```

#### 🧑‍� User Management

```bash
# User data management
npx ts-node src/scripts/backfill_user_levels.ts        # Update user levels from scores
npx ts-node src/scripts/backfill_user_locations.ts     # Add location data to users
```

#### 🔍 System Diagnostics

```bash
# Health checks and verification
npx ts-node src/scripts/verifyEnvironment.ts           # Verify environment setup
npx ts-node src/scripts/verify_leaderboard_consistency.ts  # Check scoring data
npx ts-node src/scripts/check_media.ts                 # Verify media files
npx ts-node src/scripts/check_posts.ts                 # Check discussion posts
npx ts-node src/scripts/check_tags.ts                  # Verify category tags
npx ts-node src/scripts/check_users.ts                 # Inspect user accounts
```

## 📂 Project Structure

```
src/
├── controllers/     # API route handlers
├── middleware/      # Authentication, validation, permissions
├── models/          # Sequelize database models
├── routes/          # Express route definitions
├── services/        # Business logic (email, scoring, etc.)
├── scripts/         # Database management scripts
├── migrations/      # Database schema migrations
├── types/          # TypeScript type definitions
├── config/         # Database and app configuration
└── tests/          # Test suites
```

## 🚀 Development Workflow

### For New Developers

1. **Clone and Setup**:

   ```bash
   git clone https://github.com/Smart-Pig-Farming/farm-connect-backend.git
   cd farm-connect-backend
   npm install
   cp .env.example .env
   # Edit .env with your database and email credentials
   ```

2. **Database Initialization**:

   ```bash
   npm run migrate
   npx ts-node src/scripts/updateQuizDuration.ts
   node populate-best-practices.js
   npx ts-node src/scripts/populateCategoryQuizzes.ts
   ```

3. **Start Development**:

   ```bash
   npm run dev
   ```

4. **Test with Sample Data** - Your database now has:
   - 9 best practice categories (Pig Farming, Environment Management, etc.)
   - 9 quizzes with 50 questions each
   - Proper quiz duration settings
   - Ready for user registration and quiz taking

### When to Use Utility Scripts

- **`clearAllQuizData.ts`** - Use when you want to completely reset the quiz system (removes all quizzes, questions, and user attempts)
- **`clearQuizQuestions.ts`** - Use when you want to update quiz questions but keep the quiz structure and user progress
- **`verifyEnvironment.ts`** - Run when setting up a new environment or troubleshooting configuration issues
- **`approve_all_posts.ts`** - Use in development to bypass moderation for testing discussions

## 🏗️ Production Deployment

```bash
# Build the application
npm run build

# Run migrations on production database
npm run migrate

# Start production server
npm start
```

## 📧 Email Templates

The application includes modern, responsive email templates:

- **Welcome Email** - Sent when admin creates user accounts
- **Password Reset** - Secure OTP-based password reset
- **Orange Branding** - Matches FarmConnect frontend design

## 🎮 Quiz System Features

- **9 Categories**: Pig Farming, Environment Management, Nutrition, Health Management, etc.
- **50 Questions per Category**: Comprehensive coverage of precision farming topics
- **Scoring System**: Points, streaks, and leaderboards
- **Progress Tracking**: User completion rates and performance analytics

## 🔧 Available Scripts

### Development

```bash
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm start           # Start production server
npm run migrate     # Run database migrations
```

### Testing

```bash
npm test            # Run test suite
npm run test:watch  # Run tests in watch mode
```

### Utilities

```bash
npm run type-check  # TypeScript type checking
npm run clean      # Remove build files
```

## 🌟 Key Features for Users

- **Secure Authentication** - JWT-based with refresh tokens
- **Comprehensive Quizzes** - Category-based learning system
- **Community Discussions** - Moderated forums for knowledge sharing
- **Scoring & Rankings** - Competitive learning with leaderboards
- **Modern Email System** - Professional notifications and communications
- **Admin Panel** - User management and content moderation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

ISC
