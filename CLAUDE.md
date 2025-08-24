# Zeroscript Project Brief

This document contains the high-level overview, tech stack, and key architectural decisions for the Zeroscript Chrome extension. Please reference this file to guide your coding.

## 1. Project Overview

Zeroscript is a real-time sales coaching platform designed to codify the patterns of top-performing sales agents. The app, delivered as a seamless Chrome extension, listens to sales calls in real-time, uses AI to detect customer intents, and instantly provides the agent with a word-for-word script from a "Golden Playbook." The core design principle is a "zero-thinking" UI that is fully guided and foolproof for the agent.

## 2. Tech Stack

- **Framework**: React.js
- **Platform**: Chrome Extension (Manifest V3)
- **Backend & Database**: Supabase (Postgres with `pgvector`)
- **Authentication**: Supabase Auth
- **Real-Time Transcription**: Deepgram

## 3. Core Files & Utilities

- `src/supabaseClient.js`: Initializes and exports the Supabase client.
- `src/context/AuthContext.js`: Manages and provides the user session and authentication status to the entire application using React Context.
- `src/components/Auth.js`: The component responsible for handling user login.
- `src/components/MainApp.js`: The main placeholder component for the application view after a user is logged in.

## 4. Architectural Decisions & Conventions

- **State Management**: **IMPORTANT**: Use **React Context** for global state. Do not use Redux.
- **Styling**: **IMPORTANT**: Use **plain CSS**. Create a corresponding `.css` file for each component. Do not use styled-components or Tailwind.
- **Authentication**: All authentication is handled by the Supabase client. The system is **invite-only**; do not build a public sign-up page.
- **Data Storage**: The app is **stateless** regarding PII. Do not write code that stores customer call data.
- **Edge Function Security**: **IMPORTANT**: For all Supabase Edge Functions, the "Verify JWT with legacy secret" setting must be **OFF**. Authentication **MUST** be handled manually inside the function by verifying the `Authorization` header.

## 5. Workflow Instructions

- **IMPORTANT**: For any new feature or component, you **MUST** create a step-by-step plan for how you will implement it first. Do not write any code until this plan has been approved.
- Use the `gh` CLI for any GitHub-related tasks, such as creating pull requests.
- When creating git commits, write descriptive commit messages that explain the changes made.