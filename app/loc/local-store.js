'use client';

import { useNeonSetting } from './use-neon-setting';

// Compatibility hook for existing UI consumers.
// Persistent settings are backed by Neon user_settings; there is no browser database.
export function useLocalStore(key, initialValue) {
  const state=useNeonSetting(key,initialValue);
  return {
    ...state,
    isPersistent:Boolean(state.account?.user)
  };
}

export function updateById(items, id, patch) {
  return items.map(item => item.id === id ? { ...item, ...patch } : item);
}

export function removeById(items, id) {
  return items.filter(item => item.id !== id);
}
