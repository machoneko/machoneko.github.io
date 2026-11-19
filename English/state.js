import { buildSchedule, maxDailyNewWords, validPlanEvent, validPlanIds, validPlanSettings } from './schedule.js';

export const typeLabels = {
  vocabulary: '单词翻译',
  reading: '阅读理解',
  speaking: '口语',
  grammar: '语法',
  study: '词汇练习',
};

export const errorKinds = ['词义', '拼写', '细节理解', '推断', '时态', '主谓一致', '句型结构', '表达', '粗心', '其他'];

const defaultKinds = {
  vocabulary: '词义',
  reading: '细节理解',
  speaking: '表达',
  grammar: '句型结构',
  study: '词义',
};

const namespace = 'english-study-desk:v1';
const eventStoragePrefix = `${namespace}:events:`;
const maxStudyWords = 100;

export function questionKey(week, type, index) {
  return `${week}:${type}:${index}`;
}

export function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function recentDateKeys(endDate = localDateKey(), days = 7) {
  const [year, month, day] = endDate.split('-').map(Number);
  return Array.from({ length: days }, (_, index) => {
    return localDateKey(new Date(year, month - 1, day - days + 1 + index, 12));
  });
}

function normalizeTranslation(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]+/gu, '');
}

function translationParts(value) {
  return value.normalize('NFKC').split(/[,、;/|\n]+/u).map(normalizeTranslation).filter(Boolean);
}

function grade(type, question, answer) {
  if (type === 'speaking') return null;
  if (type !== 'vocabulary') return Number(answer) === question.answer;

  const accepted = question.answers.map(normalizeTranslation).filter(Boolean);
  if (accepted.includes(normalizeTranslation(answer))) return true;

  const parts = translationParts(answer);
  return parts.length > 1 && parts.every((part) => accepted.includes(part));
}

function normalizeEnglishSpelling(value) {
  return value.normalize('NFC').toLowerCase()
    .replace(/[‘’ʼ＇]/gu, "'")
    .replace(/[‐‑‒–—−﹣－]/gu, '-')
    .trim().replace(/\s+/gu, ' ');
}

function gradeStudy({ term, meaning }, answer, direction) {
  if (direction === 'zh-en') return normalizeEnglishSpelling(term) === normalizeEnglishSpelling(answer);
  if (meaning.normalize('NFKC').toLowerCase() === answer.normalize('NFKC').toLowerCase()) return true;
  const accepted = new Set([normalizeTranslation(meaning), ...translationParts(meaning)]);
  const response = normalizeTranslation(answer);
  if (!response) return false;
  if (accepted.has(response)) return true;
  const parts = translationParts(answer);
  return parts.length > 1 && parts.every((part) => accepted.has(part));
}

function uniqueId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function compareEvents(left, right) {
  return left.clock - right.clock || left.time.localeCompare(right.time) || left.id.localeCompare(right.id);
}

function validStudyGroupKey(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{2,179}$/u.test(value);
}

function validStudySetId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9-]{8,80}$/u.test(value);
}

function validStudyText(value, length, allowEmpty = false) {
  return typeof value === 'string' && value.length <= length && (allowEmpty || !!value.trim());
}

function validStudyWord(word) {
  return validStudyText(word?.term, 120) && validStudyText(word.meaning, 240) && validStudyText(word.example, 400, true);
}

function validStudySet(set) {
  return validStudySetId(set?.id) && validStudyText(set.title, 80) &&
    Array.isArray(set.words) && set.words.length > 0 && set.words.length <= maxStudyWords && set.words.every(validStudyWord);
}

function validStudyIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < maxStudyWords;
}

function validStudyDirection(direction) {
  return direction === undefined || direction === 'en-zh' || direction === 'zh-en';
}

function studyQuestionKey(groupKey, index, direction) {
  const key = `study:${groupKey}:${index}`;
  return direction === 'zh-en' ? `${key}:zh-en` : key;
}

