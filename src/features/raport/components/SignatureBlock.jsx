import React from 'react';

const blockStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

export default function SignatureBlock({ label, nama, signatureUrl, mode }) {
  const isDigital = mode === 'digital' && signatureUrl;

  return (
    <div className="raport-signature-block" style={blockStyle}>
      {/* Label Jabatan (support newlines) */}
      <div
        className="raport-signature-label"
        style={{
          height: '48px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9.5pt',
          fontWeight: 700,
          whiteSpace: 'pre-line',
          lineHeight: 1.25,
          marginBottom: '8px',
          textAlign: 'center',
          color: '#111827',
        }}
      >
        {label}
      </div>

      {/* Signature Area (height fixed 64px) */}
      <div
        className="raport-signature-image"
        style={{
          height: '64px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDigital && (
          <img
            src={signatureUrl}
            alt={`TTD ${label}`}
            crossOrigin="anonymous"
            style={{ maxHeight: '64px', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Unified Signature Line Divider */}
      <div
        className="raport-signature-line"
        style={{
          width: '128px',
          borderTop: '1px solid rgb(156, 163, 175)',
          marginTop: '8px',
        }}
      />

      {/* Penandatangan Name */}
      <div
        className="raport-signature-name"
        style={{
          width: '100%',
          fontWeight: 700,
          fontSize: '10.5pt',
          marginTop: '8px',
          textAlign: 'center',
          color: '#111827',
        }}
      >
        {nama}
      </div>
    </div>
  );
}
