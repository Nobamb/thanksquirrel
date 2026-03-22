import './SpeechBubble.css';

export default function SpeechBubble({ text, isVisible, variant = 'default', showButton = false, onButtonClick }) {
  // 개행 문자(\n)를 <br/>로 치환하기 위한 처리
  const formattedText = text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      {index !== text.split('\n').length - 1 && <br />}
    </span>
  ));

  return (
    <div className={`speech-bubble ${variant} ${isVisible ? 'visible' : ''}`}>
      <div className="speech-text">{formattedText}</div>
      {showButton && (
        <button className="speech-button" onClick={onButtonClick}>
          알겠다람!
        </button>
      )}
    </div>
  );
}