function validStudyAttempt(attempt, event) {
  return attempt?.id === event.id && attempt.type === 'study' && attempt.mode === 'normal' &&
    attempt.time === event.time && attempt.date === event.date && validStudyGroupKey(attempt.groupKey) &&
    validStudyText(attempt.title, 80) && Array.isArray(attempt.items) && attempt.items.length > 0 &&
    attempt.items.length <= maxStudyWords && attempt.items.every((item) =>
      validStudyWord(item) && validStudyIndex(item.index) && validStudyDirection(item.direction) &&
      item.key === studyQuestionKey(attempt.groupKey, item.index, item.direction) &&
      validStudyText(item.answer, 200) && typeof item.correct === 'boolean' && item.kind === '' && item.note === '') &&
    new Set(attempt.items.map((item) => item.index)).size === attempt.items.length;
}

function validEvent(event) {
  if (typeof event?.id !== 'string' || !Number.isSafeInteger(event.clock) || event.clock < 1 ||
      typeof event.time !== 'string' || typeof event.date !== 'string') return false;

  switch (event.action) {
    case 'submit': {
      const attempt = event.attempt;
      return attempt?.id === event.id && attempt.type !== 'study' && Object.hasOwn(typeLabels, attempt.type) &&
        Number.isInteger(attempt.week) && attempt.time === event.time && attempt.date === event.date &&
        ['normal', 'review'].includes(attempt.mode) && Array.isArray(attempt.items) &&
        attempt.items.every((item) => Number.isInteger(item?.index) &&
          item.key === questionKey(attempt.week, attempt.type, item.index) && typeof item.answer === 'string' &&
          typeof item.note === 'string' && typeof item.kind === 'string' && [true, false, null].includes(item.correct));
    }
    case 'correct':
      return typeof event.attemptId === 'string' && Number.isInteger(event.index) && typeof event.correct === 'boolean';
    case 'error':
      return typeof event.attemptId === 'string' && typeof event.key === 'string' &&
        (event.kind === undefined || errorKinds.includes(event.kind)) &&
        (event.note === undefined || typeof event.note === 'string');
    case 'master':
      return typeof event.attemptId === 'string' && typeof event.key === 'string';
    case 'review-complete':
      return typeof event.reviewDate === 'string';
    case 'study-set-save':
      return validStudySet(event.set) && event.set.revision === event.id;
    case 'study-set-remove':
      return validStudySetId(event.setId);
    case 'study-complete':
      return validStudyGroupKey(event.groupKey);
    case 'study-submit':
      return validStudyAttempt(event.attempt, event);
    case 'plan-settings':
    case 'plan-complete':
      return validPlanEvent(event);
    default:
      return false;
  }
}

function validSnapshot(snapshot) {
  return snapshot?.version === 1 && Array.isArray(snapshot.events) && snapshot.events.every(validEvent);
}

function combineEvents(groups) {
  const combined = new Map();
  for (const group of groups) {
    for (const event of group) combined.set(event.id, event);
  }
  return [...combined.values()].sort(compareEvents);
}

