import { useEffect, useEffectEvent, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { getImageUrl, getWebpageImageUrl, supabase } from '../lib/supabase';
import LetterListModal from './LetterListModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import SpeechBubble from './SpeechBubble';
import WithdrawConfirmModal from './WithdrawConfirmModal';
import './AuthenticatedHome.css';

const ACTION_INTERVAL_MS = 20_000;
const ACTION_FRAME_MS = 1_000;
const ACTION_DURATION_FRAMES = 10;
const INTERACTION_DURATION_MS = 3_000;
const ACORN_RETURN_WINDOW_MS = 5_000;
const POINTER_DRAG_THRESHOLD_PX = 12;
const PROFILE_IMAGE_BUCKET = 'profile-images';
const PROFILE_IMAGE_MAX_BYTES = 100 * 1024;

const EAT_IMAGES = ['character-web-eat.webp', 'character-web-eat2.webp'];

const IDLE_FRAME = {
  alt: '기본 상태의 달램이',
  dialogue: '',
  imageNames: ['character-web.webp'],
};

const TICKLE_FRAME = {
  alt: '간지러워하는 달램이',
  dialogue: '다람다람! 너무 간지럽습니다람!',
  durationMs: INTERACTION_DURATION_MS,
  imageNames: ['character-tickle.webp'],
};

const HAPPY_FRAME = {
  alt: '기분이 좋아진 달램이',
  dialogue: '다람다람! 머리를 쓰다듬어 주셔서 기분이 좋습니다람!',
  durationMs: INTERACTION_DURATION_MS,
  imageNames: ['character-happy.webp'],
};

const ACORN_STOLEN_FRAME = {
  alt: '도토리를 빼앗겨 슬픈 달램이',
  dialogue: '다람다람! 도토리 돌려주시면 좋겠습니다람!',
  imageNames: ['character-sad.webp'],
};

const ACORN_MISSED_FRAME = {
  alt: '도토리를 돌려받지 못해 실망한 달램이',
  dialogue: '다람다람… 힝… 아쉽습니다람…',
  durationMs: INTERACTION_DURATION_MS,
  imageNames: ['character-sad2.webp'],
};

const BUTTERFLY_GOODBYE_FRAME = {
  alt: '나비에게 작별 인사하는 달램이',
  dialogue: '다람다람! 나비님! 자주 찾아와주셔서 감사합니다람!',
  durationMs: 2_000,
  imageNames: ['character-enjoy2.webp'],
};

function createAlternatingFrames({ imageNames, alt, dialogue, frameCount = ACTION_DURATION_FRAMES }) {
  return Array.from({ length: frameCount }, (_, index) => ({
    alt,
    dialogue,
    durationMs: ACTION_FRAME_MS,
    imageNames: [imageNames[index % imageNames.length]],
  }));
}

function createEatFrames(dialogue) {
  return createAlternatingFrames({
    imageNames: EAT_IMAGES,
    alt: '도토리를 먹는 달램이',
    dialogue,
  });
}

function createFrameWithCurrentImage(frame, dialogue) {
  return {
    alt: frame.alt,
    dialogue,
    durationMs: INTERACTION_DURATION_MS,
    imageNames: frame.imageNames,
  };
}

const AUTO_ACTIONS = [
  {
    name: 'eat',
    frames: createEatFrames('다람다람! 도토리는 정말 맛있습니다람!'),
  },
  {
    name: 'butterfly',
    frames: [
      {
        alt: '나비와 노는 달램이',
        dialogue: '다람다람! 나비님! 언제나 참 아름답습니다람!',
        durationMs: 8_000,
        imageNames: ['character-enjoy.webp'],
      },
      BUTTERFLY_GOODBYE_FRAME,
    ],
  },
  {
    name: 'sing',
    frames: createAlternatingFrames({
      imageNames: ['character-sing.webp', 'character-sing2.webp'],
      alt: '노래를 부르는 달램이',
      dialogue: '다람다람! 기분이 좋아서 노래 한곡 부르겠습니다람!',
    }).map((frame, index) => ({
      ...frame,
      imageNames: index % 2 === 0 ? ['character-sing.webp', 'character-sing1.webp'] : frame.imageNames,
    })),
  },
];

function getProfileImageExtension(file) {
  const extensionFromName = file.name?.split('.').pop()?.toLowerCase();

  if (extensionFromName) {
    return extensionFromName;
  }

  const extensionFromType = file.type?.split('/').pop()?.toLowerCase();

  if (!extensionFromType) {
    return 'jpg';
  }

  return extensionFromType === 'jpeg' ? 'jpg' : extensionFromType;
}

async function prepareProfileImageFile(file) {
  if (file.size <= PROFILE_IMAGE_MAX_BYTES) {
    return file;
  }

  const compressedFile = await imageCompression(file, {
    maxSizeMB: PROFILE_IMAGE_MAX_BYTES / (1024 * 1024),
    useWebWorker: true,
    initialQuality: 0.85,
  });

  if (compressedFile.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('profile_image_too_large');
  }

  return compressedFile;
}

async function uploadProfileImage(userId, file) {
  const preparedFile = await prepareProfileImageFile(file);
  const fileExtension = getProfileImageExtension(preparedFile);
  const filePath = `${userId}/avatar-${Date.now()}.${fileExtension}`;
  const storageClient = supabase.storage.from(PROFILE_IMAGE_BUCKET);
  const { error: uploadError } = await storageClient.upload(filePath, preparedFile, {
    cacheControl: '3600',
    upsert: true,
    contentType: preparedFile.type || file.type || 'image/jpeg',
  });

  if (uploadError) {
    console.error('Storage upload error details:', JSON.stringify(uploadError));
    throw uploadError;
  }

  const { data } = storageClient.getPublicUrl(filePath);
  return data.publicUrl;
}

function LetterIcon() {
  return (
    <svg viewBox="0 0 360 280" aria-hidden="true">
      <defs>
        <linearGradient id="headerEnvelopeBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffaf2" />
          <stop offset="55%" stopColor="#fff2df" />
          <stop offset="100%" stopColor="#f9e4c6" />
        </linearGradient>
        <linearGradient id="headerEnvelopeSideLeft" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#fff8ee" />
          <stop offset="100%" stopColor="#f6e1c0" />
        </linearGradient>
        <linearGradient id="headerEnvelopeSideRight" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#fff8ee" />
          <stop offset="100%" stopColor="#f6e1c0" />
        </linearGradient>
        <linearGradient id="headerEnvelopeFrontFlap" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff9ef" />
          <stop offset="100%" stopColor="#f5ddbb" />
        </linearGradient>
        <radialGradient id="headerEnvelopeGlow" cx="50%" cy="46%" r="72%">
          <stop offset="0%" stopColor="rgba(255, 223, 184, 0.78)" />
          <stop offset="68%" stopColor="rgba(255, 236, 209, 0.22)" />
          <stop offset="100%" stopColor="rgba(255, 236, 209, 0)" />
        </radialGradient>
        <linearGradient id="headerEnvelopeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ddbc91" />
          <stop offset="100%" stopColor="#e7c79d" />
        </linearGradient>
        <linearGradient id="headerEnvelopeFlap" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffe8c9" />
          <stop offset="100%" stopColor="#ffd8a7" />
        </linearGradient>
      </defs>

      <ellipse cx="180" cy="236" rx="128" ry="26" fill="rgba(216, 184, 140, 0.22)" />
      <rect x="48" y="76" width="264" height="148" fill="url(#headerEnvelopeBody)" rx="0" />
      <rect x="48" y="76" width="264" height="148" fill="url(#headerEnvelopeGlow)" rx="0" opacity="0.82" />
      <path
        d="M52 80L180 168L52 220Z"
        fill="url(#headerEnvelopeSideLeft)"
        stroke="#e3c194"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M308 80L180 168L308 220Z"
        fill="url(#headerEnvelopeSideRight)"
        stroke="#e3c194"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M52 220L180 136L308 220Z"
        fill="url(#headerEnvelopeFrontFlap)"
        stroke="#e3c194"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <rect
        x="48"
        y="76"
        width="264"
        height="148"
        fill="none"
        stroke="url(#headerEnvelopeStroke)"
        strokeWidth="4.5"
      />
      <path
        d="M48 76L180 154L312 76H48Z"
        fill="url(#headerEnvelopeFlap)"
        stroke="#e1bf93"
        strokeWidth="4.5"
      />
    </svg>
  );
}

export default function AuthenticatedHome({ profile, onProfileUpdated }) {
  const [isLetterListOpen, setIsLetterListOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [characterFrame, setCharacterFrame] = useState({
    ...IDLE_FRAME,
    imageIndex: 0,
  });
  const actionTimeoutEntriesRef = useRef(new Set());
  const autoTimeoutIdRef = useRef(null);
  const isUnmountedRef = useRef(false);
  const actionRunIdRef = useRef(0);
  const currentActionRef = useRef('idle');
  const currentFrameRef = useRef(IDLE_FRAME);
  const pointerStateRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileImageSrc = profile?.avatar_url || getWebpageImageUrl('character-icon.png');
  const displayName = profile?.nickname || profile?.email?.split('@')[0] || '고마운 친구';

  const clearActionTimeouts = useEffectEvent(() => {
    actionTimeoutEntriesRef.current.forEach((entry) => {
      clearTimeout(entry.timeoutId);
      entry.resolve(false);
    });
    actionTimeoutEntriesRef.current.clear();
  });

  const clearAutoTimer = useEffectEvent(() => {
    if (autoTimeoutIdRef.current !== null) {
      clearTimeout(autoTimeoutIdRef.current);
      autoTimeoutIdRef.current = null;
    }
  });

  const waitForAction = useEffectEvent((runId, durationMs) => new Promise((resolve) => {
    const entry = {
      timeoutId: null,
      resolve: (result) => {
        actionTimeoutEntriesRef.current.delete(entry);
        resolve(result);
      },
    };

    entry.timeoutId = window.setTimeout(() => {
      entry.resolve(!isUnmountedRef.current && runId === actionRunIdRef.current);
    }, durationMs);

    actionTimeoutEntriesRef.current.add(entry);
  }));

  const showFrame = useEffectEvent((frame) => {
    currentFrameRef.current = frame;
    setCharacterFrame({
      ...frame,
      imageIndex: 0,
    });
  });

  const showIdleFrame = useEffectEvent(() => {
    currentActionRef.current = 'idle';
    showFrame(IDLE_FRAME);
  });

  const scheduleNextAutoAction = useEffectEvent(() => {
    clearAutoTimer();

    autoTimeoutIdRef.current = window.setTimeout(async () => {
      autoTimeoutIdRef.current = null;

      if (isUnmountedRef.current) {
        return;
      }

      const action = AUTO_ACTIONS[Math.floor(Math.random() * AUTO_ACTIONS.length)];
      await runFrameSequence(action.name, action.frames);
    }, ACTION_INTERVAL_MS);
  });

  const finishSequence = useEffectEvent((runId, { resumeAuto = true } = {}) => {
    if (isUnmountedRef.current || runId !== actionRunIdRef.current) {
      return;
    }

    showIdleFrame();

    if (resumeAuto) {
      scheduleNextAutoAction();
    }
  });

  const runFrameSequence = useEffectEvent(async (name, frames, { resumeAuto = true } = {}) => {
    clearActionTimeouts();
    clearAutoTimer();

    const runId = actionRunIdRef.current + 1;
    actionRunIdRef.current = runId;
    currentActionRef.current = name;

    for (const frame of frames) {
      if (isUnmountedRef.current || runId !== actionRunIdRef.current) {
        return false;
      }

      showFrame(frame);
      const isStillActive = await waitForAction(runId, frame.durationMs);

      if (!isStillActive) {
        return false;
      }
    }

    finishSequence(runId, { resumeAuto });
    return true;
  });

  const startEatSequence = useEffectEvent((dialogue) => (
    runFrameSequence('eat', createEatFrames(dialogue))
  ));

  const startAcornStolenFlow = useEffectEvent(async () => {
    clearActionTimeouts();
    clearAutoTimer();

    const runId = actionRunIdRef.current + 1;
    actionRunIdRef.current = runId;
    currentActionRef.current = 'eat-stolen';
    showFrame(ACORN_STOLEN_FRAME);

    const stillWaiting = await waitForAction(runId, ACORN_RETURN_WINDOW_MS);

    if (!stillWaiting) {
      return;
    }

    currentActionRef.current = 'eat-disappointed';
    showFrame(ACORN_MISSED_FRAME);

    const isStillActive = await waitForAction(runId, ACORN_MISSED_FRAME.durationMs);

    if (!isStillActive) {
      return;
    }

    finishSequence(runId);
  });

  const handleCharacterInteraction = useEffectEvent(({ zone, dragged }) => {
    const currentAction = currentActionRef.current;

    if (currentAction === 'eat-stolen') {
      startEatSequence('다람다람! 도토리를 주셔서 감사합니다람!');
      return;
    }

    if (currentAction === 'eat') {
      startAcornStolenFlow();
      return;
    }

    if (currentAction === 'sing') {
      runFrameSequence('sing-response', [
        createFrameWithCurrentImage(
          currentFrameRef.current,
          '다람다람! 나는 이 동네 최고의 가수입니다람!',
        ),
      ]);
      return;
    }

    if (currentAction === 'butterfly') {
      runFrameSequence('butterfly-response', [BUTTERFLY_GOODBYE_FRAME]);
      return;
    }

    if (zone === 'head') {
      if (dragged) {
        runFrameSequence('happy', [HAPPY_FRAME]);
        return;
      }

      startEatSequence('다람다람! 도토리를 주셔서 감사합니다람!');
      return;
    }

    runFrameSequence('tickle', [TICKLE_FRAME]);
  });

  useEffect(() => {
    isUnmountedRef.current = false;
    showIdleFrame();
    scheduleNextAutoAction();

    return () => {
      isUnmountedRef.current = true;
      pointerStateRef.current = null;
      clearActionTimeouts();
      clearAutoTimer();
    };
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDownOutside = (event) => {
      const target = event.target;

      if (profileMenuRef.current?.contains(target) || profileButtonRef.current?.contains(target)) {
        return;
      }

      setIsProfileMenuOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDownOutside);

    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [isProfileMenuOpen]);

  const handleCharacterImageError = () => {
    setCharacterFrame((current) => {
      if (current.imageIndex >= current.imageNames.length - 1) {
        return current;
      }

      return {
        ...current,
        imageIndex: current.imageIndex + 1,
      };
    });
  };

  const handleZonePointerDown = useEffectEvent((zone, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();

    pointerStateRef.current = {
      dragged: false,
      hasTriggeredDrag: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      zone,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  });

  const handleZonePointerMove = useEffectEvent((zone, event) => {
    const state = pointerStateRef.current;

    if (!state || state.pointerId !== event.pointerId || state.zone !== zone) {
      return;
    }

    event.preventDefault();

    if (state.hasTriggeredDrag) {
      return;
    }

    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);

    if (distance >= POINTER_DRAG_THRESHOLD_PX) {
      state.dragged = true;
      state.hasTriggeredDrag = true;
      handleCharacterInteraction({
        dragged: true,
        zone: state.zone,
      });
    }
  });

  const releaseZonePointer = useEffectEvent((zone, event) => {
    const state = pointerStateRef.current;

    if (!state || state.pointerId !== event.pointerId || state.zone !== zone) {
      return null;
    }

    pointerStateRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    return state;
  });

  const handleZonePointerUp = useEffectEvent((zone, event) => {
    event.preventDefault();

    const state = releaseZonePointer(zone, event);

    if (!state) {
      return;
    }

    if (state.hasTriggeredDrag) {
      return;
    }

    handleCharacterInteraction({
      dragged: state.dragged,
      zone: state.zone,
    });
  });

  const handleZonePointerCancel = useEffectEvent((zone, event) => {
    event.preventDefault();
    releaseZonePointer(zone, event);
  });

  const preventNativeDrag = useEffectEvent((event) => {
    event.preventDefault();
  });

  const handleProfileMenuToggle = () => {
    setIsProfileMenuOpen((prev) => !prev);
  };

  const handleProfileSaveLegacy = async (updates) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', profile.user_id);

    if (error) {
      console.error('Profile update error:', error);
      return '프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    }

    onProfileUpdated?.({
      ...profile,
      ...updates,
    });

    return '';
  };

  const handleProfileSave = async (updates) => {
    if (!profile?.user_id) {
      return '프로필 정보를 찾을 수 없어요. 다시 로그인해 주세요.';
    }

    const { avatarFile, ...profileUpdates } = updates;
    const nextUpdates = {
      ...profileUpdates,
    };

    try {
      if (avatarFile) {
        nextUpdates.avatar_url = await uploadProfileImage(profile.user_id, avatarFile);
      }
    } catch (uploadError) {
      console.error('Profile image upload error:', uploadError);

      if (uploadError?.message === 'profile_image_too_large') {
        return '이미지를 100KB 이하로 맞추지 못했어요. 다른 이미지를 선택해 주세요.';
      }

      const errMsg = uploadError?.message || uploadError?.error || String(uploadError);
      return `프로필 이미지를 업로드하지 못했어요. (${errMsg}) 다시 시도해 주세요.`;
    }

    const { error } = await supabase
      .from('profiles')
      .update(nextUpdates)
      .eq('user_id', profile.user_id);

    if (error) {
      console.error('Profile update error:', error);
      return '프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    }

    onProfileUpdated?.({
      ...profile,
      ...nextUpdates,
    });

    return '';
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setIsProfileSettingsOpen(false);
    setIsWithdrawConfirmOpen(false);
    setWithdrawError('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (!profile?.user_id) {
      return;
    }

    setWithdrawError('');
    setIsWithdrawing(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('Withdraw update error:', updateError);
      setWithdrawError('회원탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setIsWithdrawing(false);
      return;
    }

    onProfileUpdated?.({
      ...profile,
      is_active: false,
    });

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('Withdraw sign-out error:', signOutError);
      setWithdrawError('회원탈퇴 후 로그아웃을 완료하지 못했어요. 다시 시도해 주세요.');
      setIsWithdrawing(false);
      return;
    }
  };

  return (
    <div
      className="authenticated-home"
      style={{ backgroundImage: `url(${getImageUrl('background.webp')})` }}
    >
      <header className="site-header">
        <div className="site-header__logo-wrap">
          <img
            className="site-header__logo"
            src={getWebpageImageUrl('logo.webp')}
            alt="thanksquirrel 로고"
          />
        </div>

        <div className="site-header__actions">
          <button
            type="button"
            className="header-icon-button"
            aria-label="편지함"
            onClick={() => setIsLetterListOpen(true)}
          >
            <LetterIcon />
          </button>
          <button
            type="button"
            className="header-profile-button"
            aria-label={`${displayName} 프로필`}
            ref={profileButtonRef}
            onClick={handleProfileMenuToggle}
          >
            <img src={profileImageSrc} alt="" />
          </button>

          {isProfileMenuOpen ? (
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-menu__item"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsProfileSettingsOpen(true);
                }}
              >
                마이페이지
              </button>
              <button
                type="button"
                className="profile-menu__item"
                onClick={handleLogout}
              >
                로그아웃
              </button>
              <button
                type="button"
                className="profile-menu__item profile-menu__item--danger"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setWithdrawError('');
                  setIsWithdrawConfirmOpen(true);
                }}
              >
                회원탈퇴
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="site-main">
        <div className="site-main__character-stage">
          {characterFrame.dialogue ? (
            <div className="site-main__speech-wrap" aria-live="polite">
              <SpeechBubble
                className="site-main__speech"
                isVisible
                text={characterFrame.dialogue}
              />
            </div>
          ) : null}

          <div className="site-main__character-shell">
            <div className="site-main__glow" />
            <img
              className="site-main__character"
              src={getImageUrl(characterFrame.imageNames[characterFrame.imageIndex])}
              alt={characterFrame.alt}
              draggable="false"
              onDragStart={preventNativeDrag}
              onError={handleCharacterImageError}
            />

            <button
              type="button"
              className="site-main__hit-zone site-main__hit-zone--head"
              aria-label="달램이 머리와 상호작용"
              draggable="false"
              onDragStart={preventNativeDrag}
              onPointerCancel={(event) => handleZonePointerCancel('head', event)}
              onPointerDown={(event) => handleZonePointerDown('head', event)}
              onPointerMove={(event) => handleZonePointerMove('head', event)}
              onPointerUp={(event) => handleZonePointerUp('head', event)}
            />
            <button
              type="button"
              className="site-main__hit-zone site-main__hit-zone--body"
              aria-label="달램이 몸과 상호작용"
              draggable="false"
              onDragStart={preventNativeDrag}
              onPointerCancel={(event) => handleZonePointerCancel('body', event)}
              onPointerDown={(event) => handleZonePointerDown('body', event)}
              onPointerMove={(event) => handleZonePointerMove('body', event)}
              onPointerUp={(event) => handleZonePointerUp('body', event)}
            />
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer__content">
          <p className="site-footer__copy">copyright 2026 jshh001206@gmail.com All rights reserved.</p>
        </div>
      </footer>

      {isLetterListOpen && profile?.user_id ? (
        <LetterListModal
          profileId={profile.user_id}
          onClose={() => setIsLetterListOpen(false)}
        />
      ) : null}

      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        profile={profile}
        profileImageSrc={profileImageSrc}
        onClose={() => setIsProfileSettingsOpen(false)}
        onSave={handleProfileSave}
      />

      <WithdrawConfirmModal
        isOpen={isWithdrawConfirmOpen}
        loading={isWithdrawing}
        error={withdrawError}
        onClose={() => {
          if (isWithdrawing) {
            return;
          }

          setWithdrawError('');
          setIsWithdrawConfirmOpen(false);
        }}
        onConfirm={handleWithdrawConfirm}
      />
    </div>
  );
}
