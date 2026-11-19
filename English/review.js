import { localDateKey, recentDateKeys, typeLabels } from './state.js';

const icons = {
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6m3.5 3.5 1.5 1.5"/>',
  notebook: '<path d="M5 5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 1-2-2zM5 17a2 2 0 0 1 2-2h12M9 7h6m-6 4h4"/>',
  accuracy: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  activity: '<path d="M4 18h16M6 14v-4m6 4V6m6 8v-7"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>',
  review: '<path d="M5 10a7 7 0 1 1 1 7M4 5v6h6"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 11h16m-12 4h2m4 0h2"/>',
  history: '<path d="M5 10a7 7 0 1 1 1 7M4 5v6h6m2-3v4l3 2"/>',
  trend: '<path d="M4 4v15h16M8 15l4-5 3 2 4-6"/>',
};

function symbol(name) {
  return `<span class="study-symbol" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[name]}</svg></span>`;
}

function panelTitle(icon, title) {
  return `<div class="study-panel-title">${symbol(icon)}<h2>${title}</h2></div>`;
}

function empty(title, detail, action = '') {
  return `<div class="study-empty"><h3>${title}</h3><p>${detail}</p>${action}</div>`;
}

function referenceAnswer(type, question) {
  if (type === 'study') return question?.direction === 'zh-en' ? question.term : question?.meaning;
  if (type === 'vocabulary') return question?.answers.join(' / ');
  if (type === 'speaking') return question?.example;
  return question?.options?.[question.answer];
}

function answerDetails(esc, type, question, answer) {
  const reference = referenceAnswer(type, question);
  const answerLanguage = type === 'study' ? (question?.direction === 'zh-en' ? ' lang="en"' : ' lang="zh-CN"') : '';
  return `<dl class="study-answer-list">
    <div><dt>我的答案</dt><dd${answer ? answerLanguage : ''}>${esc(answer || '未填写')}</dd></div>
    ${reference ? `<div><dt>参考答案</dt><dd${answerLanguage}>${esc(reference)}</dd></div>` : ''}
    ${question?.explanation ? `<div><dt>解析</dt><dd>${esc(question.explanation)}</dd></div>` : ''}
    ${type === 'study' && question?.example ? `<div><dt>例句</dt><dd lang="en">${esc(question.example)}</dd></div>` : ''}
  </dl>`;
}

function retryButton(esc, week, type, key = '') {
  return `<button type="button" class="btn secondary" data-action="practice-again" data-week="${esc(week)}" data-type="${esc(type)}"${key ? ` data-key="${esc(key)}"` : ''}>${key ? '重做此题' : '再做一遍'}</button>`;
}

function studyRetryButton(esc, groupKey, {index, direction, indices} = {}) {
  const single = Number.isInteger(index);
  const position = single ? ` data-index="${index}" data-direction="${direction === 'zh-en' ? 'zh-en' : 'en-zh'}"` : ` data-indices="${esc(indices.join(','))}"`;
  return `<button type="button" class="btn secondary" data-action="study-retry" data-group="${esc(groupKey)}"${position}>${single ? '重做此题' : '复练这组'}</button>`;
}

function studyDirection(item) {
  return item.direction === 'zh-en' ? '中译英' : '英译中';
}

function studyPrompt(item) {
  return item.direction === 'zh-en' ? { text:item.meaning, language:'zh-CN' } : { text:item.term, language:'en' };
}

function practiceLabel(esc, entry) {
  return entry.type === 'study' ? `${esc(entry.title)} · ${typeLabels.study}` : `第 ${esc(entry.week)} 周 · ${typeLabels[entry.type]}`;
}

