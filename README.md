# Astra O3 by Rajesh

An advanced AI-powered chat interface built on OpenAI's O3 model with multimodal capabilities.

## Features

- **Intelligent Chat Interface**: Engage with advanced AI assistant powered by OpenAI's GPT-4o model
- **Multimodal Capabilities**: Upload and analyze images directly in the chat interface
- **Structured Responses**: AI provides structured answers with steps, next actions, and citations
- **Token Usage Tracking**: Monitor token usage and costs in INR
- **GitHub Integration**: Analyze repositories, get code suggestions, and commit changes

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Express server with server-side rendering via Vite
- **Database**: PostgreSQL with Drizzle ORM
- **API Integration**: OpenAI API, GitHub API

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- OpenAI API key
- GitHub API token (for repository integration)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/rajeshkanaka/o3_mutant.git
   cd o3_mutant
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/astra_o3
   OPENAI_API_KEY=your_openai_api_key
   GITHUB_TOKEN=your_github_token
   ```

4. Run the development server:
   ```
   npm run dev
   ```

## License

This project is private and not licensed for redistribution.

## Acknowledgments

- Built with OpenAI's GPT-4o model
- Customized by Rajesh