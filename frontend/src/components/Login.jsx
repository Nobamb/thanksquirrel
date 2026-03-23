import { useState, useEffect } from 'react';
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
  
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  
  // 성공 상태 관리: null | 'login' | 'signup'
  const [isSuccess, setIsSuccess] = useState(null);
  // 로그인 창 퇴장 애니메이션 상태 관리
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 렌더링 후 약간의 딜레이를 두고 달램이가 올라오도록 설정
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    // Google OAuth 콜백 감지: 로그인/가입 완료 시 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION: 이미 로그인되어 있는 상태로 페이지 로드
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
          const user = session.user;
          const provider = user.app_metadata?.provider;
          const providers = user.app_metadata?.providers || [];

          console.log(`Auth State Change [${event}] - User:`, user);

          // ─── 구글 로그인 처리 ───
          if (provider === 'google' || providers.includes('google')) {
            const { data: existing } = await supabase
              .from('profiles').select('user_id').eq('user_id', user.id).single();

            if (!existing) {
              const nickname = user.email?.split('@')[0] ?? '';
              const { error: insertError } = await supabase.from('profiles').insert([{
                user_id: user.id,
                nickname,
                gender: '비밀',
                mbti: 'infp',
                hobby: '',
                specialty: '',
                created_at: new Date().toISOString(),
                last_check_in_at: new Date().toISOString(),
                is_active: true,
              }]);
              if (insertError) console.error('Google profile insert error:', insertError);
              triggerSuccess('signup');
            } else {
              triggerSuccess('login');
            }
            return;
          }

          // ─── 네이버 로그인 처리 ───
          const isNaver = provider === 'custom:naver' || provider === 'naver' || provider === 'custom' || providers.some(p => p?.includes('naver'));
          
          if (isNaver) {
            const meta = user.user_metadata ?? {};
            // 네이버는 response 객체 안에 한 번 더 감싸질 수 있음 (OAuth 설정에 따라 다름)
            const naverData = meta.response ?? meta.custom_claims ?? meta;

            const emailStr = user.email || naverData.email || '';
            const nickname =
              naverData.nickname ??
              naverData.name ??
              emailStr.split('@')[0] ??
              'naver_user';
            const gender = naverData.gender ?? '비밀';
            const avatar_url = naverData.profile_image ?? naverData.profile_image_url ?? null;

            const { data: existing } = await supabase
              .from('profiles').select('user_id').eq('user_id', user.id).single();

            if (!existing) {
              // 신규 네이버 가입
              const { error: insertError } = await supabase.from('profiles').insert([{
                user_id: user.id,
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
              if (insertError) console.error('Naver profile insert error:', insertError);
              triggerSuccess('signup');
            } else {
              // 기존 네이버 유저 — last_check_in_at 업데이트
              const { error: updateError } = await supabase.from('profiles')
                .update({ last_check_in_at: new Date().toISOString() })
                .eq('user_id', user.id);
              if (updateError) console.error('Naver profile update error:', updateError);
              triggerSuccess('login');
            }
            return;
          }
          
          // ─── 일반 이메일 혹은 인식되지 않은 다른 로그인 폴백 ───
          if (provider !== 'email' || event === 'INITIAL_SESSION') {
             if (provider !== 'email') console.warn('Fallback: Unhandled provider detected:', provider, user);
             // 이미 로그인된 상태이거나, 기타 제공자라면 무조건 로비/성공창으로 전환
             triggerSuccess('login');
          }
        }
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
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

  // 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
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
                  <button className="sns-btn kakao">카카오</button>
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
