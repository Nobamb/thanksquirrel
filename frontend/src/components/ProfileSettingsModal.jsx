import { useEffect, useRef, useState } from 'react';
import './ProfileSettingsModal.css';

const MBTI_OPTIONS = [
  'istj', 'isfj', 'infj', 'intj',
  'istp', 'isfp', 'infp', 'intp',
  'estp', 'esfp', 'enfp', 'entp',
  'estj', 'esfj', 'enfj', 'entj',
];

const INITIAL_FORM = {
  nickname: '',
  gender: 'secret',
  mbti: 'infp',
  hobby: '',
  specialty: '',
};

export default function ProfileSettingsModal({
  isOpen,
  profile,
  profileImageSrc,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState(profileImageSrc);
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const objectUrlRef = useRef(null);

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    clearObjectUrl();
    setFormData({
      nickname: profile?.nickname ?? '',
      gender: profile?.gender ?? 'secret',
      mbti: profile?.mbti ?? 'infp',
      hobby: profile?.hobby ?? '',
      specialty: profile?.specialty ?? '',
    });
    setAvatarPreviewSrc(profileImageSrc);
    setAvatarFile(null);
    setError('');
    setLoading(false);
  }, [isOpen, profile, profileImageSrc]);

  useEffect(() => () => {
    clearObjectUrl();
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleRequestClose = () => {
    if (loading) {
      return;
    }

    clearObjectUrl();
    onClose();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleAvatarChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      return;
    }

    if (!nextFile.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있어요.');
      event.target.value = '';
      return;
    }

    clearObjectUrl();
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    objectUrlRef.current = nextPreviewUrl;
    setAvatarPreviewSrc(nextPreviewUrl);
    setAvatarFile(nextFile);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.nickname.trim()) {
      setError('별명을 입력해 주세요.');
      return;
    }

    setLoading(true);
    const saveError = await onSave({
      nickname: formData.nickname.trim(),
      gender: formData.gender,
      mbti: formData.mbti,
      hobby: formData.hobby.trim(),
      specialty: formData.specialty.trim(),
      avatarFile,
    });
    setLoading(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    clearObjectUrl();
    onClose();
  };

  return (
    <div className="profile-modal-overlay" onMouseDown={handleRequestClose}>
      <div className="profile-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="close-btn"
          onClick={handleRequestClose}
          aria-label="닫기"
          disabled={loading}
        >
          X
        </button>
        <h2>마이페이지</h2>
        <p className="profile-settings-subtitle">프로필 정보를 확인하고 수정할 수 있어요.</p>

        <div className="profile-settings-card">
          <label
            htmlFor="profile-avatar"
            className={`profile-settings-avatar-wrap ${loading ? 'is-disabled' : ''}`}
            title="프로필 사진 변경"
          >
            <img src={avatarPreviewSrc} alt="" className="profile-settings-avatar" />
            <div className="profile-settings-avatar-overlay" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <input
              id="profile-avatar"
              className="profile-settings-file-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={loading}
            />
          </label>
          <div className="profile-settings-meta">
            <strong>{formData.nickname.trim() || profile?.nickname || '다람이 친구'}</strong>
            <span>{profile?.email ?? ''}</span>
          </div>
        </div>

        {error ? <div className="error-message main-error">{error}</div> : null}

        <form className="profile-settings-form" onSubmit={handleSubmit}>
          <div className="form-group row-group">
            <div className="input-group">
              <label htmlFor="profile-email">이메일</label>
              <input id="profile-email" type="email" value={profile?.email ?? ''} disabled readOnly />
            </div>

            <div className="input-group">
              <label htmlFor="profile-nickname">별명</label>
              <input
                id="profile-nickname"
                name="nickname"
                type="text"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="별명을 입력해 주세요."
              />
            </div>
          </div>

          <div className="form-group row-group three-cols">
            <div className="input-group">
              <label htmlFor="profile-gender">성별</label>
              <select id="profile-gender" name="gender" value={formData.gender} onChange={handleChange}>
                <option value="secret">비밀</option>
                <option value="male">남자</option>
                <option value="female">여자</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="profile-mbti">MBTI</label>
              <select id="profile-mbti" name="mbti" value={formData.mbti} onChange={handleChange}>
                {MBTI_OPTIONS.map((mbti) => (
                  <option key={mbti} value={mbti}>{mbti.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group row-group">
            <div className="input-group">
              <label htmlFor="profile-hobby">취미</label>
              <input
                id="profile-hobby"
                name="hobby"
                type="text"
                value={formData.hobby}
                onChange={handleChange}
                placeholder="취미"
              />
            </div>

            <div className="input-group">
              <label htmlFor="profile-specialty">특기</label>
              <input
                id="profile-specialty"
                name="specialty"
                type="text"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="특기"
              />
            </div>
          </div>

          <button type="submit" className="signup-submit-btn" disabled={loading}>
            {loading ? '저장 중..' : '프로필 저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
