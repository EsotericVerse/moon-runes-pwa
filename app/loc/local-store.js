'use client';

import useLocalStorageState from 'use-local-storage-state';

export function useLocalStore(key, initialValue) {
  const [value, setValue, { removeItem, isPersistent }] = useLocalStorageState(key, {
    defaultValue: initialValue,
    storageSync: false
  });

  return {
    value,
    setValue,
    reset: removeItem,
    isPersistent
  };
}

export function updateById(items, id, patch) {
  return items.map(item => item.id === id ? { ...item, ...patch } : item);
}

export function removeById(items, id) {
  return items.filter(item => item.id !== id);
}
