const LOC8_SPREADSHEET_ID = '1v2Sl4a1x9AvQgxdwrfxyhox8pHxmhbqhBL6YstH_ekg';
const USER_SHEET = 'User';
const EVENT_SHEET = 'Event';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'events').toLowerCase();
    const userId = String((e && e.parameter && e.parameter.user_id) || '').trim();

    if (action === 'health') {
      return json_({ ok: true, service: 'LOC8', schema: 'loc8-mvp-0.2' });
    }

    if (action === 'users') {
      return json_({ ok: true, users: readRows_(USER_SHEET) });
    }

    let events = readRows_(EVENT_SHEET);
    if (userId) events = events.filter(row => String(row.user_id || '') === userId);
    return json_({ ok: true, events: events });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
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

    const event = normalizeEvent_(body.event || body);
    appendObject_(EVENT_SHEET, event);
    return json_({ ok: true, event: event });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
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
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
      .map(v => String(v).trim())
      .filter(Boolean);

    if (!headers.length) throw new Error(sheetName + ' has no headers');

    const row = headers.map(h => {
      const value = object[h];
      if (Array.isArray(value)) return value.join(', ');
      return value == null ? '' : value;
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

function normalizeEvent_(raw) {
  const now = new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const createdAt = Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const date = raw.date || Utilities.formatDate(now, tz, 'yyyy-MM-dd');

  return {
    id: raw.id || makeId_('EV'),
    user_id: raw.user_id || 'lucas',
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
    created_at: raw.created_at || createdAt
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

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
