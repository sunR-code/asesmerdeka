import React from 'react';

interface BrandLogoProps {
  size?: number;
}

/**
 * Ikon resmi AsesMerdeka: Buku Kurikulum Merdeka + Monogram 'A' + Centang Asesmen + Bintang AI Emas
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 38 }) => {
  return (
    <img
      src="/favicon.svg"
      alt="Logo AsesMerdeka"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.24)',
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
};

