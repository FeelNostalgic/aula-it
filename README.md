# Aula IT

**High-performance learning dashboard for IT students** — An LMS built with Next.js 16, Supabase, and modern frontend tooling. Designed for Spanish IT vocational programs (SMR, ASIR, DAW, DAM).

Inspired by professional tools like Vercel, GitHub, and Linear with a terminal/industrial aesthetic.

## Quick Start

### Prerequisites

- Node.js 18+ (latest LTS recommended)
- npm or yarn
- Supabase project (free tier ok)

### Installation

```bash
# Clone the repository
git clone https://github.com/FeelNostalgic/aula-it.git
cd aula-it

# Install dependencies
npm install

# Configure environment (see below)
cp .env.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file at the project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (used for auth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Drive Integration (optional, for Phase 3)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/drive/callback
```

### Getting Supabase Credentials

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** to find your URL and anon key
3. Go to **Settings → API → Service Role Key** to get the service role key

### Google Drive Integration (Optional)

For teacher-controlled Google Drive deliverable distribution:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials (Desktop app)
4. Add authorized redirect URI: `https://your-domain.com/api/drive/callback`

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | SSR, API routes, Server Components |
| **Auth & Database** | Supabase (PostgreSQL) | Real-time auth, RLS policies, data persistence |
| **Frontend** | React 19, TypeScript | UI components and state |
| **Styling** | Tailwind CSS 4, shadcn/ui | Design system, responsive UI |
| **Forms** | React Hook Form, Zod | Type-safe form validation |
| **State** | Zustand | Client state management |
| **Visualizations** | React Flow | Activity map visualization |
| **Testing** | Playwright | E2E testing |
| **Deployment** | Vercel | Serverless hosting with CD |

## Project Structure

```
aula-it/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, register)
│   ├── auth/                     # Auth API routes (callback, sign-out)
│   ├── api/                      # API routes
│   │   └── drive/                # Google Drive endpoints
│   ├── dashboard/                # Main app (protected)
│   │   ├── modules/              # Module management
│   │   ├── units/                # Unit management
│   │   └── page.tsx              # Dashboard entry
│   ├── activities/               # Activity student view & builder
│   ├── units/                    # Unit map view
│   ├── settings/                 # User settings
│   └── layout.tsx                # Root layout
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives
│   ├── dashboard/                # Dashboard components
│   │   ├── activity-builder/     # Activity builder UI
│   │   │   ├── editors/          # Step editors (theory, quiz, etc)
│   │   │   └── viewers/          # Step viewers
│   │   └── [other modules]/
│   ├── map-ide/                  # Map visualization (React Flow)
│   └── auth/                     # Auth components
│
├── utils/                        # Utilities
│   └── supabase/                 # Supabase client setup
│
├── lib/                          # Libraries & helpers
│   └── google-drive-api.ts       # Google Drive integration
│
├── types/                        # TypeScript definitions
│   ├── activity.ts               # Activity builder types
│   ├── database.ts               # Database enums
│   └── google.d.ts               # Google API types
│
├── supabase/
│   └── migrations/               # Database schema (SQL)
│
├── middleware.ts                 # Auth & session middleware
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies
```

## Key Features

### For Teachers

- **Activity Builder**: Create activities with multiple phase types
  - Theory (markdown)
  - Deliverables (Google Drive templates with teacher copy mode)
  - Animations (embedded interactive content)
  - Quizzes (multiple choice)
  - Presentations (slides/notes)
  - Resources (file/link collections)
- **Module & Unit Management**: Organize activities into modules and units
- **Student Enrollment**: Add students to modules
- **Activity Map View**: Visualize activity flow with React Flow
- **Google Drive Integration**: Copy templates to student Google Drive accounts
- **Grading**: Grade student deliverable submissions

### For Students

- **Dashboard**: View enrolled modules and units
- **Activity Viewer**: Complete activities, view instructions and resources
- **Deliverable Submission**: Submit work via Google Drive links
- **Progress Tracking**: Track completion across activities
- **Map View**: See activity flow visualization

## Development

### Running the Dev Server

```bash
npm run dev
```

