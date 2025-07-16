# Farm Connect Backend

Backend API for Farm Connect - A Precision Pig Farming Application

## Features

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **Security** - Helmet.js for security headers
- **CORS** - Cross-origin resource sharing support
- **Logging** - Morgan HTTP request logger
- **Environment Configuration** - Dotenv for environment variables

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration

### Development

Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT)

### Production

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
src/
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Data models
├── routes/          # API routes
├── services/        # Business logic
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check endpoint

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run type-check` - Type checking without compilation
- `npm run clean` - Remove build files

## Environment Variables

See `.env.example` for available environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC
