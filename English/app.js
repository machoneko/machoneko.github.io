import { weeks } from './course.js';
import { createStore, localDateKey, errorKinds, typeLabels, questionKey } from './state.js';
import { renderReview, renderProgress } from './review.js';
import { createLearningView } from './learn.js';
import { createPlanView } from './plan.js';

const paths = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 5h2m4 0h2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  pin: '<path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z"/><path d="M9 8h6m-6 4h4"/>',
  chart: '<path d="M3 4v16h18M8 15v-3m5 3V8m5 7V5"/>',
  book: '<path d="M12 6c-2.4-1.8-5-2.2-9-1.5v14c4-.7 6.6-.3 9 1.5m0-14c2.4-1.8 5-2.2 9-1.5v14c-4-.7-6.6-.3-9 1.5m0-14v14"/>',
  word: '<path d="m3 18 5-12 5 12m-8-4h6m5-1c.3-1 1-1.5 2.2-1.5 1.5 0 2.8 1 2.8 2.5v4m0-3h-2.6c-3 0-3.2 3 0 3 1.5 0 2.6-.8 2.6-1.8"/>',
  reading: '<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v5h4M8 12h7m-7 4h7"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-3 0h6"/>',
  grammar: '<path d="m5 18 1-5L15 4a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8l-9 9-5 1m8-14 5 5M4 21h16"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 7v4l2.5 2m5-9 1-1"/>',
  play: '<path d="M8 5v14l11-7Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  cloud: '<path d="M7 18a4 4 0 1 1 0-8 5.5 5.5 0 0 1 10.4 1.2A3.5 3.5 0 0 1 18 18H7Z"/><path d="m10 14 1.5 1.5 3-3"/>',
};

const types = {
  vocabulary: {icon:'word', time:'约 3 分钟', help:'把英文单词或短语翻译成简体中文。'},
  reading: {icon:'reading', time:'约 5 分钟', help:'先读完文章，再选择每题最合适的答案。'},
  speaking: {icon:'mic', time:'约 3 分钟', help:'先用英语说一遍，再写下你用到的句子或关键词。'},
  grammar: {icon:'grammar', time:'约 3 分钟', help:'选择最合适的答案，提交后查看语法解析。'},
};
const weekByNumber = new Map(weeks.map(week => [week.number, week]));
const allTypes = Object.keys(types);
const app = document.getElementById('app');
const notification = document.getElementById('notification');
const browserRecords = !!document.querySelector('meta[name="study-records"][content="browser"]');
const expandedHistory = new Set();
let selection = routeFromHash();
let historyType = 'all';
let historyWeek = 'all';
let selectedDate = localDateKey();
let appDay = selectedDate;
let noticeTimeout;
let syncDelay;
let syncing = false;
let syncRequested = false;
let syncText = browserRecords ? '学习记录保存在此浏览器' : '正在同步学习记录';
let reviewMode = {seconds:300, running:false, completed:false, started:false, endAt:0};
const store = createStore(weeks, {onCommit:queueSync});
const today = localDateKey;

