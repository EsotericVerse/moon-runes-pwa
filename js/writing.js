import registry from '../data/json/registries/WRITING_REGISTRY.json';

export const writingWorks = Object.freeze([...(registry?.works || [])]);

export function getWritingWork(workId) {
  return writingWorks.find(work => work.work_id === workId) || null;
}
