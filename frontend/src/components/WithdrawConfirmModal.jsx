import { getImageUrl } from '../lib/supabase';
import SpeechBubble from './SpeechBubble';
import './WithdrawConfirmModal.css';

const WITHDRAW_MESSAGE = '힝… 탈퇴하시면 내 마음이 너무 슬픕니다람… 제발 탈퇴하지 마시고 같이 즐겁게 놀아주었으면 좋겠습니다람…';

export default function WithdrawConfirmModal({
  isOpen,
  loading,
  error,
  onClose,
  onConfirm,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="withdraw-modal-overlay" onMouseDown={onClose}>
      <div className="withdraw-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="close-btn" onClick={onClose} aria-label="닫기">×</button>
        <div className="withdraw-modal__layout">
          <div className="withdraw-modal__character">
            <SpeechBubble
              className="withdraw-modal__bubble"
              isVisible
              text={WITHDRAW_MESSAGE}
            />
            <img
              className="withdraw-modal__image"
              src={getImageUrl('character-sad2.webp')}
              alt="슬퍼하는 달램이"
            />
          </div>

          <div className="withdraw-modal__panel">
            <h2>정말 회원탈퇴하시겠습니까?</h2>
            <p>
              회원탈퇴를 진행하면 로그아웃되며, 프로필은 비활성 상태로 전환됩니다.
            </p>
            {error ? <div className="error-message main-error">{error}</div> : null}
            <div className="withdraw-modal__actions">
              <button type="button" className="withdraw-modal__secondary" onClick={onClose} disabled={loading}>
                계속 함께하기
              </button>
              <button type="button" className="withdraw-modal__primary" onClick={onConfirm} disabled={loading}>
                {loading ? '처리 중...' : '알겠다람'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
