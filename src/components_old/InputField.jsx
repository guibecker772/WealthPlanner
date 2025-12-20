import React from 'react';

export default function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="input-field" style={{ marginBottom: '15px' }}>
      {label && <label style={{ display: 'block', marginBottom: '5px' }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
        }}
      />
    </div>
  );
}
