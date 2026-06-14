'use client';

import { useState, useEffect, useRef } from 'react';
import { Module } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

const DEFAULT_BASE = 8;
const DEFAULT_STEPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 10, 12, 16];

function pxToRem(px: number) {
  const rem = px / 16;
  return rem % 1 === 0 ? `${rem}rem` : `${parseFloat(rem.toFixed(3))}rem`;
}

function tokenName(base: number, step: number) {
  const val = base * step;
  // Use the px value as token index (e.g. space-8, space-16)
  return `space-${val % 1 === 0 ? val : parseFloat(val.toFixed(1))}`;
}

export default function SpacingModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const base = module.spacingBase ?? DEFAULT_BASE;
  const steps = module.spacingSteps ?? DEFAULT_STEPS;
  const [baseInput, setBaseInput] = useState(String(base));
  const [newStep, setNewStep] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const prevEditing = useRef(isEditing);

  // Save base when leaving edit mode
  useEffect(() => {
    if (prevEditing.current && !isEditing) {
      const parsed = parseFloat(baseInput);
      if (!isNaN(parsed) && parsed > 0 && parsed !== base) {
        fetch(`/api/modules/${module.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ spacingBase: parsed }),
        }).then(r => r.json()).then(onUpdate);
      }
    }
    prevEditing.current = isEditing;
  }, [isEditing]);

  async function patchSteps(newSteps: number[]) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spacingSteps: newSteps }),
    });
    onUpdate(await res.json());
  }

  async function addStep() {
    const val = parseFloat(newStep);
    if (isNaN(val) || val <= 0 || steps.includes(val)) return;
    await patchSteps([...steps, val].sort((a, b) => a - b));
    setNewStep('');
    setShowAdd(false);
  }

  async function removeStep(step: number) {
    await patchSteps(steps.filter(s => s !== step));
  }

  // Use live input value for preview, fall back to saved base
  const liveBase = parseFloat(baseInput);
  const previewBase = isEditing && !isNaN(liveBase) && liveBase > 0 ? liveBase : base;

  // Largest px value for proportional bar width
  const maxPx = Math.max(...steps.map(s => previewBase * s));
  const BAR_MAX_WIDTH = 480; // px, logical max width for the bar

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />

      {/* Base unit setting */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-gray-500">Unité de base :</span>
        {isEditing ? (
          <div className="flex items-center gap-1 border rounded-lg overflow-hidden text-sm" style={{ borderColor: 'var(--border)' }}>
            <input
              className="w-14 px-2 py-1 outline-none text-right font-mono"
              value={baseInput}
              onChange={e => setBaseInput(e.target.value)}
            />
            <span className="px-2 text-gray-400 dark:text-gray-500 text-xs bg-gray-50 dark:bg-gray-800/50 border-l py-1" style={{ borderColor: 'var(--border)' }}>px</span>
          </div>
        ) : (
          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">{base}px</span>
        )}
      </div>

      {/* Spacing scale */}
      <div className="space-y-2">
        {steps.map(step => {
          const px = previewBase * step;
          const barWidth = Math.round((px / maxPx) * BAR_MAX_WIDTH);
          const label = tokenName(previewBase, step);
          return (
            <div key={step} className="flex items-center gap-4 group">
              {/* Token name */}
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-24 flex-shrink-0 text-right">{label}</span>

              {/* Bar */}
              <div className="flex-1 flex items-center gap-3">
                <div
                  className="h-6 rounded"
                  style={{ width: Math.max(barWidth, 4), background: brandColor, opacity: 0.85, minWidth: 4 }}
                />
              </div>

              {/* Values */}
              <div className="flex items-center gap-3 flex-shrink-0 w-36">
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300 w-14 text-right">{px % 1 === 0 ? px : parseFloat(px.toFixed(1))}px</span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{pxToRem(px)}</span>
              </div>

              {/* Multiplier + delete */}
              <div className="flex items-center gap-2 flex-shrink-0 w-20">
                <span className="text-[10px] text-gray-300 dark:text-gray-500">×{step}</span>
                {isEditing && (
                  <button onClick={() => removeStep(step)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-300 dark:text-gray-500 hover:text-red-400">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add step */}
      {isEditing && (
        <div className="mt-4">
          {showAdd ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">Multiplicateur :</span>
              <input
                autoFocus
                className="w-20 border rounded-lg px-2 py-1 text-sm font-mono outline-none"
                style={{ borderColor: 'var(--border)' }}
                placeholder="ex: 20"
                value={newStep}
                onChange={e => setNewStep(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addStep(); if (e.key === 'Escape') setShowAdd(false); }}
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">→ {parseFloat(newStep) > 0 ? `${previewBase * parseFloat(newStep)}px` : '—'}</span>
              <button onClick={addStep} className="text-xs px-3 py-1 rounded-lg text-white" style={{ background: brandColor }}>Ajouter</button>
              <button onClick={() => setShowAdd(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">Annuler</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors mt-3"
            >
              <Plus size={12} /> Ajouter un pas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
