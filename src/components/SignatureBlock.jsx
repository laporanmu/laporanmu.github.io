import React from 'react';

export default function SignatureBlock({ label, nama, signatureUrl, mode }) {
  const isDigital = mode === 'digital' && signatureUrl;

  return (
    <div className="flex flex-col items-center text-center" style={{ flex: 1, minWidth: 0 }}>
      {/* Label Jabatan (support newlines) */}
      <div 
        className="text-xs text-gray-900 whitespace-pre-line leading-tight flex items-center justify-center text-center"
        style={{ 
          height: '48px', // Fixed height for label alignment
          fontSize: '9.5pt',
          fontWeight: 700,
          whiteSpace: 'pre-line',
          lineHeight: 1.25,
          marginBottom: '8px'
        }}
      >
        {label}
      </div>

      {/* Signature Area (height fixed 64px) */}
      <div 
        className="flex items-center justify-center w-full"
        style={{ height: '64px' }}
      >
        {isDigital && (
          <img
            src={signatureUrl}
            alt={`TTD ${label}`}
            crossOrigin="anonymous"
            className="max-h-16 object-contain"
            style={{ maxHeight: '64px', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Unified Signature Line Divider */}
      <div 
        style={{ 
          width: '128px', 
          borderTop: '1px solid rgb(156, 163, 175)', 
          marginTop: '8px' 
        }} 
      />

      {/* Penandatangan Name */}
      <div 
        className="font-semibold text-sm text-gray-900"
        style={{ 
          fontWeight: 700, 
          fontSize: '10.5pt',
          marginTop: '8px'
        }}
      >
        {nama}
      </div>
    </div>
  );
}
