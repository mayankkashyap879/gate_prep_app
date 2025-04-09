# GATE Prep App

A comprehensive study planning and progress tracking platform for GATE CS/IT exam preparation.

## Features

- 📚 **Complete Syllabus Management**: Track your progress through the entire GATE CS syllabus
- 📝 **Interactive Quizzes**: Practice with topic-wise quizzes from GateOverflow
- 📄 **Mock Tests**: Take full-length practice tests to simulate the actual GATE exam experience
- 📅 **Smart Scheduling**: Automated study planning based on your exam deadline
- 📊 **Detailed Progress Tracking**: Monitor your preparation at subject, module, and content levels
- 🏆 **Leaderboard**: Compare your progress with others for motivation
- 🌓 **Dark/Light Mode**: Study comfortably in any lighting condition
- 📱 **Responsive Design**: Works on all devices

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and TailwindCSS
- **Backend**: Express.js with TypeScript
- **Database**: MongoDB
- **Deployment**: Docker

## Installation and Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+
- Docker and Docker Compose (optional, for containerized deployment)

### Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/gate-prep-app.git
cd gate-prep-app
```

2. **Backend Setup**

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```
MONGODB_URI=mongodb://localhost:27017/gate_prep_app
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
```

3. **Frontend Setup**

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the frontend directory:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. **Seed the Database**

```bash
cd ../backend
npm run seed
```

5. **Run the Development Servers**

Backend:
```bash
npm run dev
```

Frontend (in a new terminal):
```bash
cd ../frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Docker Setup

1. **Build and Start the Containers**

```bash
docker-compose up --build
```

2. **Seed the Database**

```bash
docker-compose exec backend npm run seed
```

Visit `http://localhost:3000` to see the application.

## Project Structure

```
gate-prep-app/
├── frontend/                  # Next.js frontend application
│   ├── src/                   # Source directory
│   │   ├── app/               # App Router structure
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # Utility functions
│   │   ├── providers/         # Context providers
│   │   └── hooks/             # Custom React hooks
├── backend/                   # Express.js backend API
│   ├── src/
│   │   ├── controllers/       # API controllers
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic services
│   │   ├── scripts/           # Scripts like database seeding
│   │   └── config/            # Configuration files
├── data/                      # Seed data
└── docker/                    # Docker configuration files
```

## Key Components

### Pomodoro Timer

The Pomodoro timer helps users maintain focus using the Pomodoro Technique:
- 25-minute focused study periods
- 5-minute short breaks
- 15-minute long breaks after 4 focus periods

### Smart Scheduling

The app creates optimized study schedules based on:
- User's exam deadline
- Remaining syllabus content
- Subject priorities
- Previous study performance

### Progress Tracking

Progress is tracked at multiple levels:
- Overall syllabus completion
- Subject-wise progress
- Module-level breakdown
- Individual content items (lectures, quizzes, homework)

## License

MIT