function esc(value = '') {
  const chars = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
  return String(value ?? '').replace(/[&<>"']/g, char => chars[char]);
}
function icon(name, size = 19) {
  return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.book) + '</svg>';
}
function dateLabel(value, full = false) {
  return new Intl.DateTimeFormat('zh-CN', {...(full ? {year:'numeric'} : {}),month:'long', day:'numeric', weekday:'short'})
    .format(new Date(value + 'T12:00:00'));
}
function question(week, type, index) {
  return weekByNumber.get(Number(week))?.[type]?.[Number(index)];
}
function answerText(week, type, index, answer) {
  const item = question(week, type, index);
  return item?.options ? item.options[Number(answer)] ?? '' : answer ?? '';
}
function reference(question) {
  if (question.options) return question.options[question.answer];
  return question.answers?.join(' / ') ?? question.example;
}

function routeFromHash() {
  const [view, w, type, questionIndex, id] = location.hash.slice(1).split('/');
  const week = weekByNumber.has(Number(w)) ? Number(w) : weeks[0].number;
  if (view === 'practice' && allTypes.includes(type)) {
    const index = questionIndex && /^\d+$/.test(questionIndex) && question(week, type, questionIndex) ? Number(questionIndex) : null;
    const attemptId = id && /^[\w-]+$/.test(id) ? id : null;
    return {view, week, type, index, attemptId};
  }
  if (view === 'plan' || (view === 'learn' && type === 'plan')) return {view:'learn',week,section:'plan'};
  if (view === 'learn') return {view,week,section:'words',weeklyStudy:type === 'week'};
  return {view:['review','progress'].includes(view) ? view : 'dashboard',week};
}
function isPlan(route) {
  return route.view === 'learn' && route.section === 'plan';
}
function go(next, replace = false) {
  if (isPlan(selection) && !isPlan(next)) plan.leave();
  selection = next;
  const parts = [next.view, next.week];
  if (next.view === 'practice') {
    parts.push(next.type);
    if (next.index != null || next.attemptId) parts.push(next.index ?? 'all');
    if (next.attemptId) parts.push(next.attemptId);
  }
  if (isPlan(next)) parts.push('plan');
  else if (next.view === 'learn' && next.weeklyStudy) parts.push('week');
  const hash = '#' + parts.join('/');
  if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash);
  render(true);
}
function notify(message) {
  notification.textContent = message;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => { notification.textContent = ''; }, 3400);
}
const helper = {esc,icon,typeName:(type)=>typeLabels[type],question,answerText,today,dateLabel,store,weeks,errorKinds};
const learning = createLearningView({store,weeks,esc,icon,notify,rerender:render});
const plan = createPlanView({store,esc,icon,dateKey:today,dateLabel:value=>dateLabel(value,true),notify,rerender:render});
if (selection.weeklyStudy) learning.selectWeek(selection.week);

function renderLearningHub() {
  const current = isPlan(selection) ? 'plan' : 'words';
  const sections = [
    ['plan','calendar','每日计划'],
    ['words','book','词库与默写'],
  ];
  return '<section class="learning-hub" aria-labelledby="learning-hub-title"><header class="learning-hub-header">' +
    '<h1 id="learning-hub-title">学习</h1><nav class="learning-hub-nav" aria-label="学习版块">' +
    sections.map(([section,symbol,label])=>'<button class="btn ghost" type="button" data-action="learn-section" data-section="' + section + '"' +
      (section === current ? ' aria-current="page"' : '') + '>' + icon(symbol,18) + label + '</button>').join('') +
    '</nav></header>' + (current === 'plan' ? plan.render() : learning.render()) + '</section>';
}