function errorCard(entry, { esc, question: getQuestion, answerText, errorKinds }) {
  const study = entry.type === 'study';
  const question = study ? entry : getQuestion(entry.week, entry.type, entry.index);
  const prompt = study ? studyPrompt(entry) : {text:question?.prompt,language:'en'};
  const answer = study ? entry.answer : answerText(entry.week, entry.type, entry.index, entry.answer);
  const key = esc(entry.key);
  return `<article class="review-error">
    <div class="study-item-meta">
      <span class="study-tag wrong">${esc(entry.kind || '其他')}</span>
      <span>${practiceLabel(esc, entry)}</span>
      ${study ? `<span>${studyDirection(entry)}</span>` : ''}
      ${entry.count > 1 ? `<span>累计错 ${esc(entry.count)} 次</span>` : ''}
    </div>
    <h3 lang="${prompt.language}">${esc(prompt.text || entry.key)}</h3>
    <details class="study-answer-detail">
      <summary>我的答案和解析</summary>
      ${answerDetails(esc, entry.type, question, answer)}
    </details>
    <div class="study-edit-grid">
      <label class="study-field">错误类型
        <select class="study-control" data-review-kind>
          ${errorKinds.map(kind => `<option value="${esc(kind)}"${kind === entry.kind ? ' selected' : ''}>${esc(kind)}</option>`).join('')}
        </select>
      </label>
      <label class="study-field">错因笔记
        <input class="study-control" type="text" placeholder="记录容易混淆的地方" maxlength="600" data-review-note value="${esc(entry.note || '')}">
      </label>
    </div>
    <div class="study-review-buttons">
      <button type="button" class="btn ghost" data-action="review-note" data-key="${key}">保存错因</button>
      ${study ? studyRetryButton(esc, entry.groupKey, {index:entry.index,direction:entry.direction}) : retryButton(esc, entry.week, entry.type, entry.key)}
      <button type="button" class="btn ghost" data-action="review-master" data-key="${key}">标为已掌握</button>
    </div>
  </article>`;
}

