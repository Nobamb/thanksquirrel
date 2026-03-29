import './SelectField.css';

export default function SelectField({ value, onChange, options, ariaLabel = '선택' }) {
  return (
    <label className="select-field">
      <select id="select-field" value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
        {options.map((option) => (
          <option name={`select-field-${option.value}`} id={`select-field-${option.value}`} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
