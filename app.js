(function () {
  'use strict';

  var STORAGE_KEY = 'bookpiece-data-v1';
  var APP_VERSION = '1.0.0 (Phase 1)';

  var CHILDREN = {
    shuya: { name: '修也', avatar: '🦖' },
    hiroto: { name: '啓仁', avatar: '🐰' }
  };

  var CONNECTOR_WORDS = ['だから', 'でも', 'そして', 'それに', 'すると', 'なし'];

  var BASE_QUESTIONS = {
    grade1: [
      { text: 'どんなお話だった？', zone: 'start' },
      { text: 'いちばん心にのこったのは、どこかな？', zone: 'mid' },
      { text: 'そこを読んで、どんな気持ちになった？', zone: 'mid' },
      { text: 'この本を読んで、これからやってみたいことは？', zone: 'end' }
    ],
    grade3: [
      { text: 'この本は、どんなお話ですか？', zone: 'start' },
      { text: 'どうしてこの本を選んだの？', zone: 'start' },
      { text: 'いちばん心に残った場面はどこ？', zone: 'mid' },
      { text: 'その場面で、登場人物はどんな気持ちだったと思う？', zone: 'mid' },
      { text: 'そこを読んで、あなたはどう思った？', zone: 'mid' },
      { text: 'もし自分だったら、どうする？', zone: 'mid' },
      { text: 'この本を読んで、新しく気づいたことは？', zone: 'end' },
      { text: 'これから、どんなことをしてみたい？', zone: 'end' }
    ]
  };

  // 目標文字数に届かないときに追加でたずねる質問(不足分だけ動的に出す)
  var FOLLOWUP_QUESTIONS = {
    grade1: [
      { text: 'ほかに心にのこったところはある？', zone: 'mid' },
      { text: 'その時、どんな音がきこえた気がする？', zone: 'mid' },
      { text: 'もし自分がその話に出てきたら、なにをしたい？', zone: 'mid' },
      { text: 'いちばん好きな絵や場面はどこ？', zone: 'mid' },
      { text: 'この本を、だれにすすめたい？どうして？', zone: 'end' }
    ],
    grade3: [
      { text: 'ほかに印象に残った場面はある？', zone: 'mid' },
      { text: '登場人物の中で、いちばん好きなのはだれ？どうして？', zone: 'mid' },
      { text: 'もし続きの物語があるなら、どうなってほしい？', zone: 'mid' },
      { text: '作者は、この本を通してどんなことを伝えたかったと思う？', zone: 'end' },
      { text: 'この本を読む前と後で、自分の考えは変わった？', zone: 'end' },
      { text: '同じ作者やにたテーマの本も読んでみたい？なぜ？', zone: 'end' }
    ]
  };

  var EMOTION_CHIPS = ['うれしい', 'びっくり', 'かなしい', 'たのしい', 'こわい', 'ふしぎ', 'どきどき', 'ほっとした'];

  var GRADE_TARGET_CHARS = { grade1: 400, grade3: 800 };
  var DEPTH_MIN_LENGTH = 8;
  // このくらい集まっていれば十分とみなし、追加質問を打ち切る目安(目標の85%)
  var ENOUGH_RATIO = 0.85;

  function cloneQuestion(q) { return { text: q.text, zone: q.zone }; }

  var data = null;

  var recognition = null;
  var isListening = false;

  function stopListening() {
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try { recognition.stop(); } catch (e) { /* already stopped */ }
    }
    isListening = false;
    var btn = $('btn-mic');
    if (btn) {
      btn.classList.remove('listening');
      btn.textContent = '🎤 話してみる';
    }
  }

  var state = {
    childId: null,
    bookId: null,
    questionIndex: 0,
    passcodeCallback: null,
    selectedCardId: null,
    connectorSlotIndex: null
  };

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function showScreen(id) {
    stopListening();
    qsa('.screen').forEach(function (el) { el.classList.remove('active'); });
    $(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  var toastTimer = null;
  function toast(message, duration) {
    var el = $('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, duration || 2000);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- データモデル ----------
  function defaultData() {
    return {
      version: 2,
      passcode: '0000',
      geminiApiKey: '',
      books: []
    };
  }

  function defaultBook(childId, title, date, grade) {
    return {
      id: uid(),
      childId: childId,
      title: title,
      date: date,
      grade: grade,
      stage: 'interview',
      answers: [],
      questionQueue: BASE_QUESTIONS[grade].map(cloneQuestion),
      followupIndex: 0,
      cards: [],
      zones: { start: [], mid: [], end: [] },
      connectors: {},
      essayText: '',
      rawEssayText: '',
      aiPolished: false,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function migrateData(raw) {
    if (!raw.version) raw.version = 1;
    if (!raw.passcode) raw.passcode = '0000';
    if (typeof raw.geminiApiKey !== 'string') raw.geminiApiKey = '';
    if (!raw.books) raw.books = [];
    raw.books.forEach(function (book) {
      if (!book.questionQueue) book.questionQueue = (BASE_QUESTIONS[book.grade] || BASE_QUESTIONS.grade1).map(cloneQuestion);
      if (typeof book.followupIndex !== 'number') book.followupIndex = 0;
      if (typeof book.rawEssayText !== 'string') book.rawEssayText = '';
      if (typeof book.aiPolished !== 'boolean') book.aiPolished = false;
    });
    raw.version = 2;
    return raw;
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      return migrateData(JSON.parse(raw));
    } catch (e) {
      return defaultData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getBook(bookId) {
    for (var i = 0; i < data.books.length; i++) {
      if (data.books[i].id === bookId) return data.books[i];
    }
    return null;
  }

  function currentBook() { return getBook(state.bookId); }

  // ---------- ホーム画面 ----------
  function initHome() {
    qsa('.child-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.childId = btn.getAttribute('data-child');
        openShelf();
      });
    });
    qs('[data-action="open-settings"]').addEventListener('click', function () {
      requestPasscode('おうちの人の設定', function () {
        renderSettings();
        showScreen('screen-settings');
      });
    });
  }

  // ---------- 本棚 ----------
  function openShelf() {
    var child = CHILDREN[state.childId];
    $('shelf-avatar').innerHTML = '<span>' + child.avatar + '</span>';
    $('shelf-title').textContent = child.name + 'の本だな';
    renderShelf();
    showScreen('screen-shelf');
  }

  function renderShelf() {
    var books = data.books.filter(function (b) { return b.childId === state.childId; });
    books.sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    var list = $('shelf-list');
    list.innerHTML = '';
    $('shelf-empty').classList.toggle('hidden', books.length > 0);

    books.forEach(function (book) {
      var item = document.createElement('div');
      item.className = 'shelf-item';
      var gradeLabel = book.grade === 'grade1' ? '1ねんせい' : '3ねんせい';
      var statusLabel = book.status === 'done' ? 'できた！' : 'とちゅう';
      var statusClass = book.status === 'done' ? 'done' : 'draft';
      item.innerHTML =
        '<div class="shelf-item-main" data-book="' + book.id + '">' +
          '<div class="shelf-item-title">' + escapeHtml(book.title || '（タイトルなし）') + '</div>' +
          '<div class="shelf-item-meta">' +
            '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
            '<span>' + gradeLabel + '</span>' +
            (book.date ? '<span>' + escapeHtml(book.date) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<button class="shelf-delete-btn" data-delete="' + book.id + '">🗑</button>';
      list.appendChild(item);
    });

    qsa('.shelf-item-main', list).forEach(function (el) {
      el.addEventListener('click', function () {
        openBook(el.getAttribute('data-book'));
      });
    });
    qsa('.shelf-delete-btn', list).forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = el.getAttribute('data-delete');
        if (confirm('このかんそうぶんを削除しますか？')) {
          data.books = data.books.filter(function (b) { return b.id !== id; });
          saveData();
          renderShelf();
          toast('削除しました');
        }
      });
    });
  }

  function openBook(bookId) {
    var book = getBook(bookId);
    if (!book) return;
    state.bookId = bookId;
    if (book.status === 'done') {
      renderPreview();
      showScreen('screen-preview');
      return;
    }
    switch (book.stage) {
      case 'puzzle':
        renderPuzzle();
        showScreen('screen-puzzle');
        break;
      case 'connect':
        renderConnect();
        showScreen('screen-connect');
        break;
      case 'preview':
        renderPreview();
        showScreen('screen-preview');
        break;
      default:
        state.questionIndex = book.answers.length;
        renderInterviewQuestion();
        showScreen('screen-interview');
    }
  }

  // ---------- 本の登録 ----------
  var selectedGrade = null;

  function initNewBook() {
    qs('[data-action="new-book"]').addEventListener('click', function () {
      $('input-title').value = '';
      $('input-date').value = new Date().toISOString().slice(0, 10);
      selectedGrade = null;
      qsa('.grade-btn').forEach(function (b) { b.classList.remove('selected'); });
      showScreen('screen-newbook');
    });

    qsa('.grade-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedGrade = btn.getAttribute('data-grade');
        qsa('.grade-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      });
    });

    $('btn-start-interview').addEventListener('click', function () {
      var title = $('input-title').value.trim();
      var date = $('input-date').value;
      if (!title) { toast('本のタイトルを入れてね'); return; }
      if (!selectedGrade) { toast('がくねんモードをえらんでね'); return; }

      var book = defaultBook(state.childId, title, date, selectedGrade);
      data.books.push(book);
      saveData();
      state.bookId = book.id;
      state.questionIndex = 0;
      renderInterviewQuestion();
      showScreen('screen-interview');
    });
  }

  // ---------- インタビュー画面 ----------
  function initInterview() {
    $('btn-next-question').addEventListener('click', onNextQuestion);
    $('btn-depth-continue').addEventListener('click', function () {
      $('depth-hint').classList.add('hidden');
      commitAnswer();
    });
    $('btn-depth-edit').addEventListener('click', function () {
      $('depth-hint').classList.add('hidden');
      $('answer-input').focus();
    });
    $('btn-mic').addEventListener('click', onMicClick);
  }

  function onMicClick() {
    if (isListening) {
      stopListening();
      return;
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast('このブラウザではおんせい入力が使えないよ🎤');
      return;
    }

    var input = $('answer-input');
    var baseText = input.value ? input.value + '　' : '';
    var btn = $('btn-mic');

    recognition = new SR();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = function () {
      isListening = true;
      btn.classList.add('listening');
      btn.textContent = '🎤 きいているよ…（タップでとめる）';
    };

    recognition.onresult = function (ev) {
      var finalText = '';
      var interimText = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var transcript = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) baseText += finalText;
      input.value = baseText + interimText;
    };

    recognition.onerror = function (ev) {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        toast('マイクの使用がゆるされていないよ。ブラウザのせっていを見てね');
      } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        toast('おんせい入力でエラーが起きたよ');
      }
    };

    recognition.onend = function () {
      stopListening();
      input.focus();
    };

    recognition.start();
  }

  function renderInterviewQuestion() {
    var book = currentBook();
    var questions = book.questionQueue;
    var idx = state.questionIndex;
    var q = questions[idx];

    var totalChars = book.answers.reduce(function (sum, a) { return sum + (a ? a.text.length : 0); }, 0);
    var target = GRADE_TARGET_CHARS[book.grade];
    $('q-progress').textContent = totalChars + '字 / ' + target + '字';
    $('interview-progress-fill').style.width = Math.min(100, Math.round((totalChars / target) * 100)) + '%';
    $('question-text').textContent = q.text;
    $('answer-input').value = '';
    $('depth-hint').classList.add('hidden');

    var chipsWrap = $('emotion-chips');
    if (book.grade === 'grade1') {
      chipsWrap.classList.remove('hidden');
      chipsWrap.innerHTML = EMOTION_CHIPS.map(function (w) {
        return '<button type="button" class="emotion-chip">' + w + '</button>';
      }).join('');
      qsa('.emotion-chip', chipsWrap).forEach(function (chip) {
        chip.addEventListener('click', function () {
          var input = $('answer-input');
          input.value = input.value ? (input.value + ' ' + chip.textContent) : chip.textContent;
          input.focus();
        });
      });
    } else {
      chipsWrap.classList.add('hidden');
      chipsWrap.innerHTML = '';
    }
  }

  function onNextQuestion() {
    var text = $('answer-input').value.trim();
    if (!text) { toast('ひとことでいいから、かいてみよう'); return; }
    var hintShown = !$('depth-hint').classList.contains('hidden');
    if (text.length < DEPTH_MIN_LENGTH && !hintShown) {
      $('depth-hint').classList.remove('hidden');
      return;
    }
    commitAnswer();
  }

  function commitAnswer() {
    var book = currentBook();
    var questions = book.questionQueue;
    var idx = state.questionIndex;
    var q = questions[idx];
    var text = $('answer-input').value.trim();

    book.answers[idx] = { text: text, zone: q.zone, question: q.text };
    book.updatedAt = Date.now();

    var totalChars = book.answers.reduce(function (sum, a) { return sum + (a ? a.text.length : 0); }, 0);
    var target = GRADE_TARGET_CHARS[book.grade];
    var needMore = totalChars < target * ENOUGH_RATIO;
    var pool = FOLLOWUP_QUESTIONS[book.grade];

    if (idx + 1 >= questions.length && needMore && book.followupIndex < pool.length) {
      questions.push(cloneQuestion(pool[book.followupIndex]));
      book.followupIndex += 1;
    }

    saveData();

    if (idx + 1 < questions.length) {
      state.questionIndex = idx + 1;
      renderInterviewQuestion();
    } else {
      buildCardsFromAnswers(book);
      book.stage = 'puzzle';
      saveData();
      renderPuzzle();
      showScreen('screen-puzzle');
    }
  }

  function buildCardsFromAnswers(book) {
    book.cards = book.answers.map(function (ans, i) {
      return { id: 'c' + i, text: ans.text };
    });
    book.zones = { start: [], mid: [], end: [] };
    book.answers.forEach(function (ans, i) {
      book.zones[ans.zone].push('c' + i);
    });
  }

  // ---------- カードパズル画面 ----------
  function initPuzzle() {
    qsa('.puzzle-zone').forEach(function (zoneEl) {
      zoneEl.addEventListener('click', function (ev) {
        if (ev.target.closest('.card-move-btns')) return;
        var zone = zoneEl.getAttribute('data-zone');
        if (state.selectedCardId) {
          moveCardToZone(state.selectedCardId, zone);
        }
      });
    });
    $('btn-to-connect').addEventListener('click', function () {
      var book = currentBook();
      book.stage = 'connect';
      saveData();
      renderConnect();
      showScreen('screen-connect');
    });
  }

  function cardById(book, cardId) {
    for (var i = 0; i < book.cards.length; i++) {
      if (book.cards[i].id === cardId) return book.cards[i];
    }
    return null;
  }

  function findCardZone(book, cardId) {
    var zones = book.zones;
    for (var z in zones) {
      if (zones[z].indexOf(cardId) !== -1) return z;
    }
    return null;
  }

  function moveCardToZone(cardId, targetZone) {
    var book = currentBook();
    var fromZone = findCardZone(book, cardId);
    if (fromZone) {
      book.zones[fromZone] = book.zones[fromZone].filter(function (id) { return id !== cardId; });
    }
    book.zones[targetZone].push(cardId);
    state.selectedCardId = null;
    book.updatedAt = Date.now();
    saveData();
    renderPuzzle();
  }

  function renderPuzzle() {
    var book = currentBook();
    ['start', 'mid', 'end'].forEach(function (zone) {
      var listEl = $('zone-' + zone);
      listEl.innerHTML = '';
      book.zones[zone].forEach(function (cardId, i) {
        var card = cardById(book, cardId);
        if (!card) return;
        var li = document.createElement('li');
        li.className = 'puzzle-card' + (state.selectedCardId === cardId ? ' selected' : '');
        li.setAttribute('data-card', cardId);
        li.innerHTML =
          '<span class="card-text">' + escapeHtml(card.text) + '</span>' +
          '<span class="card-move-btns">' +
            '<button type="button" data-up="' + cardId + '">▲</button>' +
            '<button type="button" data-down="' + cardId + '">▼</button>' +
          '</span>';
        listEl.appendChild(li);

        li.addEventListener('click', function (ev) {
          if (ev.target.closest('.card-move-btns')) return;
          ev.stopPropagation();
          state.selectedCardId = (state.selectedCardId === cardId) ? null : cardId;
          renderPuzzle();
        });
      });
    });

    qsa('[data-up]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        reorderCard(btn.getAttribute('data-up'), -1);
      });
    });
    qsa('[data-down]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        reorderCard(btn.getAttribute('data-down'), 1);
      });
    });
  }

  function reorderCard(cardId, delta) {
    var book = currentBook();
    var zone = findCardZone(book, cardId);
    if (!zone) return;
    var arr = book.zones[zone];
    var idx = arr.indexOf(cardId);
    var newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= arr.length) return;
    arr.splice(idx, 1);
    arr.splice(newIdx, 0, cardId);
    saveData();
    renderPuzzle();
  }

  // ---------- つなぎことば画面 ----------
  function flattenZones(book) {
    return book.zones.start.concat(book.zones.mid, book.zones.end);
  }

  function initConnect() {
    $('connector-close').addEventListener('click', function () {
      $('connector-modal').classList.add('hidden');
    });
    $('btn-to-preview').addEventListener('click', function () {
      var book = currentBook();
      book.stage = 'preview';
      saveData();
      renderPreview();
      showScreen('screen-preview');
    });
  }

  function renderConnect() {
    var book = currentBook();
    var order = flattenZones(book);
    var wrap = $('connect-list');
    wrap.innerHTML = '';

    order.forEach(function (cardId, i) {
      var card = cardById(book, cardId);
      if (!card) return;
      var cardEl = document.createElement('div');
      cardEl.className = 'connect-card';
      cardEl.textContent = card.text;
      wrap.appendChild(cardEl);

      if (i < order.length - 1) {
        var word = book.connectors[i] || '';
        var slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'connect-slot' + (word ? ' has-word' : '');
        slot.textContent = word ? word : '＋ つなぎことば';
        slot.setAttribute('data-slot', i);
        slot.addEventListener('click', function () {
          openConnectorModal(i);
        });
        wrap.appendChild(slot);
      }
    });
  }

  function openConnectorModal(slotIndex) {
    state.connectorSlotIndex = slotIndex;
    var optWrap = $('connector-options');
    optWrap.innerHTML = CONNECTOR_WORDS.map(function (w) {
      return '<button type="button" class="connector-option" data-word="' + w + '">' + w + '</button>';
    }).join('');
    qsa('.connector-option', optWrap).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var word = btn.getAttribute('data-word');
        var book = currentBook();
        book.connectors[state.connectorSlotIndex] = (word === 'なし') ? '' : word;
        saveData();
        $('connector-modal').classList.add('hidden');
        renderConnect();
      });
    });
    $('connector-modal').classList.remove('hidden');
  }

  // ---------- 原稿用紙プレビュー ----------
  function buildEssayText(book) {
    var order = flattenZones(book);
    var text = '　';
    order.forEach(function (cardId, i) {
      var card = cardById(book, cardId);
      if (!card) return;
      var sentence = card.text;
      if (!/[。！？]$/.test(sentence)) sentence += '。';
      text += sentence;
      if (i < order.length - 1) {
        var word = book.connectors[i];
        if (word) text += word + '、';
      }
    });
    return text;
  }

  function renderPreview() {
    var book = currentBook();
    var child = CHILDREN[book.childId];
    var target = GRADE_TARGET_CHARS[book.grade];
    var text = book.essayText || buildEssayText(book);

    $('preview-book-title').textContent = '「' + book.title + '」を読んで';
    $('preview-child-name').textContent = child.name;

    var chars = Array.from(text);
    var pct = Math.min(100, Math.round((chars.length / target) * 100));
    $('char-meter-fill').style.width = pct + '%';
    $('char-meter-text').textContent = chars.length + ' / ' + target + '字';

    var grid = $('genko-grid');
    grid.innerHTML = '';
    var cellCount = Math.max(target, chars.length);
    for (var i = 0; i < cellCount; i++) {
      var span = document.createElement('span');
      span.textContent = chars[i] || '';
      grid.appendChild(span);
    }

    var polishBtn = $('btn-ai-polish');
    var revertBtn = $('btn-ai-revert');
    var hint = $('ai-polish-hint');
    if (!data.geminiApiKey) {
      polishBtn.classList.add('hidden');
      revertBtn.classList.add('hidden');
      hint.classList.add('hidden');
    } else if (book.aiPolished) {
      polishBtn.classList.add('hidden');
      revertBtn.classList.remove('hidden');
      hint.classList.add('hidden');
    } else {
      polishBtn.classList.remove('hidden');
      polishBtn.disabled = false;
      polishBtn.textContent = '✨ AIでぶんしょうをととのえる';
      revertBtn.classList.add('hidden');
      hint.classList.remove('hidden');
    }
  }

  function initPreview() {
    $('btn-save-essay').addEventListener('click', function () {
      var book = currentBook();
      book.essayText = buildEssayText(book);
      book.status = 'done';
      book.stage = 'done';
      book.updatedAt = Date.now();
      saveData();
      toast('ほぞんしました！');
      openShelf();
    });
    $('btn-edit-again').addEventListener('click', function () {
      var book = currentBook();
      book.stage = 'connect';
      book.essayText = '';
      book.rawEssayText = '';
      book.aiPolished = false;
      saveData();
      renderConnect();
      showScreen('screen-connect');
    });
    $('btn-ai-polish').addEventListener('click', onAiPolish);
    $('btn-ai-revert').addEventListener('click', function () {
      var book = currentBook();
      book.essayText = book.rawEssayText;
      book.aiPolished = false;
      book.updatedAt = Date.now();
      saveData();
      renderPreview();
    });
  }

  function onAiPolish() {
    var book = currentBook();
    if (!data.geminiApiKey) { toast('せっていでAPIキーを入力してね'); return; }

    var original = book.essayText || buildEssayText(book);
    var btn = $('btn-ai-polish');
    btn.disabled = true;
    btn.textContent = 'ととのえています…';

    var prompt =
      '以下は小学生が自分の言葉で書いた読書感想文です。内容や事実、言いたいことは絶対に変えず、' +
      '一文一文の言葉もできるだけそのまま活かしてください。文と文のつなぎ方や助詞、句読点だけを、' +
      '小学生らしい自然な日本語になるように少しだけ整えてください。新しい内容やエピソードを付け加えないでください。' +
      '整えた文章のみを出力してください。\n\n---\n' + original;

    var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(data.geminiApiKey);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('API error ' + res.status);
        return res.json();
      })
      .then(function (json) {
        var polished = json.candidates &&
          json.candidates[0] &&
          json.candidates[0].content &&
          json.candidates[0].content.parts &&
          json.candidates[0].content.parts[0] &&
          json.candidates[0].content.parts[0].text;
        polished = (polished || '').trim();
        if (!polished) throw new Error('empty response');

        book.rawEssayText = original;
        book.essayText = polished;
        book.aiPolished = true;
        book.updatedAt = Date.now();
        saveData();
        renderPreview();
        toast('AIがぶんしょうをととのえました');
      })
      .catch(function () {
        toast('AIとのつうしんに失敗しました。もういちど試してね');
        btn.disabled = false;
        btn.textContent = '✨ AIでぶんしょうをととのえる';
      });
  }

  // ---------- 戻るボタン等の共通ナビゲーション ----------
  function initNav() {
    qsa('[data-action="back-home"]').forEach(function (el) {
      el.addEventListener('click', function () { showScreen('screen-home'); });
    });
    qsa('[data-action="back-shelf"]').forEach(function (el) {
      el.addEventListener('click', function () { renderShelf(); showScreen('screen-shelf'); });
    });
    qs('[data-action="interview-back"]').addEventListener('click', function () {
      renderShelf();
      showScreen('screen-shelf');
    });
    qs('[data-action="back-puzzle"]').addEventListener('click', function () {
      renderPuzzle();
      showScreen('screen-puzzle');
    });
    qs('[data-action="back-connect"]').addEventListener('click', function () {
      renderConnect();
      showScreen('screen-connect');
    });
  }

  // ---------- パスコードモーダル ----------
  function requestPasscode(title, callback) {
    $('passcode-title').textContent = title;
    $('passcode-error').textContent = '';
    state.passcodeInput = '';
    state.passcodeCallback = callback;
    updatePasscodeDisplay();
    $('passcode-modal').classList.remove('hidden');
  }

  function closePasscode() {
    $('passcode-modal').classList.add('hidden');
    state.passcodeCallback = null;
  }

  function updatePasscodeDisplay() {
    var spans = qsa('#passcode-display span');
    spans.forEach(function (span, i) {
      span.classList.toggle('filled', i < state.passcodeInput.length);
    });
  }

  function setupPasscodePad() {
    qsa('.passcode-pad button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        if (key === 'cancel') { closePasscode(); return; }
        if (key === 'del') {
          state.passcodeInput = state.passcodeInput.slice(0, -1);
          updatePasscodeDisplay();
          return;
        }
        if (state.passcodeInput.length >= 4) return;
        state.passcodeInput += key;
        updatePasscodeDisplay();
        if (state.passcodeInput.length === 4) {
          if (state.passcodeInput === data.passcode) {
            var cb = state.passcodeCallback;
            closePasscode();
            if (cb) cb();
          } else {
            $('passcode-error').textContent = 'パスコードが ちがいます';
            state.passcodeInput = '';
            updatePasscodeDisplay();
          }
        }
      });
    });
  }

  // ---------- 設定画面 ----------
  function renderSettings() {
    var body = $('settings-body');
    body.innerHTML =
      '<div class="settings-group">' +
        '<h3>パスコードの変更</h3>' +
        '<div class="settings-input-row">' +
          '<label>新パスコード</label>' +
          '<input type="text" inputmode="numeric" maxlength="4" id="new-passcode" placeholder="4桁の数字">' +
          '<button class="settings-save" id="btn-save-passcode">保存</button>' +
        '</div>' +
      '</div>' +
      '<div class="settings-group">' +
        '<h3>AI文章整えサービス(Gemini APIキー)</h3>' +
        '<p style="font-size:0.8rem;color:var(--sub);margin-bottom:0.5rem;">Google AI Studioで無料のAPIキーを取得して入力すると、げんこうようし画面で「AIでぶんしょうをととのえる」機能がつかえます。空にすると機能はひょうじされません。</p>' +
        '<div class="settings-input-row">' +
          '<label>APIキー</label>' +
          '<input type="text" id="gemini-api-key" placeholder="AIza...">' +
          '<button class="settings-save" id="btn-save-apikey">保存</button>' +
        '</div>' +
      '</div>' +
      '<div class="settings-group">' +
        '<h3>データのバックアップ</h3>' +
        '<textarea class="settings-export-text" id="export-text" readonly></textarea>' +
      '</div>' +
      '<div class="settings-group">' +
        '<h3>データのリセット</h3>' +
        '<button class="danger-btn" id="btn-reset-data">すべてのデータを消す</button>' +
      '</div>' +
      '<div class="settings-group">' +
        '<h3>バージョン情報</h3>' +
        '<p style="font-size:0.85rem;color:var(--sub);">ブックピース ' + APP_VERSION + '</p>' +
      '</div>';

    $('export-text').value = JSON.stringify(data, null, 2);
    $('gemini-api-key').value = data.geminiApiKey || '';

    $('btn-save-apikey').addEventListener('click', function () {
      data.geminiApiKey = $('gemini-api-key').value.trim();
      saveData();
      toast('APIキーを保存しました');
    });

    $('btn-save-passcode').addEventListener('click', function () {
      var val = $('new-passcode').value.trim();
      if (!/^\d{4}$/.test(val)) { toast('4桁の数字で入力してね'); return; }
      data.passcode = val;
      saveData();
      toast('パスコードを変更しました');
      $('new-passcode').value = '';
    });

    $('btn-reset-data').addEventListener('click', function () {
      if (confirm('本当にすべてのデータを消しますか？この操作は元に戻せません。')) {
        localStorage.removeItem(STORAGE_KEY);
        data = defaultData();
        saveData();
        toast('データをリセットしました');
        showScreen('screen-home');
      }
    });
  }

  // ---------- Service Worker ----------
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    }
  }

  // ---------- 初期化 ----------
  function init() {
    data = loadData();
    saveData();

    initHome();
    initNewBook();
    initInterview();
    initPuzzle();
    initConnect();
    initPreview();
    initNav();
    setupPasscodePad();
    registerSW();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
