import './SelectField.css';

export default function SelectField({ value, onChange, options, ariaLabel = '선택' }) {
  return (
    <label className="select-field">
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
