import { useState, useEffect } from 'react';
import { supabase, getImageUrl } from '../lib/supabase';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 상태: hidden (처음 숨음) -> greeting (인사) -> peeking (눈가림)
  const [squirrelState, setSquirrelState] = useState('hidden'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 렌더링 후 약간의 딜레이를 두고 달램이가 올라오도록 설정
    const timer = setTimeout(() => {
      setSquirrelState('greeting');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 입력값에 따른 다람쥐 상태 변경 (입력창에 값이 있으면 눈 가림, 비어있으면 인사)
  useEffect(() => {
    if (squirrelState === 'hidden') return;
    
    if (email.length > 0 || password.length > 0) {
      setSquirrelState('peeking');
    } else {
      setSquirrelState('greeting');
    }
  }, [email, password]);

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
      setError(error.message);
    } else {
      console.log('Logged in!', data);
      alert('로그인에 성공했습니다!');
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

  return (
    <div 
      className="login-container"
      style={{ backgroundImage: `url(${getImageUrl('background.webp')})` }}
    >
      <div className="login-box">
        <div className="squirrel-container">
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
            <button type="button" className="text-link">회원가입</button>
          </div>
          
          <div className="sns-login">
            <p>간편 로그인 (준비 중)</p>
            <div className="sns-buttons">
              <button className="sns-btn kakao">카카오</button>
              <button className="sns-btn naver">네이버</button>
              <button className="sns-btn google">구글</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
