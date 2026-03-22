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

  const handleFocus = () => {
    setSquirrelState('peeking');
  };

  const handleBlur = () => {
    if (email || password) {
        // 값이 남아있어도 일단 인사를 하거나, 아니면 상태를 유지할 수 있음
        // 기획상 인풋 바깥을 클릭하면 다시 인사하는 모습으로 돌아옵니다.
    }
    setSquirrelState('greeting');
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
    <div className="login-container">
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
                onFocus={handleFocus}
                onBlur={handleBlur}
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
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="비밀번호를 입력해주세요"
                required
              />
            </div>
            
            <button type="submit" disabled={loading} className="login-button">
              {loading ? '로딩 중...' : '로그인'}
            </button>
          </form>
          
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
