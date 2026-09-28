# Learnova — Full Next.js Demo

This project implements the complete Learnova flow discussed:
- Landing page
- Login with Learner / Specialist / Admin roles
- Registration
- Optional onboarding
- Learner dashboard
- Specialist dashboard
- Admin dashboard
- AI-assisted recommendation presentation
- Community/posts: specialist creates posts; learners like/comment/share
- Specialist profiles
- Profile photo upload/change
- Appointment booking from the specialist profile
- Appointment list in dashboards
- Workshops: free/paid; specialist can create
- Notifications
- Settings/profile editing
- Demo admin verification
- Responsive violet UI

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Demo accounts

Learner:
learner@learnova.test

Specialist:
specialist@learnova.test

Admin:
admin@learnova.test

The demo stores data in browser localStorage so all pages can be tested immediately without configuring PostgreSQL.

## Important before production

This is a deadline-ready functional frontend/demo. For production deployment, replace localStorage with PostgreSQL + a real authentication provider, add server-side authorization, secure file storage, real payments, and a real video service.
