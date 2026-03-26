import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './SignupModal.css';

const MBTI_OPTIONS = [
  'istj', 'isfj', 'infj', 'intj',
  'istp', 'isfp', 'infp', 'intp',
  'estp', 'esfp', 'enfp', 'entp',
  'estj', 'esfj', 'enfj', 'entj',
];

const INITIAL_FORM_DATA = {
  email: '',
  password: '',
  passwordConfirm: '',
  nickname: '',
  gender: 'secret',
  mbti: 'infp',
  hobby: '',
  specialty: '',
};

export default function SignupModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isNicknameManuallyEdited, setIsNicknameManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setIsNicknameManuallyEdited(false);
      setLoading(false);
      setSubmitError(null);
      setVerificationEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()[\]{}<>?,./~+\-_=|\\]).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const nextData = { ...prev, [name]: value };

      if (name === 'email' && !isNicknameManuallyEdited) {
        nextData.nickname = value.split('@')[0] || '';
      }

      return nextData;
    });

    if (name === 'nickname') {
      setIsNicknameManuallyEdited(true);
    }

    setErrors((prev) => ({ ...prev, [name]: null }));
    setSubmitError(null);
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.email) {
      nextErrors.email = '이메일을 입력해 주세요!';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = '이메일이 잘못되었어요!';
    }

    if (!validatePassword(formData.password)) {
      nextErrors.password = '비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상을 지켜주세요!';
    }

    if (!formData.passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호 확인을 입력해 주세요!';
    } else if (formData.password !== formData.passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호와 비밀번호 확인이 일치하지 않아요!';
    }

    if (!formData.nickname.trim()) {
      nextErrors.nickname = '별명을 입력해 주세요!\n(기본적으로 이메일 앞부분이 별명이 된답니다!)';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildSignupMetadata = () => ({
    signup_provider: 'email',
    nickname: formData.nickname.trim(),
    gender: formData.gender,
    mbti: formData.mbti,
    hobby: formData.hobby.trim(),
    specialty: formData.specialty.trim(),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);

    const email = formData.email.trim().toLowerCase();
    const redirectTo = `${window.location.origin}${window.location.pathname}`;

    const { error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        emailRedirectTo: redirectTo,
        data: buildSignupMetadata(),
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        setSubmitError('이미 가입을 하셨네요! 로그인을 시도해 보세요!');
      } else {
        setSubmitError(error.message);
      }
      setLoading(false);
      return;
    }

    setVerificationEmail(email);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="signup-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="닫기">×</button>
        <h2>회원가입</h2>
        <p className="signup-subtitle">늘감사합니다람에 오신 것을 환영해요!</p>

        <div className="verification-notice">
          이메일 인증을 완료하면 가입할 수 있어요!
        </div>

        {submitError && <div className="error-message main-error">{submitError}</div>}

        {verificationEmail && (
          <div className="verification-success">
            <strong>{verificationEmail}</strong> 주소로 달램이가 메일을 보냈어요!
            메일의 인증 링크를 누르면 이 페이지로 돌아오면서 가입과 로그인이 자동으로 완료된답니다!
          </div>
        )}

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
                autoComplete="email"
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
                placeholder="별명을 입력해 주세요"
                autoComplete="nickname"
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
                autoComplete="new-password"
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
                placeholder="비밀번호를 다시 입력해 주세요"
                autoComplete="new-password"
              />
              {errors.passwordConfirm && <span className="field-error">{errors.passwordConfirm}</span>}
            </div>
          </div>

          <div className="form-group row-group three-cols">
            <div className="input-group">
              <label htmlFor="signup-gender">성별</label>
              <select id="signup-gender" name="gender" value={formData.gender} onChange={handleChange}>
                <option value="secret">비밀</option>
                <option value="male">남자</option>
                <option value="female">여자</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="signup-mbti">MBTI</label>
              <select id="signup-mbti" name="mbti" value={formData.mbti} onChange={handleChange}>
                {MBTI_OPTIONS.map((mbti) => (
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
            {loading ? '달램이가 메일 보내는 중...' : verificationEmail ? '달램이에게 이메일 인증 다시 부탁하기' : '달램이에게 이메일 인증 부탁하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
