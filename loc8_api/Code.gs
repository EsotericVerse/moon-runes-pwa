const LOC8_SPREADSHEET_ID = '1v2Sl4a1x9AvQgxdwrfxyhox8pHxmhbqhBL6YstH_ekg';
const USER_SHEET = 'User';
const EVENT_SHEET = 'Event';
const ERA_SHEET = 'Era';
const RUNE_SHEET = 'Runes';
const HISTORY_SHEET = 'History';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'events').toLowerCase();
    const userId = String((e && e.parameter && e.parameter.user_id) || '').trim();

    if (action === 'health') {
      return json_({ ok: true, service: 'LOC8', schema: 'loc8-mvp-0.5' });
    }

    if (action === 'users') {
      return json_({ ok: true, users: readRows_(USER_SHEET) });
    }

    if (action === 'eras') {
      return json_({ ok: true, eras: readRowsSafe_(ERA_SHEET) });
    }

    if (action === 'runes') {
      return json_({ ok: true, runes: readRowsSafe_(RUNE_SHEET) });
    }

    if (action === 'history' || action === 'daily_draws') {
      let history = readRowsSafe_(HISTORY_SHEET);
      if (userId) history = history.filter(row => String(row.user_id || '') === userId);
      const draws = history.filter(row => {
        const t = String(row.history_type || '').toLowerCase();
        return t === 'daily_draw' || t === 'daily_draw_supplement';
      });
      return json_({ ok: true, history: history, daily_draws: draws });
    }

    let events = readRows_(EVENT_SHEET)
      .filter(row => !isDailyDrawRecord_(row));
    if (userId) events = events.filter(row => String(row.user_id || '') === userId);
    return json_({ ok: true, events: events });
  } catch (err) {
    return json_({ ok: false, error: errorText_(err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || 'event').toLowerCase();

    if (action === 'user') {
      const user = normalizeUser_(body.user || body);
      appendObject_(USER_SHEET, user);
      return json_({ ok: true, user: user });
    }

    if (action === 'daily_draw') {
      const draw = normalizeDailyDraw_(body.daily_draw || body.event || body);
      appendObject_(HISTORY_SHEET, draw);
      return json_({ ok: true, daily_draw: draw, action: 'daily_draw' });
    }

    if (action === 'migrate_daily_draws') {
      const result = migrateLegacyDailyDraws_();
      return json_({ ok: true, action: 'migrate_daily_draws', result: result });
    }

    if (action === 'update_event') {
      const raw = body.event || body;
      const id = String(raw.id || '').trim();
      if (!id) throw new Error('Missing event id');
      const event = normalizeEvent_(raw);
      event.id = id;
      const updated = updateObjectById_(EVENT_SHEET, id, event, event.user_id);
      return json_({ ok: true, event: updated, action: 'update_event' });
    }

    if (action === 'archive_event') {
      const raw = body.event || body;
      const id = String(raw.id || body.id || '').trim();
      const userId = String(raw.user_id || body.user_id || '').trim();
      if (!id) throw new Error('Missing event id');
      const updated = updateObjectById_(EVENT_SHEET, id, { status: 'archived' }, userId);
      return json_({ ok: true, event: updated, action: 'archive_event' });
    }

    if (action === 'event') {
      const raw = body.event || body;
      if (isDailyDrawRecord_(raw)) {
        const draw = normalizeDailyDraw_(raw);
        appendObject_(HISTORY_SHEET, draw);
        return json_({ ok: true, daily_draw: draw, action: 'daily_draw' });
      }
      const event = normalizeEvent_(raw);
      appendObject_(EVENT_SHEET, event);
      return json_({ ok: true, event: event, action: 'event' });
    }

    throw new Error('Unsupported action: ' + action);
  } catch (err) {
    return json_({ ok: false, error: errorText_(err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = e.postData.contents;
  try {
    return JSON.parse(text);
  } catch (err) {
    const out = {};
    text.split('&').forEach(pair => {
      const parts = pair.split('=');
      const key = decodeURIComponent(parts.shift() || '');
      const value = decodeURIComponent(parts.join('=') || '');
      if (key) out[key] = value;
    });
    return out;
  }
}

function readRowsSafe_(sheetName) {
  const ss = SpreadsheetApp.openById(LOC8_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return readRows_(sheetName);
}

function isDailyDrawRecord_(raw) {
  const type = String(raw.event_type || raw.type || '').toLowerCase();
  const title = String(raw.title || raw.event_title || '');
  const tags = String(raw.tags || '').toLowerCase();
  const source = String(raw.source || '').toLowerCase();
  return (
    type === 'daily_draw' ||
    type === 'daily_draw_supplement' ||
    type.indexOf('daily draw') >= 0 ||
    type.indexOf('daily_draw') >= 0 ||
    /^每日抽牌[｜|]/.test(title) ||
    /^補抽[｜|]/.test(title) ||
    tags.indexOf('daily-draw') >= 0 ||
    tags.indexOf('daily_draw') >= 0 ||
    source.indexOf('daily-draw') >= 0
  );
}

function normalizeDailyDraw_(raw) {
  const now = new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const createdAt = Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const title = String(raw.title || raw.event_title || '');
  const eventType = String(raw.event_type || raw.draw_kind || 'daily_draw');
  const kind = eventType.toLowerCase().indexOf('supplement') >= 0 || /^補抽[｜|]/.test(title)
    ? 'daily_draw_supplement'
    : 'daily_draw';

  let rune = String(raw.rune || raw.object_id || '').trim();
  let direction = String(raw.direction || '').trim();

  if ((!rune || !direction) && title) {
    const cleaned = title.replace(/^每日抽牌[｜|]/, '').replace(/^補抽[｜|]/, '');
    const match = cleaned.match(/^(.+?)(正位|半正位|半逆位|逆位)$/);
    if (match) {
      if (!rune) rune = match[1];
      if (!direction) direction = match[2];
    }
  }

  return {
    id: raw.id || makeId_('HIS'),
    user_id: raw.user_id || 'lo3rwang',
    date: raw.date || Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
    history_type: kind,
    rune_id: raw.rune_id || '',
    rune: rune,
    direction: direction,
    real_moon_phase: raw.real_moon_phase || '',
    note: raw.note || raw.description || '',
    interpretation: raw.interpretation || '',
    tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || ''),
    source: raw.source || 'life.html#daily-draw',
    confidence: raw.confidence || 'recorded',
    created_at: raw.created_at || createdAt,
    system_id: raw.system_id || 'lo3rwang',
    era_id: raw.era_id || '',
    updated_at: raw.updated_at || createdAt,
    visibility: raw.visibility || 'private'
  };
}

function migrateLegacyDailyDraws_() {
  const legacy = readRows_(EVENT_SHEET).filter(isDailyDrawRecord_);
  const existing = readRowsSafe_(HISTORY_SHEET);
  const ids = {};
  existing.forEach(row => { if (row.id) ids[String(row.id)] = true; });

  let copied = 0;
  legacy.forEach(row => {
    const draw = normalizeDailyDraw_(row);
    if (ids[String(draw.id)]) return;
    appendObject_(HISTORY_SHEET, draw);
    ids[String(draw.id)] = true;
    copied++;
  });

  return { legacy_found: legacy.length, copied: copied, already_present: legacy.length - copied };
}

function readRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];

  const headers = values[0].map(v => String(v).trim());
  return values.slice(1)
    .filter(row => row.some(v => String(v).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i] == null ? '' : row[i];
      });
      return obj;
    });
}

