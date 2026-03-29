import { useState } from 'react';
import './DailyLetterSequence.css';

const INTRO_TEXT = '다람다람! 늘 감사합니다람! 소중한 사람에게 온 편지가 왔습니다람! 한번 읽어보면 좋겠습니다람!';

function EnvelopeIllustration({ isOpen }) {
  return (
    <div className="letter-envelope-scene" aria-hidden="true">
      <svg className="letter-envelope-svg letter-envelope-svg--base" viewBox="0 0 360 280">
        <defs>
          <linearGradient id="envelopeBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8ee" />
            <stop offset="100%" stopColor="#f4ddc3" />
          </linearGradient>
          <linearGradient id="envelopePocket" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fff6ea" />
            <stop offset="100%" stopColor="#f9e9d3" />
          </linearGradient>
        </defs>

        <ellipse cx="180" cy="236" rx="118" ry="24" fill="rgba(185, 140, 88, 0.18)" />
        <path d="M48 76H312V224H48Z" fill="url(#envelopeBody)" stroke="#d8b691" strokeWidth="4" />
        <path d="M68 96H292V134H68Z" fill="url(#envelopePocket)" opacity="0.9" />
        <path d="M48 76H312" fill="none" stroke="#d8b691" strokeWidth="4" strokeLinecap="round" />
        <path d="M48 224L132 146" fill="none" stroke="#e6c7a6" strokeWidth="4" strokeLinecap="round" />
        <path d="M312 224L228 146" fill="none" stroke="#e6c7a6" strokeWidth="4" strokeLinecap="round" />
        <path d="M92 118H268" fill="none" stroke="#edd7ba" strokeWidth="4" strokeLinecap="round" />
      </svg>

      <div className={`letter-envelope-flap ${isOpen ? 'is-open' : ''}`}>
        <svg className="letter-envelope-svg letter-envelope-svg--flap" viewBox="0 0 360 280">
          <defs>
            <linearGradient id="envelopeFlap" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffe8cc" />
              <stop offset="100%" stopColor="#f4cfa5" />
            </linearGradient>
          </defs>

          <path d="M48 76L180 154L312 76H48Z" fill="url(#envelopeFlap)" stroke="#d8b691" strokeWidth="4" />
        </svg>
      </div>
    </div>
  );
}

export default function DailyLetterSequence({ letter, onComplete }) {
  const [phase, setPhase] = useState('notice');

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

      {(phase === 'notice' || phase === 'opening') && (
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
