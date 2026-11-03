'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VENEZUELAN_BANKS } from '@/lib/banks';
import { Bank } from '@/lib/types';
import { Search, ChevronDown, Check } from 'lucide-react';

interface BankSelectProps {
  value: string; // 4-digit code e.g. '0102'
  onChange: (bank: Bank) => void;
  error?: string;
  disabled?: boolean;
}

export function BankSelect({ value, onChange, error, disabled }: BankSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBank = VENEZUELAN_BANKS.find(b => b.code === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBanks = VENEZUELAN_BANKS.filter(bank => {
    const q = searchQuery.toLowerCase().trim();
    return (
      bank.code.includes(q) ||
      bank.name.toLowerCase().includes(q) ||
      bank.shortName.toLowerCase().includes(q)
    );
  });

  const handleSelect = (bank: Bank) => {
    onChange(bank);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
        Banco Destino (Pago Móvil) <span className="text-red-500">*</span>
      </label>

      {/* Botón trigger / Input visual */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-gray-800 border rounded-xl text-left cursor-pointer transition-all ${
          error
            ? 'border-red-500 ring-2 ring-red-100 dark:ring-red-950'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950 shadow-sm'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedBank ? (
            <>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                {selectedBank.code}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedBank.shortName}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Seleccione o escriba el banco...
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}

      {/* Menú desplegable con búsqueda */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escribe el nombre o código (ej: 0102, Banesco)..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {filteredBanks.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No se encontró ningún banco con &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = bank.code === value;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleSelect(bank)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                      isSelected ? 'bg-blue-50/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {bank.code}
                      </span>
                      <div>
                        <span className="font-medium block">{bank.shortName}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate block max-w-[280px]">
                          {bank.name}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

