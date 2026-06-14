'use client';

import { useEffect, useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('brandy-theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('brandy-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('brandy-theme', 'light');
    }
  }

  return { dark, toggle };
}
