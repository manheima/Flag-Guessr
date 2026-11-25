import React from 'react';
import { getFlagUrl } from '../data/countries';

interface FlagImageProps {
  code: string;
  name: string;
  className?: string;
}

export const FlagImage: React.FC<FlagImageProps> = ({ code, name, className = '' }) => {
  return (
    <img
      src={getFlagUrl(code)}
      alt={`Flag of ${name}`}
      draggable={false}
      loading="eager"
      decoding="async"
      className={`aspect-[4/3] object-cover select-none ${className}`}
    />
  );
};
