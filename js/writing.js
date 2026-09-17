import registry from '../data/json/registries/WRITING_REGISTRY.json';

export const writingWorks = Object.freeze([...(registry?.works || [])]);

export function getWritingWork(workId) {
  return writingWorks.find(work => work.work_id === workId) || null;
}

export function publicSourceRefs(work) {
  return [...(work?.source_refs || [])].filter(ref => {
    if (!ref || typeof ref !== 'object') return false;
    if (ref.public === false || ref.visibility === 'private') return false;
    return typeof ref.url === 'string' && /^https?:\/\//i.test(ref.url);
  });
}
