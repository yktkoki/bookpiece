(function () {
  'use strict';

  var STORAGE_KEY = 'bookpiece-data-v1';
  var APP_VERSION = '1.3.0';

  var AVATAR_CHOICES = ['🦖', '🐰', '🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🦄', '🐥', '🐻', '🐵'];
  var newChildSelectedAvatar = null;

  function getChild(childId) {
    for (var i = 0; i < data.children.length; i++) {
      if (data.children[i].id === childId) return data.children[i];
    }
    return null;
  }

  var CONNECTOR_GROUPS = [
    { label: 'そのあと・じゅんばん', words: ['だから', 'そして', 'それで', 'すると', 'そのあと', 'まず', 'つぎに', 'さいごに'] },
    { label: 'ぎゃくのいみ', words: ['でも', 'しかし', 'ところが'] },
    { label: 'つけたす', words: ['それに', 'そのうえ', 'また'] }
  ];

  // 学年帯：low=1〜2年 / mid=3〜4年 / high=5〜6年
  function gradeBand(gradeNum) {
    if (gradeNum <= 2) return 'low';
    if (gradeNum <= 4) return 'mid';
    return 'high';
  }

  var RECOMMENDED_CHARS = { 1: 400, 2: 400, 3: 800, 4: 800, 5: 1200, 6: 1200 };

  // 《》はふりがな記法：漢字《かんじ》 → <ruby>漢字<rt>かんじ</rt></ruby>
  var BASE_QUESTIONS = {
    low: [
      { text: 'どんなお話《はなし》だった？', zone: 'start' },
      { text: 'いちばん心《こころ》にのこったのは、どこかな？', zone: 'mid' },
      { text: 'そこを読《よ》んで、どんな気持《きも》ちになった？', zone: 'mid' },
      { text: 'この本《ほん》を読《よ》んで、これからやってみたいことは？', zone: 'end' }
    ],
    mid: [
      { text: 'この本は、どんなお話ですか？', zone: 'start' },
      { text: 'どうしてこの本を選んだの？', zone: 'start' },
      { text: 'いちばん心に残った場面はどこ？', zone: 'mid' },
      { text: 'その場面で、登場人物はどんな気持ちだったと思う？', zone: 'mid' },
      { text: 'そこを読んで、あなたはどう思った？', zone: 'mid' },
      { text: 'もし自分だったら、どうする？', zone: 'mid' },
      { text: 'この本を読んで、新しく気づいたことは？', zone: 'end' },
      { text: 'これから、どんなことをしてみたい？', zone: 'end' }
    ],
    high: [
      { text: 'この本は、どんな内容の本？かんたんにまとめてみよう', zone: 'start' },
      { text: 'この本を選んだ理由や、読む前に期待していたことは？', zone: 'start' },
      { text: 'いちばん印象に残った場面はどこ？それはなぜ？', zone: 'mid' },
      { text: 'その場面で、登場人物はどんな気持ちだったと思う？そう考えた理由もおしえて', zone: 'mid' },
      { text: '自分の経験で、この本の内容とにていることはある？', zone: 'mid' },
      { text: 'もし自分が同じ立場だったら、どう考えて、どう行動する？', zone: 'mid' },
      { text: '作者がこの本で伝えたかったことは、何だと思う？', zone: 'end' },
      { text: 'この本を読む前と後で、自分の考え方が変わったところは？', zone: 'end' },
      { text: 'この本から学んだことを、これからの生活でどう生かしたい？', zone: 'end' }
    ]
  };

  // 目標文字数に届かないときに追加でたずねる質問(不足分だけ動的に出す)
  var FOLLOWUP_QUESTIONS = {
    low: [
      { text: 'ほかに心《こころ》にのこったところはある？', zone: 'mid' },
      { text: 'その時《とき》、どんな音《おと》がきこえた気《き》がする？', zone: 'mid' },
      { text: 'もし自分《じぶん》がその話《はなし》に出《で》てきたら、なにをしたい？', zone: 'mid' },
      { text: 'いちばん好《す》きな絵《え》や場面《ばめん》はどこ？', zone: 'mid' },
      { text: 'この本《ほん》を、だれにすすめたい？どうして？', zone: 'end' }
    ],
    mid: [
      { text: 'ほかに印象に残った場面はある？', zone: 'mid' },
      { text: '登場人物の中で、いちばん好きなのはだれ？どうして？', zone: 'mid' },
      { text: 'もし続きの物語があるなら、どうなってほしい？', zone: 'mid' },
      { text: '作者は、この本を通してどんなことを伝えたかったと思う？', zone: 'end' },
      { text: 'この本を読む前と後で、自分の考えは変わった？', zone: 'end' },
      { text: '同じ作者やにたテーマの本も読んでみたい？なぜ？', zone: 'end' }
    ],
    high: [
      { text: 'ほかに印象に残った場面やせりふ、言葉はある？', zone: 'mid' },
      { text: 'いちばん共感できた登場人物はだれ？どんなところに共感した？', zone: 'mid' },
      { text: 'ぎゃくに、なっとくできなかったところや、ぎもんに思ったところはある？', zone: 'mid' },
      { text: 'この本のテーマを、ニュースや身のまわりの出来事と結びつけて考えられることはある？', zone: 'mid' },
      { text: 'もし続きや別の結末があるとしたら、どんな物語を想像する？', zone: 'mid' },
      { text: 'この本をだれにすすめたい？その理由もくわしくおしえて', zone: 'end' }
    ]
  };

  var EMOTION_CHIPS = ['うれしい', 'びっくり', 'かなしい', 'たのしい', 'こわい', 'ふしぎ', 'どきどき', 'ほっとした'];
  var GENKO_ROWS_PER_COLUMN = 20;
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
      btn.innerHTML = rubyToHtml('🎤 話《はな》してみる');
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

  // ドラッグ＆ドロップ（カードパズル画面）
  var dragCtx = { pointerId: null, cardId: null, originLi: null, dragging: false, ghost: null, offsetX: 0, offsetY: 0, width: 0 };
  var DRAG_THRESHOLD = 8;
  var suppressNextCardClick = false;

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function showScreen(id) {
    stopListening();
    stopSpeaking();
    qsa('.screen').forEach(function (el) { el.classList.remove('active'); });
    $(id).classList.add('active');
    window.scrollTo(0, 0);
    if (id === 'screen-home') renderChildPicker();
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

  // ---------- ふりがな（《》記法） ----------
  var RUBY_PATTERN = /([㐀-鿿々〆ヶ]+)《([^》]+)》/g;

  function stripRuby(str) {
    return String(str).replace(/《[^》]+》/g, '');
  }

  function rubyToHtml(str) {
    return escapeHtml(str).replace(RUBY_PATTERN, '<ruby>$1<rt>$2</rt></ruby>');
  }

  // ---------- 確認モーダル（confirmの代わり） ----------
  var confirmCallback = null;

  function showConfirm(message, opts, onOk) {
    opts = opts || {};
    $('confirm-emoji').textContent = opts.emoji || '🤔';
    $('confirm-message').textContent = message;
    $('confirm-ok').textContent = opts.okLabel || 'はい';
    confirmCallback = onOk;
    $('confirm-modal').classList.remove('hidden');
  }

  function setupConfirmModal() {
    $('confirm-cancel').addEventListener('click', function () {
      confirmCallback = null;
      $('confirm-modal').classList.add('hidden');
    });
    $('confirm-ok').addEventListener('click', function () {
      var cb = confirmCallback;
      confirmCallback = null;
      $('confirm-modal').classList.add('hidden');
      if (cb) cb();
    });
  }

  // ---------- お祝い演出 ----------
  var CONFETTI_COLORS = ['#e76f51', '#2c6e49', '#f4a261', '#e9c46a', '#4c956c', '#8ecae6'];

  function launchConfetti() {
    var layer = document.createElement('div');
    layer.className = 'confetti-layer';
    for (var i = 0; i < 40; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = (Math.random() * 0.8) + 's';
      piece.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 3500);
  }

  function celebrateSave(book) {
    var doneCount = data.books.filter(function (b) {
      return b.childId === book.childId && b.status === 'done';
    }).length;
    var msg = 'これで ' + doneCount + 'さつめの かんそうぶんが できたよ！';
    if (doneCount === 1) msg = 'はじめての かんそうぶんが できたよ！';
    if (doneCount === 3) msg += '\n🥉 3さつ たっせい！すごい！';
    if (doneCount === 5) msg += '\n🥈 5さつ たっせい！めいじんだね！';
    if (doneCount >= 10) msg += '\n🥇 10さつ いじょう！はかせだ！';
    $('celebrate-message').textContent = msg;
    $('celebrate-modal').classList.remove('hidden');
    launchConfetti();
  }

  function setupCelebrateModal() {
    $('celebrate-close').addEventListener('click', function () {
      $('celebrate-modal').classList.add('hidden');
      openShelf();
    });
  }

  // ---------- データモデル ----------
  function defaultData() {
    return {
      version: 4,
      passcode: '0000',
      geminiApiKey: '',
      children: [],
      books: []
    };
  }

  function defaultBook(childId, title, date, gradeNum, targetChars) {
    return {
      id: uid(),
      childId: childId,
      title: title,
      date: date,
      gradeNum: gradeNum,
      targetChars: targetChars,
      stage: 'interview',
      answers: [],
      questionQueue: BASE_QUESTIONS[gradeBand(gradeNum)].map(cloneQuestion),
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
    // 旧バージョン(子ども固定モード)からの移行：既存データのchildIdをそのまま活かす
    if (!raw.children) {
      raw.children = [
        { id: 'shuya', name: '修也', avatar: '🦖' },
        { id: 'hiroto', name: '啓仁', avatar: '🐰' }
      ];
    }
    raw.books.forEach(function (book) {
      // 旧データ('grade1'/'grade3'モード)を学年数値＋目標文字数へ変換
      if (typeof book.gradeNum !== 'number') {
        book.gradeNum = (book.grade === 'grade3') ? 3 : 1;
      }
      if (typeof book.targetChars !== 'number') {
        book.targetChars = RECOMMENDED_CHARS[book.gradeNum] || 400;
      }
      if (!book.questionQueue) book.questionQueue = BASE_QUESTIONS[gradeBand(book.gradeNum)].map(cloneQuestion);
      if (typeof book.followupIndex !== 'number') book.followupIndex = 0;
      if (typeof book.rawEssayText !== 'string') book.rawEssayText = '';
      if (typeof book.aiPolished !== 'boolean') book.aiPolished = false;
    });
    raw.version = 4;
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
  function renderChildPicker() {
    var wrap = $('child-picker');
    wrap.innerHTML = '';
    $('child-picker-empty').classList.toggle('hidden', data.children.length > 0);

    data.children.forEach(function (child) {
      var btn = document.createElement('button');
      btn.className = 'child-btn';
      btn.setAttribute('data-child', child.id);

      var avatarSpan = document.createElement('span');
      avatarSpan.className = 'avatar';
      avatarSpan.textContent = child.avatar;

      var nameSpan = document.createElement('span');
      nameSpan.className = 'child-name';
      nameSpan.textContent = child.name;

      btn.appendChild(avatarSpan);
      btn.appendChild(nameSpan);
      btn.addEventListener('click', function () {
        state.childId = child.id;
        openShelf();
      });
      wrap.appendChild(btn);
    });
  }

  function initHome() {
    renderChildPicker();
    qs('[data-action="open-settings"]').addEventListener('click', function () {
      requestPasscode('おうちの人の設定', function () {
        renderSettings();
        showScreen('screen-settings');
      });
    });
  }

  // ---------- 本棚 ----------
  function openShelf() {
    var child = getChild(state.childId);
    $('shelf-avatar').textContent = child.avatar;
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
      var gradeLabel = book.gradeNum + 'ねんせい・' + book.targetChars + '字';
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
        showConfirm('このかんそうぶんを けしてもいい？', { emoji: '🗑️', okLabel: 'けす' }, function () {
          data.books = data.books.filter(function (b) { return b.id !== id; });
          saveData();
          renderShelf();
          toast('削除しました');
        });
      });
    });

    renderShelfReward(books);
  }

  // 完成した冊数に応じてほめる（ごほうび表示）
  function renderShelfReward(books) {
    var doneCount = books.filter(function (b) { return b.status === 'done'; }).length;
    var el = $('shelf-reward');
    el.classList.toggle('hidden', doneCount === 0);
    if (doneCount === 0) return;
    var stars = '';
    for (var i = 0; i < Math.min(doneCount, 10); i++) stars += '⭐';
    var medal = '';
    if (doneCount >= 10) medal = '🥇';
    else if (doneCount >= 5) medal = '🥈';
    else if (doneCount >= 3) medal = '🥉';
    el.innerHTML = '<span class="reward-stars">' + stars + '</span>' +
      '<span class="reward-text">できた かんそうぶん：' + doneCount + 'さつ ' + medal + '</span>';
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
  var selectedGradeNum = null;

  function initNewBook() {
    qs('[data-action="new-book"]').addEventListener('click', function () {
      $('input-title').value = '';
      $('input-date').value = new Date().toISOString().slice(0, 10);
      $('input-chars').value = '';
      selectedGradeNum = null;
      qsa('.grade-num-btn').forEach(function (b) { b.classList.remove('selected'); });
      qsa('.chars-preset').forEach(function (b) { b.classList.remove('selected'); });
      showScreen('screen-newbook');
    });

    qsa('.grade-num-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedGradeNum = parseInt(btn.getAttribute('data-grade'), 10);
        qsa('.grade-num-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        // 学年に合わせたおすすめ文字数を自動入力(あとから自由に変更OK)
        $('input-chars').value = RECOMMENDED_CHARS[selectedGradeNum];
        qsa('.chars-preset').forEach(function (b) {
          b.classList.toggle('selected', parseInt(b.getAttribute('data-chars'), 10) === RECOMMENDED_CHARS[selectedGradeNum]);
        });
      });
    });

    qsa('.chars-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('input-chars').value = btn.getAttribute('data-chars');
        qsa('.chars-preset').forEach(function (b) { b.classList.toggle('selected', b === btn); });
      });
    });

    $('input-chars').addEventListener('input', function () {
      var val = parseInt($('input-chars').value, 10);
      qsa('.chars-preset').forEach(function (b) {
        b.classList.toggle('selected', parseInt(b.getAttribute('data-chars'), 10) === val);
      });
    });

    $('btn-start-interview').addEventListener('click', function () {
      var title = $('input-title').value.trim();
      var date = $('input-date').value;
      var chars = parseInt($('input-chars').value, 10);
      if (!title) { toast('本のタイトルを入れてね'); return; }
      if (!selectedGradeNum) { toast('なんねんせいか えらんでね'); return; }
      if (!chars || chars < 100 || chars > 4000) { toast('もくひょう文字数は100〜4000字で入れてね'); return; }

      var book = defaultBook(state.childId, title, date, selectedGradeNum, chars);
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
    $('btn-speak').addEventListener('click', onSpeakQuestion);
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

  // ---------- 質問の読み上げ ----------
  function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var btn = $('btn-speak');
    if (btn) btn.classList.remove('speaking');
  }

  function onSpeakQuestion() {
    if (!('speechSynthesis' in window)) {
      toast('このブラウザでは よみあげが つかえないよ🔊');
      return;
    }
    if (window.speechSynthesis.speaking) {
      stopSpeaking();
      return;
    }
    var book = currentBook();
    var q = book.questionQueue[state.questionIndex];
    if (!q) return;
    var utter = new SpeechSynthesisUtterance(stripRuby(q.text));
    utter.lang = 'ja-JP';
    utter.rate = 0.9;
    var btn = $('btn-speak');
    utter.onstart = function () { btn.classList.add('speaking'); };
    utter.onend = function () { btn.classList.remove('speaking'); };
    utter.onerror = function () { btn.classList.remove('speaking'); };
    window.speechSynthesis.speak(utter);
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
    var target = book.targetChars;
    $('q-progress').textContent = totalChars + '字 / ' + target + '字';
    $('interview-progress-fill').style.width = Math.min(100, Math.round((totalChars / target) * 100)) + '%';
    document.body.classList.toggle('furigana-on', book.gradeNum <= 2);
    $('question-text').innerHTML = rubyToHtml(q.text);
    $('answer-input').value = '';
    $('depth-hint').classList.add('hidden');

    var chipsWrap = $('emotion-chips');
    if (book.gradeNum <= 2) {
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

    book.answers[idx] = { text: text, zone: q.zone, question: stripRuby(q.text) };
    book.updatedAt = Date.now();

    var totalChars = book.answers.reduce(function (sum, a) { return sum + (a ? a.text.length : 0); }, 0);
    var target = book.targetChars;
    var needMore = totalChars < target * ENOUGH_RATIO;
    var pool = FOLLOWUP_QUESTIONS[gradeBand(book.gradeNum)];

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
    qs('.puzzle-zones').addEventListener('pointerdown', onPuzzlePointerDown);
  }

  // ---------- カードのドラッグ＆ドロップ ----------
  function onPuzzlePointerDown(ev) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    var li = ev.target.closest('.puzzle-card');
    if (!li) return;
    if (ev.target.closest('.card-move-btns')) return;

    dragCtx.pointerId = ev.pointerId;
    dragCtx.cardId = li.getAttribute('data-card');
    dragCtx.originLi = li;
    dragCtx.startX = ev.clientX;
    dragCtx.startY = ev.clientY;
    dragCtx.dragging = false;

    var rect = li.getBoundingClientRect();
    dragCtx.offsetX = ev.clientX - rect.left;
    dragCtx.offsetY = ev.clientY - rect.top;
    dragCtx.width = rect.width;

    try { li.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
    li.addEventListener('pointermove', onPuzzlePointerMove);
    li.addEventListener('pointerup', onPuzzlePointerUp);
    li.addEventListener('pointercancel', onPuzzlePointerUp);
  }

  function onPuzzlePointerMove(ev) {
    if (ev.pointerId !== dragCtx.pointerId) return;
    var dx = ev.clientX - dragCtx.startX;
    var dy = ev.clientY - dragCtx.startY;
    if (!dragCtx.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      startPuzzleDrag();
    }
    ev.preventDefault();
    movePuzzleGhost(ev.clientX, ev.clientY);
    updatePuzzleDropHighlight(ev.clientX, ev.clientY);
  }

  function startPuzzleDrag() {
    dragCtx.dragging = true;
    dragCtx.originLi.classList.add('drag-origin');
    var ghost = dragCtx.originLi.cloneNode(true);
    ghost.classList.add('puzzle-card-ghost');
    ghost.style.width = dragCtx.width + 'px';
    document.body.appendChild(ghost);
    dragCtx.ghost = ghost;
  }

  function movePuzzleGhost(x, y) {
    if (!dragCtx.ghost) return;
    dragCtx.ghost.style.transform = 'translate(' + (x - dragCtx.offsetX) + 'px, ' + (y - dragCtx.offsetY) + 'px)';
  }

  function updatePuzzleDropHighlight(x, y) {
    var el = document.elementFromPoint(x, y);
    var zoneEl = el && el.closest('.puzzle-zone');
    qsa('.puzzle-zone').forEach(function (z) { z.classList.toggle('drop-target', z === zoneEl); });
  }

  function onPuzzlePointerUp(ev) {
    if (ev.pointerId !== dragCtx.pointerId) return;
    var li = dragCtx.originLi;
    li.removeEventListener('pointermove', onPuzzlePointerMove);
    li.removeEventListener('pointerup', onPuzzlePointerUp);
    li.removeEventListener('pointercancel', onPuzzlePointerUp);
    try { li.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }

    if (dragCtx.dragging) {
      finishPuzzleDrop(ev.clientX, ev.clientY);
      suppressNextCardClick = true;
    }
    if (dragCtx.ghost) { dragCtx.ghost.remove(); dragCtx.ghost = null; }
    li.classList.remove('drag-origin');
    qsa('.puzzle-zone').forEach(function (z) { z.classList.remove('drop-target'); });
    dragCtx.dragging = false;
    dragCtx.cardId = null;
    dragCtx.pointerId = null;
    dragCtx.originLi = null;
  }

  function finishPuzzleDrop(x, y) {
    var el = document.elementFromPoint(x, y);
    var zoneEl = el && el.closest('.puzzle-zone');
    if (!zoneEl) return;
    var targetZone = zoneEl.getAttribute('data-zone');
    var listEl = qs('.zone-list', zoneEl);
    var cards = qsa('.puzzle-card', listEl).filter(function (c) { return c.getAttribute('data-card') !== dragCtx.cardId; });
    var targetIndex = cards.length;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      var mid = r.top + r.height / 2;
      if (y < mid) { targetIndex = i; break; }
    }
    moveCardToZoneAtIndex(dragCtx.cardId, targetZone, targetIndex);
  }

  function moveCardToZoneAtIndex(cardId, targetZone, targetIndex) {
    var book = currentBook();
    var fromZone = findCardZone(book, cardId);
    if (fromZone) {
      book.zones[fromZone] = book.zones[fromZone].filter(function (id) { return id !== cardId; });
    }
    var arr = book.zones[targetZone];
    var idx = Math.max(0, Math.min(targetIndex, arr.length));
    arr.splice(idx, 0, cardId);
    state.selectedCardId = null;
    book.updatedAt = Date.now();
    saveData();
    renderPuzzle();
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
    moveCardToZoneAtIndex(cardId, targetZone, book.zones[targetZone].length);
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
          '<span class="drag-handle">⠿</span>' +
          '<span class="card-text">' + escapeHtml(card.text) + '</span>' +
          '<span class="card-move-btns">' +
            '<button type="button" data-up="' + cardId + '">▲</button>' +
            '<button type="button" data-down="' + cardId + '">▼</button>' +
          '</span>';
        listEl.appendChild(li);

        li.addEventListener('click', function (ev) {
          if (suppressNextCardClick) { suppressNextCardClick = false; return; }
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
    var html = CONNECTOR_GROUPS.map(function (group) {
      return '<div class="connector-group-label">' + escapeHtml(group.label) + '</div>' +
        '<div class="connector-group">' +
        group.words.map(function (w) {
          return '<button type="button" class="connector-option" data-word="' + w + '">' + w + '</button>';
        }).join('') +
        '</div>';
    }).join('');
    html += '<button type="button" class="connector-option connector-none" data-word="なし">❌ つかわない</button>';
    optWrap.innerHTML = html;
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
  // はじめ・なか・おわりを段落として組み立てる。改行(\n)が段落の切れ目で、
  // 段落の頭には1マス分の全角スペースを入れる
  function buildEssayText(book) {
    var order = flattenZones(book);
    var text = '';
    var prevZone = null;
    order.forEach(function (cardId, i) {
      var card = cardById(book, cardId);
      if (!card) return;
      var sentence = String(card.text).replace(/[\r\n]+/g, '').trim();
      if (!sentence) return;
      if (!/[。！？」]$/.test(sentence)) sentence += '。';
      var connector = i > 0 ? (book.connectors[i - 1] || '') : '';
      // 答えがすでに同じつなぎ言葉で始まっていたら二重にしない
      if (connector && sentence.indexOf(connector) === 0) connector = '';
      var zone = findCardZone(book, cardId);
      if (prevZone === null || zone !== prevZone) {
        text += (prevZone === null ? '' : '\n') + '　';
      }
      if (connector) text += connector + '、';
      text += sentence;
      prevZone = zone;
    });
    return text;
  }

  // 原稿用紙の行割り。句読点・閉じかっこは行頭に来ないよう前の行の最後のマスにぶら下げる
  function layoutGenko(text) {
    var lines = [[]];
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === '\n') { lines.push([]); continue; }
      var line = lines[lines.length - 1];
      if (line.length >= GENKO_ROWS_PER_COLUMN) {
        if (ch === '、' || ch === '。' || ch === '」') {
          line[GENKO_ROWS_PER_COLUMN - 1] += ch;
          continue;
        }
        lines.push([]);
        line = lines[lines.length - 1];
      }
      line.push(ch);
    }
    return lines;
  }

  function renderPreview() {
    var book = currentBook();
    var child = getChild(book.childId);
    var target = book.targetChars;
    var text = book.essayText || buildEssayText(book);

    $('preview-book-title').textContent = '「' + book.title + '」を読んで';
    $('preview-child-name').textContent = child.name;

    var charCount = Array.from(text.replace(/\n/g, '')).length;
    var pct = Math.min(100, Math.round((charCount / target) * 100));
    $('char-meter-fill').style.width = pct + '%';
    $('char-meter-text').textContent = charCount + ' / ' + target + '字';

    var grid = $('genko-grid');
    grid.innerHTML = '';
    var lines = layoutGenko(text);
    var colCount = Math.max(lines.length, Math.ceil(target / GENKO_ROWS_PER_COLUMN));
    for (var c = 0; c < colCount; c++) {
      var col = document.createElement('div');
      col.className = 'genko-col';
      var line = lines[c] || [];
      for (var r = 0; r < GENKO_ROWS_PER_COLUMN; r++) {
        var span = document.createElement('span');
        var cell = line[r] || '';
        span.textContent = cell;
        // ぶら下げた句読点入りのマス（2文字）は縦に小さく並べる
        if (Array.from(cell).length > 1) span.className = 'hang';
        col.appendChild(span);
      }
      grid.appendChild(col);
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
      if (!book.aiPolished) book.essayText = buildEssayText(book);
      book.status = 'done';
      book.stage = 'done';
      book.updatedAt = Date.now();
      saveData();
      celebrateSave(book);
    });
    $('btn-edit-again').addEventListener('click', function () {
      var book = currentBook();
      book.stage = 'connect';
      book.status = 'draft';
      book.essayText = '';
      book.rawEssayText = '';
      book.aiPolished = false;
      book.updatedAt = Date.now();
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
      '段落の分かれ目（改行）と、段落のはじめの全角スペースはそのまま残してください。' +
      '整えた文章のみを出力してください。\n\n---\n' + original;

    var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': data.geminiApiKey },
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
        '<h3>お子さんの登録</h3>' +
        '<div class="settings-children-list" id="settings-children-list"></div>' +
        '<div class="settings-add-child">' +
          '<label class="form-label" style="margin-top:0.8rem;">なまえ</label>' +
          '<input type="text" id="new-child-name" class="form-input" placeholder="れい：ゆうた" maxlength="20">' +
          '<label class="form-label">アイコン</label>' +
          '<div class="avatar-picker" id="new-child-avatar-picker"></div>' +
          '<button class="settings-save full" id="btn-add-child">お子さんを追加</button>' +
        '</div>' +
      '</div>' +
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

    function renderChildrenBlock() {
      var listEl = $('settings-children-list');
      listEl.innerHTML = '';
      data.children.forEach(function (child) {
        var row = document.createElement('div');
        row.className = 'child-settings-row';

        var avatarBtn = document.createElement('button');
        avatarBtn.type = 'button';
        avatarBtn.className = 'child-row-avatar';
        avatarBtn.title = 'タップでアイコンをかえる';
        avatarBtn.textContent = child.avatar;
        avatarBtn.addEventListener('click', function () {
          var idx = AVATAR_CHOICES.indexOf(child.avatar);
          child.avatar = AVATAR_CHOICES[(idx + 1) % AVATAR_CHOICES.length];
          saveData();
          renderChildrenBlock();
        });

        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'child-row-name';
        nameInput.maxLength = 20;
        nameInput.value = child.name;
        nameInput.addEventListener('change', function () {
          var v = nameInput.value.trim();
          if (!v) { nameInput.value = child.name; return; }
          child.name = v;
          saveData();
          toast('名前を変更しました');
        });

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'child-row-delete';
        delBtn.textContent = '削除';
        delBtn.addEventListener('click', function () {
          var bookCount = data.books.filter(function (b) { return b.childId === child.id; }).length;
          var msg = bookCount > 0
            ? child.name + 'さんを削除しますか？かんそうぶん' + bookCount + '件もいっしょに削除されます。この操作は元に戻せません。'
            : child.name + 'さんを削除しますか？この操作は元に戻せません。';
          showConfirm(msg, { emoji: '⚠️', okLabel: '削除する' }, function () {
            data.children = data.children.filter(function (c) { return c.id !== child.id; });
            data.books = data.books.filter(function (b) { return b.childId !== child.id; });
            saveData();
            renderChildrenBlock();
            toast('削除しました');
          });
        });

        row.appendChild(avatarBtn);
        row.appendChild(nameInput);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }

    function renderNewChildAvatarPicker() {
      var picker = $('new-child-avatar-picker');
      picker.innerHTML = '';
      if (!newChildSelectedAvatar) newChildSelectedAvatar = AVATAR_CHOICES[0];
      AVATAR_CHOICES.forEach(function (a) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-choice-btn' + (a === newChildSelectedAvatar ? ' selected' : '');
        btn.textContent = a;
        btn.addEventListener('click', function () {
          newChildSelectedAvatar = a;
          renderNewChildAvatarPicker();
        });
        picker.appendChild(btn);
      });
    }

    renderChildrenBlock();
    renderNewChildAvatarPicker();

    $('btn-add-child').addEventListener('click', function () {
      var nameInput = $('new-child-name');
      var name = nameInput.value.trim();
      if (!name) { toast('なまえを入力してね'); return; }
      var avatar = newChildSelectedAvatar || AVATAR_CHOICES[0];
      var id = 'child-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      data.children.push({ id: id, name: name, avatar: avatar });
      saveData();
      nameInput.value = '';
      newChildSelectedAvatar = null;
      renderChildrenBlock();
      renderNewChildAvatarPicker();
      toast(name + 'さんを追加しました');
    });

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
      showConfirm('本当にすべてのデータを消しますか？この操作は元に戻せません。', { emoji: '⚠️', okLabel: '消す' }, function () {
        localStorage.removeItem(STORAGE_KEY);
        data = defaultData();
        saveData();
        toast('データをリセットしました');
        showScreen('screen-home');
      });
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
    setupConfirmModal();
    setupCelebrateModal();
    registerSW();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
