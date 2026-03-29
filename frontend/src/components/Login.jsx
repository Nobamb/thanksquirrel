import { useEffect, useRef, useState } from 'react';
import { supabase, getImageUrl } from '../lib/supabase';
import { clearPendingAuthFlow, getPendingAuthFlow, setPendingAuthFlow } from '../lib/authFlow';
import { prepareDailyLetter } from '../lib/dailyLetter';
import AuthenticatedHome from './AuthenticatedHome';
import DailyLetterSequence from './DailyLetterSequence';
import SpeechBubble from './SpeechBubble';
import PasswordResetModal from './PasswordResetModal';
import SignupModal from './SignupModal';
import './Login.css';

const buildEmailSignupProfile = (user) => {
  const metadata = user.user_metadata ?? {};

  if (metadata.signup_provider !== 'email') {
    return null;
  }

  return {
    email: (user.email ?? '').toLowerCase(),
    nickname: metadata.nickname ?? user.email?.split('@')[0] ?? '기본_별명',
    gender: metadata.gender ?? 'secret',
    mbti: metadata.mbti ?? 'infp',
    hobby: metadata.hobby ?? '',
    specialty: metadata.specialty ?? '',
    avatar_url: null,
  };
};

const buildOAuthProfile = (user) => {
  const metadata = user.user_metadata ?? {};
  const nestedData = metadata.response ?? metadata.custom_claims ?? metadata;
  const email = user.email || nestedData.account_email || nestedData.email || '';

  return {
    email: email.toLowerCase(),
    nickname:
      nestedData.profile_nickname ??
      nestedData.nickname ??
      nestedData.name ??
      email.split('@')[0] ??
      '기본_별명',
    gender: nestedData.gender ?? 'secret',
    mbti: 'infp',
    hobby: '',
    specialty: '',
    avatar_url: nestedData.profile_image ?? nestedData.profile_image_url ?? nestedData.avatar_url ?? null,
  };
};

async function insertProfile(user, profile) {
  const now = new Date().toISOString();

  return supabase.from('profiles').insert([
    {
      user_id: user.id,
      email: profile.email,
      nickname: profile.nickname,
      gender: profile.gender,
      mbti: profile.mbti,
      hobby: profile.hobby,
      specialty: profile.specialty,
      avatar_url: profile.avatar_url,
      created_at: now,
      is_active: true,
    },
  ]);
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, nickname, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Profile fetch error:', error);
    return null;
  }

  return data;
}

async function fetchProfileWithRetry(userId, attempts = 4, delayMs = 250) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const profile = await fetchProfile(userId);

    if (profile?.user_id) {
      return profile;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }
  }

  return null;
}

function isDuplicateProfileError(error) {
  return error?.code === '23505';
}

