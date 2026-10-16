'use client';

import { useState } from 'react';
import Select from './Select';

// Fin de journée locale, dans `days` jours.
function endOfDayIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

export function expiryStatus(expiresAt?: string | null): { text: string; expired: boolean } {
  if (!expiresAt) return { text: "Sans date d'expiration", expired: false };
  const end = new Date(expiresAt);
  const date = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (end.getTime() <= Date.now()) return { text: `Expiré depuis le ${date}`, expired: true };
  const days = Math.ceil((end.getTime() - Date.now()) / 86400_000);
  return { text: `Expire le ${date} (dans ${days} jour${days > 1 ? 's' : ''})`, expired: false };
}

// Choix d'une durée de validité : durées prédéfinies, sans expiration ou date précise.
export default function ExpiryPicker({ onChange, placeholder = 'Modifier la durée…', value = '' }: {
  onChange: (expiresAt: string | null) => void;
  placeholder?: string;
  value?: string;
}) {
  const [custom, setCustom] = useState(false);
  const min = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        className="text-xs"
        value={value}
        placeholder={placeholder}
        onChange={v => {
          if (v === 'custom') { setCustom(true); return; }
          setCustom(false);
          onChange(v === 'none' ? null : endOfDayIn(Number(v)));
        }}
        options={[
          { value: '7', label: '7 jours' },
          { value: '30', label: '30 jours' },
          { value: '90', label: '90 jours' },
          { value: 'none', label: "Sans date d'expiration" },
          { value: 'custom', label: 'Choisir une date…' },
        ]}
      />
      {custom && (
        <input
          type="date"
          min={min}
          onChange={e => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split('-').map(Number);
            onChange(new Date(y, m - 1, d, 23, 59, 59).toISOString());
            setCustom(false);
          }}
          className="px-2 py-1.5 rounded-lg text-xs outline-none border bg-white dark:bg-gray-900"
          style={{ borderColor: 'var(--border)' }}
        />
      )}
    </div>
  );
}
