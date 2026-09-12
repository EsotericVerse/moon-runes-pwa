'use client';

import { useCallback, useEffect, useState } from 'react';

export function useLocalStore(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved !== null) setValue(JSON.parse(saved));
    } catch (error) {
      console.warn(`LOC local store read failed: ${key}`, error);
    } finally {
      setReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`LOC local store write failed: ${key}`, error);
    }
  }, [key, ready, value]);

  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  const importJson = useCallback((text, validate) => {
    const parsed = JSON.parse(text);
    const next = validate ? validate(parsed) : parsed;
    setValue(next);
    return next;
  }, []);

  const exportJson = useCallback((filename = 'loc-local-data.json') => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [value]);

  return { value, setValue, ready, reset, importJson, exportJson };
}

export function updateById(items, id, patch) {
  return items.map(item => item.id === id ? { ...item, ...patch } : item);
}

export function removeById(items, id) {
  return items.filter(item => item.id !== id);
}
