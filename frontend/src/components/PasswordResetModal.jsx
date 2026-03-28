import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './PasswordResetModal.css';

const INITIAL_REQUEST_STATE = {
  email: '',
  loading: false,
  error: null,
  success: '',
};

const INITIAL_UPDATE_STATE = {
  password: '',
  passwordConfirm: '',
  loading: false,
  error: null,
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()[\]{}<>?,./~+\-_=|\\]).{8,}$/;
  return passwordRegex.test(password);
};

export default function PasswordResetModal({
  isOpen,
  mode,
  initialEmail = '',
  onClose,
  onPasswordUpdated,
}) {
  const [requestState, setRequestState] = useState({
    ...INITIAL_REQUEST_STATE,
    email: initialEmail,
  });
  const [updateState, setUpdateState] = useState(INITIAL_UPDATE_STATE);

  const title = useMemo(() => (
    mode === 'update' ? '새 비밀번호 설정' : '비밀번호 찾기'
  ), [mode]);

  const subtitle = useMemo(() => (
    mode === 'update'
      ? '이메일 인증이 끝났어요! 이제 새 비밀번호를 입력해 주시면 됩니다!'
      : '가입한 이메일을 입력하면 비밀번호 재설정 메일을 보내 드릴게요!'
  ), [mode]);

  if (!isOpen) {
    return null;
  }

  const handleRequestSubmit = async (event) => {
    event.preventDefault();

    const email = requestState.email.trim().toLowerCase();

    if (!email) {
      setRequestState((prev) => ({
        ...prev,
        error: '이메일을 입력해 주세요!',
        success: '',
      }));
      return;
    }

    setRequestState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: '',
    }));

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setRequestState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return;
    }

    setRequestState((prev) => ({
      ...prev,
      loading: false,
      error: null,
      success: `${email} 주소로 비밀번호 재설정 메일을 보냈어요! 메일에서 인증을 마치면 이 화면으로 돌아와 새 비밀번호를 설정할 수 있답니다!`,
    }));
  };

  const handleUpdateSubmit = async (event) => {
    event.preventDefault();

    if (!validatePassword(updateState.password)) {
      setUpdateState((prev) => ({
        ...prev,
        error: '비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 해요!',
      }));
      return;
    }

    if (updateState.password !== updateState.passwordConfirm) {
      setUpdateState((prev) => ({
        ...prev,
        error: '비밀번호와 비밀번호 확인이 일치하지 않아요!',
      }));
      return;
    }

    setUpdateState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const { error } = await supabase.auth.updateUser({
      password: updateState.password,
    });

    if (error) {
      setUpdateState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return;
    }

    setUpdateState((prev) => ({
      ...prev,
      loading: false,
      error: null,
    }));

    await onPasswordUpdated();
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="password-reset-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="닫기">×</button>
        <h2>{title}</h2>
        <p className="password-reset-subtitle">{subtitle}</p>

        {mode === 'request' ? (
          <>
            <div className="password-reset-notice">
              다람다람! 비밀번호를 바꿔주기 위해 메일은 달램이가 보냈습니다람! 메일 인증을 마치기 전까지는 조금만 기다려주시면 좋겠습니다람!
            </div>

            {requestState.error && <div className="error-message main-error">{requestState.error}</div>}
            {requestState.success && <div className="verification-success">{requestState.success}</div>}

            <form onSubmit={handleRequestSubmit} className="password-reset-form">
              <div className="input-group">
                <label htmlFor="password-reset-email">이메일</label>
                <input
                  id="password-reset-email"
                  type="email"
                  value={requestState.email}
                  onChange={(event) => setRequestState((prev) => ({
                    ...prev,
                    email: event.target.value,
                    error: null,
                  }))}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="signup-submit-btn" disabled={requestState.loading}>
                {requestState.loading ? '메일 보내는 중...' : '다람이에게 비밀번호 바꿔달라고 부탁하기다람!'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="password-reset-notice is-recovery">
              인증된 세션으로 접속 중입니다! 새 비밀번호를 저장하면 자동으로 로그인 상태를 유지할 수 있어요!
            </div>

            {updateState.error && <div className="error-message main-error">{updateState.error}</div>}

            <form onSubmit={handleUpdateSubmit} className="password-reset-form">
              <div className="input-group">
                <label htmlFor="password-reset-new-password">새 비밀번호</label>
                <input
                  id="password-reset-new-password"
                  type="password"
                  value={updateState.password}
                  onChange={(event) => setUpdateState((prev) => ({
                    ...prev,
                    password: event.target.value,
                    error: null,
                  }))}
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                  autoComplete="new-password"
                />
              </div>

              <div className="input-group">
                <label htmlFor="password-reset-password-confirm">새 비밀번호 확인</label>
                <input
                  id="password-reset-password-confirm"
                  type="password"
                  value={updateState.passwordConfirm}
                  onChange={(event) => setUpdateState((prev) => ({
                    ...prev,
                    passwordConfirm: event.target.value,
                    error: null,
                  }))}
                  placeholder="새 비밀번호를 다시 입력해 주세요"
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="signup-submit-btn" disabled={updateState.loading}>
                {updateState.loading ? '비밀번호 변경 중...' : '새 비밀번호 저장'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