Opens at `http://localhost:3000`. Hot reload enabled.

### Testing

```bash
# Install Playwright (one-time)
npx playwright install chromium

# Run all tests
npm run test

# Run specific test
npx playwright test tests/my-test.spec.ts

# Run with UI
npx playwright test --ui
```

### Linting

```bash
npm run lint
```

### Database

Migrations are in `supabase/migrations/`. Apply them:

```bash
# Via Supabase CLI
supabase migration up

# Or manually in Supabase Studio
```

### Building

```bash
npm run build
npm run start
```

## Architecture & Data Flow

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for:
- Component architecture (Server vs Client)
- Authentication flow
- Activity builder data model
- Student submission flow
- Real-time updates

## Database Schema

See [docs/DATABASE.md](docs/DATABASE.md) for:
- All tables and columns
- Relationships
- RLS policies
- Indexes

## API Reference

See [docs/API.md](docs/API.md) for:
- All API routes
- Request/response shapes
- Authentication requirements
- Error handling

## Versioning & Releases

The project uses **Semantic Versioning** with **Conventional Commits**. Version bumps are automated via CI/CD:

| Prefix | Bump | Example |
|--------|------|---------|
| `feat:` | Minor | `feat: add activity templates` |
| `feat!:` | Major | `feat!: redesign dashboard` |
| `fix:` | Patch | `fix: correct form validation` |
| `refactor:`, `docs:`, `test:`, `chore:` | Patch | Various |

### Making a Release

1. Commit changes following conventional commits format
2. Push to `main` branch
3. CI/CD automatically runs tests, bumps version, creates GitHub release, and deploys to Vercel

```bash
# Example commits (all valid)
git commit -m "fix: correct email validation regex"
git commit -m "feat(activities): add deliverable step type"
git commit -m "feat!: redesign activity builder UI"
git commit -m "docs: update API documentation"
```

Current version: Check `package.json` (auto-updated by CI/CD)

## Environment Setup

### macOS/Linux

```bash
# If using Homebrew, install required tools:
brew install node

# Clone & setup
git clone https://github.com/FeelNostalgic/aula-it.git
cd aula-it
npm install
npm run dev
```

### Windows

Use Git Bash (included with Git for Windows):

```bash
git clone https://github.com/FeelNostalgic/aula-it.git
cd aula-it
npm install
npm run dev
```

Or use Windows Subsystem for Linux (WSL2) for better compatibility.

## CI/CD Pipeline

Every push to `main` triggers:

```
Code Push
  ↓
Playwright E2E Tests
  ↓ (if pass)
Version Bump (Conventional Commits)
  ↓
Create GitHub Release & Tag
  ↓
Deploy to Vercel
```

If tests fail, the pipeline stops and nothing is deployed.

## Troubleshooting

### Port 3000 already in use

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Supabase connection error

1. Verify `.env.local` has correct URL and keys
2. Check Supabase project is running
3. Verify IP is whitelisted (if applicable)

### Google Drive auth fails

1. Verify Google Cloud credentials in `.env.local`
2. Check redirect URI in Google Cloud Console matches `NEXT_PUBLIC_SITE_URL`
3. Ensure Google Drive API is enabled

### Tests failing

```bash
# Update Playwright
npx playwright install

# Run with debug output
PWDEBUG=1 npm run test
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit with conventional commits: `git commit -m "feat: describe change"`
4. Push and open a Pull Request
5. CI/CD runs tests — merge if green

## Deployment

The project auto-deploys to [Vercel](https://vercel.com) on every push to `main`:

1. Tests must pass (Playwright)
2. Version is bumped (if applicable)
3. Code is deployed to production

### Manual Deployment

If needed to deploy to Vercel manually:

```bash
npm run build
vercel --prod
```

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) — System design, patterns, data flow
- [Database Schema](docs/DATABASE.md) — Tables, columns, relationships, RLS
- [API Reference](docs/API.md) — Endpoints, request/response formats

## Support & Issues

Found a bug or have a feature request? Open an [issue on GitHub](https://github.com/FeelNostalgic/aula-it/issues).

## License

ISC
