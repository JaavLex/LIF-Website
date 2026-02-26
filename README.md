# LIF Website

A modern website built with **Payload CMS** and **Next.js**.

## Features

- **Payload CMS 3.x** - Headless CMS with admin panel
- **Next.js 15** - React framework with App Router
- **MongoDB** - Database
- **TypeScript** - Type safety
- **Lexical Editor** - Rich text editing

## Collections

- **Users** - Admin users with roles
- **Media** - Image and file uploads
- **Pages** - Dynamic pages with block-based layouts
- **Posts** - Blog posts

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

Copy `.env` and update the values:

```env
MONGODB_URI=mongodb://127.0.0.1/lif-website
PAYLOAD_SECRET=your-secret-key-change-in-production
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

5. Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin)

### First Time Setup

On first visit to `/admin`, you'll be prompted to create your first admin user.

## Project Structure

```
src/
├── app/
│   ├── (frontend)/    # Public website pages
│   │   ├── page.tsx   # Homepage
│   │   ├── [slug]/    # Dynamic pages
│   │   └── posts/     # Blog section
│   └── (payload)/     # Payload admin routes
│       ├── admin/     # Admin panel
│       └── api/       # REST & GraphQL APIs
├── collections/       # Payload collection definitions
│   ├── Users.ts
│   ├── Media.ts
│   ├── Pages.ts
│   └── Posts.ts
├── lib/              # Shared utilities
└── payload.config.ts # Payload configuration
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run generate:types` - Generate TypeScript types from Payload config

## API Endpoints

- REST API: `/api`
- GraphQL: `/api/graphql`
- GraphQL Playground: `/api/graphql-playground`

## License

MIT
