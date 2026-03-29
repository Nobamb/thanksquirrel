import { useEffect, useMemo, useState } from 'react';
import { fetchLetterCatalog, fetchReceivedLetterIds } from '../lib/dailyLetter';
import DailyLetterSequence from './DailyLetterSequence';
import SearchInput from './SearchInput';
import SelectField from './SelectField';
import './LetterListModal.css';

const UNRECEIVED_MESSAGE = '아직 받지 않은 편지입니다. 출석을 할 수록 더 많은 편지를 얻을 수 있습니다!';
const VIEW_OPTIONS = [
  { value: 'all', label: '전체 편지' },
  { value: 'received', label: '내 편지' },
];

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function LetterListModal({ profileId, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const [status, setStatus] = useState('loading');
  const [entries, setEntries] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');

  useEffect(() => {
    let isActive = true;

    const loadLetters = async () => {
      try {
        setStatus('loading');
        setError('');

        const [catalog, receivedIds] = await Promise.all([
          fetchLetterCatalog(),
          fetchReceivedLetterIds(profileId),
        ]);

        if (!isActive) {
          return;
        }

        const receivedIdSet = new Set(receivedIds);
        setEntries(
          catalog.map((letter) => ({
            id: letter.id,
            message: receivedIdSet.has(letter.id) ? letter.message : UNRECEIVED_MESSAGE,
            isReceived: receivedIdSet.has(letter.id),
          })),
        );
        setStatus('ready');
      } catch (loadError) {
        console.error('Letter list load error:', loadError);

        if (!isActive) {
          return;
        }

        setEntries([]);
        setStatus('error');
        setError('편지 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    };

    loadLetters();

    return () => {
      isActive = false;
    };
  }, [profileId]);

  const receivedCount = useMemo(
    () => entries.filter((entry) => entry.isReceived).length,
    [entries],
  );

  const visibleEntries = useMemo(() => {
    if (viewMode === 'received') {
      return entries.filter((entry) => entry.isReceived);
    }

    return entries;
  }, [entries, viewMode]);

  const filteredEntries = useMemo(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return visibleEntries;
    }

    if (/^\d+$/.test(trimmedQuery)) {
      return visibleEntries.filter((entry) => String(entry.id).includes(trimmedQuery));
    }

    const normalizedQuery = trimmedQuery.toLowerCase();
    return visibleEntries.filter((entry) => entry.message.toLowerCase().includes(normalizedQuery));
  }, [visibleEntries, query]);

  const handleClose = () => {
    setSelectedLetter(null);
    setIsClosing(true);

    window.setTimeout(() => {
      onClose();
    }, 280);
  };

  return (
    <>
      <div className={`letter-list-modal ${isClosing ? 'is-closing' : ''}`}>
        <div className="letter-list-modal__backdrop" onClick={handleClose} />

        <section className="letter-list-modal__panel" aria-modal="true" role="dialog">
          <button type="button" className="letter-list-modal__close" onClick={handleClose} aria-label="닫기">
            <CloseIcon />
          </button>

          <header className="letter-list-modal__header">
            <h2>편지 리스트</h2>
            <p>받은 편지 {receivedCount}개</p>
          </header>

          <div className="letter-list-modal__search">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="숫자는 ID, 문자는 편지 내용을 검색해 주세요"
              ariaLabel="편지 검색"
            />
          </div>

          <div className="letter-list-modal__filter">
            <SelectField
              value={viewMode}
              onChange={setViewMode}
              options={VIEW_OPTIONS}
              ariaLabel="편지 보기 방식"
            />
          </div>

          <div className="letter-list-modal__divider" />

          {status === 'loading' && (
            <div className="letter-list-modal__status">편지 목록을 준비하고 있습니다람!</div>
          )}

          {status === 'error' && (
            <div className="letter-list-modal__status letter-list-modal__status--error">{error}</div>
          )}

          {status === 'ready' && (
            filteredEntries.length > 0 ? (
              <div className="letter-list-modal__list" role="list">
                {filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`letter-list-item ${entry.isReceived ? 'is-received' : 'is-locked'}`}
                    disabled={!entry.isReceived}
                    onClick={() => setSelectedLetter({ id: entry.id, message: entry.message })}
                  >
                    <span className="letter-list-item__id">{String(entry.id).padStart(3, '0')}</span>
                    <span className="letter-list-item__message">{entry.message}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="letter-list-modal__status">검색 결과가 없습니다.</div>
            )
          )}
        </section>
      </div>

      {selectedLetter && (
        <DailyLetterSequence
          letter={selectedLetter}
          mode="preview"
          onComplete={() => setSelectedLetter(null)}
        />
      )}
    </>
  );
}
