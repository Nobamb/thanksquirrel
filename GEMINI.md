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



## 데이터 구조

① profiles 테이블 (사용자 및 출석 관리)
id (uuid): Supabase Auth와 연동하기 위해 uuid 타입을 권장합니다. (기본키)
email (text): 사용자의 이메일 주소입니다. (Unique 제약 조건 추가 필수)
last_check_in_at (timestamptz): 가장 마지막으로 출석체크를 한 시간입니다. 이 컬럼이 있어야 "오늘 이미 편지를 받았는지"를 로직으로 체크할 수 있습니다.
created_at (timestamptz): 가입 일자입니다. (기본값: now())
nickname (text): 다람이가 사용자를 부를 때 이메일 주소보다는 별명으로 부르는 것이 서비스 컨셉(따뜻한 위로)에 더 잘 어울립니다.(기본값은 이메일)
is_active (boolean): 혹시 모를 계정 상태 관리용으로 넣어두면 유용합니다.
hobby(text) : 취미
specility(text) : 특기
gender : 성별(기본값 비밀)
mbti : mbti값(기본 infp)
② all_letter json (500개의 덕담 json 데이터, workers kv에 저장)
id (int): 편지의 고유 번호입니다. (1~500)
message (text): 다람이가 전해줄 따뜻한 문장 내용입니다.
③ user_letters 테이블 (사용자별 편지 보관함)
id (bigint): 보관 내역 고유 번호입니다.
user_id (uuid): 어느 유저의 편지인지 나타냅니다. (profiles.id 참조)
letter_id (bigint): 어떤 편지를 받았는지 나타냅니다. (letters.id 참조)
created_at (timestamptz): 편지를 받은 날짜와 시간입니다.




## 달램이 대사

### 달램이의 대사는 되도록 변경 x

### 전체적인 웹사이트의 분위기는 딱딱한 말투는 지향하고 따뜻하고 친근한 말투를 사용합니다.

로그인창에서: 
다람다람! 용기를 내어 와 주셔서 감사합니다람!

몸을 클릭하거나 드래그할 때 : 
다람다람! 너무 간지럽습니다람!

회원가입을 할 때: 
다람다람! 처음이라 쉽지 않을텐데 용기내서 우리 동네 와주셔서 정말 감사합니다람!
수고 많으셨을텐데 우선 우리 동네에서 푹 쉬고 있어주시면 좋겠습니다람!

로그인을 할 때: 
다람다람! 우리 동네 사람이었다람!
편히 쉬시면 좋겠습니다람!

달램이의 몸을 간지럽힐 때 : 
다람다람! 너무 간지럽습니다람!

달램이가 나비랑 놀게 될 때:
다람다람! 나비님! 언제나 참 아름답습니다람!

나비가 떠나갈 때:
다람다람! 나비님! 자주 찾아와주셔서 감사합니다람!

달램이가 노래를 부를 때:
다람다람!
기분이 좋아서 노래 한곡 부르겠습니다람!

달램이가 노래를 부를 때 상호작용시:
다람다람! 나는 이 동네 최고의 가수입니다람!

달램이가 도토리를 먹을 시:
다람다람! 도토리는 정말 맛있습니다람!

달램이가 도토리를 뺏길 시:
다람다람! 도토리 돌려주시면 좋겠습니다람!

5초 이상 뺏기고 돌려주지 않을 시: 
다람다람… 힝… 아쉽습니다람…

회원탈퇴시:
힝… 탈퇴하시면 내 마음이 너무 슬픕니다람… 제발 탈퇴하지 마시고 같이 즐겁게 놀아주었으면 좋겠습니다람…

편지가 오게 되면:
다람다람! 늘 감사합니다람! 소중한 사람에게 온 편지가 왔습니다람! 한번 읽어보면 좋겠습니다람!


머리 드래그 시: 
다람다람! 머리를 쓰다듬어 주셔서 기분이 좋습니다람!




## 달램이 사진 데이터(확장자명)

### 기본적으로 달램이 이미지들은 supabase storage에 thanksquirrel-image 폴더에 저장

background.webp(배경화면)
character-hello.webp(반겨주는 이미지)
character-secret.webp(눈을 가리는 이미지)
character-web.webp(기본 이미지)
character-enjoy.webp(나비랑 노는 이미지)
character-enjoy2.webp(나비에게 작별인사하는 이미지)
character-happy.webp(행복해하는 이미지)
character-sad.webp(슬퍼하는 이미지)
character-sad2.webp(시무룩해하는 이미지)
character-sing1.webp(노래하는 이미지1)
character-sing2.webp(노래하는 이미지2)
character-tickle.webp(간지러워하는 이미지)
character-web-eat.webp(도토리를 먹는 이미지1)
character-web-eat2.webp(도토리를 먹는 이미지2)
character-web.webp(기본 달램이 이미지)



## 로고/파비콘 사진 데이터

### 기본적으로 로고/파비콘 이미지들은 supabase storage에 thanksquirrel-webpage-image 폴더에 저장

logo.png(로고 이미지)
favicon.webp(파비콘 이미지)
character-icon.png(프로필 아이콘 이미지)