function render(moveFocus = false) {
  const {view, week} = selection;
  const pending = store.reviewQueue().length;
  const menu = [
    ['learn','book','学习'],
    ['dashboard','grid','每周练习'],
    ['review','pin','错题复习'],
    ['progress','chart','进步记录'],
  ];
  let page;
  if (view === 'learn') page = renderLearningHub();
  else if (view === 'review') page = renderReview({week, selectedDate:today(), helper, reviewMode});
  else if (view === 'progress') page = renderProgress({selectedDate, historyType, historyWeek, expandedHistory, helper});
  else if (view === 'practice') page = renderPractice();
  else page = renderDashboard(week);
  const recordLabel = browserRecords && !store.storageAvailable ? '此浏览器暂时无法保存记录' : syncText;
  app.innerHTML = '<div class="app-shell">' +
    '<header class="app-top"><a class="brand" href="#dashboard/' + week + '" data-action="nav" data-view="dashboard"><img src="./mark.svg" alt="" width="37" height="37">英语练习簿</a>' +
    '<span class="top-date">' + icon('calendar',17) + esc(dateLabel(today())) + '</span></header>' +
    '<aside class="sidebar"><nav class="nav-group" aria-label="主要导航"><p class="nav-label">学习空间</p>' +
    menu.map(([key,symbol,label])=>'<button class="nav-item" type="button" data-action="nav" data-view="' + key + '"' + (view === key || (key === 'dashboard' && view === 'practice') ? ' aria-current="page"' : '') + '>' + icon(symbol,18) + label + (key === 'review' && pending ? '<span class="nav-count">' + pending + '</span>' : '') + '</button>').join('') +
    '</nav><nav class="week-menu" aria-label="课程周次"><p class="nav-label">第 6–16 周</p><div class="week-list">' +
    weeks.map(item => '<button class="week-item" type="button" data-action="week" data-week="' + item.number + '"' + (week === item.number ? ' aria-current="true"' : '') + '>第 ' + item.number + ' 周<span class="week-label">' + esc(item.label) + '</span></button>').join('') +
    '</div></nav><p class="sidebar-sync">' + icon(browserRecords ? 'pin' : 'cloud',16) + '<span class="sync-text">' + esc(recordLabel) + '</span></p></aside>' +
    '<main class="main" id="main" tabindex="-1"><div class="main-content">' +
    (view === 'dashboard' || view === 'practice' ? mobileWeeks(week) : '') + page +
    (browserRecords ? '<p class="local-record-note">' + esc(recordLabel) + '</p>' : '') +
    '</div></main></div>';
  if (moveFocus) {
    window.scrollTo(0,0);
    document.getElementById('main').focus({preventScroll:true});
  }
}
function mobileWeeks(week) {
  return '<label class="mobile-weeks">选择周次 <span class="select-wrap"><select class="field-control" data-input="week">' +
    weeks.map(item=>'<option value="' + item.number + '"' + (item.number === week ? ' selected' : '') + '>第 ' + item.number + ' 周 · ' + esc(item.label) + '</option>').join('') +
    '</select>' + icon('chevron',16) + '</span></label>';
}
function renderDashboard(number) {
  const week = weekByNumber.get(number);
  const history = store.history().filter(attempt=>attempt.week === number && attempt.items.length === week[attempt.type].length);
  const finished = new Set(history.map(attempt=>attempt.type));
  const upcoming = allTypes.find(type=>!finished.has(type)) ?? 'vocabulary';
  const summary = store.daySummary(today());
  const total = allTypes.reduce((sum,type)=>sum + week[type].length,0);
  return '<section class="hero"><div class="hero-copy"><span class="hero-week">' + icon('book',17) + ' 第 ' + number + ' 周英语练习</span>' +
    '<h1 lang="en">' + esc(week.title) + '</h1><p>' + esc(week.label) + ' · ' + total + ' 道练习</p>' +
    '<div class="hero-actions"><button class="btn" type="button" data-action="study-week">' + icon('book',16) + '先学本周单词</button>' +
    '<button class="btn hero-practice" type="button" data-action="practice" data-type="' + upcoming + '">' + icon('play',16) + (finished.size ? '继续练习' : '开始练习') + '</button></div></div>' +
    '<div class="hero-art" aria-hidden="true"><div class="hero-orbit"></div><div class="book-art"><i></i><b>Aa</b></div><span class="word-art">Hello!</span><span class="art-spark">✧</span><span class="art-spark small">✦</span></div></section>' +
    '<div class="dashboard-grid"><section aria-labelledby="practice-title"><div class="section-title"><h2 id="practice-title">本周练习</h2><span>已完成 ' + finished.size + ' / 4 项</span></div><div class="practice-grid">' +
    allTypes.map(type=>'<button class="module-card card ' + type + '" type="button" data-action="practice" data-type="' + type + '"><span class="module-icon">' + icon(types[type].icon,21) + '</span><span class="module-time">' + types[type].time + '</span><h3>' + typeLabels[type] + '</h3><p>' + practiceCount(week,type) + (finished.has(type) ? ' · <span class="module-status">已练习</span>' : '') + '</p></button>').join('') +
    '</div></section><section aria-labelledby="today-title"><div class="section-title"><h2 id="today-title">今日进度</h2></div><div class="card today-card"><div class="metric-pair"><div><b>' + summary.attempts + '</b><span>练习次数</span></div><div><b>' + (summary.accuracy == null ? '—' : summary.accuracy + '%') + '</b><span>正确率</span></div></div>' +
    '<button class="btn ghost" type="button" data-action="nav" data-view="progress">查看进步记录</button></div><div class="card review-callout">' + icon('timer',22) + '<div><h3>每日 5 分钟错题整理</h3><p>' + (store.reviewCompleted(today()) ? '今日整理已完成' : (summary.pending.length ? summary.pending.length + ' 道题待巩固' : '整理错因，复练薄弱题目')) + '</p></div><button class="btn secondary" type="button" data-action="nav" data-view="review">' + (store.reviewCompleted(today()) ? '查看错题' : '开始整理') + '</button></div></section></div>';
}
function practiceCount(week, type) {
  if (type === 'reading') return '1 篇文章 · ' + week[type].length + ' 道题';
  return week[type].length + (type === 'speaking' ? ' 道口语题' : ' 道题');
}
function renderPractice() {
  const {week:number,type,index,attemptId} = selection;
  const week = weekByNumber.get(number);
  const attempt = attemptId ? store.getAttempt(attemptId) : null;
  const matching = attempt?.week === number && attempt?.type === type ? attempt : null;
  const draft = index == null ? store.getDraft(number,type) : {};
  const indices = index == null ? week[type].map((_,i)=>i) : [index];
  let passage = '';
  if (type === 'reading') {
    passage = '<article class="card passage" lang="en"><h2>' + esc(week.passageTitle) + '</h2>' + week.passage.map(block=>'<p>' + esc(block) + '</p>').join('') + '</article>';
  }
  return '<header class="practice-head"><div class="crumb"><button class="btn ghost" type="button" data-action="nav" data-view="dashboard">第 ' + number + ' 周</button><span aria-hidden="true">/</span><span lang="en">' + esc(week.title) + '</span></div>' +
    '<h1>' + typeLabels[type] + (index == null ? '' : '复练') + '</h1><p>' + types[type].help + '</p></header>' +
    '<nav class="practice-tabs card" aria-label="练习类别">' + allTypes.map(key=>'<button class="btn ghost" type="button" data-action="practice" data-type="' + key + '"' + (key === type ? ' aria-current="true"' : '') + '>' + icon(types[key].icon,16) + typeLabels[key] + '</button>').join('') + '</nav>' +
    '<div class="practice-grid-layout">' + passage + (matching ? renderResult(matching) :
    '<form id="quiz" class="quiz-form">' + indices.map(i=>renderQuestion(week[type][i],type,i,draft[i])).join('') +
    '<div class="quiz-actions"><button class="btn primary" type="submit">' + icon('check',17) + '提交并查看参考答案</button><p>' + (index == null ? '填写中的答案会保存在此浏览器。' : '本次只复练这道题。') + '</p></div></form>') + '</div>';
}
function renderQuestion(item, type, i, value = '') {
  const number = '<span class="quiz-index">' + (i + 1) + '.</span>';
  if (item.options) {
    return '<div class="card quiz-item" role="group" aria-labelledby="q-label-' + i + '"><p class="quiz-prompt" id="q-label-' + i + '">' + number + '<span lang="en">' + esc(item.prompt) + '</span></p>' +
      item.options.map((option,n)=>'<label class="quiz-option" lang="en"><input type="radio" data-answer="' + i + '" name="q' + i + '" value="' + n + '"' + (String(value) === String(n) ? ' checked' : '') + ' required><span>' + String.fromCharCode(65 + n) + '. ' + esc(option) + '</span></label>').join('') + '</div>';
  }
  const label = type === 'speaking' ? '我的口语笔记' : '我的翻译';
  const control = type === 'speaking'
    ? '<textarea lang="en" name="q' + i + '" data-answer="' + i + '" required maxlength="3000" placeholder="写下你刚才说的英语">' + esc(value) + '</textarea>'
    : '<input type="text" name="q' + i + '" data-answer="' + i + '" value="' + esc(value) + '" required maxlength="200" placeholder="输入中文译文" autocomplete="off">';
  return '<section class="quiz-item card"><h2 class="quiz-prompt">' + number + '<span lang="en">' + esc(item.prompt) + '</span></h2><label class="field">' + label + control + '</label></section>';
}
function renderResult(attempt) {
  const {week,type,id,items} = attempt;
  const correct = items.filter(item=>item.correct === true).length;
  const scored = items.filter(item=>item.correct != null).length;
  const summary = type === 'speaking' ? '对照口语示例，自评是否完成了表达目标。' : '本次答对 ' + correct + ' / ' + scored + ' 题，参考答案和解析见下方。';
  return '<section aria-label="练习结果"><div class="card result-banner"><h2>本次练习已记录</h2><p>' + summary + '</p></div><div class="quiz-form">' +
    items.map(item=> {
      const task = question(week,type,item.index);
      if (!task) return '';
      const key = questionKey(week,type,item.index);
      const error = store.getError(key);
      const label = item.correct == null ? '待自评' : item.correct ? (type === 'speaking' ? '已达标' : '正确') : '待巩固';
      const status = item.correct == null ? 'unrated' : item.correct ? 'correct' : 'wrong';
      let controls = '';
      if (item.correct !== true) controls += outcomeButton(id,item.index,true,type === 'speaking' ? '已达标' : '将此题标为正确');
      if (item.correct !== false) controls += outcomeButton(id,item.index,false,type === 'speaking' ? '标记待巩固' : '将此题标为错误');
      return '<section class="quiz-item card"><h3 class="quiz-prompt"><span class="quiz-index">' + (item.index + 1) + '.</span><span lang="en">' + esc(task.prompt) + '</span><span class="result-status ' + status + '">' + label + '</span></h3>' +
        '<dl class="result-meta"><div><dt>我的答案</dt><dd' + (type === 'vocabulary' ? '' : ' lang="en"') + '>' + esc(answerText(week,type,item.index,item.answer)) + '</dd></div>' +
        '<div><dt>' + (type === 'speaking' ? '口语示例' : '参考答案') + '</dt><dd' + (type === 'vocabulary' ? '' : ' lang="en"') + '>' + esc(reference(task)) + '</dd></div>' +
        '<div><dt>' + (type === 'grammar' ? '语法解析' : type === 'reading' ? '解题依据' : type === 'speaking' ? '表达提示' : '词义提示') + '</dt><dd class="explanation">' + esc(task.explanation) + '</dd></div></dl>' +
        '<div class="result-controls">' + controls + '</div>' + (item.correct === false && error?.attemptId === id ? noteForm(key,error) : '') + '</section>';
    }).join('') +
    '<div class="quiz-actions result-footer"><button class="btn primary" type="button" data-action="practice-again" data-week="' + week + '" data-type="' + type + '"' + (selection.index == null ? '' : ' data-key="' + esc(questionKey(week,type,selection.index)) + '"') + '>再练一次</button>' +
    '<button class="btn secondary" type="button" data-action="nav" data-view="dashboard">返回本周练习</button></div></div></section>';
}
function outcomeButton(id,index,correct,label) {
  return '<button class="btn secondary" type="button" data-action="outcome" data-id="' + esc(id) + '" data-index="' + index + '" data-correct="' + correct + '">' + label + '</button>';
}
function noteForm(key,error) {
  return '<div class="result-note"><label class="field">错误类别<span class="select-wrap"><select data-review-kind>' +
    errorKinds.map(kind=>'<option' + (kind === error.kind ? ' selected' : '') + '>' + esc(kind) + '</option>').join('') + '</select>' + icon('chevron',16) + '</span></label>' +
    '<label class="field">我的错因<input type="text" maxlength="1000" data-review-note value="' + esc(error.note) + '" placeholder="写下当时想错的地方"></label>' +
    '<button class="btn secondary" type="button" data-action="review-note" data-key="' + esc(key) + '">保存错因</button></div>';
}