function project(events) {
  const attempts = new Map();
  const pending = new Map();
  const latestScored = new Map();
  const errorPreferences = new Map();
  const completedReviews = new Set();
  const submittedDrafts = new Map();
  const studySets = new Map();
  const removedStudySets = new Set();
  const studySessions = new Map();
  const planEvents = [];

  function getStudySession(groupKey) {
    if (!studySessions.has(groupKey)) studySessions.set(groupKey, { completedDate: null, attempts: 0 });
    return studySessions.get(groupKey);
  }

  function applyScore(attempt, item, isNew) {
    if (item.correct === null) return;

    const previous = errorPreferences.get(item.key);
    if (item.correct === false) {
      const defaultKind = item.direction === 'zh-en' ? '拼写' : defaultKinds[attempt.type];
      item.kind ||= (isNew && previous?.kind) || defaultKind;
      if (isNew && previous) item.note = previous.note;
    }

    if ((latestScored.get(item.key) ?? -1) > attempt.order) return;
    latestScored.set(item.key, attempt.order);
    if (item.correct) {
      pending.delete(item.key);
      return;
    }

    errorPreferences.set(item.key, { kind: item.kind, note: item.note });
    pending.set(item.key, { attempt, item });
  }

  for (const [order, event] of events.entries()) {
    if (event.action === 'submit' || event.action === 'study-submit') {
      if (event.draftId && submittedDrafts.has(event.draftId)) continue;
      const attempt = { ...event.attempt, order, items: event.attempt.items.map((item) => ({ ...item })) };
      attempts.set(attempt.id, attempt);
      if (event.draftId) submittedDrafts.set(event.draftId, attempt.id);
      if (event.action === 'study-submit') {
        for (const item of attempt.items) item.direction ??= 'en-zh';
        const session = getStudySession(attempt.groupKey);
        session.attempts++;
        session.lastAttempt = attempt;
      }
      for (const item of attempt.items) applyScore(attempt, item, true);
    }

    if (event.action === 'correct') {
      const attempt = attempts.get(event.attemptId);
      const item = attempt?.items.find((entry) => entry.index === event.index);
      if (!item) continue;
      item.correct = event.correct;
      applyScore(attempt, item, false);
    }

    if (event.action === 'error') {
      const attempt = attempts.get(event.attemptId);
      const item = attempt?.items.find((entry) => entry.key === event.key);
      if (!item) continue;
      if (event.kind !== undefined) item.kind = event.kind;
      if (event.note !== undefined) item.note = event.note;
      if (latestScored.get(item.key) === attempt.order && item.correct === false) {
        errorPreferences.set(item.key, { kind: item.kind, note: item.note });
      }
    }

    if (event.action === 'master' && pending.get(event.key)?.attempt.id === event.attemptId) {
      pending.delete(event.key);
    }

    if (event.action === 'review-complete') completedReviews.add(event.reviewDate);

    if (event.action === 'study-set-save' && !removedStudySets.has(event.set.id)) studySets.set(event.set.id, event.set);

    if (event.action === 'study-set-remove') {
      studySets.delete(event.setId);
      removedStudySets.add(event.setId);
    }

    if (event.action === 'study-complete') getStudySession(event.groupKey).completedDate ??= event.date;
    if (event.action === 'plan-settings' || event.action === 'plan-complete') planEvents.push(event);
  }

  const misses = new Map();
  for (const attempt of attempts.values()) {
    for (const item of attempt.items) {
      if (item.correct === false) misses.set(item.key, (misses.get(item.key) ?? 0) + 1);
    }
  }

  const queue = [...pending.values()].sort((left, right) => right.attempt.order - left.attempt.order);
  return {
    attempts,
    completedReviews,
    submittedDrafts,
    studySets,
    studySessions,
    planEvents,
    queue: queue.map(({ attempt, item }) => ({
      key: item.key,
      week: attempt.week,
      type: attempt.type,
      index: item.index,
      kind: item.kind,
      note: item.note,
      answer: item.answer,
      attemptId: attempt.id,
      date: attempt.date,
      count: misses.get(item.key) ?? 0,
      ...(attempt.type === 'study' && {
        groupKey: attempt.groupKey,
        title: attempt.title,
        term: item.term,
        meaning: item.meaning,
        example: item.example,
        direction: item.direction,
      }),
    })),
  };
}

function publicAttempt(attempt) {
  if (!attempt) return undefined;
  const { order, ...record } = attempt;
  return { ...record, items: record.items.map((item) => ({ ...item })) };
}

