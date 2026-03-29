import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { getImageUrl, getWebpageImageUrl } from '../lib/supabase';
import SpeechBubble from './SpeechBubble';
import './AuthenticatedHome.css';

const ACTION_INTERVAL_MS = 60_000;
const ACTION_FRAME_MS = 1_000;

const IDLE_FRAME = {
  alt: '기본 상태의 달램이',
  dialogue: '',
  imageNames: ['character-web.webp'],
};

const ACTIONS = [
  {
    name: 'eat',
    frames: [
      'character-web-eat.webp',
      'character-web-eat2.webp',
      'character-web.webp',
      'character-web-eat.webp',
      'character-web-eat2.webp',
      'character-web.webp',
      'character-web-eat.webp',
      'character-web-eat2.webp',
      'character-web.webp',
      'character-web.webp',
    ].map((imageName) => ({
      alt: '도토리를 먹는 달램이',
      dialogue: '다람다람! 도토리는 정말 맛있습니다람!',
      durationMs: ACTION_FRAME_MS,
      imageNames: [imageName],
    })),
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
      {
        alt: '나비에게 작별 인사하는 달램이',
        dialogue: '다람다람! 나비님! 자주 찾아와주셔서 감사합니다람!',
        durationMs: 2_000,
        imageNames: ['character-enjoy2.webp'],
      },
    ],
  },
  {
    name: 'sing',
    frames: Array.from({ length: 10 }, (_, index) => ({
      alt: '노래를 부르는 달램이',
      dialogue: '다람다람! 기분이 좋아서 노래 한곡 부르겠습니다람!',
      durationMs: ACTION_FRAME_MS,
      imageNames:
        index % 2 === 0
          ? ['character-sing.webp', 'character-sing1.webp']
          : ['character-sing2.webp'],
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
  const [characterFrame, setCharacterFrame] = useState({
    ...IDLE_FRAME,
    imageIndex: 0,
  });
  const timeoutIdsRef = useRef(new Set());
  const isUnmountedRef = useRef(false);
  const profileImageSrc = profile?.avatar_url || getWebpageImageUrl('character-icon.png');
  const displayName = profile?.nickname || profile?.email?.split('@')[0] || '고마운 이웃';

  const clearScheduledTimeouts = useEffectEvent(() => {
    timeoutIdsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutIdsRef.current.clear();
  });

  const waitFor = useEffectEvent((durationMs) => new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current.delete(timeoutId);
      resolve();
    }, durationMs);

    timeoutIdsRef.current.add(timeoutId);
  }));

  const showFrame = useEffectEvent((frame) => {
    setCharacterFrame({
      ...frame,
      imageIndex: 0,
    });
  });

  const restoreIdleFrame = useEffectEvent(() => {
    showFrame(IDLE_FRAME);
  });

  const runRandomAction = useEffectEvent(async () => {
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

    for (const frame of action.frames) {
      if (isUnmountedRef.current) {
        return;
      }

      showFrame(frame);
      await waitFor(frame.durationMs);
    }

    if (!isUnmountedRef.current) {
      restoreIdleFrame();
    }
  });

  useEffect(() => {
    isUnmountedRef.current = false;
    restoreIdleFrame();

    let isCancelled = false;

    const loopActions = async () => {
      while (!isCancelled) {
        await waitFor(ACTION_INTERVAL_MS);

        if (isCancelled || isUnmountedRef.current) {
          return;
        }

        await runRandomAction();
      }
    };

    loopActions();

    return () => {
      isCancelled = true;
      isUnmountedRef.current = true;
      clearScheduledTimeouts();
    };
  }, []);

  const handleCharacterImageError = () => {
    setCharacterFrame((currentFrame) => {
      if (currentFrame.imageIndex >= currentFrame.imageNames.length - 1) {
        return currentFrame;
      }

      return {
        ...currentFrame,
        imageIndex: currentFrame.imageIndex + 1,
      };
    });
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
          <button type="button" className="header-icon-button" aria-label="편지함">
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
              onError={handleCharacterImageError}
            />
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer__content">
          <p className="site-footer__copy">copyright 2026 jshh001206@gmail.com All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
