'use client';

import { useMemo, useState } from 'react';
import RuneAtlas from '../RuneAtlas';

export default function RuneLibraryClient({ runes = [] }) {
  const [group, setGroup] = useState('');
  const groups = useMemo(() => [...new Set(runes.map(card => card?.所屬分組).filter(Boolean))], [runes]);

  return <RuneAtlas runes={runes} groups={groups} group={group} setGroup={setGroup} />;
}