function formatTimer(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function renderReview({ week, helper, reviewMode }) {
  const { esc, store } = helper;
  const { seconds = 300, running = false, started = false, completed = false } = reviewMode || {};
  const rows = store.reviewQueue();
  const reviewed = store.reviewCompleted();
  const title = running ? '暂停计时' : completed || seconds === 0 ? '重新计时' : started ? '继续计时' : '开始计时';
  const currentWeek = typeof week === 'object' ? week?.number : week;
  return `<section class="study-view" aria-labelledby="review-title">
    <header class="study-view-header">
      <div><h1 id="review-title">错题整理</h1><p>回顾错因，把容易混淆的题再做一遍。</p></div>
      ${reviewed ? '<span class="study-tag right">今日已整理</span>' : ''}
    </header>
    <div class="study-panel-grid study-review-grid">
      <section class="study-panel">
        <header class="study-panel-header">${panelTitle('notebook', '待巩固错题')}<span class="study-tag">${rows.length} 题</span></header>
        <div class="study-queue">
          ${rows.length ? rows.map(item => errorCard(item, helper)).join('') : empty('目前没有待巩固的错题', '核对答案并标记错误后，这里会显示题目和错因。', currentWeek ? `<button type="button" class="btn secondary" data-action="practice-again" data-week="${esc(currentWeek)}" data-type="vocabulary">去做练习</button>` : '')}
        </div>
      </section>
      <aside class="study-panel study-timer" aria-labelledby="review-timer-title">
        <header class="study-panel-header">
          <div class="study-panel-title">${symbol('timer')}<h2 id="review-timer-title">每日 5 分钟</h2></div>
        </header>
        <div class="timer-value" role="timer" aria-label="剩余时间">${formatTimer(Math.max(0, Math.ceil(seconds)))}</div>
        <div class="study-review-buttons">
          <button type="button" class="btn primary" data-action="timer-toggle">${title}</button>
          <button type="button" class="btn ghost" data-action="timer-reset"${started || seconds !== 300 ? '' : ' disabled'}>重置</button>
        </div>
        <ol class="study-timer-steps">
          <li>选几道容易重复出错的题。</li>
          <li>补充错因，遮住答案后重做。</li>
          <li>确认理解后标为已掌握。</li>
        </ol>
        <div class="study-timer-save">
          <button type="button" class="btn secondary" data-action="review-save"${reviewed ? ' disabled' : ''}>${reviewed ? '已记录今日整理' : '记录今日整理'}</button>
        </div>
      </aside>
    </div>
  </section>`;
}

function dateElements(date) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function friendlyDate(date) {
  const { year, month, day } = dateElements(date);
  return `${year} 年 ${month} 月 ${day} 日`;
}

function adjacentDay(date, offset) {
  const { year, month, day } = dateElements(date);
  return localDateKey(new Date(year, month - 1, day + offset, 12));
}

function dateTools(selected, today) {
  return `<div class="study-date-tools">
    <button type="button" class="btn secondary study-day-button" data-action="progress-date" data-date="${adjacentDay(selected, -1)}">前一天</button>
    <label class="study-field">统计日期
      <input class="study-control" type="date" data-input="progress-date" value="${selected}" max="${today}">
    </label>
    <button type="button" class="btn secondary study-day-button" data-action="progress-date" data-date="${adjacentDay(selected, 1)}"${selected >= today ? ' disabled' : ''}>后一天</button>
  </div>`;
}

function metric(icon, label, value, detail, esc) {
  return `<div class="study-panel study-metric">
    <div class="study-metric-label">${symbol(icon)}${label}</div>
    <strong>${esc(value)}</strong>
    <p>${esc(detail)}</p>
  </div>`;
}

function renderTrend(selected, store) {
  const bars = recentDateKeys(selected, 7).map(date => {
    const { month, day } = dateElements(date);
    const { accuracy } = store.daySummary(date);
    const display = accuracy === null ? '没有已判题目' : `正确率 ${accuracy}%`;
    return `<button type="button" class="study-trend-day" data-action="progress-date" data-date="${date}"${date === selected ? ' aria-current="date"' : ''} aria-label="${friendlyDate(date)}，${display}" title="${display}">
      <span class="study-bar-wrap" aria-hidden="true"><span class="study-bar${accuracy === null ? ' no-data' : ''}" style="--pct:${accuracy ?? 0}%"></span></span>
      <time datetime="${date}">${month}/${day}</time>
    </button>`;
  });
  return `<section class="study-panel">
    <header class="study-panel-header">${panelTitle('trend', '7 天正确率')}</header>
    <figure class="study-trend">
      <div class="study-trend-axis">
        <div class="study-trend-grid" aria-hidden="true"></div>
        <div class="study-trend-scale" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
        ${bars.join('')}
      </div>
      <figcaption>点击日期查看当天记录。虚线表示当天没有已判题目。</figcaption>
    </figure>
  </section>`;
}

function renderErrors(summary, esc) {
  return `<section class="study-panel">
    <header class="study-panel-header">${panelTitle('alert', '常见错误')}</header>
    ${summary.errors.length ? `<ul class="study-count-list">${summary.errors.map(item => `<li><span>${esc(item.kind)}</span><span class="study-tag wrong">${esc(item.count)} 次</span></li>`).join('')}</ul>` : '<p>当天没有已标记的错误。</p>'}
  </section>`;
}

function renderPending(summary, { esc, question: getQuestion }) {
  const rows = summary.pending.map(item => {
    const study = item.type === 'study';
    const prompt = study ? studyPrompt(item) : {text:getQuestion(item.week, item.type, item.index)?.prompt,language:'en'};
    return `<li>
      <span><strong lang="${prompt.language}">${esc(prompt.text || item.key)}</strong><small>${practiceLabel(esc, item)}${study ? ` · ${studyDirection(item)}` : ''} · ${esc(item.kind || '其他')}</small></span>
    </li>`;
  });
  return `<section class="study-panel">
    <header class="study-panel-header">${panelTitle('review', '待巩固内容')}</header>
    ${rows.length ? `<ul class="study-pending">${rows.join('')}</ul>
      <div class="study-pending-actions"><button type="button" class="btn secondary" data-action="nav" data-view="review">打开错题整理</button></div>` : '<p>当天没有待巩固的错题。</p>'}
  </section>`;
}

function isExpanded(expanded, id) {
  if (expanded instanceof Set) return expanded.has(id);
  if (Array.isArray(expanded)) return expanded.includes(id);
  return expanded === id;
}

function attemptScore(attempt) {
  const scored = attempt.items.filter(item => typeof item.correct === 'boolean');
  const correct = scored.filter(item => item.correct).length;
  return scored.length ? `${correct}/${scored.length} 题正确` : '未自评';
}

function historyAttempt(attempt, expanded, { esc, question: getQuestion, answerText }) {
  const time = new Date(attempt.time);
  const displayTime = Number.isNaN(time.valueOf()) ? '' : time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const id = esc(attempt.id);
  const study = attempt.type === 'study';
  const retry = attempt.items.length === 1
    ? {index:attempt.items[0].index,direction:attempt.items[0].direction}
    : {indices:attempt.items.map(item=>item.index)};
  const items = expanded ? attempt.items.map(item => {
    const question = study ? item : getQuestion(attempt.week, attempt.type, item.index);
    const prompt = study ? studyPrompt(item) : {text:question?.prompt,language:'en'};
    const answer = study ? item.answer : answerText(attempt.week, attempt.type, item.index, item.answer);
    const result = item.correct === true ? '正确' : item.correct === false ? '错误' : '未自评';
    const resultClass = item.correct === true ? 'right' : item.correct === false ? 'wrong' : 'open';
    return `<li>
      <span class="study-tag ${resultClass}">${result}${study ? ` · ${studyDirection(item)}` : ''}${item.correct === false && item.kind ? ` · ${esc(item.kind)}` : ''}</span>
      <h3 lang="${prompt.language}">${esc(prompt.text || item.key)}</h3>
      ${answerDetails(esc, attempt.type, question, answer)}
      ${item.note ? `<p>错因笔记　${esc(item.note)}</p>` : ''}
    </li>`;
  }).join('') : '';
  return `<article class="study-record">
    <header class="study-record-heading">
      <div>
        <h3>${practiceLabel(esc, attempt)}</h3>
        <p class="study-item-meta">${esc(displayTime)} · ${attempt.mode === 'review' ? '错题重做' : '独立练习'} · ${attemptScore(attempt)}</p>
      </div>
      <div class="study-record-actions">
        <button type="button" class="btn ghost" data-action="history-toggle" data-id="${id}" aria-expanded="${expanded}" aria-controls="attempt-${id}">${expanded ? '收起作答' : '查看作答'}</button>
        ${study ? studyRetryButton(esc, attempt.groupKey, retry) : retryButton(esc, attempt.week, attempt.type)}
      </div>
    </header>
    ${expanded ? `<ol class="study-record-answers" id="attempt-${id}">${items}</ol>` : `<div id="attempt-${id}" hidden></div>`}
  </article>`;
}

function historyFilters(historyWeek, historyType, { esc, weeks }) {
  return `<div class="study-history-filters">
    <label class="study-field">练习周次
      <select class="study-control" data-input="history-week">
        <option value="all">全部周次</option>
        ${weeks.map(week => `<option value="${esc(week.number)}"${Number(historyWeek) === week.number ? ' selected' : ''}>第 ${esc(week.number)} 周</option>`).join('')}
      </select>
    </label>
    <label class="study-field">练习类型
      <select class="study-control" data-input="history-type">
        <option value="all">全部类型</option>
        ${Object.entries(typeLabels).map(([type, label]) => `<option value="${type}"${historyType === type ? ' selected' : ''}>${label}</option>`).join('')}
      </select>
    </label>
  </div>`;
}

function attemptWeek(attempt) {
  if (attempt.type !== 'study') return attempt.week;
  const match = /^week:(\d+):/.exec(attempt.groupKey);
  return match ? Number(match[1]) : null;
}

export function renderProgress({ selectedDate, historyType, historyWeek, expandedHistory, helper }) {
  const { esc, store } = helper;
  const today = localDateKey();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) && selectedDate <= today ? selectedDate : today;
  const summary = store.daySummary(selected);
  const history = store.history(selected).filter(attempt => {
    const weekMatches = !historyWeek || historyWeek === 'all' || Number(historyWeek) === attemptWeek(attempt);
    const typeMatches = !historyType || historyType === 'all' || historyType === attempt.type;
    return weekMatches && typeMatches;
  });
  const wrongCount = summary.errors.reduce((count, item) => count + item.count, 0);
  return `<section class="study-view" aria-labelledby="progress-title">
    <header class="study-view-header">
      <div><h1 id="progress-title">进步统计</h1><p>${friendlyDate(selected)}${selected === today ? ' · 今天' : ''}</p></div>
      ${dateTools(selected, today)}
    </header>
    <div class="study-metrics" aria-label="当日统计">
      ${metric('accuracy', '正确率', summary.accuracy === null ? '—' : `${summary.accuracy}%`, summary.scored ? `答对 ${summary.correct} / ${summary.scored} 题` : '当天无已判题目', esc)}
      ${metric('activity', '练习次数', summary.attempts, `共作答 ${summary.answered} 题`, esc)}
      ${metric('alert', '错误次数', wrongCount, `${summary.errors.length} 种错误类型`, esc)}
      ${metric('review', '待巩固', summary.pending.length, summary.reviewCompleted ? '已记录 5 分钟整理' : '当天尚未整理', esc)}
    </div>
    <div class="study-panel-grid">
      ${renderTrend(selected, store)}
      <div class="study-progress-sidebar">
        ${renderErrors(summary, esc)}
        ${renderPending(summary, helper)}
      </div>
    </div>
    <section class="study-panel" aria-labelledby="history-title">
      <header class="study-panel-header">
        <div class="study-panel-title">${symbol('history')}<h2 id="history-title">练习历史</h2></div>
        ${historyFilters(historyWeek, historyType, helper)}
      </header>
      <div class="study-history">
        ${history.length ? history.map(attempt => historyAttempt(attempt, isExpanded(expandedHistory, attempt.id), helper)).join('') : empty('这一天没有符合条件的记录', '可切换日期、周次或练习类型查看。')}
      </div>
    </section>
  </section>`;
}
