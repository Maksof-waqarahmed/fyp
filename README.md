# AI-Powered Uptime Monitor

This project is built with **Next.js** and uses **Better Auth** for authentication.
It uses **PostgreSQL** for the database and supports social login via **Google** and **GitHub**.

---

## ⚙️ Setup

1. **Clone the repository:**

```bash
git clone <repository-url>
cd <repository-folder>
```

2. **Install dependencies:**

```bash
pnpm install
# or
npm install
```

3. **Environment variables**

Create a `.env` file in the project root and define the following variables:

```env
# PostgreSQL database connection
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# Next.js environment
NEXT_PUBLIC_ENV=development

# Better Auth secret (random string)
BETTER_AUTH_SECRET="your-random-secret"

# Better Auth URL (for server callbacks)
BETTER_AUTH_URL="http://localhost:3000/api/auth"

# Google OAuth credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth credentials (optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

> **Note:** Do not commit your `.env` file to version control.

---
## Install dependencies:

```bash
pnpm install
```

## 🛠️ Database Setup

1. **Generate Prisma client:**

```bash
npx prisma generate
```

2. **Push schema to the database:**

```bash
pnpm db:push
```

This will automatically create your Prisma schema models in the PostgreSQL database.

---

## 🔑 Run the Project

**Development server:**

```bash
pnpm dev
```

The project will run at: `http://localhost:3000`

---

## 📦 Tech Stack

* Next.js
* Prisma ORM + PostgreSQL
* TRPC
* Better Auth
* OpenAI API
* Shadcn UI
* TailwindCSS (for styling)

---

## 🔗 References

* [Better Auth Documentation](https://docs.better-auth.com/)
* [Prisma Documentation](https://www.prisma.io/docs/)
* [Next.js Documentation](https://nextjs.org/docs)
* [TRPC Documentation](https://trpc.io/docs)
* [Google OAuth Setup](https://console.cloud.google.com/apis/credentials)
* [Shadcn UI Documentation](https://ui.shadcn.com/docs)
* [OpenAI API Documentation](https://platform.openai.com/docs)

---