import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { getImageUrl, getWebpageImageUrl } from '../lib/supabase';
import LetterListModal from './LetterListModal';
import SpeechBubble from './SpeechBubble';
import './AuthenticatedHome.css';

const ACTION_INTERVAL_MS = 20_000;
const ACTION_FRAME_MS = 1_000;
const ACTION_DURATION_FRAMES = 10;
const INTERACTION_DURATION_MS = 3_000;
const ACORN_RETURN_WINDOW_MS = 5_000;
const POINTER_DRAG_THRESHOLD_PX = 12;

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

function LetterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 6.75h15a1.75 1.75 0 0 1 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75h-15A1.75 1.75 0 0 1 2.75 15.5v-7A1.75 1.75 0 0 1 4.5 6.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m4 8 8 5.5L20 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function AuthenticatedHome({ profile }) {
  const [isLetterListOpen, setIsLetterListOpen] = useState(false);
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
          >
            <img src={profileImageSrc} alt="" />
          </button>
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
    </div>
  );
}