function appendObject_(sheetName, object) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(sheetName);
    const headers = getHeaders_(sheet);
    if (!headers.length) throw new Error(sheetName + ' has no headers');
    const row = headers.map(h => serializeCell_(object[h]));
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

function updateObjectById_(sheetName, id, patch, expectedUserId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(sheetName);
    const headers = getHeaders_(sheet);
    const idCol = headers.indexOf('id');
    if (idCol < 0) throw new Error(sheetName + ' has no id column');

    const values = sheet.getDataRange().getDisplayValues();
    let targetRow = -1;

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idCol] || '').trim() !== String(id).trim()) continue;

      if (expectedUserId) {
        const userCol = headers.indexOf('user_id');
        if (userCol >= 0 && String(values[r][userCol] || '').trim() !== String(expectedUserId).trim()) {
          throw new Error('Event owner mismatch');
        }
      }

      targetRow = r + 1;
      break;
    }

    if (targetRow < 0) throw new Error('Event not found: ' + id);

    const existing = {};
    headers.forEach((h, i) => existing[h] = values[targetRow - 1][i] == null ? '' : values[targetRow - 1][i]);
    const merged = Object.assign({}, existing, patch, { id: id });

    const row = headers.map(h => serializeCell_(merged[h]));
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);

    const result = {};
    headers.forEach((h, i) => result[h] = row[i]);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function getHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(v => String(v).trim())
    .filter(Boolean);
}

function serializeCell_(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value == null ? '' : value;
}

function normalizeEvent_(raw) {
  const now = new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const createdAt = Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const date = raw.date || Utilities.formatDate(now, tz, 'yyyy-MM-dd');

  return {
    id: raw.id || makeId_('EV'),
    user_id: raw.user_id || 'lo3rwang',
    date: date,
    object_type: raw.object_type || 'person',
    object_id: raw.object_id || '',
    event_type: raw.event_type || 'transition',
    title: raw.title || raw.event_title || '',
    description: raw.description || '',
    state_before: raw.state_before || '',
    state_after: raw.state_after || '',
    era: raw.era || '',
    tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || ''),
    status: raw.status || 'current',
    source: raw.source || '',
    confidence: raw.confidence || 'recorded',
    created_at: raw.created_at || createdAt,
    system_id: raw.system_id || 'lo3rwang',
    primary_loc: raw.primary_loc || 'LOC8',
    related_locs: Array.isArray(raw.related_locs) ? raw.related_locs.join(', ') : (raw.related_locs || ''),
    era_id: raw.era_id || ''
  };
}

function normalizeUser_(raw) {
  const now = new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  return {
    user_id: raw.user_id || makeId_('USR'),
    display_name: raw.display_name || '',
    provider: raw.provider || 'local',
    provider_user_id: raw.provider_user_id || '',
    email: raw.email || '',
    created_at: raw.created_at || Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    status: raw.status || 'active',
    visibility: raw.visibility || 'private'
  };
}

function makeId_(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
}

function getSheet_(name) {
  const ss = SpreadsheetApp.openById(LOC8_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function errorText_(err) {
  return String(err && err.message ? err.message : err);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