function getDailyLetterErrorMessage(error) {
  switch (error?.code) {
    case 'missing_letters_api_url':
      return '편지 API 주소가 설정되지 않았어요. VITE_LETTERS_API_URL 값을 확인해 주세요.';
    case 'letters_api_failed':
      return '편지 데이터를 불러오지 못했어요. Cloudflare Worker 상태를 확인해 주세요.';
    case 'letters_payload_empty':
      return '편지 데이터가 비어 있어요. Worker KV 데이터를 확인해 주세요.';
    case 'missing_profile_id':
      return '편지를 준비할 프로필 정보를 찾지 못했어요.';
    default:
      return '오늘의 편지를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

export default function Login() {
  const initialHashParams = new URLSearchParams(window.location.hash.slice(1));
  const initialRecoveryMode = initialHashParams.get('type') === 'recovery';
  const hasAuthTokensInHash =
    initialHashParams.has('access_token') || initialHashParams.has('refresh_token');
  const initialErrorDescription =
    initialHashParams.get('error_description') || initialHashParams.get('error');
  const initialError = initialErrorDescription
    ? `OAuth 오류: ${decodeURIComponent(initialErrorDescription).replace(/\+/g, ' ')}`
    : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(initialRecoveryMode);
  const [passwordResetMode, setPasswordResetMode] = useState(initialRecoveryMode ? 'update' : 'request');
  const [isSuccess, setIsSuccess] = useState(null);
  const [isSuccessLeaving, setIsSuccessLeaving] = useState(false);
  const [appStage, setAppStage] = useState('auth');
  const [profile, setProfile] = useState(null);
  const [dailyLetter, setDailyLetter] = useState(null);
  const [dailyLetterStatus, setDailyLetterStatus] = useState('idle');
  const [dailyLetterError, setDailyLetterError] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const authProcessedRef = useRef(false);
  const recoveryFlowRef = useRef(initialRecoveryMode);
  const dailyLetterPromiseRef = useRef(null);
  const activeProfileIdRef = useRef(null);

  const resetDailyLetterState = () => {
    dailyLetterPromiseRef.current = null;
    activeProfileIdRef.current = null;
    setDailyLetter(null);
    setDailyLetterStatus('idle');
    setDailyLetterError('');
  };

  const beginDailyLetterPreparation = (profileId) => {
    activeProfileIdRef.current = profileId;
    setDailyLetter(null);
    setDailyLetterError('');
    setDailyLetterStatus('loading');

    const promise = prepareDailyLetter(profileId)
      .then((result) => {
        setDailyLetter(result.letter ?? null);
        setDailyLetterStatus(result.status);
        return result;
      })
      .catch((letterError) => {
        console.error('Daily letter preparation error:', letterError);
        setDailyLetter(null);
        setDailyLetterStatus('error');
        setDailyLetterError(getDailyLetterErrorMessage(letterError));
        return {
          status: 'error',
          letter: null,
          error: letterError,
        };
      });

    dailyLetterPromiseRef.current = promise;
    return promise;
  };

  const showSuccessStage = (type) => {
    setLoading(false);
    setError(null);
    setIsSuccessLeaving(false);
    setIsExiting(true);

    window.setTimeout(() => {
      setIsSuccess(type);
      setIsExiting(false);
    }, 500);
  };

  useEffect(() => {
    if (initialErrorDescription) {
      clearPendingAuthFlow();
      window.history.replaceState(null, '', window.location.pathname);
    }

    const timer = window.setTimeout(() => {
      setIsReady(true);
    }, 500);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        authProcessedRef.current = false;
        recoveryFlowRef.current = false;
        resetDailyLetterState();
        clearPendingAuthFlow();
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        recoveryFlowRef.current = true;
        authProcessedRef.current = false;
        setPasswordResetMode('update');
        setIsPasswordResetModalOpen(true);
        return;
      }

      if (!['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event)) {
        return;
      }

      if (recoveryFlowRef.current || authProcessedRef.current) {
        return;
      }

      authProcessedRef.current = true;

      const user = session.user;
      const pendingAuthFlow = getPendingAuthFlow();
      const isFreshAuth = Boolean(pendingAuthFlow || hasAuthTokensInHash);

      if (!isFreshAuth) {
        await supabase.auth.signOut();
        setProfile(null);
        resetDailyLetterState();
        setAppStage('auth');
        setIsSuccess(null);
        authProcessedRef.current = false;
        return;
      }

      const provider = user.app_metadata?.provider || 'unknown';
      const { data: existingProfile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileLookupError) {
        console.error('Profile lookup error:', profileLookupError);
        authProcessedRef.current = false;
        clearPendingAuthFlow();
        setLoading(false);
        setError('로그인 정보를 확인하는 중 문제가 발생했어요. 다시 시도해 주세요.');
        return;
      }

      let successType = 'login';

      if (!existingProfile) {
        let profileToInsert = null;

        if (provider === 'email') {
          profileToInsert = buildEmailSignupProfile(user);

          if (!user.email_confirmed_at || !profileToInsert) {
            clearPendingAuthFlow();
            await supabase.auth.signOut();
            authProcessedRef.current = false;
            return;
          }
        } else {
          profileToInsert = buildOAuthProfile(user);
        }

        const { error: insertError } = await insertProfile(user, profileToInsert);

        if (insertError && !isDuplicateProfileError(insertError)) {
          console.error('Profile insert error:', insertError);
          clearPendingAuthFlow();
          setLoading(false);
          setError('로그인 처리 중 문제가 발생했어요. 다시 로그인해 주세요.');
          await supabase.auth.signOut();
          authProcessedRef.current = false;
          return;
        }

        successType = 'signup';
      } else if (pendingAuthFlow === 'signup') {
        successType = 'signup';
      }

      if (user.email) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: user.email.toLowerCase(),
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
        }
      }

      const fetchedProfile = await fetchProfileWithRetry(user.id);
      if (!fetchedProfile?.user_id) {
        authProcessedRef.current = false;
        clearPendingAuthFlow();
        setLoading(false);
        setError('프로필 정보를 불러오지 못했어요. 다시 로그인해 주세요.');
        return;
      }

      setProfile(fetchedProfile);
      window.history.replaceState(null, '', window.location.pathname);
      clearPendingAuthFlow();
      beginDailyLetterPreparation(fetchedProfile.user_id);
      setAppStage('auth');
      showSuccessStage(successType);
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      authProcessedRef.current = false;
    };
  }, [hasAuthTokensInHash, initialErrorDescription]);

  const squirrelState = !isReady
    ? 'hidden'
    : (isSignupModalOpen || isPasswordResetModalOpen || isFocused || email.length > 0 || password.length > 0)
      ? 'peeking'
      : 'greeting';

  const handleKakaoLogin = async () => {
    setError(null);
    setPendingAuthFlow('oauth');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'login',
        },
      },
    });

    if (oauthError) {
      clearPendingAuthFlow();
      setError('카카오 로그인 중 오류가 발생했어요.');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setPendingAuthFlow('oauth');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'login select_account',
        },
      },
    });

    if (oauthError) {
      clearPendingAuthFlow();
      setError('구글 로그인 중 오류가 발생했어요.');
    }
  };

  const handleNaverLogin = async () => {
    setError(null);
    setPendingAuthFlow('oauth');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'custom:naver',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          auth_type: 'reauthenticate',
        },
      },
    });

    if (oauthError) {
      clearPendingAuthFlow();
      setError('네이버 로그인 중 오류가 발생했어요.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPendingAuthFlow('login');

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (loginError) {
      clearPendingAuthFlow();

      if (loginError.message.includes('Email not confirmed')) {
        setError('이메일 인증이 필요해요. 메일함에서 인증을 완료해 주세요.');
      } else if (loginError.message.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않아요.');
      } else {
        setError(loginError.message);
      }

      setLoading(false);
    }
  };

  const handlePasswordResetClose = async () => {
    if (passwordResetMode === 'update') {
      recoveryFlowRef.current = false;
      clearPendingAuthFlow();
      await supabase.auth.signOut();
    }

    setIsPasswordResetModalOpen(false);
    setPasswordResetMode('request');
  };

  const handlePasswordUpdated = async () => {
    recoveryFlowRef.current = false;
    setIsPasswordResetModalOpen(false);
    setLoading(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      const fetchedProfile = await fetchProfileWithRetry(session.user.id);

      if (fetchedProfile?.user_id) {
        setProfile(fetchedProfile);
        beginDailyLetterPreparation(fetchedProfile.user_id);
      } else {
        setDailyLetter(null);
        setDailyLetterStatus('error');
        setDailyLetterError('프로필 정보를 찾지 못해 편지를 준비할 수 없어요.');
      }
    }

    showSuccessStage('login');
  };

  const handleSuccessConfirm = async () => {
    if (dailyLetterStatus === 'error') {
      if (activeProfileIdRef.current) {
        beginDailyLetterPreparation(activeProfileIdRef.current);
      }
      return;
    }

    let nextStatus = dailyLetterStatus;
    let nextLetter = dailyLetter;

    if (dailyLetterStatus === 'loading' && dailyLetterPromiseRef.current) {
      const result = await dailyLetterPromiseRef.current;
      nextStatus = result?.status ?? 'error';
      nextLetter = result?.letter ?? null;
    }

    if (nextStatus === 'error') {
      return;
    }

    setIsSuccessLeaving(true);

    window.setTimeout(() => {
      setIsSuccess(null);
      setIsSuccessLeaving(false);

      if (nextStatus === 'ready' && nextLetter) {
        setAppStage('letter');
      } else {
        setAppStage('home');
      }
    }, 450);
  };

  const handleLetterSequenceComplete = () => {
    setDailyLetter(null);
    dailyLetterPromiseRef.current = null;
    setAppStage('home');
  };

  const getImageName = () => {
    switch (squirrelState) {
      case 'peeking':
        return 'character-secret.webp';
      case 'greeting':
        return 'character-hello.webp';
      case 'hidden':
        return 'character-web.webp';
      default:
        return 'character-hello.webp';
    }
  };

  const getDialogue = () => {
    if (squirrelState === 'peeking') {
      return '다람다람! 안 보고 있으니까 걱정하지 않아도 됩니다람!';
    }

    return '다람다람! 용기를 내어 와 주셔서 감사합니다람!';
  };

  const getBaseSuccessDialogue = () => {
    if (isSuccess === 'signup') {
      return '다람다람! 처음이라 쉽지 않을텐데 용기내서 우리 동네 와주셔서 정말 감사합니다람!\n수고 많으셨을텐데 우선 우리 동네에서 푹 쉬고 있어주시면 좋겠습니다람!';
    }

    return '다람다람! 우리 동네 사람이었다람!\n편히 쉬시면 좋겠습니다람!';
  };

  const getSuccessDialogue = () => {
    const baseDialogue = getBaseSuccessDialogue();

    switch (dailyLetterStatus) {
      case 'loading':
        return `${baseDialogue}\n\n오늘의 편지를 준비하고 있습니다람!`;
      case 'ready':
        return `${baseDialogue}\n\n다람다람! 늘 감사합니다람! 소중한 사람에게 온 편지가 왔습니다람! 한번 읽어보면 좋겠습니다람!`;
      case 'already_received':
        return `${baseDialogue}\n\n오늘 받은 편지는 이미 전달했습니다람! 홈으로 안내하겠습니다람!`;
      case 'error':
        return `${baseDialogue}\n\n${dailyLetterError}`;
      default:
        return baseDialogue;
    }
  };

  const getSuccessButtonText = () => {
    switch (dailyLetterStatus) {
      case 'loading':
        return '편지 준비 중...';
      case 'ready':
        return '편지 보기';
      case 'already_received':
        return '홈으로';
      case 'error':
        return '다시 시도';
      default:
        return '계속';
    }
  };

  return (
    <>
      {appStage === 'home' ? (
        <AuthenticatedHome profile={profile} />
      ) : appStage === 'letter' && dailyLetter ? (
        <DailyLetterSequence letter={dailyLetter} onComplete={handleLetterSequenceComplete} />
      ) : (
        <div
          className="login-container"
          style={{ backgroundImage: `url(${getImageUrl('background.webp')})` }}
        >
          {isSuccess ? (
            <div className="success-screen">
              <div className={`success-bubble-wrapper ${isSuccessLeaving ? 'is-leaving' : ''}`}>
                <SpeechBubble
                  text={getSuccessDialogue()}
                  isVisible
                  variant="large"
                  className="large"
                  showButton
                  buttonText={getSuccessButtonText()}
                  isButtonDisabled={dailyLetterStatus === 'loading'}
                  onButtonClick={handleSuccessConfirm}
                />
              </div>
              <img
                src={getImageUrl('character-hello.webp')}
                alt="달램이 캐릭터"
                className={`squirrel-img success-anim ${isSuccessLeaving ? 'is-leaving' : ''}`}
              />
            </div>
          ) : (
            <div className={`login-box ${isExiting ? 'slide-out-down' : ''}`}>
              <div className="squirrel-container">
                <div
                  style={{
                    position: 'absolute',
                    top: '-75px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                  }}
                >
                  <SpeechBubble text={getDialogue()} isVisible={isReady && !isExiting} />
                </div>
                <img
                  src={getImageUrl(getImageName())}
                  alt="달램이 캐릭터"
                  className={`squirrel-img ${squirrelState}`}
                />
              </div>

              <div className="form-container">
                <h2>환영합니다</h2>
                <p className="subtitle">thanksquirrel</p>

                <form onSubmit={handleSubmit} className="login-form">
                  {error && <div className="error-message">{error}</div>}

                  <div className="input-group">
                    <label htmlFor="email">이메일</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="이메일을 입력해 주세요"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="password">비밀번호</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="비밀번호를 입력해 주세요"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <button type="submit" disabled={loading} className="login-button">
                    {loading ? '로그인 중...' : '로그인'}
                  </button>
                </form>

                <div className="extra-links">
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setPasswordResetMode('request');
                      setIsPasswordResetModalOpen(true);
                    }}
                  >
                    비밀번호 찾기
                  </button>
                  <span className="divider">|</span>
                  <button type="button" className="text-link" onClick={() => setIsSignupModalOpen(true)}>
                    회원가입
                  </button>
                </div>

                <div className="sns-login">
                  <p>간편 로그인</p>
                  <div className="sns-buttons">
                    <button className="sns-btn kakao" onClick={handleKakaoLogin} type="button">카카오</button>
                    <button className="sns-btn naver" onClick={handleNaverLogin} type="button">네이버</button>
                    <button className="sns-btn google" onClick={handleGoogleLogin} type="button">구글</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isSuccess && !isExiting && appStage === 'auth' && (
        <>
          {isSignupModalOpen && (
            <SignupModal
              isOpen={isSignupModalOpen}
              onClose={() => setIsSignupModalOpen(false)}
            />
          )}
          {isPasswordResetModalOpen && (
            <PasswordResetModal
              key={`${passwordResetMode}-${email || 'blank'}`}
              isOpen={isPasswordResetModalOpen}
              mode={passwordResetMode}
              initialEmail={email}
              onClose={handlePasswordResetClose}
              onPasswordUpdated={handlePasswordUpdated}
            />
          )}
        </>
      )}
    </>
  );
}
