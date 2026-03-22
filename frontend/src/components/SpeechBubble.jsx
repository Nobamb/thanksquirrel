import './SpeechBubble.css';

export default function SpeechBubble({ text, isVisible, variant = 'default', className = '', showButton = false, onButtonClick }) {
  // 개행 문자(\n)를 <br/>로 치환하기 위한 처리
  const formattedText = text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      {index !== text.split('\n').length - 1 && <br />}
    </span>
  ));

  // variant와 className을 모두 포함하여 클래스 문자열 생성
  const bubbleClass = `speech-bubble ${variant !== 'default' ? variant : ''} ${className} ${isVisible ? 'visible' : ''}`.trim().replace(/\s+/g, ' ');

  return (
    <div className={bubbleClass}>
      <div className="speech-text">{formattedText}</div>
      {showButton && (
        <button className="speech-button" onClick={onButtonClick}>
          알겠다람!
        </button>
      )}
    </div>
  );
}
