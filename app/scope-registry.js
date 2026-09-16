export const SHARED_SCOPE_FUNCTIONS = Object.freeze([
  ['脈絡', 'context'],
  ['統計', 'statics'],
  ['文化', 'evolution'],
  ['治理', 'governance']
]);

export const SCOPE_REGISTRY = Object.freeze({
  loc: Object.freeze({
    id: 'loc',
    zhName: '月典',
    enName: 'Luna Codex',
    vocabulary: '月典',
    host: 'loc.lo3rwang.cc',
    base: '',
    dataset: 'loc',
    reserved: ['月之符文', '/runes'],
    role: [['作者頁面', 'https://whoami.lo3rwang.cc']],
    homes: [['回月典首頁', '/']]
  }),
  runes: Object.freeze({
    id: 'runes',
    zhName: '月之符文',
    enName: 'LunaRunes',
    vocabulary: '語彙',
    host: 'lrunes.lo3rwang.cc',
    base: '/runes',
    dataset: 'runes',
    reserved: ['語彙', '/runes'],
    role: [['作者頁面', 'https://whoami.lo3rwang.cc']],
    homes: [['回月之符文首頁', '/runes'], ['回月典首頁', 'https://loc.lo3rwang.cc']]
  }),
  author: Object.freeze({
    id: 'author',
    zhName: '作者',
    enName: 'Author',
    vocabulary: '風格詞',
    host: 'whoami.lo3rwang.cc',
    base: '',
    dataset: 'author',
    managerHome: 'https://manage.lo3rwang.cc',
    reserved: ['風格詞', '/'],
    role: [['管理者頁面', 'https://manage.lo3rwang.cc']],
    homes: [['回作者頁面', '/'], ['回月典首頁', 'https://loc.lo3rwang.cc']]
  })
});

export function detectScope(pathname = '/', host = '') {
  if (host === 'lrunes.lo3rwang.cc' || pathname === '/runes' || pathname.startsWith('/runes/')) return 'runes';
  if (host === 'whoami.lo3rwang.cc') return 'author';
  return 'loc';
}

export function getScope(scope) {
  return SCOPE_REGISTRY[scope] || SCOPE_REGISTRY.loc;
}

export function scopeRoute(scopeOrConfig, name) {
  const config = typeof scopeOrConfig === 'string' ? getScope(scopeOrConfig) : scopeOrConfig;
  return `${config.base}/${name}`.replace(/\/+/g, '/') || '/';
}

export function scopeOwns(scope, dataset) {
  if (scope === 'author') return dataset === 'author' || dataset === 'loc' || dataset === 'runes';
  return getScope(scope).dataset === dataset;
}
