import { useState, useEffect, useRef } from 'react';
import { supabase, getImageUrl } from '../lib/supabase';
import SpeechBubble from './SpeechBubble';
import SignupModal from './SignupModal';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const authProcessedRef = useRef(false);
  
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  
  // 성공 상태 관리: null | 'login' | 'signup'
  const [isSuccess, setIsSuccess] = useState(null);
  // 로그인 창 퇴장 애니메이션 상태 관리
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // URL Hash에 에러가 있는지 확인 (OAuth 실패 시)
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorDesc = hashParams.get('error_description') || hashParams.get('error');
    if (errorDesc) {
      setError(`OAuth 에러: ${decodeURIComponent(errorDesc).replace(/\+/g, ' ')}`);
      // URL에서 에러 파라미터 제거
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    // 렌더링 후 약간의 딜레이를 두고 달램이가 올라오도록 설정
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    // Google OAuth 콜백 감지: 로그인/가입 완료 시 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session || event === 'SIGNED_OUT') {
          authProcessedRef.current = false;
          return;
        }

        // INITIAL_SESSION: 이미 로그인되어 있는 상태로 페이지 로드
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
          if (authProcessedRef.current) return;
          authProcessedRef.current = true;

          const user = session.user;
          const sessionKey = `auth_processed_${user.id}`;
          const processedType = sessionStorage.getItem(sessionKey);
          
          // 이미 현재 세션에서 애니메이션을 본 경우 건너뛰고 성공 화면 띄우기 (무한 렌더 루프 및 리로드 반복 방지)
          if (processedType === 'login' || processedType === 'signup') {
            setIsReady(true);
            setIsSuccess(processedType);
            return;
          }

          const provider = user.app_metadata?.provider || 'unknown';

          console.log(`Auth State Change [${event}] - User:`, user);

          // 이메일 비밀번호 로그인(SignupModal 포함)은 별도의 흐름이 있으므로 생략,
          // 하지만 외부 OAuth나 INITIAL_SESSION이면 DB 확인 및 삽입 수행
          if (provider !== 'email' || event === 'INITIAL_SESSION') {
            const { data: existingData } = await supabase
              .from('profiles').select('user_id').eq('user_id', user.id).limit(1);
              
            const existing = existingData && existingData.length > 0 ? existingData[0] : null;

            // 만약 profile에 데이터가 없다면 무조건 새로 생성
            if (!existing) {
              if (provider === 'email') {
                // 이메일 유저는 여기서 프로필을 자동 생성하지 않음 (SignupModal에서 생성).
                // 데이터베이스(profiles)에 해당 유저가 없는데 로그인이 유지(session 존재)되어 있다면
                // 관리자 페이지 등에서 유저를 임의로 삭제한 경우이므로 강제 로그아웃 처리
                await supabase.auth.signOut();
                authProcessedRef.current = false;
                return;
              }

              const meta = user.user_metadata ?? {};
              const nestedData = meta.response ?? meta.custom_claims ?? meta;
              const emailStr = user.email || nestedData.account_email || nestedData.email || '';
              const nickname = nestedData.profile_nickname ?? nestedData.nickname ?? nestedData.name ?? emailStr.split('@')[0] ?? '기본_닉네임';
              const gender = nestedData.gender ?? '비밀';
              const avatar_url = nestedData.profile_image ?? nestedData.profile_image_url ?? nestedData.avatar_url ?? null;

              const { error: insertError } = await supabase.from('profiles').insert([{
                user_id: user.id,
                email: emailStr,
                nickname,
                gender,
                avatar_url,
                mbti: 'infp',
                hobby: '',
                specialty: '',
                created_at: new Date().toISOString(),
                last_check_in_at: new Date().toISOString(),
                is_active: true,
              }]);
              
              if (insertError) {
                console.error('Profile insert error:', insertError);
              }
              sessionStorage.setItem(`auth_processed_${user.id}`, 'signup');
              triggerSuccess('signup');
            } else {
              // 기존 유저는 업데이트
              const { error: updateError } = await supabase.from('profiles')
                .update({ last_check_in_at: new Date().toISOString() })
                .eq('user_id', user.id);
                
              if (updateError) {
                console.error('Profile update error:', updateError);
              }
              sessionStorage.setItem(`auth_processed_${user.id}`, 'login');
              triggerSuccess('login');
            }
          }
        }
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      authProcessedRef.current = false; // 리액트 Unmount시 상태 초기화(에러 방지용)
    };
  }, []);

  // 상태 판별: 처음엔 hidden, 이후 조건 시 peeking, 아니면 greeting
  const squirrelState = !isReady ? 'hidden' 
    : (isSignupModalOpen || isFocused || email.length > 0 || password.length > 0) ? 'peeking' 
    : 'greeting';

  // 성공 시 0.5초 퇴장 애니메이션 후 상태 변경
  const triggerSuccess = (type) => {
    setIsExiting(true);
    setTimeout(() => {
      setIsSuccess(type);
      setIsExiting(false);
    }, 500);
  };

  // 카카오 로그인 핸들러
  const handleKakaoLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'login',
        },
      },
    });
    if (error) setError('카카오 로그인 중 오류가 발생했습니다.');
  };

  // 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'login select_account',
        },
      },
    });
    if (error) setError('구글 로그인 중 오류가 발생했습니다.');
  };

  // 네이버 로그인 핸들러
  const handleNaverLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'custom:naver',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          auth_type: 'reauthenticate',
        },
      },
    });
    if (error) setError('네이버 로그인 중 오류가 발생했습니다.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // 기본 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('이메일 인증이 필요합니다. 메일함을 확인해주세요.');
      } else if (error.message.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError(error.message);
      }
    } else {
      console.log('Logged in!', data);
      if (data?.session?.user?.id) {
        sessionStorage.setItem(`auth_processed_${data.session.user.id}`, 'login');
      }
      triggerSuccess('login');
    }
    setLoading(false);
  };

  const getImageName = () => {
    switch(squirrelState) {
      case 'peeking': return 'character-secret.webp';
      case 'greeting': return 'character-hello.webp';
      case 'hidden': return 'character-web.webp';
      default: return 'character-hello.webp';
    }
  };

  const getDialogue = () => {
    if (squirrelState === 'peeking') return "다람다람! 안보고있을거니 걱정안하셔도 됩니다람!";
    return "다람다람! 누구신지 알려주시면 감사하겠습니다람!";
  };

  const getSuccessDialogue = () => {
    if (isSuccess === 'login') return "다람다람! 우리 동네 사람이었다람!\n편히 쉬시면 좋겠습니다람!";
    if (isSuccess === 'signup') return "다람다람! 처음이라 쉽지 않을텐데 용기내서 우리 동네 와주셔서 정말 감사합니다람!\n수고 많으셨을텐데 우선 우리 동네에서 푹 쉬고 있어주시면 좋겠습니다람!";
    return "";
  };

  return (
    <>
      <div 
        className="login-container"
        style={{ backgroundImage: `url(${getImageUrl('background.webp')})` }}
      >
        {isSuccess ? (
          <div className="success-screen">
            <div className="success-bubble-wrapper">
              <SpeechBubble 
                text={getSuccessDialogue()} 
                isVisible={true} 
                variant="large"
                className="large"
                showButton={true}
                onButtonClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session?.user?.id) {
                    sessionStorage.removeItem(`auth_processed_${session.user.id}`);
                  }
                  await supabase.auth.signOut();
                  // 세션을 비우고 초기 로그인 화면으로 돌아가기 (테스트용)
                  setIsSuccess(null);
                  setIsReady(false);
                  setTimeout(() => setIsReady(true), 100);
                }}
              />
            </div>
            <img 
              src={getImageUrl('character-hello.webp')} 
              alt="달램이 환영" 
              className="squirrel-img success-anim" 
            />
          </div>
        ) : (
          <div className={`login-box ${isExiting ? 'slide-out-down' : ''}`}>
            <div className="squirrel-container">
              <div style={{
                position: 'absolute',
                top: '-75px', 
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20
              }}>
                <SpeechBubble text={getDialogue()} isVisible={isReady && !isExiting} />
              </div>
              <img 
                src={getImageUrl(getImageName())} 
                alt="달램이" 
                className={`squirrel-img ${squirrelState}`} 
              />
            </div>
            <div className="form-container">
              <h2>환영합니다!</h2>
              <p className="subtitle">늘감사합니다람</p>
              
              <form onSubmit={handleSubmit} className="login-form">
                {error && <div className="error-message">{error}</div>}
                
                <div className="input-group">
                  <label htmlFor="email">이메일</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="이메일을 입력해주세요"
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="password">비밀번호</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="비밀번호를 입력해주세요"
                    required
                  />
                </div>
                
                <button type="submit" disabled={loading} className="login-button">
                  {loading ? '로딩 중...' : '로그인'}
                </button>
              </form>

              <div className="extra-links">
                <button type="button" className="text-link">비밀번호 찾기</button>
                <span className="divider">|</span>
                <button type="button" className="text-link" onClick={() => setIsSignupModalOpen(true)}>회원가입</button>
              </div>
              
              <div className="sns-login">
                <p>간편 로그인</p>
                <div className="sns-buttons">
                  <button className="sns-btn kakao" onClick={handleKakaoLogin} type="button">카카오</button>
                  <button className="sns-btn naver" onClick={handleNaverLogin}>네이버</button>
                  <button className="sns-btn google" onClick={handleGoogleLogin}>구글</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 회원가입 모달 */}
      {!isSuccess && !isExiting && (
        <SignupModal 
          isOpen={isSignupModalOpen}
          onClose={() => setIsSignupModalOpen(false)}
          onSuccess={(type) => {
            setIsSignupModalOpen(false);
            triggerSuccess(type); // 'signup' 파라미터 전달
          }}
        />
      )}
    </>
  );
}
