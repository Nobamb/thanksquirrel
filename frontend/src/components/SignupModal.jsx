import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './SignupModal.css';

const MBTI_OPTIONS = [
  'istj', 'isfj', 'infj', 'intj',
  'istp', 'isfp', 'infp', 'intp',
  'estp', 'esfp', 'enfp', 'entp',
  'estj', 'esfj', 'enfj', 'entj'
];

export default function SignupModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    gender: 'secret',
    mbti: 'infp',
    hobby: '',
    specialty: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isNicknameManuallyEdited, setIsNicknameManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '', password: '', passwordConfirm: '', nickname: '', 
        gender: 'secret', mbti: 'infp', hobby: '', specialty: ''
      });
      setErrors({});
      setIsNicknameManuallyEdited(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validatePassword = (pw) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()[\]{}<>?,./~+\-_=|\\]).{8,}$/;
    return passwordRegex.test(pw);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const nextData = { ...prev, [name]: value };
      
      if (name === 'email' && !isNicknameManuallyEdited) {
        nextData.nickname = value.split('@')[0] || '';
      }
      return nextData;
    });

    if (name === 'nickname') {
      setIsNicknameManuallyEdited(true);
    }

    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = '이메일을 입력해주세요.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '올바른 이메일 형식이 아닙니다.';
    
    if (!validatePassword(formData.password)) {
      newErrors.password = '비밀번호는 문구, 숫자, 특수문자 조합 8자 이상이어야 합니다.';
    }
    
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
    }
    
    if (!formData.nickname) newErrors.nickname = '별명을 입력해주세요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);

    // 1. Supabase Auth Signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password
    });

    if (authError) {
      setSubmitError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const now = new Date().toISOString();
      // 2. Insert into profiles with created_at, last_check_in_at, is_active
      const { error: dbError } = await supabase.from('profiles').insert([
        {
          user_id: authData.user.id,
          nickname: formData.nickname,
          gender: formData.gender,
          mbti: formData.mbti,
          hobby: formData.hobby,
          specialty: formData.specialty,
          created_at: now,
          last_check_in_at: now,
          is_active: true
        }
      ]);

      if (dbError) {
        console.error('Profile Insert Error:', dbError);
      }

      alert('달램이와 함께하게 된 것을 환영합니다! 🎉');
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="signup-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="닫기">×</button>
        <h2>회원가입</h2>
        <p className="signup-subtitle">늘감사합니다람에 오신 것을 환영해요!</p>
        
        {submitError && <div className="error-message main-error">{submitError}</div>}
        
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group row-group">
            <div className="input-group">
              <label htmlFor="signup-email">이메일 <span className="required">*</span></label>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="signup-nickname">별명 <span className="required">*</span></label>
              <input
                id="signup-nickname"
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="별명을 입력해주세요"
              />
              {errors.nickname && <span className="field-error">{errors.nickname}</span>}
            </div>
          </div>

          <div className="form-group row-group">
            <div className="input-group">
              <label htmlFor="signup-password">비밀번호 <span className="required">*</span></label>
              <input
                id="signup-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="signup-password-confirm">비밀번호 확인 <span className="required">*</span></label>
              <input
                id="signup-password-confirm"
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="비밀번호 재입력"
              />
              {errors.passwordConfirm && <span className="field-error">{errors.passwordConfirm}</span>}
            </div>
          </div>

          <div className="form-group row-group three-cols">
            <div className="input-group">
              <label>성별</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="secret">비밀</option>
                <option value="male">남자</option>
                <option value="female">여자</option>
              </select>
            </div>

            <div className="input-group">
              <label>MBTI</label>
              <select name="mbti" value={formData.mbti} onChange={handleChange}>
                {MBTI_OPTIONS.map(mbti => (
                  <option key={mbti} value={mbti}>{mbti.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group row-group">
            <div className="input-group">
              <label htmlFor="signup-hobby">취미 <span className="optional">(선택)</span></label>
              <input
                id="signup-hobby"
                type="text"
                name="hobby"
                value={formData.hobby}
                onChange={handleChange}
                placeholder="취미"
              />
            </div>

            <div className="input-group">
              <label htmlFor="signup-specialty">특기 <span className="optional">(선택)</span></label>
              <input
                id="signup-specialty"
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="특기"
              />
            </div>
          </div>

          <button type="submit" className="signup-submit-btn" disabled={loading}>
            {loading ? '가입하는 중...' : '다람이와 함께하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
