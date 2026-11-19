import { lexiconGroups } from './lexicon.js';
import { cet4Words, cet4Source } from './cet4-corpus.js';

const SOURCES = {
  library: '四级词库',
  cet4: '主题精选',
  weekly: '每周单词',
  custom: '我的词库',
};
const LIBRARY_TIERS = [
  { id: 'core', label: '核心词', start: 0, end: 3500 },
  { id: 'extension', label: '扩展词', start: 3500, end: 4500 },
  { id: 'supplement', label: '补充词', start: 4500, end: 5000 },
];
const LIBRARY_DECK_SIZE = 25;
const LIBRARY_GROUP_PAGE_SIZE = 6;
const LIBRARY_SEARCH_PAGE_SIZE = 6;
const BATCH_SIZE = 8;
const EDITOR_LIMITS = { title: 80, term: 120, meaning: 240, example: 400, words: 100 };
const DIRECTIONS = {
  'en-zh': { label: '英译中', promptLanguage: 'en', answerLanguage: 'zh-CN', placeholder: '填写中文释义' },
  'zh-en': { label: '中译英', promptLanguage: 'zh-CN', answerLanguage: 'en', placeholder: '填写英文单词或短语' },
};

function batchRanges(count) {
  const ranges = [];
  for (let start = 0; start < count;) {
    const remaining = count - start;
    const length = remaining === BATCH_SIZE + 1 ? BATCH_SIZE - 1 : Math.min(BATCH_SIZE, remaining);
    ranges.push({ start, end: start + length });
    start += length;
  }
  return ranges;
}

function shuffled(values) {
  const order = values.slice();
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}

function questionPrompt(word, direction) {
  if (direction === 'en-zh') return word.term;
  const escaped = word.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const source = `(?<![a-z])${escaped}(?![a-z])`;
  const answer = new RegExp(source, 'iu');
  if (!answer.test(word.meaning)) return word.meaning;
  const clues = word.meaning.split(/[；;]/u).map(clue => clue.trim()).filter(clue => clue && !answer.test(clue));
  return clues.length ? clues.join('；') : word.meaning.replace(new RegExp(source, 'giu'), '____');
}

function parseWordLines(text) {
  const words = [];
  const terms = new Set();
  for (const [index, input] of text.split(/\r?\n/u).entries()) {
    const line = input.trim();
    if (!line) continue;
    const sections = line.split(/[|｜]/u).map((value) => value.trim());
    const [term, meaning, example = ''] = sections;
    const lineNumber = index + 1;
    if (sections.length > 3 || !term || !meaning) {
      throw new Error(`第 ${lineNumber} 行需要填写英文和中文，用竖线 | 分隔。`);
    }
    if (!/[a-z]/iu.test(term)) {
      throw new Error(`第 ${lineNumber} 行的英文栏需要包含英文字母。`);
    }
    if (term.length > EDITOR_LIMITS.term || meaning.length > EDITOR_LIMITS.meaning || example.length > EDITOR_LIMITS.example) {
      throw new Error(`第 ${lineNumber} 行过长。英文最多 120 字，中文最多 240 字，例句最多 400 字。`);
    }
    const key = term.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ');
    if (terms.has(key)) throw new Error(`第 ${lineNumber} 行重复出现，多个译法可写在同一行的中文栏。`);
    terms.add(key);
    words.push({ term, meaning, example });
  }
  if (!words.length) throw new Error('请至少添加一条学习内容。');
  if (words.length > EDITOR_LIMITS.words) throw new Error('每套学习内容最多添加 100 条。');
  return words;
}

function editorLines(words) {
  return words.map(({term, meaning, example}) => [term, meaning, example].filter(Boolean).join(' | ')).join('\n');
}

function numberText(count) {
  return `${count} 条`;
}

function formatWordCount(count) {
  return count.toLocaleString('zh-CN');
}

