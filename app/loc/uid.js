'use client';

const UID_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function createUid8(){
  const bytes=new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes,value=>UID_ALPHABET[value%UID_ALPHABET.length]).join('');
}
