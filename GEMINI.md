# ThankSquirrel (늘감사합니다람)

A web application where users can receive warm, supportive "letters" from a friendly squirrel character named "Dalaemi" (달램이). The project features a highly interactive login/signup experience with character animations and social authentication.
사용자가 친근한 다람쥐 캐릭터 "달램이"로부터 따뜻하고 위로가 되는 "편지"를 받을 수 있는 웹 애플리케이션입니다. 이 프로젝트는 캐릭터 애니메이션과 소셜 로그인이 포함된 매우 인터랙티브한 로그인/회원가입 경험을 제공합니다.

*Note: "thanksquirrel" can be literally translated as "늘감사합니다람" (Always thank you, squirrel).*
*참고: "thanksquirrel"의 직역은 "늘감사합니다람" 입니다.*

## Project Overview (프로젝트 개요)

- **Frontend (프론트엔드)**: React 19 (Vite) with Vanilla CSS.
- **Backend/Serverless (백엔드/서버리스)**: Cloudflare Workers for API logic (API 로직 처리).
- **Database & Auth (데이터베이스 및 인증)**: Supabase (Authentication, PostgreSQL Database, Storage).
- **Data Store (데이터 저장소)**: Cloudflare KV for storing letter data (편지 데이터 저장).
- **Character (캐릭터)**: "Dalaemi" (달램이), whose images and animations change based on user interaction (e.g., hiding eyes when typing a password). 사용자 상호작용(예: 비밀번호 입력 시 눈 가리기)에 따라 이미지와 애니메이션이 변합니다.

### Key Features (주요 기능)

- **Interactive Login (인터랙티브 로그인)**: Dalaemi reacts to user input (focus, typing) with different animations. 달램이가 사용자 입력(포커스, 타이핑)에 반응하여 다양한 애니메이션을 보여줍니다.
- **Authentication (인증)**:
  - Email/Password signup and login. 이메일/비밀번호 회원가입 및 로그인.
  - Social Logins: Google, Naver, Kakao (OAUTH). 소셜 로그인: 구글, 네이버, 카카오.
  - Profile synchronization: Automatic creation/update of user profiles in Supabase upon login. 프로필 동기화: 로그인 시 Supabase에 사용자 프로필 자동 생성 및 업데이트.
- **Random Letters (랜덤 편지)**: A Cloudflare Worker fetches random supportive messages from Cloudflare KV. Cloudflare Worker가 Cloudflare KV에서 랜덤으로 위로의 메시지를 가져옵니다.

## Project Structure (프로젝트 구조)

- `frontend/`: The React application. React 애플리케이션.
  - `src/components/`: UI components (Login, SignupModal, SpeechBubble). UI 컴포넌트.
  - `src/lib/supabase.js`: Supabase client configuration. Supabase 클라이언트 설정.
- `wrangler.toml`: Cloudflare Workers configuration. Cloudflare Workers 설정 파일.
- `test.js`: Main logic for the Cloudflare Worker. Cloudflare Worker의 메인 로직.
- `plan.md`: Detailed development log and historical requirements. 상세 개발 일지 및 요구사항 히스토리.

## Building and Running (빌드 및 실행)

### Frontend (프론트엔드)

1. Navigate to the `frontend` directory: `cd frontend` (frontend 디렉토리로 이동)
2. Install dependencies: `npm install` (의존성 설치)
3. Set up environment variables in `.env` (refer to `supabase.js` for required keys) (환경변수 설정):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run development server: `npm run dev` (개발 서버 실행)
5. Build for production: `npm run build` (프로덕션 빌드)

### Cloudflare Worker

1. Install Wrangler: `npm install -g wrangler` (Wrangler 설치)
2. Authenticate: `wrangler login` (인증)
3. Deploy: `wrangler deploy` (배포)

## Development Conventions (개발 규칙)

- **Styling (스타일링)**: Prefer Vanilla CSS for component-specific styling (e.g., `Login.css`). 컴포넌트별 스타일링에 Vanilla CSS 사용을 권장합니다.
- **Animations (애니메이션)**: CSS transitions and transforms are used for character movement and UI state changes. 캐릭터 움직임과 UI 상태 변화에 CSS transition과 transform을 사용합니다.
- **State Management (상태 관리)**: React's `useState` and `useEffect` are primarily used for managing UI state and authentication events. UI 상태 및 인증 이벤트 관리에 주로 React의 useState와 useEffect를 사용합니다.
- **Authentication (인증)**: Use `supabase.auth.onAuthStateChange` to handle login/logout events and synchronize with the database. 로그인/로그아웃 이벤트를 처리하고 데이터베이스와 동기화하기 위해 supabase.auth.onAuthStateChange를 사용합니다.
- **Images (이미지)**: Character assets are hosted on Supabase Storage and fetched via the `getImageUrl` helper in `supabase.js`. 캐릭터 에셋은 Supabase Storage에 호스팅되며 supabase.js의 getImageUrl 헬퍼 함수를 통해 가져옵니다.

## TODO / Future Work (향후 과제)

- [ ] Implement password recovery functionality. 비밀번호 찾기 기능 구현.
- [ ] Connect the "I get it!" (알겠다람!) button in the post-login popup. 로그인 후 팝업의 "알겠다람!" 버튼 기능 연결.
- [ ] Expand the letter database in Cloudflare KV. Cloudflare KV의 편지 데이터베이스 확장.
- [ ] Integrate full letter-reading UI after successful login. 로그인 성공 후 전체 편지 읽기 UI 통합.
