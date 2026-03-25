# ThankSquirrel (고마워 다람쥐)

A web application where users can receive warm, supportive "letters" from a friendly squirrel character named "Dalaemi" (달램이). The project features a highly interactive login/signup experience with character animations and social authentication.

## Project Overview

- **Frontend**: React 19 (Vite) with Vanilla CSS.
- **Backend/Serverless**: Cloudflare Workers for API logic.
- **Database & Auth**: Supabase (Authentication, PostgreSQL Database, Storage).
- **Data Store**: Cloudflare KV for storing letter data.
- **Character**: "Dalaemi" (달램이), whose images and animations change based on user interaction (e.g., hiding eyes when typing a password).

### Key Features

- **Interactive Login**: Dalaemi reacts to user input (focus, typing) with different animations.
- **Authentication**:
  - Email/Password signup and login.
  - Social Logins: Google, Naver, Kakao (OAUTH).
  - Profile synchronization: Automatic creation/update of user profiles in Supabase upon login.
- **Random Letters**: A Cloudflare Worker fetches random supportive messages from Cloudflare KV.

## Project Structure

- `frontend/`: The React application.
  - `src/components/`: UI components (Login, SignupModal, SpeechBubble).
  - `src/lib/supabase.js`: Supabase client configuration.
- `wrangler.toml`: Cloudflare Workers configuration.
- `test.js`: Main logic for the Cloudflare Worker.
- `plan.md`: Detailed development log and historical requirements.

## Building and Running

### Frontend

1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Set up environment variables in `.env` (refer to `supabase.js` for required keys):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run development server: `npm run dev`
5. Build for production: `npm run build`

### Cloudflare Worker

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Deploy: `wrangler deploy`

## Development Conventions

- **Styling**: Prefer Vanilla CSS for component-specific styling (e.g., `Login.css`).
- **Animations**: CSS transitions and transforms are used for character movement and UI state changes.
- **State Management**: React's `useState` and `useEffect` are primarily used for managing UI state and authentication events.
- **Authentication**: Use `supabase.auth.onAuthStateChange` to handle login/logout events and synchronize with the database.
- **Images**: Character assets are hosted on Supabase Storage and fetched via the `getImageUrl` helper in `supabase.js`.

## TODO / Future Work

- [ ] Implement password recovery functionality.
- [ ] Connect the "I get it!" (알겠다람!) button in the post-login popup.
- [ ] Expand the letter database in Cloudflare KV.
- [ ] Integrate full letter-reading UI after successful login.
