import './SpeechBubble.css';

export default function SpeechBubble({ text, isVisible }) {
  return (
    <div className={`speech-bubble ${isVisible ? 'visible' : ''}`}>
      {text}
    </div>
  );
}
