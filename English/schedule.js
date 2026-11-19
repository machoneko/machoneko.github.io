const dayMs = 86_400_000;

export const planScopeSizes = Object.freeze({ core: 3500, extended: 4500, all: 5000 });
export const planReviewIntervals = Object.freeze([1, 2, 4, 7, 15, 30]);
export const maxDailyNewWords = 200;

function calendarDay(date) {
  if (typeof date !== 'string' || !/^(?:19[0-9]{2}|[2-9][0-9]{3})-[0-9]{2}-[0-9]{2}$/u.test(date)) return null;
  const time = Date.parse(date);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return null;
  return time / dayMs;
}

function dateKey(day) {
  return new Date(day * dayMs).toISOString().slice(0, 10);
}

export function validPlanSettings({ dailyGoal, scope } = {}) {
  return Number.isInteger(dailyGoal) && dailyGoal >= 1 && dailyGoal <= maxDailyNewWords &&
    typeof scope === 'string' && Object.hasOwn(planScopeSizes, scope);
}

export function validPlanIds(ids, allowEmpty = false) {
  return Array.isArray(ids) && (allowEmpty || ids.length > 0) && ids.length <= planScopeSizes.all &&
    Array.from(ids).every(id => Number.isInteger(id) && id >= 0 && id < planScopeSizes.all) &&
    new Set(ids).size === ids.length;
}

export function validPlanEvent(event) {
  if (calendarDay(event.date) === null) return false;
  if (event.action === 'plan-settings') return validPlanSettings(event);
  if (event.action !== 'plan-complete' || !['new', 'review'].includes(event.kind) || !validPlanIds(event.ids)) return false;
  if (event.kind === 'new') return event.ids.length <= maxDailyNewWords && event.failedIds === undefined;
  if (!validPlanIds(event.failedIds, true)) return false;
  const ids = new Set(event.ids);
  return event.failedIds.every(id => ids.has(id));
}

export function buildSchedule(events, today) {
  // Replay by civil day so records synced late still move the correct calendar.
  // Array.sort is stable, preserving the store's event order inside each day.
  const timeline = events.map(event => ({ event, day: calendarDay(event.date) }))
    .sort((left, right) => left.day - right.day);
  const todayNumber = calendarDay(today);
  const current = materialize(timeline, todayNumber);

  function getSettings() {
    return current.settings;
  }

  function getDay(date = today) {
    const day = calendarDay(date);
    if (day === null) throw new Error('请选择有效日期。');
    return day > todayNumber ? projectedDay(current, date, day) :
      actualDay(day === todayNumber ? current : materialize(timeline, day), date);
  }

  return { getSettings, getDay };
}

function dueDay(firstDay, stage, previousReview = -Infinity) {
  if (stage >= planReviewIntervals.length) return Infinity;
  return Math.max(firstDay + planReviewIntervals[stage], previousReview + 1);
}

function materialize(timeline, day) {
  let settings = null;
  const words = new Map();

  for (const entry of timeline) {
    if (entry.day > day) break;
    const { event, day: eventDay } = entry;
    if (event.action === 'plan-settings') {
      settings = {
        dailyGoal: event.dailyGoal,
        scope: event.scope,
        startDate: settings?.startDate ?? event.date,
        updatedDate: event.date,
      };
      continue;
    }
    if (!settings) continue;
    if (event.kind === 'new') {
      for (const id of event.ids) {
        if (!words.has(id)) words.set(id, { firstDay: eventDay, stage: 0, lastDay: -Infinity, passed: false });
      }
      continue;
    }

    const failed = new Set(event.failedIds);
    for (const id of event.ids) {
      const word = words.get(id);
      if (!word) continue;
      const passed = !failed.has(id);
      if (word.lastDay === eventDay) {
        // Concurrent same-day reviews count once. A successful recall is retained.
        if (passed && !word.passed) {
          word.stage++;
          word.passed = true;
        }
        continue;
      }
      if (dueDay(word.firstDay, word.stage, word.lastDay) > eventDay) continue;
      word.lastDay = eventDay;
      word.passed = passed;
      if (passed) word.stage++;
    }
  }

  const learnedToday = [];
  const reviewedToday = [];
  if (settings) {
    let learned = 0;
    const totalWords = planScopeSizes[settings.scope];
    for (const [id, word] of words) {
      if (id < totalWords) learned++;
      if (word.firstDay === day) learnedToday.push(id);
      if (word.lastDay === day) reviewedToday.push(id);
    }
    settings = { ...settings, learned, totalWords, learnedAll: words.size };
  }
  return { day, settings, words, learnedToday, reviewedToday };
}

function emptyDay(date, projected, settings = null) {
  return { date, settings, newWords: [], reviewWords: [], learnedToday: [], reviewedToday: [], overdue: 0, projected };
}

function availableNewWords({ settings, words, learnedToday }) {
  const next = [];
  const limit = Math.max(0, settings.dailyGoal - learnedToday.length);
  for (let id = 0; id < settings.totalWords && next.length < limit; id++) {
    if (!words.has(id)) next.push(id);
  }
  return next;
}

function actualDay(state, date) {
  const { day, settings, words, learnedToday, reviewedToday } = state;
  if (!settings) return emptyDay(date, false);
  const due = [];
  for (const [id, word] of words) {
    const next = dueDay(word.firstDay, word.stage, word.lastDay);
    if (next <= day) due.push({ id, next });
  }
  due.sort((left, right) => (left.next - right.next) || (left.id - right.id));
  return {
    ...emptyDay(date, false, { ...settings }),
    newWords: availableNewWords(state),
    reviewWords: due.map(item => item.id),
    learnedToday: [...learnedToday].sort((left, right) => left - right),
    reviewedToday: [...reviewedToday].sort((left, right) => left - right),
    overdue: due.filter(item => item.next < day).length,
  };
}

function projectedReview(firstDay, stage, previousReview, from, target) {
  for (let review = stage; review < planReviewIntervals.length; review++) {
    const next = Math.max(from, dueDay(firstDay, review, previousReview));
    if (next >= target) return next === target;
    previousReview = next;
  }
  return false;
}

function projectedDay(state, date, target) {
  const { day, settings, words } = state;
  if (!settings) return emptyDay(date, true);

  const projection = emptyDay(date, true, { ...settings });
  let learnedBeforeDay = settings.learned;
  let learnedAllBeforeDay = settings.learnedAll;
  const remainingToday = Math.max(0, settings.dailyGoal - state.learnedToday.length);

  for (const [id, word] of words) {
    if (projectedReview(word.firstDay, word.stage, word.lastDay, day, target)) projection.reviewWords.push(id);
  }

  let position = 0;
  for (let id = 0; id < settings.totalWords; id++) {
    if (words.has(id)) continue;
    const firstDay = position < remainingToday ? day : day + 1 + Math.floor((position - remainingToday) / settings.dailyGoal);
    position++;
    if (firstDay > target) break;
    if (firstDay === target) projection.newWords.push(id);
    if (firstDay < target) {
      learnedBeforeDay++;
      learnedAllBeforeDay++;
      if (projectedReview(firstDay, 0, -Infinity, day, target)) projection.reviewWords.push(id);
    }
  }
  projection.settings.learned = learnedBeforeDay;
  projection.settings.learnedAll = learnedAllBeforeDay;
  projection.reviewWords.sort((left, right) => left - right);
  return projection;
}