export function createStore(weeks, { storage, now = () => new Date(), onCommit } = {}) {
  const course = new Map(weeks.map((week) => [week.number, week]));
  let readable = false;
  let writable = true;
  let refreshNeeded = true;
  let lastStorageSize = 0;
  let parts = new Map();
  let events = [];
  let current = project(events);
  let scheduleCache;

  function storageArea() {
    const area = storage === undefined ? globalThis.localStorage : storage;
    if (!area) throw new Error('Storage unavailable');
    return area;
  }

  function refresh() {
    try {
      const area = storageArea();
      const size = area.length;
      if (readable && !refreshNeeded && size === lastStorageSize) return;

      const found = new Map();
      for (let index = 0; index < size; index++) {
        const key = area.key(index);
        if (!key?.startsWith(eventStoragePrefix)) continue;
        const known = parts.get(key);
        if (known) {
          found.set(key, known);
          continue;
        }
        const snapshot = JSON.parse(area.getItem(key));
        if (!validSnapshot(snapshot)) throw new Error('Invalid learning records');
        found.set(key, snapshot.events);
      }

      const sorted = combineEvents(found.values());
      const next = project(sorted);
      parts = found;
      events = sorted;
      current = next;
      lastStorageSize = size;
      refreshNeeded = false;
      readable = true;
    } catch {
      readable = false;
    }
  }

  function saveError() {
    writable = false;
    return new Error('浏览器无法保存学习记录。请检查存储权限或可用空间后重试。');
  }

  function persist(incoming) {
    if (!readable) throw saveError();
    const sorted = combineEvents([events, incoming]);
    const next = project(sorted);
    // Each write uses its own key so simultaneous tabs can both save without overwriting records.
    const key = `${eventStoragePrefix}${uniqueId()}`;
    try {
      storageArea().setItem(key, JSON.stringify({ version: 1, events: incoming }));
    } catch {
      throw saveError();
    }
    parts.set(key, incoming);
    events = sorted;
    current = next;
    lastStorageSize++;
    writable = true;
  }

  function capture(action, detail, date = now()) {
    const clock = Math.max(date.getTime(), (events.at(-1)?.clock ?? 0) + 1);
    return { id: uniqueId(), clock, date: localDateKey(date), time: date.toISOString(), action, ...detail };
  }

  function commit(event) {
    persist([event]);
    if (onCommit) queueMicrotask(onCommit);
  }

  function questions(week, type) {
    const list = course.get(Number(week))?.[type];
    if (type === 'study' || !Object.hasOwn(typeLabels, type) || !Array.isArray(list)) throw new Error('找不到这组练习。');
    return list;
  }

  function draftStorageKey(week, type) {
    return `${namespace}:draft:${Number(week)}:${type}`;
  }

  function readDraft(week, type) {
    try {
      const raw = storageArea().getItem(draftStorageKey(week, type));
      if (raw === null) return undefined;
      const draft = JSON.parse(raw);
      if (typeof draft?.id !== 'string' || !draft.answers || typeof draft.answers !== 'object' ||
          Array.isArray(draft.answers) || current.submittedDrafts.has(draft.id)) return undefined;
      return draft;
    } catch {
      writable = false;
      return undefined;
    }
  }

  function submit(week, type, answers, mode, draftId) {
    const list = questions(week, type);
    const indices = list.keys();
    const items = [];
    for (const index of indices) {
      if (mode === 'review' && !Object.hasOwn(answers, index)) continue;
      const question = list[index];
      const answer = String(answers[index] ?? '').trim();
      if (!answer) throw new Error('请填写所选题目后再提交。');
      if (question.options && (!/^\d+$/u.test(answer) || Number(answer) >= question.options.length)) {
        throw new Error('请选择有效的答案。');
      }
      items.push({ index, key: questionKey(week, type, index), answer, correct: grade(type, question, answer), kind: '', note: '' });
    }
    if (!items.length) throw new Error('请填写所选题目后再提交。');

    const event = capture('submit', { draftId });
    event.attempt = { id: event.id, week: Number(week), type, date: event.date, time: event.time, mode, items };
    commit(event);
    const attemptId = current.submittedDrafts.get(draftId) ?? event.id;
    return publicAttempt(current.attempts.get(attemptId));
  }

  function history(date) {
    refresh();
    return [...current.attempts.values()]
      .filter((attempt) => date === undefined || attempt.date === date)
      .sort((left, right) => right.time.localeCompare(left.time) || right.order - left.order)
      .map(publicAttempt);
  }

  function reviewQueue(date) {
    refresh();
    const view = date === undefined ? current : project(events.filter((event) => event.date <= date));
    return view.queue.map((entry) => ({ ...entry }));
  }

  function trimStudyText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function studyWord({ term, meaning, example } = {}) {
    return { term: trimStudyText(term), meaning: trimStudyText(meaning), example: trimStudyText(example) };
  }

  function studySession(groupKey) {
    refresh();
    const session = current.studySessions.get(groupKey);
    return {
      completed: !!session?.completedDate,
      completedDate: session?.completedDate ?? null,
      attempts: session?.attempts ?? 0,
      lastAttempt: publicAttempt(session?.lastAttempt),
    };
  }

  function saveStudySet({ id, title, words } = {}) {
    refresh();
    const previous = id === undefined ? undefined : current.studySets.get(id);
    if (id !== undefined && !previous) throw new Error('找不到这组自定义内容。');
    const set = {
      id: previous?.id ?? uniqueId(),
      title: trimStudyText(title),
      words: Array.isArray(words) && words.length <= maxStudyWords ? Array.from(words, (word) => studyWord(word ?? {})) : [],
    };
    if (!validStudySet(set)) throw new Error('请输入 80 字以内的名称和 1–100 条有效的学习内容。');
    if (previous?.title === set.title && JSON.stringify(previous.words) === JSON.stringify(set.words)) {
      return structuredClone(previous);
    }
    const event = capture('study-set-save');
    event.set = { ...set, revision: event.id };
    commit(event);
    return structuredClone(event.set);
  }

  function submitStudy({ groupKey, title, items } = {}) {
    if (!validStudyGroupKey(groupKey)) throw new Error('找不到这组学习内容。');
    if (!studySession(groupKey).completed) throw new Error('请先完成学习，再开始练习。');
    const event = capture('study-submit');
    const answers = Array.isArray(items) && items.length <= maxStudyWords ? Array.from(items, (item) => {
      const word = studyWord(item ?? {});
      const answer = trimStudyText(item?.answer);
      const index = item?.index;
      const direction = item?.direction === undefined ? 'en-zh' : item.direction;
      return {
        ...word, index, direction, key: studyQuestionKey(groupKey, index, direction), answer,
        correct: gradeStudy(word, answer, direction), kind: '', note: '',
      };
    }) : [];
    event.attempt = {
      id: event.id, type: 'study', groupKey, title: trimStudyText(title),
      date: event.date, time: event.time, mode: 'normal', items: answers,
    };
    if (!validStudyAttempt(event.attempt, event)) throw new Error('请填写本次练习的所有答案。');
    commit(event);
    return publicAttempt(current.attempts.get(event.id));
  }

  function scheduleForToday(today = localDateKey(now())) {
    refresh();
    if (scheduleCache?.source !== current.planEvents || scheduleCache.today !== today) {
      scheduleCache = { source: current.planEvents, today, schedule: buildSchedule(current.planEvents, today) };
    }
    return scheduleCache.schedule;
  }

  function getStudyPlan() {
    const settings = scheduleForToday().getSettings();
    return settings ? { ...settings } : null;
  }

  function saveStudyPlan({ dailyGoal, scope } = {}) {
    if (!validPlanSettings({ dailyGoal, scope })) {
      throw new Error('请输入 1–200 之间的每日新词数，并选择词库范围。');
    }
    const previous = getStudyPlan();
    if (previous?.dailyGoal === dailyGoal && previous.scope === scope) return previous;
    commit(capture('plan-settings', { dailyGoal, scope }));
    return getStudyPlan();
  }

  function planDay(date) {
    return scheduleForToday().getDay(date);
  }

  function completePlan({ date, kind, ids, failedIds = [] } = {}) {
    const when = now();
    const today = localDateKey(when);
    if ((date ?? today) !== today) throw new Error('只能记录今天的学习或复习。');
    if (!['new', 'review'].includes(kind) || !validPlanIds(ids) || !validPlanIds(failedIds, true)) {
      throw new Error('请选择今天的有效学习任务。');
    }
    const selected = new Set(ids);
    if ((kind === 'new' && (ids.length > maxDailyNewWords || failedIds.length)) || failedIds.some(id => !selected.has(id))) {
      throw new Error('本次学习记录包含无效结果。');
    }

    const day = scheduleForToday(today).getDay(today);
    if (!day.settings) throw new Error('请先保存学习计划。');
    const remaining = new Set(kind === 'new' ? day.newWords : day.reviewWords);
    const completed = new Set(kind === 'new' ? day.learnedToday : day.reviewedToday);
    if (ids.some(id => !remaining.has(id) && !completed.has(id))) {
      throw new Error('今天的计划已更新，请重新选择任务。');
    }

    const fresh = ids.filter(id => remaining.has(id));
    if (!fresh.length) return day;
    const event = capture('plan-complete', { kind, ids: fresh }, when);
    if (kind === 'review') event.failedIds = failedIds.filter(id => remaining.has(id));
    commit(event);
    return planDay(today);
  }

  if (storage === undefined && typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('storage', (event) => {
      if (event.key === null || event.key.startsWith(eventStoragePrefix)) refreshNeeded = true;
    });
  }
  refresh();

  return {
    get storageAvailable() { return readable && writable; },
    getDraft(week, type) {
      refresh();
      return { ...readDraft(week, type)?.answers };
    },
    setDraft(week, type, index, value) {
      refresh();
      if (!questions(week, type)[index]) return;
      const draft = readDraft(week, type) ?? { id: uniqueId(), answers: {} };
      draft.answers[index] = String(value ?? '');
      try {
        storageArea().setItem(draftStorageKey(week, type), JSON.stringify(draft));
        writable = true;
      } catch {
        throw saveError();
      }
    },
    restart(week, type) {
      try {
        storageArea().removeItem(draftStorageKey(week, type));
        writable = true;
      } catch {
        throw saveError();
      }
    },
    submit(week, type) {
      refresh();
      const draft = readDraft(week, type);
      return submit(week, type, draft?.answers ?? {}, 'normal', draft?.id);
    },
    submitReview(week, type, answers) {
      refresh();
      return submit(week, type, answers, 'review');
    },
    getAttempt(id) {
      refresh();
      return publicAttempt(current.attempts.get(id));
    },
    studySets() {
      refresh();
      return [...current.studySets.values()].map((set) => structuredClone(set));
    },
    saveStudySet,
    removeStudySet(id) {
      refresh();
      if (!current.studySets.has(id)) return;
      commit(capture('study-set-remove', { setId: id }));
    },
    getStudySession: studySession,
    completeStudy(groupKey) {
      if (!validStudyGroupKey(groupKey)) throw new Error('找不到这组学习内容。');
      if (studySession(groupKey).completed) return;
      commit(capture('study-complete', { groupKey }));
    },
    submitStudy,
    getStudyPlan,
    saveStudyPlan,
    planDay,
    completePlan,
    history,
    setCorrect(id, index, correct) {
      refresh();
      const item = current.attempts.get(id)?.items.find((entry) => entry.index === Number(index));
      if (!item || typeof correct !== 'boolean' || item.correct === correct) return;
      commit(capture('correct', { attemptId: id, index: item.index, correct }));
    },
    getError(key) {
      return reviewQueue().find((entry) => entry.key === key);
    },
    setError(key, { kind, note } = {}) {
      refresh();
      const entry = current.queue.find((item) => item.key === key);
      if (!entry) return;
      const patch = {};
      if (errorKinds.includes(kind) && kind !== entry.kind) patch.kind = kind;
      if (typeof note === 'string' && note.trim() !== entry.note) patch.note = note.trim();
      if (!Object.keys(patch).length) return;
      commit(capture('error', { key, attemptId: entry.attemptId, ...patch }));
    },
    master(key) {
      refresh();
      const entry = current.queue.find((item) => item.key === key);
      if (!entry) return;
      commit(capture('master', { key, attemptId: entry.attemptId }));
    },
    reviewQueue,
    completeReview(date = localDateKey(now())) {
      refresh();
      if (current.completedReviews.has(date)) return;
      commit(capture('review-complete', { reviewDate: date }));
    },
    reviewCompleted(date = localDateKey(now())) {
      refresh();
      return current.completedReviews.has(date);
    },
    daySummary(date = localDateKey(now())) {
      const attempts = history(date);
      const items = attempts.flatMap((attempt) => attempt.items);
      const scored = items.filter((item) => item.correct !== null);
      const correct = scored.filter((item) => item.correct).length;
      const errors = new Map();
      for (const item of scored) {
        if (item.correct) continue;
        errors.set(item.kind, (errors.get(item.kind) ?? 0) + 1);
      }
      return {
        date,
        attempts: attempts.length,
        answered: items.length,
        scored: scored.length,
        correct,
        accuracy: scored.length ? Math.round(100 * correct / scored.length) : null,
        errors: [...errors].map(([kind, count]) => ({ kind, count })).sort((left, right) => right.count - left.count),
        pending: reviewQueue(date),
        reviewCompleted: current.completedReviews.has(date),
      };
    },
    getSnapshot() {
      refresh();
      return JSON.parse(JSON.stringify({ version: 1, events }));
    },
    mergeSnapshot(snapshot) {
      refresh();
      if (!validSnapshot(snapshot)) throw new Error('学习记录同步失败，请稍后重试。');
      const known = new Set(events.map((event) => event.id));
      const incoming = snapshot.events.filter((event) => {
        if (known.has(event.id)) return false;
        known.add(event.id);
        return true;
      });
      if (!incoming.length) return false;
      persist(structuredClone(incoming));
      return true;
    },
  };
}