function searchText(value) {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function createLearningView({ store, weeks, esc, icon, notify, rerender }) {
  const selected = {};
  const studyPositions = new Map();
  let source = 'library';
  let activeKey;
  let stage = 'study';
  const weeklyDecks = weeks.map((week) => ({
    id: String(week.number),
    groupKey: `week:${week.number}:v1`,
    title: `第 ${week.number} 周 · ${week.label}`,
    words: week.vocabulary.map(({ prompt, answers, explanation }) => ({
      term: prompt,
      meaning: answers.join('；'),
      example: explanation.split('例句：')[1]?.trim() ?? '',
    })),
  }));
  const cet4Decks = lexiconGroups.map((group) => ({ ...group, groupKey: `cet4:${group.id}:v1` }));
  const libraryDecks = LIBRARY_TIERS.flatMap((tier) => {
    const decks = [];
    for (let offset = tier.start; offset < tier.end; offset += LIBRARY_DECK_SIZE) {
      const groupIndex = decks.length;
      const id = `${tier.id}-${groupIndex + 1}`;
      decks.push({
        id,
        tier,
        groupIndex,
        groupKey: `library:${id}:v1`,
        title: `${tier.label} · 第 ${groupIndex + 1} 组`,
        words: cet4Words.slice(offset, Math.min(tier.end, offset + LIBRARY_DECK_SIZE)),
      });
    }
    return decks;
  });
  const librarySelections = new Map();
  let libraryTier = LIBRARY_TIERS[0];
  let libraryPage = 0;
  let libraryQuery = '';
  let libraryResults = null;
  let libraryResultPage = 0;
  let cardIndex = 0;
  let displayMode = 'cards';
  let viewed = new Set();
  let quizBatch = 0;
  let singleIndex = null;
  let singleDirection;
  let replayIndices;
  let quizItems = [];
  let draft = {};
  let attemptId;
  let editor;
  let confirmingRemoval = false;

  function decks(kind) {
    switch (kind) {
      case 'library': return libraryDecks;
      case 'cet4': return cet4Decks;
      case 'weekly': return weeklyDecks;
      case 'custom': return store.studySets().map((set) => ({
        ...set,
        groupKey: `custom:${set.id}:${set.revision}`,
      }));
      default: return [];
    }
  }

  function tierDecks() {
    return libraryDecks.filter((deck) => deck.tier === libraryTier);
  }

  function activeDeck() {
    const inLibrary = source === 'library';
    const available = inLibrary ? tierDecks() : decks(source);
    const selectedId = inLibrary ? librarySelections.get(libraryTier.id) : selected[source];
    const deck = available.find((item) => item.id === selectedId) ?? available[0];
    if (deck?.groupKey !== activeKey) {
      activeKey = deck?.groupKey;
      if (inLibrary) librarySelections.set(libraryTier.id, deck?.id);
      else selected[source] = deck?.id;
      if (stage !== 'editor') resetDeck();
    }
    return deck;
  }

  function resetDeck() {
    const position = studyPositions.get(activeKey);
    stage = 'study';
    cardIndex = position?.cardIndex ?? 0;
    displayMode = position?.displayMode ?? 'cards';
    viewed = position?.viewed ?? new Set([0]);
    quizBatch = 0;
    singleIndex = null;
    singleDirection = undefined;
    replayIndices = undefined;
    quizItems = [];
    draft = {};
    attemptId = undefined;
    confirmingRemoval = false;
  }

  function selectDeck(kind, id) {
    source = kind;
    if (kind === 'library' && id !== undefined) {
      const deck = libraryDecks.find((item) => item.id === id);
      if (deck) {
        if (libraryTier !== deck.tier) clearLibrarySearch();
        libraryTier = deck.tier;
        librarySelections.set(deck.tier.id, deck.id);
        libraryPage = Math.floor(deck.groupIndex / LIBRARY_GROUP_PAGE_SIZE);
      }
    } else if (id !== undefined) {
      selected[kind] = String(id);
    }
    resetDeck();
    return activeDeck();
  }

  function selectWeek(number) {
    const id = String(number);
    if (!weeklyDecks.some((deck) => deck.id === id)) return false;
    selectDeck('weekly', id);
    return true;
  }

  function selectGroup(groupKey, { practice = false, itemIndex, startIndex, itemIndices, direction } = {}) {
    for (const kind of Object.keys(SOURCES)) {
      const deck = decks(kind).find((item) => item.groupKey === groupKey);
      if (!deck) continue;
      if (practice && !store.getStudySession(groupKey).completed) return false;
      if (itemIndex !== undefined && (!Number.isInteger(Number(itemIndex)) || !deck.words[Number(itemIndex)])) return false;
      if (startIndex !== undefined && (!Number.isInteger(Number(startIndex)) || !deck.words[Number(startIndex)])) return false;
      if (itemIndices !== undefined &&
          (!Array.isArray(itemIndices) || !itemIndices.length || itemIndices.length > BATCH_SIZE ||
            new Set(itemIndices).size !== itemIndices.length ||
            itemIndices.some(index => !Number.isInteger(index) || !deck.words[index]))) return false;
      selectDeck(kind, deck.id);
      if (practice) {
        singleIndex = itemIndex !== undefined ? Number(itemIndex) : null;
        singleDirection = singleIndex !== null && direction === 'zh-en' ? 'zh-en' : 'en-zh';
        replayIndices = itemIndices?.slice();
        if (startIndex !== undefined) {
          quizBatch = batchRanges(deck.words.length).findIndex(({ start, end }) => startIndex >= start && startIndex < end);
        }
        prepareQuiz(deck);
      }
      return true;
    }
    return false;
  }

  function refresh(focusSelector, preventScroll = true) {
    rerender();
    if (focusSelector) document.querySelector(focusSelector)?.focus({ preventScroll });
  }

  function render() {
    const deck = activeDeck();
    const body = stage === 'editor' ? renderEditor()
      : deck ? renderDeck(deck)
      : `<div class="learn-empty card">
          <h2>创建一套自己的学习内容</h2>
          <p>可以添加英文单词、短语或句子，并写下对应中文。</p>
          <button type="button" class="btn primary" data-learn-action="new">新建学习词库</button>
        </div>`;

    return `<section class="learning-page" aria-labelledby="learning-title">
      <header class="learn-header">
        <div>
          <h2 id="learning-title">词库与默写</h2>
          <p>先学词义，再练习英译中和中译英。</p>
        </div>
        <div class="learn-actions learn-header-actions">
          ${source !== 'custom' ? '<button type="button" class="btn secondary" data-learn-action="new">新建学习词库</button>' : ''}
        </div>
      </header>
      <nav class="learn-sources card" aria-label="学习来源">
        ${Object.entries(SOURCES).map(([kind,label]) => `<button type="button" class="btn ghost" data-learn-action="source" data-source="${kind}" aria-pressed="${kind === source}">${label}</button>`).join('')}
      </nav>
      <div class="learn-layout">
        ${renderPicker(deck)}
        <div class="learn-main">${body}</div>
      </div>
    </section>`;
  }

  function renderPicker(deck) {
    if (source === 'library') return renderLibraryPicker(deck);
    const description = {
      cet4: '四级高频词汇精选，按主题学习。',
      weekly: '复习第 6–16 周的原有单词。',
      custom: '用自己的材料制作学习卡片。',
    }[source];
    return `<section class="learn-picker card" aria-labelledby="learn-picker-label">
      <h2 id="learn-picker-label">${SOURCES[source]}</h2>
      <p class="learn-secondary">${description}</p>
      <div class="learn-group-list">
        ${decks(source).map((item) => `<button type="button" class="learn-group" data-learn-action="deck" data-deck="${esc(item.id)}" aria-pressed="${item.id === deck?.id && stage !== 'editor'}">
          <span>${esc(item.title)}</span><span class="learn-group-count">${numberText(item.words.length)}</span>
        </button>`).join('')}
      </div>
      ${source === 'custom' && stage !== 'editor' && decks(source).length ? '<button type="button" class="btn secondary learn-new-button" data-learn-action="new">新建学习词库</button>' : ''}
    </section>`;
  }

  function renderLibraryPicker(deck) {
    const groups = tierDecks();
    const pages = Math.ceil(groups.length / LIBRARY_GROUP_PAGE_SIZE);
    const from = libraryPage * LIBRARY_GROUP_PAGE_SIZE;
    return `<section class="learn-picker card library-picker" aria-labelledby="learn-picker-label">
      <h2 id="learn-picker-label">大学四级词库</h2>
      <p class="learn-secondary">共 ${formatWordCount(cet4Words.length)} 词，按学习顺序分级。</p>
      <div class="library-tiers" role="group" aria-label="词汇分级">
        ${LIBRARY_TIERS.map((tier) => `<button type="button" class="learn-group" data-learn-action="library-tier" data-tier="${tier.id}" aria-pressed="${tier === libraryTier}"><span>${tier.label}</span><span class="learn-group-count">${formatWordCount(tier.end - tier.start)} 词</span></button>`).join('')}
      </div>
      ${stage === 'quiz' ? '' : renderLibrarySearch()}
      <div class="library-groups">
        <h3>词汇分组</h3>
        <div class="learn-group-list">
          ${groups.slice(from, from + LIBRARY_GROUP_PAGE_SIZE).map((item) => `<button type="button" class="learn-group" data-learn-action="deck" data-deck="${item.id}" aria-pressed="${item === deck}">
            <span>第 ${item.groupIndex + 1} 组</span><span class="learn-group-count">${item.words.length} 词</span>
          </button>`).join('')}
        </div>
        ${renderLibraryPager('library-page', libraryPage, pages, '分组页码')}
      </div>
      ${renderLibrarySource()}
    </section>`;
  }

  function renderLibrarySearch() {
    return `<div class="library-search">
      <form id="learn-library-search" class="library-search-form" role="search">
        <label class="field">${libraryTier.label}查词
          <input type="search" name="query" data-learn-input="library-query" value="${esc(libraryQuery)}" maxlength="60" placeholder="输入英文或中文" autocomplete="off">
        </label>
        <div class="learn-actions">
          <button class="btn secondary" type="submit">查找</button>
          ${libraryResults === null ? '' : '<button class="btn ghost" type="button" data-learn-action="library-clear">清除</button>'}
        </div>
      </form>
      ${libraryResults === null ? '' : renderLibrarySearchResults()}
    </div>`;
  }

  function renderLibrarySearchResults() {
    const from = libraryResultPage * LIBRARY_SEARCH_PAGE_SIZE;
    const pages = Math.ceil(libraryResults.length / LIBRARY_SEARCH_PAGE_SIZE);
    return `<div class="library-search-results">
      <h3 id="library-result-heading" tabindex="-1">${formatWordCount(libraryResults.length)} 个匹配词</h3>
      ${libraryResults.length ? `<ul>${libraryResults.slice(from, from + LIBRARY_SEARCH_PAGE_SIZE).map((index) => {
        const word = cet4Words[index];
        return `<li><button class="learn-group library-search-hit" type="button" data-learn-action="library-jump" data-index="${index}"><strong lang="en">${esc(word.term)}</strong><span>${esc(word.meaning)}</span></button></li>`;
      }).join('')}</ul>` : '<p class="learn-secondary">试试其他关键词，或切换词汇档位。</p>'}
      ${pages > 1 ? renderLibraryPager('library-result-page', libraryResultPage, pages, '查词结果页码') : ''}
    </div>`;
  }

  function renderLibraryPager(action, page, pages, label) {
    return `<nav class="library-pager" aria-label="${label}">
      <button type="button" class="btn ghost" data-learn-action="${action}" data-offset="-1"${page === 0 ? ' disabled' : ''}>上一页</button>
      <span id="${action}-label" tabindex="-1">${page + 1} / ${pages}</span>
      <button type="button" class="btn ghost" data-learn-action="${action}" data-offset="1"${page + 1 >= pages ? ' disabled' : ''}>下一页</button>
    </nav>`;
  }

  function renderLibrarySource() {
    if (!cet4Source?.url || !cet4Source?.name) return '';
    const sourceLink = `<a href="${esc(cet4Source.url)}" target="_blank" rel="noopener noreferrer">${esc(cet4Source.name)}</a>`;
    const license = cet4Source.license ? esc(cet4Source.license) + ' 许可' : '';
    const licenseLink = license && cet4Source.licenseUrl ? `<a href="${esc(cet4Source.licenseUrl)}" target="_blank" rel="noopener noreferrer">${license}</a>` : license;
    return `<p class="library-attribution">词条来自 ${sourceLink}${licenseLink ? ' · ' + licenseLink : ''}。档位由本站编排。</p>`;
  }

  function clearLibrarySearch(resetQuery = true) {
    if (resetQuery) libraryQuery = '';
    libraryResults = null;
    libraryResultPage = 0;
  }

  function searchLibrary() {
    const query = searchText(libraryQuery);
    if (!query) {
      clearLibrarySearch();
      return;
    }
    const exact = [];
    const prefix = [];
    const matches = [];
    for (let index = libraryTier.start; index < libraryTier.end; index++) {
      const word = cet4Words[index];
      const term = searchText(word.term);
      if (term === query) exact.push(index);
      else if (term.startsWith(query)) prefix.push(index);
      else if (term.includes(query) || searchText(word.meaning).includes(query)) matches.push(index);
    }
    libraryResults = exact.concat(prefix, matches);
    libraryResultPage = 0;
  }

  function selectLibraryTier(id) {
    const tier = LIBRARY_TIERS.find((item) => item.id === id);
    if (!tier || tier === libraryTier) return;
    libraryTier = tier;
    const deck = selectDeck('library');
    libraryPage = Math.floor(deck.groupIndex / LIBRARY_GROUP_PAGE_SIZE);
    if (libraryResults !== null) searchLibrary();
    refresh(`[data-learn-action="library-tier"][data-tier="${tier.id}"]`);
  }

  function jumpToLibraryWord(index) {
    if (!libraryResults?.includes(index)) return;
    const position = index - libraryTier.start;
    const deck = tierDecks()[Math.floor(position / LIBRARY_DECK_SIZE)];
    selectDeck('library', deck.id);
    cardIndex = position % LIBRARY_DECK_SIZE;
    displayMode = 'cards';
    viewed.add(cardIndex);
    clearLibrarySearch(false);
    rememberStudy();
    refresh('#learn-word-heading', false);
  }

  function renderDeck(deck) {
    const session = store.getStudySession(deck.groupKey);
    const attempt = stage === 'result' && attemptId ? store.getAttempt(attemptId) : undefined;
    const current = stage === 'quiz' && session.completed ? renderQuiz(deck)
      : attempt ? renderResult(deck, attempt)
      : renderStudy(deck, session);
    return `<section class="learn-deck" aria-labelledby="learn-deck-title">
      <div class="learn-deck-heading">
        <div>
          <h2 id="learn-deck-title" tabindex="-1">${esc(deck.title)}</h2>
          <p class="learn-secondary">${numberText(deck.words.length)} · ${session.completed ? '已完成学习' : '学习中'}${session.attempts ? ` · 已练习 ${session.attempts} 次` : ''}</p>
        </div>
        ${source === 'custom' && stage === 'study' ? `<div class="learn-actions">
          <button type="button" class="btn ghost" data-learn-action="edit">编辑</button>
          <button type="button" class="btn ghost" data-learn-action="prompt-remove">移除</button>
        </div>` : ''}
      </div>
      ${confirmingRemoval ? `<div class="learn-remove card">
        <p>移除「${esc(deck.title)}」？</p>
        <div class="learn-actions">
          <button class="btn secondary" type="button" data-learn-action="cancel-remove">取消</button>
          <button class="btn ghost learn-danger" type="button" data-learn-action="remove">确认移除</button>
        </div>
      </div>` : ''}
      ${current}
    </section>`;
  }

  function renderStudy(deck, session) {
    const word = deck.words[cardIndex];
    const count = deck.words.length;
    const ready = displayMode === 'list' || viewed.size === count;
    return `<div class="learn-study">
      <div class="learn-study-toolbar">
        <div class="learn-actions" aria-label="学习视图">
          <button class="btn ghost" type="button" data-learn-action="cards" aria-pressed="${displayMode === 'cards'}">词汇卡</button>
          <button class="btn ghost" type="button" data-learn-action="list" aria-pressed="${displayMode === 'list'}">整组词表</button>
        </div>
        ${displayMode === 'cards' ? `<div class="learn-studied">
          <span>已看 ${viewed.size} / ${count}</span>
          <progress value="${viewed.size}" max="${count}" aria-label="已查看卡片"></progress>
        </div>` : ''}
      </div>
      ${displayMode === 'cards' ? `<article class="learn-word-card card" aria-labelledby="learn-word-heading">
        <span class="learn-card-position">${cardIndex + 1} / ${count}</span>
        <div class="learn-card-content">
          <h3 lang="en" id="learn-word-heading" tabindex="-1">${esc(word.term)}</h3>
          <p class="learn-meaning">${esc(word.meaning)}</p>
          ${word.example ? `<p class="learn-example" lang="en">${esc(word.example)}</p>` : ''}
        </div>
        <div class="learn-card-controls">
          <button type="button" class="btn secondary" data-learn-action="previous"${cardIndex === 0 ? ' disabled' : ''}>上一张</button>
          <button type="button" class="btn secondary" data-learn-action="next"${cardIndex === count - 1 ? ' disabled' : ''}>下一张</button>
        </div>
      </article>` : `<ul class="learn-word-list card">
        ${deck.words.map((item) => `<li><h3 lang="en">${esc(item.term)}</h3><p class="learn-list-meaning">${esc(item.meaning)}</p>${item.example ? `<p class="learn-example" lang="en">${esc(item.example)}</p>` : ''}</li>`).join('')}
      </ul>`}
      <div class="learn-study-footer">
        ${session.completed ? `${renderBatchSelect(count)}
          <button class="btn primary" type="button" data-learn-action="practice">${icon('play',16)} 开始默写</button>`
          : `<button class="btn primary" type="button" data-learn-action="complete"${ready ? '' : ' disabled'}>${icon('check',16)} 完成学习</button>
          ${ready ? '' : '<p class="learn-secondary">看完词汇卡或整组词表后，即可开始默写。</p>'}`}
      </div>
    </div>`;
  }

  function renderBatchSelect(count) {
    if (count <= BATCH_SIZE) return '';
    return `<label class="learn-batch-label">练习范围
      <span class="select-wrap"><select class="field-control" data-learn-change="batch">
        ${batchRanges(count).map(({start,end}, index) => `<option value="${index}"${index === quizBatch ? ' selected' : ''}>第 ${start + 1}–${end} 条</option>`).join('')}
      </select>${icon('chevron',16)}</span>
    </label>`;
  }

  function quizIndices(deck) {
    if (singleIndex !== null) return [singleIndex];
    if (replayIndices) return replayIndices;
    const { start, end } = batchRanges(deck.words.length)[quizBatch];
    return Array.from({ length: end - start }, (_, offset) => start + offset);
  }

  function renderQuiz(deck) {
    const enZh = quizItems.filter(({direction}) => direction === 'en-zh').length;
    const summary = [
      enZh ? `英译中 ${enZh} 题` : '',
      enZh < quizItems.length ? `中译英 ${quizItems.length - enZh} 题` : '',
    ].filter(Boolean).join(' · ');
    return `<form id="learn-quiz" class="learn-quiz">
      <div class="learn-stage-heading"><div>
        <h3 id="learn-quiz-title" tabindex="-1">词汇默写</h3>
        <p class="learn-secondary">${summary}。提交后显示参考答案。</p>
      </div><button type="button" class="btn ghost" data-learn-action="back">返回学习卡</button></div>
      <div class="learn-quiz-items">
        ${quizItems.map(({index,direction}, position) => {
          const info = DIRECTIONS[direction];
          return `<label class="learn-question field card">
            <span class="learn-direction ${direction}">${info.label}</span>
            <span class="learn-question-label"><span>${position + 1}.</span><b lang="${info.promptLanguage}">${esc(questionPrompt(deck.words[index], direction))}</b></span>
            <input name="word-${index}" type="text" lang="${info.answerLanguage}" maxlength="200" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${info.placeholder}" value="${esc(draft[index] ?? '')}" data-learn-input="answer" data-index="${index}" required>
          </label>`;
        }).join('')}
      </div>
      <div class="learn-actions"><button class="btn primary" type="submit">${icon('check',16)} 提交并核对</button></div>
    </form>`;
  }

  function renderResult(deck, attempt) {
    const count = attempt.items.reduce((sum, item) => sum + Number(item.correct === true), 0);
    const more = singleIndex === null && !replayIndices && quizBatch + 1 < batchRanges(deck.words.length).length;
    return `<div class="learn-result">
      <div class="learn-result-banner card">
        <h3 id="learn-result-title" tabindex="-1">本次答对 ${count} / ${attempt.items.length} 条</h3>
        <p>核对参考答案后，可手动修正判定。</p>
      </div>
      <div class="learn-result-items">
        ${attempt.items.map((item) => {
          const direction = item.direction ?? 'en-zh';
          const info = DIRECTIONS[direction];
          const answer = direction === 'zh-en' ? item.term : item.meaning;
          return `<article class="learn-result-item card">
            <div class="learn-result-top"><span class="learn-direction ${direction}">${info.label}</span><span class="learn-result-status ${item.correct ? 'correct' : 'wrong'}">${item.correct ? '正确' : '待巩固'}</span></div>
            <h3 lang="${info.promptLanguage}">${esc(questionPrompt(item, direction))}</h3>
            <dl><div><dt>我的答案</dt><dd lang="${info.answerLanguage}">${esc(item.answer)}</dd></div><div><dt>参考答案</dt><dd lang="${info.answerLanguage}">${esc(answer)}</dd></div></dl>
            ${item.example ? `<p class="learn-example" lang="en">${esc(item.example)}</p>` : ''}
            <button type="button" class="btn ghost" data-learn-action="grade" data-index="${item.index}" data-correct="${item.correct ? 'false' : 'true'}">${item.correct ? '将此题标为错误' : '将此题标为正确'}</button>
          </article>`;
        }).join('')}
      </div>
      <div class="learn-actions">
        ${more ? '<button type="button" class="btn primary" data-learn-action="next-batch">练习下一组</button>' : ''}
        <button type="button" class="btn ${more ? 'secondary' : 'primary'}" data-learn-action="retry">再练一次</button>
        <button type="button" class="btn ghost" data-learn-action="back">返回学习卡</button>
      </div>
    </div>`;
  }

  function renderEditor() {
    return `<form id="learn-editor" class="learn-editor card">
      <h2 id="learn-editor-title" tabindex="-1">${editor?.id ? '编辑学习词库' : '新建学习词库'}</h2>
      <label class="field">词库名称<input name="title" maxlength="${EDITOR_LIMITS.title}" data-learn-input="title" value="${esc(editor?.title ?? '')}" placeholder="例如「本周课堂笔记」" required></label>
      <label class="field">学习内容
        <span class="learn-secondary" id="learn-format">每行一条，用竖线 <b>|</b> 分隔英文、中文和可选的英文例句。多个译法用分号隔开。最多 100 条。</span>
        <textarea name="lines" rows="8" maxlength="77000" data-learn-input="lines" aria-describedby="learn-format learn-example-format" required>${esc(editor?.lines ?? '')}</textarea>
      </label>
      <p class="learn-format-example" id="learn-example-format"><code>take notes | 记笔记 | I take notes in class.</code></p>
      <p class="learn-editor-error" id="learn-editor-error" role="alert"${editor?.error ? '' : ' hidden'}>${esc(editor?.error ?? '')}</p>
      <div class="learn-actions">
        <button class="btn primary" type="submit">保存并学习</button>
        <button class="btn ghost" type="button" data-learn-action="cancel-editor">取消</button>
      </div>
    </form>`;
  }

  function startEditor(deck) {
    source = 'custom';
    activeKey = undefined;
    stage = 'editor';
    confirmingRemoval = false;
    editor = {
      id: deck?.id,
      title: deck?.title ?? '',
      lines: deck ? editorLines(deck.words) : '',
      error: '',
    };
    refresh('#learn-editor-title');
  }

  function prepareQuiz(deck) {
    const indices = shuffled(quizIndices(deck));
    const reverseCount = Math.floor((indices.length + Number(Math.random() < 0.5)) / 2);
    const directions = singleIndex !== null
      ? [singleDirection]
      : shuffled(indices.map((_, index) => index < reverseCount ? 'zh-en' : 'en-zh'));
    quizItems = indices.map((index, position) => ({ index, direction: directions[position] }));
    stage = 'quiz';
    draft = {};
    attemptId = undefined;
  }

  function startQuiz(deck) {
    prepareQuiz(deck);
    refresh('#learn-quiz-title');
  }

  function rememberStudy() {
    if (activeKey) studyPositions.set(activeKey, { cardIndex, displayMode, viewed });
  }

  function moveCard(deck, offset) {
    cardIndex = Math.max(0, Math.min(deck.words.length - 1, cardIndex + offset));
    viewed.add(cardIndex);
    rememberStudy();
    const previous = cardIndex === 0;
    const next = cardIndex === deck.words.length - 1;
    const selector = offset > 0 && !next ? '[data-learn-action="next"]'
      : offset < 0 && !previous ? '[data-learn-action="previous"]' : '#learn-word-heading';
    refresh(selector);
  }

  function handleClick(control, event) {
    event.preventDefault();
    const { learnAction, source: kind, deck: id, index, correct, tier, offset } = control.dataset;
    const deck = activeDeck();
    try {
      switch (learnAction) {
        case 'source':
          if (!Object.hasOwn(SOURCES, kind)) return;
          selectDeck(kind);
          refresh(`[data-learn-action="source"][data-source="${kind}"]`);
          break;
        case 'deck':
          selectDeck(source, id);
          refresh('#learn-deck-title', source !== 'library');
          break;
        case 'library-tier':
          selectLibraryTier(tier);
          break;
        case 'library-page': {
          const pages = Math.ceil(tierDecks().length / LIBRARY_GROUP_PAGE_SIZE);
          libraryPage = Math.max(0, Math.min(pages - 1, libraryPage + Number(offset)));
          refresh('#library-page-label');
          break;
        }
        case 'library-result-page': {
          const pages = Math.ceil(libraryResults.length / LIBRARY_SEARCH_PAGE_SIZE);
          libraryResultPage = Math.max(0, Math.min(pages - 1, libraryResultPage + Number(offset)));
          refresh('#library-result-page-label');
          break;
        }
        case 'library-clear':
          clearLibrarySearch();
          refresh('[data-learn-input="library-query"]');
          break;
        case 'library-jump':
          jumpToLibraryWord(Number(index));
          break;
        case 'new':
          startEditor();
          break;
        case 'edit':
          if (source === 'custom' && deck) startEditor(deck);
          break;
        case 'cancel-editor':
          editor = undefined;
          resetDeck();
          refresh('#learn-deck-title');
          break;
        case 'prompt-remove':
          if (source !== 'custom' || !deck) return;
          confirmingRemoval = true;
          refresh('[data-learn-action="cancel-remove"]');
          break;
        case 'cancel-remove':
          confirmingRemoval = false;
          refresh('[data-learn-action="prompt-remove"]');
          break;
        case 'remove':
          if (source !== 'custom' || !deck || !confirmingRemoval) return;
          store.removeStudySet(deck.id);
          selectDeck('custom');
          refresh('#learn-deck-title');
          notify('已移除学习词库。');
          break;
        case 'cards':
        case 'list':
          displayMode = learnAction;
          rememberStudy();
          refresh(`[data-learn-action="${learnAction}"]`);
          break;
        case 'previous':
        case 'next':
          if (deck) moveCard(deck, learnAction === 'next' ? 1 : -1);
          break;
        case 'complete':
          if (!deck || (displayMode !== 'list' && viewed.size !== deck.words.length)) return;
          store.completeStudy(deck.groupKey);
          refresh('[data-learn-action="practice"]');
          notify('学习已完成，可以开始默写。');
          break;
        case 'practice':
        case 'retry':
          if (!deck || !store.getStudySession(deck.groupKey).completed) return;
          startQuiz(deck);
          break;
        case 'next-batch':
          if (!deck || replayIndices || !store.getStudySession(deck.groupKey).completed || quizBatch + 1 >= batchRanges(deck.words.length).length) return;
          quizBatch += 1;
          singleIndex = null;
          startQuiz(deck);
          break;
        case 'back':
          stage = 'study';
          singleIndex = null;
          replayIndices = undefined;
          refresh('#learn-deck-title');
          break;
        case 'grade':
          if (stage !== 'result' || !attemptId) return;
          store.setCorrect(attemptId, Number(index), correct === 'true');
          refresh(`[data-learn-action="grade"][data-index="${Number(index)}"]`);
          notify('已更新本题判定。');
          break;
      }
    } catch (error) {
      notify(error.message);
    }
  }

  function handleInput(event) {
    const input = event.target;
    const { learnInput, index } = input.dataset;
    if (learnInput === 'answer') draft[index] = input.value;
    else if (learnInput === 'library-query') libraryQuery = input.value;
    else if (editor && (learnInput === 'lines' || learnInput === 'title')) editor[learnInput] = input.value;
  }

  function handleChange(event) {
    const select = event.target;
    if (select.dataset.learnChange === 'batch') {
      const batch = Number(select.value);
      const count = activeDeck()?.words.length ?? 0;
      if (Number.isInteger(batch) && batch >= 0 && batch < batchRanges(count).length) quizBatch = batch;
    }
  }

  function handleSubmit(event) {
    const form = event.target;
    event.preventDefault();
    const data = new FormData(form);
    try {
      if (form.id === 'learn-library-search') {
        libraryQuery = String(data.get('query') ?? '').trim();
        searchLibrary();
        refresh(libraryResults === null ? '[data-learn-input="library-query"]' : '#library-result-heading');
        return;
      }
      if (form.id === 'learn-editor') {
        const title = String(data.get('title') ?? '').trim();
        const lines = String(data.get('lines') ?? '');
        editor = { ...editor, title, lines, error: '' };
        if (!title) throw new Error('请为词库填写名称。');
        const words = parseWordLines(lines);
        const saved = store.saveStudySet({ id: editor.id, title, words });
        editor = undefined;
        selectDeck('custom', saved.id);
        refresh('#learn-deck-title');
        notify('已保存学习词库。');
      }
      if (form.id === 'learn-quiz') {
        const deck = activeDeck();
        if (!deck || stage !== 'quiz' || !store.getStudySession(deck.groupKey).completed) return;
        const items = quizItems.map(({index,direction}) => ({
          ...deck.words[index],
          index,
          direction,
          answer: String(data.get(`word-${index}`) ?? '').trim(),
        }));
        if (items.some((item) => !item.answer)) throw new Error('请完成全部答案后提交。');
        const attempt = store.submitStudy({ groupKey: deck.groupKey, title: deck.title, items });
        attemptId = attempt.id;
        stage = 'result';
        draft = {};
        refresh('#learn-result-title');
      }
    } catch (error) {
      if (form.id === 'learn-editor' && editor) {
        editor.error = error.message;
        const alert = form.querySelector('#learn-editor-error');
        alert.hidden = false;
        alert.textContent = error.message;
      } else {
        notify(error.message);
      }
    }
  }

  return { render, handleClick, handleChange, handleInput, handleSubmit, selectWeek, selectGroup };
}
