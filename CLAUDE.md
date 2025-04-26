# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm run start`
- Type checking: `npm run check`
- Database schema push: `npm run db:push`

## Code Style Guidelines
- **TypeScript**: Use strict mode with proper type annotations
- **Imports**: Use absolute imports with @ prefix (e.g., `@/components`)
- **React Components**: Function components with TypeScript interfaces
- **CSS**: Tailwind with composition via clsx/cva utilities
- **API Calls**: Use Tanstack React Query for data fetching
- **Error Handling**: Use try/catch with proper error types
- **Form Handling**: Use react-hook-form with zod validation
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File Structure**: Group by feature in the components directory
- **Architecture**: React frontend with Express backend, PostgreSQL database

## Project Organization
- `client/`: React frontend code
- `server/`: Express backend code
- `shared/`: Shared types and utilities