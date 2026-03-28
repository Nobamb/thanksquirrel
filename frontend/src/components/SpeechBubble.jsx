import './SpeechBubble.css';

export default function SpeechBubble({
  text,
  isVisible,
  variant = 'default',
  className = '',
  showButton = false,
  onButtonClick,
  buttonText = '?뚭쿋?ㅻ엺!',
  isButtonDisabled = false,
}) {
  const lines = text.split('\n');
  const formattedText = lines.map((line, index) => (
    <span key={index}>
      {line}
      {index !== lines.length - 1 && <br />}
    </span>
  ));

  const bubbleClass = `speech-bubble ${variant !== 'default' ? variant : ''} ${className} ${isVisible ? 'visible' : ''}`
    .trim()
    .replace(/\s+/g, ' ');

  return (
    <div className={bubbleClass}>
      <div className="speech-text">{formattedText}</div>
      {showButton && (
        <button className="speech-button" onClick={onButtonClick} disabled={isButtonDisabled}>
          {buttonText}
        </button>
      )}
    </div>
  );
}
