import { useState } from 'react';
import { getImageUrl, getWebpageImageUrl } from '../lib/supabase';
import LetterListModal from './LetterListModal';
import './AuthenticatedHome.css';

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
  const profileImageSrc = profile?.avatar_url || getWebpageImageUrl('character-icon.png');
  const displayName = profile?.nickname || profile?.email?.split('@')[0] || '고마운 친구';

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
          <button type="button" className="header-profile-button" aria-label={`${displayName} 프로필`}>
            <img src={profileImageSrc} alt="" />
          </button>
        </div>
      </header>

      <main className="site-main">
        <div className="site-main__character-shell">
          <div className="site-main__glow" />
          <img
            className="site-main__character"
            src={getImageUrl('character-web.webp')}
            alt="기본 상태의 달램이"
          />
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer__content">
          <p className="site-footer__copy">copyright 2026 jshh001206@gmail.com All rights reserved.</p>
        </div>
      </footer>

      {isLetterListOpen && profile?.user_id && (
        <LetterListModal
          profileId={profile.user_id}
          onClose={() => setIsLetterListOpen(false)}
        />
      )}
    </div>
  );
}
