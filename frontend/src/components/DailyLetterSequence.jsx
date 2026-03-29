import { useEffect, useState } from 'react';
import './DailyLetterSequence.css';

const INTRO_TEXT = '다람다람! 늘 감사합니다람! 소중한 사람에게 온 편지가 왔습니다람! 한번 읽어보면 좋겠습니다람!';

function EnvelopeIllustration({ isOpen }) {
  return (
    <div className="letter-envelope-scene" aria-hidden="true">
      <svg className="letter-envelope-svg letter-envelope-svg--base" viewBox="0 0 360 280">
        <defs>
          <linearGradient id="envelopeBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffaf2" />
            <stop offset="55%" stopColor="#fff2df" />
            <stop offset="100%" stopColor="#f9e4c6" />
          </linearGradient>
          <linearGradient id="envelopeSideLeft" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fff8ee" />
            <stop offset="100%" stopColor="#f6e1c0" />
          </linearGradient>
          <linearGradient id="envelopeSideRight" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#fff8ee" />
            <stop offset="100%" stopColor="#f6e1c0" />
          </linearGradient>
          <linearGradient id="envelopeFrontFlap" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fff9ef" />
            <stop offset="100%" stopColor="#f5ddbb" />
          </linearGradient>
          <radialGradient id="envelopeGlow" cx="50%" cy="46%" r="72%">
            <stop offset="0%" stopColor="rgba(255, 223, 184, 0.78)" />
            <stop offset="68%" stopColor="rgba(255, 236, 209, 0.22)" />
            <stop offset="100%" stopColor="rgba(255, 236, 209, 0)" />
          </radialGradient>
          <linearGradient id="envelopeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ddbc91" />
            <stop offset="100%" stopColor="#e7c79d" />
          </linearGradient>
        </defs>

        <ellipse cx="180" cy="236" rx="128" ry="26" fill="rgba(216, 184, 140, 0.22)" />
        <rect x="48" y="76" width="264" height="148" fill="url(#envelopeBody)" rx="0" />
        <rect x="48" y="76" width="264" height="148" fill="url(#envelopeGlow)" rx="0" opacity="0.82" />
        <path
          d="M52 80L180 168L52 220Z"
          fill="url(#envelopeSideLeft)"
          stroke="#e3c194"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d="M308 80L180 168L308 220Z"
          fill="url(#envelopeSideRight)"
          stroke="#e3c194"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d="M52 220L180 136L308 220Z"
          fill="url(#envelopeFrontFlap)"
          stroke="#e3c194"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <rect x="48" y="76" width="264" height="148" fill="none" stroke="url(#envelopeStroke)" strokeWidth="4.5" />
      </svg>

      <div className={`letter-envelope-flap ${isOpen ? 'is-open' : ''}`}>
        <svg className="letter-envelope-svg letter-envelope-svg--flap" viewBox="0 0 360 280">
          <defs>
            <linearGradient id="envelopeFlap" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffe8c9" />
              <stop offset="100%" stopColor="#ffd8a7" />
            </linearGradient>
          </defs>

          <path d="M48 76L180 154L312 76H48Z" fill="url(#envelopeFlap)" stroke="#e1bf93" strokeWidth="4.5" />
        </svg>
      </div>
    </div>
  );
}

export default function DailyLetterSequence({ letter, onComplete, mode = 'daily' }) {
  const [phase, setPhase] = useState(mode === 'preview' ? 'opening' : 'notice');

  useEffect(() => {
    if (mode !== 'preview') {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPhase('reading');
    }, 760);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mode]);

  const handleNoticeConfirm = () => {
    setPhase('opening');

    window.setTimeout(() => {
      setPhase('reading');
    }, 760);
  };

  const handleLetterConfirm = () => {
    setPhase('closing');

    window.setTimeout(() => {
      onComplete();
    }, 420);
  };

  const isEnvelopeOpen = phase === 'opening' || phase === 'reading' || phase === 'closing';

  return (
    <div className={`daily-letter-stage phase-${phase}`}>
      <div className="daily-letter-stage__backdrop" />

      <div className="daily-letter-envelope-wrap">
        <EnvelopeIllustration isOpen={isEnvelopeOpen} />
      </div>

      {mode !== 'preview' && (phase === 'notice' || phase === 'opening') && (
        <div className={`daily-letter-intro ${phase === 'opening' ? 'is-leaving' : ''}`}>
          <p>{INTRO_TEXT}</p>
          <button type="button" onClick={handleNoticeConfirm}>
            알겠다람!
          </button>
        </div>
      )}

      {(phase === 'reading' || phase === 'closing') && (
        <div className={`daily-letter-paper ${phase === 'closing' ? 'is-leaving' : ''}`}>
          <div className="daily-letter-paper__inner">
            <p className="daily-letter-paper__message nanum-pen-script-regular">
              {letter.message}
            </p>
            <button type="button" onClick={handleLetterConfirm}>
              알겠다람!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