function resetTimer() {
  reviewMode = {seconds:300,running:false,completed:false,started:false,endAt:0};
}
function paintTimer() {
  const {seconds, running, started, completed} = reviewMode;
  const timer = app.querySelector('.timer-value');
  if (!timer) return;
  timer.textContent = String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
  app.querySelector('[data-action="timer-toggle"]').textContent = running ? '暂停计时' : completed ? '重新计时' : started ? '继续计时' : '开始计时';
  app.querySelector('[data-action="timer-reset"]').disabled = !started;
}
function refreshTimer() {
  if (!reviewMode.running) return;
  const remaining = Math.max(0, Math.ceil((reviewMode.endAt - Date.now()) / 1000));
  if (remaining === reviewMode.seconds) return;
  reviewMode.seconds = remaining;
  if (remaining === 0) {
    reviewMode.running = false;
    reviewMode.completed = true;
    if (selection.view === 'review') notify('5 分钟结束，可以记录今日整理。');
  }
  paintTimer();
}
function toggleTimer() {
  refreshTimer();
  if (reviewMode.running) {
    reviewMode.running = false;
  } else {
    if (reviewMode.completed) resetTimer();
    reviewMode.started = true;
    reviewMode.running = true;
    reviewMode.endAt = Date.now() + reviewMode.seconds * 1000;
  }
  paintTimer();
}
function refreshDay() {
  const date = today();
  if (date === appDay || document.activeElement?.matches('input,textarea,select')) return;
  if (selectedDate === appDay) selectedDate = date;
  appDay = date;
  render();
}
function updateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today() || date < '1900-01-01' || localDateKey(new Date(date + 'T12:00:00')) !== date) return;
  selectedDate = date;
  expandedHistory.clear();
  render();
}
function practiceAgain(control) {
  const {week:rawWeek,type,key} = control.dataset;
  const week = Number(rawWeek);
  const index = key ? Number(key.split(':').at(-1)) : null;
  if (weekByNumber.has(week) && allTypes.includes(type) && (index == null || question(week,type,index))) {
    go({view:'practice',week,type,index,attemptId:null});
  }
}
function setSyncStatus(text) {
  syncText = text;
  const label = app.querySelector('.sync-text');
  if (label) label.textContent = text;
}
function rerenderSaved(control, message) {
  const data = control.dataset;
  render();
  const replacement = [...app.querySelectorAll('[data-action]')].find(item=> {
    return item.dataset.action === data.action && item.dataset.key === data.key &&
      item.dataset.id === data.id && item.dataset.index === data.index && item.dataset.correct === data.correct;
  });
  if (replacement) replacement.focus({preventScroll:true});
  notify(message);
}
function queueSync(delay = 325) {
  if (browserRecords) return;
  clearTimeout(syncDelay);
  if (syncing) {
    syncRequested = true;
    return;
  }
  syncDelay = setTimeout(syncRecords, delay);
}
async function records(init) {
  const response = await fetch('./api/records', {cache:'no-store',signal:AbortSignal.timeout(15000),...init});
  if (!response.ok) throw new Error('记录同步暂时不可用。');
  return response.json();
}
function* syncBodies(events) {
  const encoder = new TextEncoder();
  const byteLimit = 900 * 1024;
  let batch = [];
  let bytes = 25;
  for (const event of events) {
    const entry = JSON.stringify(event);
    const entryBytes = encoder.encode(entry).byteLength + 1;
    if (batch.length && (batch.length === 40 || bytes + entryBytes > byteLimit)) {
      yield '{"version":1,"events":[' + batch.join(',') + ']}';
      batch = [];
      bytes = 25;
    }
    batch.push(entry);
    bytes += entryBytes;
  }
  if (batch.length) yield '{"version":1,"events":[' + batch.join(',') + ']}';
}
async function syncRecords() {
  if (syncing) return;
  syncing = true;
  let remoteChanged = false;
  try {
    const remote = await records();
    remoteChanged = store.mergeSnapshot(remote);
    const known = new Set(remote.events.map(event=>event.id));
    const newEvents = store.getSnapshot().events.filter(event=>!known.has(event.id));
    for (const body of syncBodies(newEvents)) {
      const merged = await records({
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body,
      });
      remoteChanged = store.mergeSnapshot(merged) || remoteChanged;
    }
    setSyncStatus('学习与练习已同步');
  } catch {
    setSyncStatus(store.storageAvailable ? '记录保存在此浏览器' : '记录暂时无法保存');
  } finally {
    syncing = false;
    if (syncRequested) {
      syncRequested = false;
      queueSync();
    }
    if (remoteChanged && !document.activeElement?.matches('input,textarea,select')) render();
  }
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action],[data-learn-action],[data-plan-action]');
  if (!control || control.disabled) return;
  try {
    if (control.dataset.planAction) {
      plan.handleClick(control,event);
      return;
    }
    if (control.dataset.learnAction) {
      learning.handleClick(control,event);
      return;
    }
    event.preventDefault();
    const {action,view,type,id,key,index,correct,week,date,group,section,direction,indices} = control.dataset;
    switch (action) {
      case 'nav':
        if (view === 'learn') {
          if (selection.view !== 'learn') go({view,week:selection.week,section:'plan'});
        } else {
          go({view,week:selection.week});
        }
        break;
      case 'learn-section':
        if (section !== (isPlan(selection) ? 'plan' : 'words')) {
          go({view:'learn',week:selection.week,section});
          app.querySelector('[data-action="learn-section"][aria-current="page"]')?.focus({preventScroll:true});
        }
        break;
      case 'week':
        go({view:'dashboard',week:Number(week)});
        break;
      case 'study-week':
        learning.selectWeek(selection.week);
        go({view:'learn',week:selection.week,weeklyStudy:true});
        break;
      case 'study-retry':
        if (!learning.selectGroup(group,{
          practice:true,
          itemIndex:index == null ? undefined : Number(index),
          itemIndices:indices ? indices.split(',').map(Number) : undefined,
          direction,
        })) {
          notify('这份内容已更新或移除，请选择当前可用的内容。');
        }
        go({view:'learn',week:selection.week,section:'words'});
        break;
      case 'practice':
        if (selection.view !== 'practice' || selection.type !== type || selection.index != null || selection.attemptId) {
          go({view:'practice',week:selection.week,type});
        }
        break;
      case 'practice-again':
        practiceAgain(control);
        break;
      case 'outcome':
        store.setCorrect(id,Number(index),correct === 'true');
        rerenderSaved(control, correct === 'true' ? '已更新结果。' : '已标记为待巩固。');
        break;
      case 'review-note': {
        const box = control.closest('.review-error,.result-note');
        const kind = box.querySelector('[data-review-kind]').value;
        const note = box.querySelector('[data-review-note]').value;
        store.setError(key,{kind,note});
        rerenderSaved(control,'已保存错因。');
        break;
      }
      case 'review-master':
        store.master(key);
        rerenderSaved(control,'已标为掌握。');
        break;
      case 'timer-toggle':
        toggleTimer();
        break;
      case 'timer-reset':
        resetTimer();
        paintTimer();
        app.querySelector('[data-action="timer-toggle"]')?.focus();
        break;
      case 'review-save':
        store.completeReview(today());
        rerenderSaved(control,'已记录今日整理。');
        break;
      case 'progress-date':
        updateDate(date);
        app.querySelector('input[data-input="progress-date"]')?.focus({preventScroll:true});
        break;
      case 'history-toggle':
        if (expandedHistory.has(id)) expandedHistory.delete(id);
        else expandedHistory.add(id);
        render();
        [...app.querySelectorAll('[data-action="history-toggle"]')].find(button=>button.dataset.id === id)?.focus({preventScroll:true});
        break;
    }
  } catch (error) {
    notify(error.message);
  }
});
app.addEventListener('input', (event) => {
  const field = event.target;
  if (field.matches('[data-plan-field]')) {
    plan.handleInput(event);
    return;
  }
  if (field.matches('[data-learn-input]')) {
    learning.handleInput(event);
    return;
  }
  if (!field.matches('[data-answer]') || selection.index != null || (field.type === 'radio' && !field.checked)) return;
  try {
    store.setDraft(selection.week,selection.type,Number(field.dataset.answer),field.value);
  } catch (error) {
    notify(error.message);
  }
});
app.addEventListener('change', (event) => {
  if (event.target.matches('[data-plan-date],[data-plan-field]')) {
    try {
      plan.handleChange(event);
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (event.target.matches('[data-learn-change]')) {
    learning.handleChange(event);
    return;
  }
  const {value,dataset} = event.target;
  switch (dataset.input) {
    case 'week':
      go({view:'dashboard',week:Number(value)});
      break;
    case 'progress-date':
      updateDate(value);
      break;
    case 'history-type':
      historyType = value;
      expandedHistory.clear();
      render();
      app.querySelector('[data-input="history-type"]')?.focus();
      break;
    case 'history-week':
      historyWeek = value;
      expandedHistory.clear();
      render();
      app.querySelector('[data-input="history-week"]')?.focus();
      break;
  }
});
app.addEventListener('submit', (event) => {
  if (event.target.id === 'plan-settings') {
    try {
      plan.handleSubmit(event);
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  if (event.target.id.startsWith('learn-')) {
    learning.handleSubmit(event);
    return;
  }
  if (event.target.id !== 'quiz') return;
  event.preventDefault();
  const {week,type,index} = selection;
  try {
    const answers = Object.fromEntries([...new FormData(event.target)].map(([name,value])=>[Number(name.slice(1)),value]));
    if (Object.values(answers).some(value=>!value.trim())) {
      notify('请填写所选题目后再提交。');
      return;
    }
    if (index == null) {
      const draft = store.getDraft(week,type);
      for (const [position,value] of Object.entries(answers)) {
        if (draft[position] !== value) store.setDraft(week,type,Number(position),value);
      }
    }
    const saved = index == null ? store.submit(week,type) : store.submitReview(week,type,answers);
    go({...selection,attemptId:saved.id},true);
  } catch (error) {
    notify(error.message);
  }
});
window.addEventListener('hashchange', () => {
  const wasPlan = isPlan(selection);
  selection = routeFromHash();
  if (wasPlan && !isPlan(selection)) {
    try {
      plan.leave();
    } catch (error) {
      notify(error.message);
    }
  }
  if (selection.weeklyStudy) learning.selectWeek(selection.week);
  render(true);
});
window.addEventListener('online', ()=>queueSync(0));
window.addEventListener('storage', (event)=> {
  if (!event.key || event.key.startsWith('english-study-desk:v1:events:')) {
    if (!document.activeElement?.matches('input,textarea,select')) render();
    queueSync();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') {
    savePlanProgress();
    return;
  }
  refreshDay();
  refreshTimer();
  queueSync(0);
});
function savePlanProgress() {
  try {
    plan.saveProgress();
  } catch (error) {
    notify(error.message);
  }
}
window.addEventListener('pagehide', savePlanProgress);
render();
setInterval(refreshTimer, 250);
setInterval(refreshDay, 30000);
queueSync(0);
