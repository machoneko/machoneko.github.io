import { cet4Words } from './cet4-corpus.js';
import { maxDailyNewWords, planReviewIntervals, planScopeSizes } from './schedule.js';

const scopes = {
  core: '核心词',
  extended: '核心词 + 扩展词',
  all: '全部三个档位',
};
const kinds = {
  new: { title: '新词学习', start: '开始学新词', empty: '这一天没有待学新词。', done: '已学' },
  review: { title: '计划复习', start: '开始复习', empty: '这一天没有到期复习。', done: '已复习' },
};
const wordsPerPage = 12;
const cardsPerSave = 16;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function offsetDate(date, days, dateKey) {
  const value = new Date(date + 'T12:00:00');
  value.setDate(value.getDate() + days);
  return dateKey(value);
}
function tier(index) {
  if (index < planScopeSizes.core) return { key: 'core', label: '核心词' };
  if (index < planScopeSizes.extended) return { key: 'extended', label: '扩展词' };
  return { key: 'supplement', label: '补充词' };
}

export function createPlanView({ store, esc, icon, dateKey, dateLabel, notify, rerender }) {
  let selectedDate;
  let editing = false;
  let settingsDraft;
  let session;
  const taskPages = { new:0, review:0 };
  const taskLists = { new:'pending', review:'pending' };

  function show(focus) {
    rerender();
    if (focus) document.querySelector(focus)?.focus({ preventScroll:true });
  }
  function validDate(date) {
    return datePattern.test(date) && dateKey(new Date(date + 'T12:00:00')) === date;
  }
  function pickedDate(config) {
    if (selectedDate && selectedDate >= config.startDate) return selectedDate;
    return dateKey();
  }

  function render() {
    const config = store.getStudyPlan();
    if (!config) {
      return '<section class="plan-page" aria-labelledby="plan-title">' +
        '<header class="plan-intro"><div class="plan-intro-icon">' + icon('calendar',27) + '</div>' +
        '<h2 id="plan-title">四级学习计划</h2><p>设定每天学习的新词数量，自动安排学习和到期复习。</p></header>' +
        '<div class="plan-setup-grid">' + editor(null) + intervalCard() + '</div></section>';
    }
    const date = pickedDate(config);
    const day = store.planDay(date);
    const today = dateKey();
    const active = session?.date === today && session?.date === date ? session : null;
    const main = active && pending(day,active.kind).includes(active.index)
      ? renderSession(day,active)
      : renderDay(day,config,today);
    return '<section class="plan-page" aria-labelledby="plan-title"><header class="plan-heading"><div>' +
      '<h2 id="plan-title">四级学习计划</h2><p>' + esc(scopes[config.scope]) + ' · 每天 ' + config.dailyGoal + ' 个新词</p></div>' +
      '<button class="btn secondary" type="button" data-plan-action="edit">' + icon('grammar',16) + ' 修改计划</button></header>' +
      (editing ? editor(config) : '') +
      '<div class="plan-layout"><div class="plan-detail">' + main +
      '</div><aside class="plan-aside">' + coverage(config) + intervalCard() + '</aside></div></section>';
  }

  function editor(config) {
    const draft = settingsDraft ?? { dailyGoal:config?.dailyGoal ?? 20, scope:config?.scope ?? 'all' };
    const title = config ? '修改学习计划' : '设定每日目标';
    return '<form id="plan-settings" class="card plan-settings"><h2 id="plan-settings-title" tabindex="-1">' + title + '</h2>' +
      '<div class="plan-settings-grid"><label class="field">每日新词数' +
      '<input name="dailyGoal" data-plan-field="dailyGoal" value="' + esc(draft.dailyGoal) + '" type="number" inputmode="numeric" min="1" max="' + maxDailyNewWords + '" step="1" required aria-describedby="plan-goal-help"></label>' +
      '<label class="field">学习范围<span class="select-wrap"><select name="scope" data-plan-field="scope">' +
      Object.entries(scopes).map(([key,title])=>'<option value="' + key + '"' + (key === draft.scope ? ' selected' : '') + '>' + title + ' · ' + planScopeSizes[key].toLocaleString('zh-CN') + ' 词</option>').join('') +
      '</select>' + icon('chevron',16) + '</span></label></div>' +
      '<p id="plan-goal-help" class="plan-muted">每天 1–' + maxDailyNewWords + ' 个新词，复习量随已学词数变化。</p>' +
      '<div class="plan-actions"><button type="submit" class="btn primary">' + (config ? '保存计划' : '生成学习计划') + '</button>' +
      (config ? '<button type="button" class="btn ghost" data-plan-action="cancel-edit">取消</button>' : '') + '</div></form>';
  }

  function intervalCard() {
    const intervals = planReviewIntervals.map(day=>'<li>第 ' + day + ' 天</li>').join('');
    return '<section class="card plan-info"><h2>' + icon('timer',20) + ' 复习间隔</h2>' +
      '<ol class="plan-intervals" aria-label="首次学习后的复习间隔">' + intervals + '</ol>' +
      '<p class="plan-muted">参考艾宾浩斯遗忘曲线，从首次学会起安排 6 轮间隔复习。漏复习会顺延，没记住的词次日再复习。</p></section>';
  }

  function coverage(config) {
    const { learned,totalWords } = config;
    return '<section class="card plan-info"><h2>' + icon('chart',20) + ' 学习进度</h2>' +
      '<div class="plan-coverage"><strong>' + learned.toLocaleString('zh-CN') + '</strong><span> / ' + totalWords.toLocaleString('zh-CN') + ' 词</span></div>' +
      '<progress max="' + totalWords + '" value="' + learned + '" aria-label="已学习词汇"></progress>' +
      '<p class="plan-muted">计划开始于 ' + esc(dateLabel(config.startDate)) + '。</p></section>';
  }

  function pending(day,kind) {
    return kind === 'new' ? day.newWords : day.reviewWords;
  }
  function completed(day,kind) {
    return kind === 'new' ? day.learnedToday : day.reviewedToday;
  }
  function remainingInSession(day, current) {
    return pending(day,current.kind).filter(index=>!current.results.has(index));
  }
  function saveProgress() {
    if (!session?.results.size) return;
    if (session.date !== dateKey()) {
      session = undefined;
      notify('日期已更新，请查看今天的学习计划。');
      return;
    }
    const ids = [...session.results.keys()];
    const failedIds = ids.filter(index=>session.results.get(index) === false);
    store.completePlan({date:session.date,kind:session.kind,ids,failedIds});
    session.results.clear();
  }
  function leave() {
    saveProgress();
    session = undefined;
  }

  function renderDay(day,config,today) {
    const date = day.date;
    const current = date === today;
    const period = date > today ? '预计任务' : current ? '今日任务' : '历史任务';
    const previous = offsetDate(date,-1,dateKey);
    const next = offsetDate(date,1,dateKey);
    const weekStart = offsetDate(date,-((new Date(date + 'T12:00:00').getDay() + 6) % 7),dateKey);
    const miniCalendar = Array.from({length:7},(_,index)=>{
      const value = offsetDate(weekStart,index,dateKey);
      const name = ['周一','周二','周三','周四','周五','周六','周日'][index];
      return '<button class="plan-mini-day" type="button" data-plan-action="date" data-date="' + esc(value) + '" aria-label="' + esc(value + ' ' + name) + '"' +
        (value === date ? ' aria-current="date"' : '') + (value < config.startDate || !validDate(value) ? ' disabled' : '') + '><span>' + name + '</span><b>' + Number(value.slice(-2)) + '</b>' +
        (value === today ? '<span class="plan-today-dot" aria-hidden="true"></span>' : '') + '</button>';
    }).join('');
    return '<section class="card plan-calendar" aria-labelledby="plan-day-title"><div class="plan-date-heading"><div><h2 id="plan-day-title" tabindex="-1">' + period + '</h2>' +
      '<p class="plan-muted">' + esc(dateLabel(date)) + (day.projected ? ' · 按目前计划预计' : '') + '</p></div>' +
      '<button type="button" class="btn ghost" data-plan-action="date" data-date="' + today + '"' + (current ? ' disabled' : '') + '>回到今天</button></div>' +
      '<div class="plan-date-tools"><button type="button" class="btn secondary" data-plan-action="date" data-date="' + previous + '"' + (previous < config.startDate ? ' disabled' : '') + '>前一天</button>' +
      '<label class="field plan-date-field"><span class="plan-visually-hidden">查看指定日期</span><input type="date" data-plan-date value="' + date + '" min="' + config.startDate + '" max="9999-12-31"></label>' +
      '<button type="button" class="btn secondary" data-plan-action="date" data-date="' + next + '"' + (!validDate(next) ? ' disabled' : '') + '>后一天</button></div>' +
      '<nav class="plan-week" aria-label="当周日期">' + miniCalendar + '</nav></section>' +
      '<div class="plan-task-grid">' + Object.keys(kinds).map(kind=>renderTasks(day,kind,current)).join('') + '</div>' +
      (day.projected ? '<p class="plan-muted plan-projection">预计安排按每天完成任务计算，会随实际学习和复习结果调整。</p>' : '');
  }

  function renderTasks(day,kind,current) {
    const action = kinds[kind];
    const remaining = pending(day,kind);
    const done = completed(day,kind);
    const viewDone = taskLists[kind] === 'done' && done.length > 0;
    const list = viewDone ? done : remaining;
    const pages = Math.ceil(list.length / wordsPerPage);
    const page = Math.max(0,Math.min(taskPages[kind],pages - 1));
    const expired = kind === 'review' && day.overdue ? '<span class="plan-overdue">' + day.overdue + ' 个已逾期</span>' : '';
    let preview = '';
    if (list.length) {
      preview = '<ul class="plan-terms" aria-label="' + (viewDone ? action.done : action.title) + '">' + list.slice(page*wordsPerPage,(page+1)*wordsPerPage).map(index=>{
        const word = cet4Words[index];
        const {key,label} = tier(index);
        return '<li><span lang="en">' + esc(word.term) + '</span><span class="plan-term-tier ' + key + '">' + label + '</span></li>';
      }).join('') + '</ul>';
    } else {
      preview = '<p class="plan-empty">' + (done.length ? '这一天的此类任务已完成。' : action.empty) + '</p>';
    }
    const listControl = done.length
      ? '<button class="btn ghost" type="button" data-plan-action="tasks-view" data-kind="' + kind + '">' + (viewDone ? '查看待完成' : '查看已完成') + '</button>'
      : '';
    const button = current && remaining.length
      ? '<button class="btn primary" type="button" data-plan-action="start" data-kind="' + kind + '">' + icon('play',16) + ' ' + action.start + '</button>'
      : '';
    return '<section class="card plan-task ' + kind + '" aria-labelledby="plan-task-' + kind + '"><div class="plan-task-top"><div class="plan-task-icon">' + icon(kind === 'new' ? 'book' : 'timer',20) + '</div><div>' +
      '<h2 id="plan-task-' + kind + '">' + action.title + '</h2><p class="plan-muted">' +
      '<strong>' + remaining.length + '</strong> 个待完成 · ' + action.done + ' ' + done.length + ' 个</p></div></div>' + expired + preview +
      (pages > 1 ? '<div class="plan-pager"><button class="btn ghost" type="button" data-plan-action="page" data-kind="' + kind + '" data-page="' + (page-1) + '"' + (page === 0 ? ' disabled' : '') + '>上一页</button>' +
      '<span>' + (page+1) + ' / ' + pages + '</span><button class="btn ghost" type="button" data-plan-action="page" data-kind="' + kind + '" data-page="' + (page+1) + '"' + (page+1 >= pages ? ' disabled' : '') + '>下一页</button></div>' : '') +
      (button || listControl ? '<div class="plan-actions">' + button + listControl + '</div>' : '') + '</section>';
  }

  function renderSession(day,active) {
    const {index,kind,revealed} = active;
    const word = cet4Words[index];
    const current = remainingInSession(day,active);
    const info = tier(index);
    const answer = kind === 'new' || revealed;
    const title = kind === 'new' ? '学习今日新词' : '回忆中文释义';
    const help = kind === 'new' ? '读一遍单词和释义，记熟后进入下一词。' : answer ? '对照释义，自评刚才的回忆。' : '先尝试回想中文意思，再显示释义。';
    const controls = kind === 'new'
      ? sessionButton('complete','学会了','primary',index)
      : answer
        ? sessionButton('complete','记得','primary',index) + sessionButton('failed','没记住','secondary',index)
        : sessionButton('reveal','显示释义','primary',index);
    return '<section class="card plan-session" aria-labelledby="plan-session-title"><div class="plan-session-heading"><div>' +
      '<h2 id="plan-session-title" tabindex="-1">' + title + '</h2><p class="plan-muted">今日还剩 ' + current.length + ' 个</p></div>' +
      '<button type="button" class="btn ghost" data-plan-action="end">' + (active.results.size ? '保存并返回' : '返回今日计划') + '</button></div>' +
      '<article class="plan-flashcard"><span class="plan-term-tier ' + info.key + '">' + info.label + '</span>' +
      '<h3 lang="en" id="plan-card-word" tabindex="-1">' + esc(word.term) + '</h3>' +
      (answer ? '<p class="plan-meaning" id="plan-card-meaning" tabindex="-1">' + esc(word.meaning) + '</p>' +
        (word.example ? '<p class="plan-example" lang="en">' + esc(word.example) + '</p>' : '') : '') + '</article>' +
      '<p class="plan-muted">' + help + '</p><div class="plan-actions">' + controls +
      (current.length > 1 ? sessionButton('next','稍后再看','ghost',index) : '') + '</div></section>';
  }

  function sessionButton(action,label,theme,index) {
    return '<button type="button" class="btn ' + theme + '" data-plan-action="' + action + '" data-index="' + index + '">' + label + '</button>';
  }

  function chooseDate(date) {
    const config = store.getStudyPlan();
    if (!config || !validDate(date) || date < config.startDate) return;
    leave();
    selectedDate = date === dateKey() ? undefined : date;
    for (const kind of Object.keys(kinds)) {
      taskPages[kind] = 0;
      taskLists[kind] = 'pending';
    }
    show('#plan-day-title');
  }
  function start(kind) {
    if (!Object.hasOwn(kinds,kind)) return;
    leave();
    const date = dateKey();
    const index = pending(store.planDay(date),kind)[0];
    if (index === undefined) return;
    session = {date,kind,index,revealed:false,results:new Map()};
    show('#plan-card-word');
  }
  function advance(index, action) {
    const date = dateKey();
    if (!session || session.date !== date || session.index !== index) return;
    const { kind,revealed } = session;
    const failed = action === 'failed';
    if (kind === 'review' && action !== 'next' && !revealed) return;
    const before = remainingInSession(store.planDay(date),session);
    const position = before.indexOf(index);
    if (position < 0) return;
    const after = action === 'next' ? before : before.filter(id=>id !== index);
    if (action !== 'next') {
      session.results.set(index,!failed);
      try {
        if (session.results.size >= cardsPerSave || after.length === 0) saveProgress();
      } catch (error) {
        session.results.delete(index);
        throw error;
      }
    }
    const following = before[(position+1)%before.length];
    const next = after.includes(following) ? following : after[0];
    session = next === undefined ? undefined : {...session,index:next,revealed:false};
    show(session ? '#plan-card-word' : '#plan-day-title');
    if (failed) notify(session?.results.size ? '没记住的词将在保存后安排到明天。' : '这个词已安排到明天复习。');
    else if (!session) notify(kind === 'new' ? '今日新词已学完。' : '今日复习已完成。');
  }

  function handleClick(control,event) {
    event.preventDefault();
    const {planAction,kind, date, page, index} = control.dataset;
    switch (planAction) {
      case 'edit': {
        const current = store.getStudyPlan();
        settingsDraft = {dailyGoal:current.dailyGoal,scope:current.scope};
        editing = true;
        show('#plan-settings-title');
        break;
      }
      case 'cancel-edit':
        editing = false;
        settingsDraft = undefined;
        show('[data-plan-action="edit"]');
        break;
      case 'date':
        chooseDate(date);
        break;
      case 'tasks-view':
        taskLists[kind] = taskLists[kind] === 'pending' ? 'done' : 'pending';
        taskPages[kind] = 0;
        show('[data-plan-action="tasks-view"][data-kind="' + kind + '"]');
        break;
      case 'page':
        taskPages[kind] = Number(page);
        show('[data-plan-action="page"][data-kind="' + kind + '"][data-page="' + (Number(page)+1) + '"]');
        break;
      case 'start':
        start(kind);
        break;
      case 'end':
        leave();
        show('#plan-day-title');
        break;
      case 'reveal':
        if (session?.date === dateKey() && session.index === Number(index)) {
          session.revealed = true;
          show('#plan-card-meaning');
        }
        break;
      case 'complete':
      case 'failed':
      case 'next':
        advance(Number(index),planAction);
        break;
    }
  }
  function handleInput(event) {
    const key = event.target.dataset.planField;
    if (!key) return;
    if (!settingsDraft) settingsDraft = {dailyGoal:20,scope:'all'};
    settingsDraft[key] = event.target.value;
  }
  function handleChange(event) {
    if (event.target.matches('[data-plan-date]')) chooseDate(event.target.value);
    else handleInput(event);
  }
  function handleSubmit(event) {
    event.preventDefault();
    const fields = new FormData(event.target);
    const dailyGoal = Number(fields.get('dailyGoal'));
    const scope = String(fields.get('scope') ?? '');
    if (!Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > maxDailyNewWords || !Object.hasOwn(scopes,scope)) {
      notify('请选择学习范围，并输入 1–' + maxDailyNewWords + ' 之间的每日新词数。');
      return;
    }
    const existed = !!store.getStudyPlan();
    leave();
    store.saveStudyPlan({dailyGoal,scope});
    editing = false;
    settingsDraft = undefined;
    chooseDate(dateKey());
    notify(existed ? '学习计划已更新。' : '学习计划已生成。');
  }

  return {render,handleClick,handleInput,handleChange,handleSubmit,leave,saveProgress};
}
