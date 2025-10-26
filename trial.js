/* global PIXI */
window.onload = function () {
  console.log(PIXI);

  //--------------------------------------- pixi start -----------------------------------> init

  const containerEl = document.getElementById("pixi-container-waves-blur");

  // после создания stageContainer
  const wrapperEl = document.getElementById("main-field-wrapper");
  const fieldEl = document.getElementById("main-field");
  // чтобы был доступен вне блока условий
  let blurVideoSprite = null;

  // === Создание приложения ===
  const app = new PIXI.Application({
    resizeTo: containerEl,
    backgroundAlpha: 0, // прозрачный фон
    antialias: true,
  });
  containerEl.appendChild(app.view);
  app.ticker.maxFPS = 45; // ограничить FPS

  // === Контейнер для эффекта ===
  const stageContainer = new PIXI.Container();
  app.stage.addChild(stageContainer);

  //--------------------------------------- pixi ----------------------------------> video upl

  // === Загрузка видео в Pixi ===
  // === Загрузка видео в Pixi (кроссбраузер: MP4 для Safari + WebM) ===
const mp4URL = 'https://dunchekk.github.io/stud-2_01-struct-lending/imgs/wod2.mp4';
const webmURL = 'https://dunchekk.github.io/stud-2_01-struct-lending/imgs/wod2.webm';

const videoEl = document.createElement('video');
videoEl.crossOrigin = 'anonymous';
videoEl.muted = true;
videoEl.loop = true;
videoEl.autoplay = true;
videoEl.playsInline = true;
videoEl.setAttribute('playsinline', '');
videoEl.preload = 'auto';

const srcMp4 = document.createElement('source');
srcMp4.src = mp4URL;
srcMp4.type = 'video/mp4';

const srcWebm = document.createElement('source');
srcWebm.src = webmURL;
srcWebm.type = 'video/webm';

videoEl.append(srcMp4, srcWebm);

// Безопасный автозапуск + запасной запуск по пользовательскому жесту (для iOS/Safari)
const tryPlay = () => videoEl.play().catch(() => {});
videoEl.addEventListener('canplay', tryPlay, { once: true });
window.addEventListener('pointerdown', tryPlay, { once: true });

// Создаём Pixi-текстуру и спрайт из <video>
const videoTexture = PIXI.Texture.from(videoEl);
const videoSprite = new PIXI.Sprite(videoTexture);


  // Fit video to cover while preserving aspect ratio; add overscan for parallax
  const OVERSCAN = 1.4; // was ~1.8 fixed stretch; use slightly gentler overscan
  videoSprite.anchor.set(0.5);

  function sizeVideoToCover() {
    const vw =
      (videoEl && videoEl.videoWidth) || videoSprite.texture.width || 1920;
    const vh =
      (videoEl && videoEl.videoHeight) || videoSprite.texture.height || 1080;
    if (!vw || !vh) return;
    const scale =
      Math.max(app.screen.width / vw, app.screen.height / vh) * OVERSCAN;
    videoSprite.scale.set(scale);
    videoSprite.x = app.screen.width / 2;
    videoSprite.y = app.screen.height / 2;
    if (blurVideoSprite) {
      blurVideoSprite.scale.set(scale);
      blurVideoSprite.x = videoSprite.x;
      blurVideoSprite.y = videoSprite.y;
    }
  }

  // Initial sizing when metadata is available; fallback run on resize too
  const applyInitialSizing = () => sizeVideoToCover();
  if (videoEl.readyState >= 1) applyInitialSizing();
  else
    videoEl.addEventListener("loadedmetadata", applyInitialSizing, {
      once: true,
    });

  // Добавляем В САМОЕ НАЧАЛО stageContainer (до текстур)
  stageContainer.addChildAt(videoSprite, 0);

  //--------------------------------------- pixi --------------------------------> blur

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const lowPerf = window.devicePixelRatio > 2 || app.screen.width < 800;

  if (!isMobile && !lowPerf) {
    // ... включаем блюр с маской ...

    // === параметры ===
    const radius = 300;
    const blurSize = 250;

    // === 1. добавляем оригинальное видео (чёткое) ===
    // stageContainer.addChild(videoSprite);

    // === 2. создаём размытый слой поверх ===
    blurVideoSprite = new PIXI.Sprite(videoSprite.texture);
    blurVideoSprite.anchor.set(0.5);
    // scale/position applied by sizeVideoToCover

    const blurFilter = new PIXI.BlurFilter();
    blurFilter.blur = 6;
    blurVideoSprite.filters = [blurFilter];

    // добавляем поверх оригинала
    stageContainer.addChild(blurVideoSprite);

    // === 3. создаём МАСКУ, которая скрывает блюр в центре ===
    const circle = new PIXI.Graphics();

    // шаг 1: рисуем сплошной белый прямоугольник — вся область видна
    const pad = Math.max(app.screen.width, app.screen.height) * 2;
    circle.beginFill(0xffffff);
    circle.drawRect(-pad / 2, -pad / 2, pad, pad);
    circle.endFill();

    // шаг 2: вырезаем в центре мягкий круг (дырку)
    circle.beginHole();
    circle.drawCircle(0, 0, radius);
    circle.endHole();

    // размываем края дырки, чтобы переход был плавный
    circle.filters = [new PIXI.BlurFilter(blurSize)];

    // генерируем текстуру маски
    const bounds = new PIXI.Rectangle(-pad / 2, -pad / 2, pad, pad);

    const circleTexture = app.renderer.generateTexture(circle, {
      scaleMode: PIXI.SCALE_MODES.LINEAR,
      resolution: 1,
      region: bounds,
    });

    // создаём спрайт маски
    const focus = new PIXI.Sprite(circleTexture);
    focus.anchor.set(0.5); // центр спрайта = центр дырки
    app.stage.addChild(focus);

    // применяем маску к размытым слоям — центр теперь «дырка»
    blurVideoSprite.mask = focus;

    // === 4. движение маски за курсором ===
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointermove", (e) => {
      const pos = e.global;
      focus.position.set(pos.x, pos.y);
    });

    window.addEventListener("resize", () => {
      const pad = Math.max(app.screen.width, app.screen.height) * 2;
      circle.clear();
      circle.beginFill(0xffffff);
      circle.drawRect(-pad / 2, -pad / 2, pad, pad);
      circle.endFill();
      circle.beginHole();
      circle.drawCircle(0, 0, radius);
      circle.endHole();
      circle.filters = [new PIXI.BlurFilter(blurSize)];

      const bounds = new PIXI.Rectangle(-pad / 2, -pad / 2, pad, pad);
      const newTexture = app.renderer.generateTexture(circle, {
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        resolution: 1,
        region: bounds,
      });
      focus.texture = newTexture;

      sizeVideoToCover();
      updateParallax();
    });
  }

  //--------------------------------------- pixi + vanilla ------------------> motion on scroll

  // === Параллакс по скроллу main-field-wrapper ===

  // 1 — в ту же сторону, -1 — в противоположную
  const PARALLAX_DIR = -1; // 1 — та же сторона, -1 — противоположная

  const lerp = (a, b, t) => a + (b - a) * t;

  function getScrollRatios() {
    const maxX = Math.max(0, fieldEl.scrollWidth - wrapperEl.clientWidth);
    const maxY = Math.max(0, fieldEl.scrollHeight - wrapperEl.clientHeight);
    const rx = maxX ? wrapperEl.scrollLeft / maxX : 0; // 0..1
    const ry = maxY ? wrapperEl.scrollTop / maxY : 0; // 0..1
    return { rx, ry };
  }

  function getTravel() {
    // сколько можно сместить центр, чтобы не оголить края
    const travelX = Math.max(0, (videoSprite.width - app.screen.width) / 2);
    const travelY = Math.max(0, (videoSprite.height - app.screen.height) / 2);
    return { travelX, travelY };
  }

  function updateParallax() {
    const { rx, ry } = getScrollRatios();
    const { travelX, travelY } = getTravel();

    // 0..1 → [-travel, +travel] и «в ту же сторону»
    const ox = PARALLAX_DIR * lerp(-travelX, +travelX, rx);
    const oy = PARALLAX_DIR * lerp(-travelY, +travelY, ry);

    const cx = app.screen.width / 2 + ox;
    const cy = app.screen.height / 2 + oy;

    videoSprite.x = cx;
    videoSprite.y = cy;

    if (blurVideoSprite) {
      blurVideoSprite.x = cx;
      blurVideoSprite.y = cy;
    }
  }

  // rAF-троттлинг скролла
  let parallaxScheduled = false;
  wrapperEl.addEventListener(
    "scroll",
    () => {
      if (parallaxScheduled) return;
      parallaxScheduled = true;
      requestAnimationFrame(() => {
        parallaxScheduled = false;
        updateParallax();
      });
    },
    { passive: true }
  );

  // первичная установка
  updateParallax();

  //--------------------------------------- pixi --------------------------------> noisy textures

  // === Загрузка displacement-карты ===
  const displacementTexture = PIXI.Texture.from(
    "https://pixijs.com/assets/pixi-filters/displacement_map_repeat.jpg"
  );
  displacementTexture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;

  const displacementSprite = new PIXI.Sprite(displacementTexture);
  // делаем спрайт крупнее, чем экран, чтобы не было краёв
  displacementSprite.width = app.screen.width * 2;
  displacementSprite.height = app.screen.height * 2;
  displacementSprite.x = -app.screen.width / 2;
  displacementSprite.y = -app.screen.height / 2;
  stageContainer.addChild(displacementSprite);

  // === Создаём полупрозрачный слой для "волнового" шума ===
  const noiseTexture = PIXI.Texture.from(
    "https://dunchekk.github.io/stud-2_01-struct-lending/imgs/noisy.png" // мягкая прозрачная
    // noise-текстура
  );
  const noiseSprite = new PIXI.TilingSprite(
    noiseTexture,
    app.screen.width,
    app.screen.height
  );
  noiseSprite.alpha = 0.2; // лёгкая прозрачность, чтобы “мерцало”
  stageContainer.addChild(noiseSprite);

  // === Фильтр смещения ===
  const displacementFilter = new PIXI.DisplacementFilter(displacementSprite);
  displacementFilter.scale.x = 20;
  displacementFilter.scale.y = 40;

  // === Анимация дребезжания ===
  let frame = 0;
  app.ticker.add((delta) => {
    if ((frame++ & 1) === 1) return; // обновлять через кадр
    displacementSprite.x += 0.6 * delta;
    displacementSprite.y += 0.4 * delta;
    if (displacementSprite.x > 0) displacementSprite.x = -app.screen.width / 2;
    if (displacementSprite.y > 0) displacementSprite.y = -app.screen.height / 2;
    noiseSprite.tilePosition.x += 0.09 * delta;
    noiseSprite.tilePosition.y += 0.05 * delta;
  });

  //--------------------------------------- pixi --------------------------------> add stuff

  // === Реакция на resize ===
  window.addEventListener("resize", () => {
    sizeVideoToCover();

    noiseSprite.tileScale.set(
      app.screen.width / noiseSprite.texture.width,
      app.screen.height / noiseSprite.texture.height
    );

    displacementSprite.width = app.screen.width * 2;
    displacementSprite.height = app.screen.height * 2;
    displacementSprite.x = -app.screen.width / 2;
    displacementSprite.y = -app.screen.height / 2;

    noiseSprite.width = app.screen.width;
    noiseSprite.height = app.screen.height;

    updateParallax();
  });

  //--------------------------------------- vanilla --------------------------------> add stuff

  // === (чтобы тильда не страдала хренью) ===

  document.body.style.overflow = "hidden";
};

async function initField() {
  // 1️⃣ Загружаем JSON
  const response = await fetch(
    "https://dunchekk.github.io/stud-2_01-struct-lending/data.json"
  );
  const data = await response.json(); // теперь это массив из 39 объектов

  // 2️⃣ Настраиваем размеры поля
  const SCREEN_W = window.innerWidth;
  const SCREEN_H = window.innerHeight;
  const SCALE_FACTOR = 9;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // Make field proportionally wider on mobile (reduce tallness)
  const WIDTH_BOOST = isMobile ? 1.8 : 1.0; // widen
  const HEIGHT_SHRINK = isMobile ? 0.9 : 1.0; // slightly shorter
  const FIELD_W = SCREEN_W * SCALE_FACTOR * WIDTH_BOOST;
  const FIELD_H = SCREEN_H * SCALE_FACTOR * HEIGHT_SHRINK;

  // минимальный отступ между краем нода и краем поля
  const EDGE_MARGIN_VW = 5; // поменяйте при желании
  const EDGE_MARGIN = window.innerWidth * (EDGE_MARGIN_VW / 100);

  const field = document.getElementById("main-field");
  field.style.width = FIELD_W + "px";
  field.style.height = FIELD_H + "px";

  // 3️⃣ Константы генерации координат
  // 3️⃣ Константы генерации координат: минимум 120vw между центрами
  // 3️⃣ Константы генерации координат: r_min=120vw, r_max=200vw
  // 3️⃣ Константы генерации координат (рекурсия по N, попытки — итерацией)
  // 3️⃣ Константы генерации координат (равномерный разлёт по полю)
  const N = data.length;

  const MIN_DISTANCE_VW = 10; // минимум между центрами
  const MAX_DISTANCE_VW = 80; // потолок «удалённости» (≈1.5×MIN → 110–140)
  const MIN_DISTANCE = SCREEN_W * (MIN_DISTANCE_VW / 100);
  const MAX_DISTANCE = SCREEN_W * (MAX_DISTANCE_VW / 100);

  const PADDING_X = Math.max(EDGE_MARGIN, 10);
  const PADDING_Y = Math.max(EDGE_MARGIN, 10);
  const EFF_W = Math.max(1, FIELD_W - 2 * PADDING_X);
  const EFF_H = Math.max(1, FIELD_H - 2 * PADDING_Y);

  const positions = [];

  // === Кандидаты по сетке с джиттером ===
  // === Жёсткая сетка: ровно N ячеек, по 1 ноду в ячейке ===
  // === Плотная сетка: ячеек больше, чем N; берём N равномерных ячеек ===
  (function buildGridOversampled() {
    const GRID_OVERSAMPLE = 1.0; // 2× больше ячеек → клетки ~в √2 раз меньше
    const targetCells = Math.ceil(N * GRID_OVERSAMPLE);

    // подбираем rows/cols под аспект рабочей области
    const ar = EFF_W / EFF_H;
    let rows = Math.max(1, Math.round(Math.sqrt(targetCells / ar)));
    let cols = Math.max(1, Math.ceil(targetCells / rows));
    while (rows * cols < targetCells) {
      const addColsWaste = (cols + 1) * rows - targetCells;
      const addRowsWaste = cols * (rows + 1) - targetCells;
      if (addColsWaste <= addRowsWaste) cols++;
      else rows++;
    }

    const cellW = EFF_W / cols;
    const cellH = EFF_H / rows;

    // внутренняя область ячейки (чтобы не липло к границам)
    const inset = 0.3; // 12% с каждой стороны
    const jitter = 0.6; // случайный сдвиг внутри внутреннего прямоугольника

    // соберём все ячейки как кандидатов
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = PADDING_X + c * cellW;
        const y0 = PADDING_Y + r * cellH;

        const ix0 = x0 + cellW * inset;
        const iy0 = y0 + cellH * inset;
        const iw = cellW * (1 - 2 * inset);
        const ih = cellH * (1 - 2 * inset);

        const x = ix0 + iw * (0.5 + (Math.random() - 0.5) * 2 * jitter);
        const y = iy0 + ih * (0.5 + (Math.random() - 0.5) * 2 * jitter);

        cells.push({
          x: Math.min(PADDING_X + EFF_W, Math.max(PADDING_X, x)),
          y: Math.min(PADDING_Y + EFF_H, Math.max(PADDING_Y, y)),
        });
      }
    }

    // перемешиваем и берём первые N ячеек — просто и достаточно ровно при oversample > 1
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    positions.length = 0;
    for (let i = 0; i < N && i < cells.length; i++) {
      positions.push(cells[i]);
    }
  })();

  if (positions.length < N) {
    console.warn(
      `Разместили ${positions.length}/${N} при min=${MIN_DISTANCE_VW}vw, max=${MAX_DISTANCE_VW}vw. 
      Увеличьте SCALE_FACTOR или скорректируйте min/max.`
    );
  }

  // перемешивание и нормирование
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  shuffle(positions);

  const normPositions = positions.map((p) => ({
    nx: p.x / FIELD_W,
    ny: p.y / FIELD_H,
  }));

  const blocks = []; // сюда положим созданные ноды по индексу i

  function clampCenterToField(block, centerX, centerY) {
    // Важно: блок должен быть в DOM, чтобы размеры были валидны
    const rect = block.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    // на случай слишком крупных блоков: не даём уйти в NaN
    const minX = Math.min(
      FIELD_W - EDGE_MARGIN - halfW,
      Math.max(EDGE_MARGIN + halfW, 0)
    );
    const maxX = Math.max(
      EDGE_MARGIN + halfW,
      Math.min(FIELD_W - EDGE_MARGIN - halfW, FIELD_W)
    );
    const minY = Math.min(
      FIELD_H - EDGE_MARGIN - halfH,
      Math.max(EDGE_MARGIN + halfH, 0)
    );
    const maxY = Math.max(
      EDGE_MARGIN + halfH,
      Math.min(FIELD_H - EDGE_MARGIN - halfH, FIELD_H)
    );

    const clampedX = Math.min(maxX, Math.max(minX, centerX));
    const clampedY = Math.min(maxY, Math.max(minY, centerY));

    block.style.left = clampedX + "px";
    block.style.top = clampedY + "px";
  }

  // -----------------------------render functions start -----------------------------

  // --- text render

  function renderTextElement(data, i) {
    const block = document.createElement("div");
    block.classList.add("text-el");
    block.classList.add("map-item");

    // можно позже задать координаты block.style.left/top из функции рандомного позиционирования

    // позиционирование
    block.style.position = "absolute";
    block.style.left = positions[i].x + "px";
    block.style.top = positions[i].y + "px";
    block.style.transform = "translate(-50%, -50%)";
    block.dataset.id = data.id;
    block.dataset.name = data.name;
    block.dataset.link = "—";

    block.innerHTML = `
    <div class="meta-top">
      <span class="title">${data.name}</span>
    </div>
    <div class="text-content">
      ${data.paragraphs
        .map((p, i) => `<p ${i === 0 ? 'class="active"' : ""}>${p}</p>`)
        .join("")}
    </div>
    <div class="meta-bottom">
      <span class="counter">1/${data.paragraphs.length}</span>
      <span class="scroll-hint">scroll it</span>
    </div>
  `;

    let current = 0;
    const paragraphs = block.querySelectorAll("p");
    const counter = block.querySelector(".counter");

    let switching = false;

    const SWITCH_COOLDOWN = 1000; // пауза между листаниями в мс (2с)
    function withCooldown(fn) {
      if (switching) return;
      const didSwitch = fn();
      if (didSwitch) {
        switching = true;
        setTimeout(() => {
          switching = false;
        }, SWITCH_COOLDOWN);
      }
    }

    // Обработчик скролла при наведении
    block.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (e.deltaY > 0) withCooldown(nextParagraph);
        else withCooldown(prevParagraph);
      },
      { passive: false }
    );

    // --------------можно также добавить листание свайпом для тач
    let startY = null;
    let swipeRecognized = false;
    const SWIPE_THRESHOLD = 50;

    block.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY;
        swipeRecognized = false;
      },
      { passive: true }
    );

    block.addEventListener(
      "touchmove",
      (e) => {
        if (startY == null) return;
        const dy = e.touches[0].clientY - startY;

        // жест распознан — блокируем прокрутку контейнера
        if (Math.abs(dy) > SWIPE_THRESHOLD) {
          swipeRecognized = true;
          e.preventDefault();
        }
      },
      { passive: false }
    );

    block.addEventListener("touchend", (e) => {
      if (startY == null) return;
      const diff = e.changedTouches[0].clientY - startY;

      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff < 0) withCooldown(nextParagraph);
        if (diff > 0) withCooldown(prevParagraph);
      }

      startY = null;
      swipeRecognized = false;
    });

    //--------------------

    function nextParagraph() {
      if (current < paragraphs.length - 1) {
        paragraphs[current].classList.remove("active");
        paragraphs[current].classList.add("exit");
        current++;
        paragraphs[current].classList.add("active");
        counter.textContent = `${current + 1}/${paragraphs.length}`;
        setTimeout(() => {
          paragraphs.forEach((p) => p.classList.remove("exit"));
        }, 600);
        return true;
      }
      return false;
    }

    function prevParagraph() {
      if (current > 0) {
        paragraphs[current].classList.remove("active");
        // снять возможные «зависшие» exit
        paragraphs.forEach((p) => p.classList.remove("exit"));
        current--;
        paragraphs[current].classList.add("active");
        counter.textContent = `${current + 1}/${paragraphs.length}`;
        return true;
      }
      return false;
    }

    document.getElementById("main-field").appendChild(block);
    // console.log(`rendered ${i}`);
    blocks[i] = block;
    clampCenterToField(block, positions[i].x, positions[i].y);
  }

  // --- pic render

  function renderPictureElement(data, i) {
    const block = document.createElement("div");
    block.classList.add("pic-el");
    block.classList.add("map-item");
    block.dataset.id = data.id;
    block.dataset.name = data.name;
    block.dataset.link = (data.link || "—").trim();

    // базовые стили
    block.style.position = "absolute";
    // block.style.cursor = "pointer";
    //   block.style.overflow = 'hidden';
    block.style.display = "flex";
    block.style.justifyContent = "center";
    block.style.alignItems = "center";

    // позиционирование
    block.style.position = "absolute";
    block.style.left = positions[i].x + "px";
    block.style.top = positions[i].y + "px";
    block.style.transform = "translate(-50%, -50%)";

    // дефолтные размеры, если в данных не задано (можно подправить под задачи)
    if (
      !(
        data.style &&
        typeof data.style === "object" &&
        (data.style.width || data.style.height)
      )
    ) {
      block.style.width = "auto";
      block.style.height = "auto";
    }

    // индивидуальные стили из JSON, если есть
    if (data.style && typeof data.style === "object") {
      Object.assign(block.style, data.style);
    }

    // выбор: картинка или видео
    const isVideo =
      typeof data.url === "string" && /\.(mp4|webm|ogg)$/i.test(data.url);
    let mediaEl;

    if (isVideo) {
      const video = document.createElement("video");
      video.src = data.url;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "metadata";
      // размеры/кадрирование
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.style.transition = "transform 0.6s ease";

      // безопасный запуск (на случай ограничений браузера)
      video.addEventListener("canplay", () => {
        video.play().catch(() => {});
      });

      mediaEl = video;
    } else {
      const img = document.createElement("img");
      img.src = data.url;
      img.alt = data.name || "";
      img.decoding = "async";
      img.loading = "lazy";
      // размеры/кадрирование
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.transition = "transform 0.6s ease";

      mediaEl = img;
    }

    block.appendChild(mediaEl);

    const parent = document.getElementById("main-field");
    parent.appendChild(block);
    // console.log(`rendered ${i}`);
    blocks[i] = block;

    const doClamp = () =>
      clampCenterToField(block, positions[i].x, positions[i].y);

    // кламп сразу и после загрузки медиа — чтобы учесть реальные размеры
    doClamp();

    if (mediaEl.tagName === "IMG") {
      if (mediaEl.complete) doClamp();
      else mediaEl.addEventListener("load", doClamp, { once: true });
    } else if (mediaEl.tagName === "VIDEO") {
      if (mediaEl.readyState >= 1) doClamp();
      else mediaEl.addEventListener("loadedmetadata", doClamp, { once: true });
    }

    // эффекты при наведении (одинаково для img и video)
    block.addEventListener("mouseenter", () => {
      mediaEl.style.transform = "scale(1.05)";
    });
    block.addEventListener("mouseleave", () => {
      mediaEl.style.transform = "scale(1)";
    });

    document.getElementById("main-field").appendChild(block);
    // console.log(`rendered ${i}`);
    blocks[i] = block;
  }

  // -----------------------------render functions end ------------------------------

  function applyLayout(newW, newH) {
    field.style.width = newW + "px";
    field.style.height = newH + "px";

    blocks.forEach((el, i) => {
      if (!el) return;
      const cx = normPositions[i].nx * newW;
      const cy = normPositions[i].ny * newH;
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      // переиспользуем хелпенр — он перечитает реальные размеры элемента
      clampCenterToField(el, cx, cy);
    });
  }

  let resizeScheduled = false;

  window.addEventListener("resize", () => {
    if (resizeScheduled) return;
    resizeScheduled = true;

    requestAnimationFrame(() => {
      resizeScheduled = false;
      const SW = window.innerWidth;
      const SH = window.innerHeight;
      const newW = SW * SCALE_FACTOR * (isMobile ? WIDTH_BOOST : 1);
      const newH = SH * SCALE_FACTOR * (isMobile ? HEIGHT_SHRINK : 1);
      applyLayout(newW, newH);
    });
  });

  // 4️⃣ Размещаем элементы на поле
  data.forEach((item, i) => {
    if (!positions[i]) {
      console.warn(
        `Пропуск элемента #${i} (${item.name || item.id}) — нет позиции`
      );
      return;
    }
    if (item.type === "text-el") renderTextElement(item, i);
    else renderPictureElement(item, i);
  });

  // 5️⃣ Отслеживаем видимость и считаем найденные
  const wrapper = document.getElementById("main-field-wrapper");
  const items = document.querySelectorAll(".map-item");

  const found = new Set(); // уникальные найденные id
  const foundSpan = document.getElementById("found-span");
  const nodeNameSpan = document.getElementById("node-name");
  const nodeIdSpan = document.getElementById("node-id-span");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const id = el.dataset.id;
        const nodeLinkEl = document.getElementById("node-link");

        if (!id) return;

        // считаем «найденным» при 50% видимости
        if (entry.intersectionRatio >= 0.5) {
          // активный узел (покажем имя/ID наверху)
          if (nodeNameSpan) nodeNameSpan.textContent = el.dataset.name || "";
          if (nodeIdSpan) nodeIdSpan.textContent = id;

          // зафиксируем уникальную находку
          if (!found.has(id)) {
            found.add(id);
            if (foundSpan) foundSpan.textContent = String(found.size);
          }
          const link = el.dataset.link || "";
          if (nodeLinkEl) {
            if (link) {
              nodeLinkEl.href = link;
              nodeLinkEl.textContent = link;
              nodeLinkEl.target = "_blank";
              nodeLinkEl.rel = "noopener noreferrer";
              nodeLinkEl.style.pointerEvents = "auto";
              nodeLinkEl.style.opacity = "1";
            } else {
              nodeLinkEl.removeAttribute("href");
              nodeLinkEl.textContent = "";
              nodeLinkEl.removeAttribute("target");
              nodeLinkEl.removeAttribute("rel");
              nodeLinkEl.style.pointerEvents = "none";
              nodeLinkEl.style.opacity = "0.6";
            }
          }
        }
      });
      // опционально, логим прогресс
      // console.log(`Найдено: ${found.size}/${items.length}`);
    },
    {
      root: wrapper, // важно: скроллит именно wrapper
      threshold: [0.5], // 50% на экране
    }
  );

  items.forEach((el) => observer.observe(el));

  //--------------------------------движение экрана с main-field
}

document.addEventListener("DOMContentLoaded", () => {
  initField();
});

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("main-field-wrapper");
  const field = document.getElementById("main-field");
  if (!root || !field) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.5) {
          entry.target.classList.add("in-view");
        } else {
          entry.target.classList.remove("in-view");
        }
      }
    },
    {
      root,
      threshold: [0, 0.4, 1],
    }
  );

  const enhance = (el) => {
    if (!el.classList.contains("reveal")) el.classList.add("reveal");
    io.observe(el);
  };

  // обработать уже отрендеренные
  document.querySelectorAll(".map-item").forEach(enhance);

  // и любые будущие вставки из third-layer.js
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.matches(".map-item")) enhance(n);
        n.querySelectorAll?.(".map-item").forEach(enhance);
      });
    }
  });
  mo.observe(field, { childList: true, subtree: true });

  //---------------------------

  const wrapper = document.getElementById("main-field-wrapper");
  if (!wrapper || !field) return;

  // вычисляем целевые координаты центра
  const computeCenter = () => {
    const maxX = Math.max(0, field.scrollWidth - wrapper.clientWidth);
    const maxY = Math.max(0, field.scrollHeight - wrapper.clientHeight);
    return {
      left: maxX / 2,
      top: maxY / 2,
    };
  };

  // один раз проскроллить в центр, с фоллбеком если размеры меняются
  const scrollToCenter = (behavior = "auto") => {
    const { left, top } = computeCenter();
    wrapper.scrollTo({ left, top, behavior });
    // На некоторых платформах программный скролл не всегда шлёт событие:
    // форсим, чтобы параллакс/маска обновились.
    wrapper.dispatchEvent(new Event("scroll", { bubbles: false }));
  };

  // ждём, пока third-layer и стили зададут размеры поля
  let done = false;
  const tryCenter = () => {
    if (done) return;
    const ready =
      field.scrollWidth > wrapper.clientWidth + 100 &&
      field.scrollHeight > wrapper.clientHeight + 100;

    if (ready) {
      done = true;
      // первый раз — без анимации (мгновенно к центру)
      scrollToCenter("auto");
      return true;
    }
    return false;
  };

  // 1) пробуем сразу после layout
  requestAnimationFrame(() => {
    if (tryCenter()) return;

    // 2) слушаем изменения размеров поля и контейнера, центрируем один раз
    const ro = new ResizeObserver(() => {
      if (tryCenter()) ro.disconnect();
    });
    ro.observe(field);
    ro.observe(wrapper);

    // 3) запасной таймер (если ResizeObserver недоступен/не сработал)
    const t0 = performance.now();
    const poll = () => {
      if (tryCenter()) return;
      if (performance.now() - t0 > 2000) return; // не ждём больше 2с
      requestAnimationFrame(poll);
    };
    poll();
  });

  // На полную загрузку (видео/картинки) ещё раз подровнять центр
  window.addEventListener("load", () => {
    if (!done) scrollToCenter("auto");
  });
});

//------

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("main-field-wrapper");
  const field = document.getElementById("main-field");
  if (!wrapper || !field) return;

  let isPointerDown = false;
  let isDragging = false;
  let startX = 0,
    startY = 0;
  let startScrollLeft = 0,
    startScrollTop = 0;
  let spacePanning = false; // удерживай пробел для “hand tool” поверх узлов

  // Space = hand tool (опционально)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      spacePanning = true;
      wrapper.classList.add("grab-enabled");
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      spacePanning = false;
      wrapper.classList.remove("grab-enabled");
    }
  });

  wrapper.addEventListener("pointerdown", (e) => {
    // только мышь, ЛКМ
    if (e.pointerType !== "mouse" || e.button !== 0) return;

    // не начинаем перетаскивание, если клик по узлу, кроме режима Space
    if (!spacePanning && e.target.closest(".text-el, .pic-el")) return;

    isPointerDown = true;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = wrapper.scrollLeft;
    startScrollTop = wrapper.scrollTop;

    wrapper.setPointerCapture?.(e.pointerId);
    // курсор/отключение выделения включим, когда поймем, что реально тащим
  });

  wrapper.addEventListener("pointermove", (e) => {
    if (!isPointerDown) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Порог, чтобы не ломать клики/выделение при микродвижении
    if (!isDragging && Math.abs(dx) + Math.abs(dy) > 3) {
      isDragging = true;
      wrapper.classList.add("dragging");
    }
    if (!isDragging) return;

    // Паним: двигаем скролл в противоположную сторону движения указателя
    wrapper.scrollLeft = startScrollLeft - dx;
    wrapper.scrollTop = startScrollTop - dy;

    // чтобы не выделялся текст при drag
    e.preventDefault();
  });

  const endDrag = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (isDragging) {
      wrapper.classList.remove("dragging");
      isDragging = false;
    }
    wrapper.releasePointerCapture?.(e.pointerId);
  };

  wrapper.addEventListener("pointerup", endDrag);
  wrapper.addEventListener("pointercancel", endDrag);
  wrapper.addEventListener("pointerleave", endDrag);
});

document.addEventListener("DOMContentLoaded", () => {
  const questSpan = document.getElementById("quastions");
  const layer = document.getElementById("blending-explenation");
  const containerInv = document.querySelector("html");
  const initBtn = document.getElementById("init-span");
  if (!questSpan || !layer) return;

  if (window.devicePixelRatio > 2 || navigator.hardwareConcurrency <= 4) {
    document.documentElement.classList.add("low-perf");
  }

  layer.style.opacity = "0";

  const HIDE_DELAY_MS = 0; // небольшая задержка перед скрытием
  let isOpen = false;

  const clearAnims = () => {
    layer.classList.remove("blend-anim-in", "blend-anim-out");
    containerInv.classList.remove("pixi-anim-in", "pixi-anim-out");
  };

  const open = () => {
    if (isOpen) return;
    clearAnims();
    containerInv.style.filter = "invert(0)";
    layer.classList.remove("blend-hidden"); // сделать видимым для анимации
    // containerInv.classList.remove("pixi-hidden"); // сделать видимым для анимации

    layer.classList.add("blend-anim-in"); // запустить fade-in
    containerInv.classList.add("pixi-anim-in");

    layer.addEventListener(
      "animationend",
      function h(e) {
        if (e.animationName !== "blendFadeIn") return;
        layer.removeEventListener("animationend", h);
        layer.classList.remove("blend-anim-in"); // очистить класс анимации
        containerInv.classList.remove("pixi-anim-in");
        // containerInv.style.filter = "invert(1)";

        layer.classList.add("blend-open"); // зафиксировать видимое состояние
        containerInv.style.filter = "invert(1)";

        layer.style.opacity = "1";
        // При открытии ??? гасим только текст кнопки init (opacity)
        if (initBtn) {
          if (!initBtn.style.transition)
            initBtn.style.transition = "opacity 300ms ease";
          initBtn.style.opacity = "0";
        }
        isOpen = true;
      },
      { once: true }
    );

    // containerInv.addEventListener(
    //   "animationend",
    //   function h(e) {
    //     if (e.animationName !== "blendFadeIn") return;
    //     containerInv.removeEventListener("animationend", h);
    //     // containerInv.classList.remove("pixi-anim-in"); // очистить класс анимации
    //     containerInv.style.filter = "invert(1)";

    //     containerInv.classList.add("pixi-open"); // зафиксировать видимое состояние
    //     // containerInv.style.opacity = "1";
    //     isOpen = true;
    //   },
    //   { once: true }
    // );
  };

  const close = (delay = HIDE_DELAY_MS) => {
    if (!isOpen) return;
    clearAnims();
    const doClose = () => {
      layer.classList.add("blend-anim-out"); // запустить fade-out (анимация перекроет opacity:1)
      containerInv.classList.add("pixi-anim-out"); // запустить fade-out
      // (анимация перекроет opacity:1)

      layer.addEventListener(
        "animationend",
        function h(e) {
          if (e.animationName !== "blendFadeOut") return;
          layer.removeEventListener("animationend", h);
          layer.classList.remove("blend-anim-out");
          containerInv.classList.remove("pixi-anim-out");

          layer.classList.remove("blend-open"); // убрать видимое состояние
          layer.classList.add("blend-hidden"); // скрыть полностью
          layer.style.opacity = "0";
          containerInv.style.filter = "";
          // При закрытии ??? возвращаем opacity кнопки init
          if (initBtn) {
            if (!initBtn.style.transition)
              initBtn.style.transition = "opacity 300ms ease";
            initBtn.style.opacity = "1";
          }
          isOpen = false;
        },
        { once: true }
      );
      //   containerInv.addEventListener(
      //     "animationend",
      //     function h(e) {
      //       if (e.animationName !== "blendFadeOut") return;
      //       containerInv.removeEventListener("animationend", h);
      //       containerInv.classList.remove("pixi-anim-out");
      //       containerInv.classList.remove("pixi-open"); // убрать видимое состояние
      //       containerInv.classList.add("pixi-hidden"); // скрыть полностью
      //       containerInv.style.filter = "invert(0)";

      //       isOpen = false;
      //     },
      //     { once: true }
      //   );
    };
    delay > 0 ? setTimeout(doClose, delay) : doClose();
  };

  // Включаем/выключаем строго по клику на “???”
  questSpan.addEventListener("click", (e) => {
    e.preventDefault();
    isOpen ? close() : open();
  });
});

function initInitionField() {
  const initEl = document.getElementById("inition-field");
  if (!initEl) return;

  const dataInit = {
    id: 1,
    name: "инициализация",
    type: "text-el",
    paragraphs: [
      "«В&nbsp;целях соблюдения академических норм они [студенты] обязаны выделять результаты своей деятельности, при&nbsp;реализации которой был использован ИИ, указывая характер и&nbsp;объем работ, выполненных с&nbsp;его помощью. В&nbsp;противном случае это рассматривается как нарушение академических норм, что может повлечь за&nbsp;собой дисциплинарное взыскание» — пишется в&nbsp;справочнике учебного процесса НИУ ВШЭ.",
      "Было ли выписано хотя бы одно дисциплинарное взыскание на&nbsp;основании отсутствия указания об&nbsp;использовании студентом языковой модели? Преподаватели, вероятно, знают, насколько много студенческих текстов на&nbsp;самом деле написано не&nbsp;студентами — если не&nbsp;знают, то&nbsp;чувствуют.",
      "За&nbsp;последний год 85 % (а&nbsp;то и&nbsp;больше) всех студенческих текстов, которые я&nbsp;читала (включая тексты дизайн-проектов, визуальных исследований, эссе и&nbsp;в&nbsp;целом любых заданий, где можно было бы&nbsp;сдать нечто, напоминающее текст), были написаны нейросетями. Говорил ли об&nbsp;этом хоть кто-то при&nbsp;его сдаче? Нет. По&nbsp;крайней мере, не преподавателю, а&nbsp;мне — одногруппнику, у&nbsp;которого явно нет намерений никого «сдать».",
      "Пока что НИУ ВШЭ даже на&nbsp;первый взгляд не&nbsp;справляется с&nbsp;выполнением своих предписаний в&nbsp;справочнике учебного процесса, ведь полагаться в&nbsp;вопросе «авторства» (термин существующей традиции академии, все еще используемой ею) можно разве что на&nbsp;честность студента, которой, увы (судя по&nbsp;тому, что творится вокруг), у&nbsp;него нет.",
      "Учебный процесс столкнулся с&nbsp;чем-то совершенно новым, и&nbsp;составители «академических норм» и&nbsp;«справочника учебного процесса» пока что вообще не&nbsp;понимают, как действовать. Бакалавриат можно закончить, не&nbsp;написав ни&nbsp;строчки текста самостоятельно — многие мои одногруппники упорно пытаются&nbsp;выполнить такой челлендж и&nbsp;пока что идут очень успешно — это пугает и&nbsp;вдохновляет одновременно.",
      "Это определённо требует обсуждения, постановки совершенно новых вопросов, пересмотра уже существующих, но&nbsp;более не&nbsp;работающих концепций, обновления старых понятий и&nbsp;логики, которая уже не&nbsp;актуальна. Времени на&nbsp;это обсуждение у&nbsp;нас нет: темпы ежегодного роста способностей ИИ огромные и&nbsp;останавливаться не&nbsp;планируют.",
      "В&nbsp;этом обсуждении придётся дойти и&nbsp;до&nbsp;новых «академических норм», хотя это будет далеко не первым шагом. Этот лонгрид — частичка в&nbsp;потоке этого бесконечного обсуждения, попытка собрать и&nbsp;использовать те&nbsp;концепции, которые, кажется, всё ещё работают в&nbsp;законах нового мира. Попытка найти что-то уже знакомое, чтобы стоять на&nbsp;теоретической почве было не&nbsp;так&nbsp;шатко.",
      "Концепции, которыми я пользуюсь здесь, в&nbsp;основном будут взяты из&nbsp;методологии постструктурализма — большинство из&nbsp;них не просто пережили появление языковых моделей, но&nbsp;были ими обновлены / доказаны / выделены. Возможно, меня может куда-то занести, ноя&nbsp;буду стараться следовать обозначенному плану.",
      "А теперь задачка. Был ли&nbsp;этот текст написан человеком? Если да,&nbsp;то&nbsp;какая его часть? Как вы&nbsp;это поняли?",
    ],
    footnotes: [],
    style: "",
  };

  function renderTextElement(data) {
    const block = document.createElement("div");
    block.classList.add("text-el");
    block.classList.add("init-item");

    // можно позже задать координаты block.style.left/top из функции рандомного позиционирования

    // позиционирование — по центру экрана
    block.style.position = "absolute";
    block.style.left = "50vw";
    block.style.top = "50vh";
    block.style.transform = "translate(-50%, -50%)";

    block.innerHTML = `
    <div class="meta-top">
      <span class="title">${data.name}</span>
    </div>
    <div class="text-content">
      ${data.paragraphs
        .map((p, i) => `<p ${i === 0 ? 'class="active"' : ""}>${p}</p>`)
        .join("")}
    </div>
    <div class="meta-bottom">
      <span class="counter">1/${data.paragraphs.length}</span>
      <span class="scroll-hint">scroll it</span>
    </div>
  `;

    let current = 0;
    const paragraphs = block.querySelectorAll("p");
    const counter = block.querySelector(".counter");

    let switching = false;
    let armedToClose = false; // требуем ещё один скролл на последнем абзаце

    const SWITCH_COOLDOWN = 1000; // пауза между листаниями в мс
    function withCooldown(fn) {
      if (switching) return;
      const didSwitch = fn();
      if (didSwitch) {
        switching = true;
        setTimeout(() => {
          switching = false;
        }, SWITCH_COOLDOWN);
      }
    }

    // Обработчик скролла при наведении
    // helper: close overlay smoothly (по клику на крестик)
    const closeOverlay = () => {
      if (initEl.classList.contains("closing")) return;
      initEl.classList.add("closing");
      initEl.addEventListener(
        "transitionend",
        () => {
          initEl.style.display = "none";
        },
        { once: true }
      );
    };

    block.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (e.deltaY > 0) withCooldown(nextParagraph);
        else withCooldown(prevParagraph);
      },
      { passive: false }
    );

    // --------------можно также добавить листание свайпом для тач
    let startY = null;
    let swipeRecognized = false;
    const SWIPE_THRESHOLD = 50;

    block.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY;
        swipeRecognized = false;
      },
      { passive: true }
    );

    block.addEventListener(
      "touchmove",
      (e) => {
        if (startY == null) return;
        const dy = e.touches[0].clientY - startY;

        // жест распознан — блокируем прокрутку контейнера
        if (Math.abs(dy) > SWIPE_THRESHOLD) {
          swipeRecognized = true;
          e.preventDefault();
        }
      },
      { passive: false }
    );

    block.addEventListener("touchend", (e) => {
      if (startY == null) return;
      const diff = e.changedTouches[0].clientY - startY;

      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff < 0) withCooldown(nextParagraph);
        if (diff > 0) withCooldown(prevParagraph);
      }

      startY = null;
      swipeRecognized = false;
    });

    //--------------------

    function nextParagraph() {
      if (current < paragraphs.length - 1) {
        paragraphs[current].classList.remove("active");
        paragraphs[current].classList.add("exit");
        current++;
        paragraphs[current].classList.add("active");
        counter.textContent = `${current + 1}/${paragraphs.length}`;
        setTimeout(() => {
          paragraphs.forEach((p) => p.classList.remove("exit"));
        }, 600);
        return true;
      }
      return false;
    }

    function prevParagraph() {
      if (current > 0) {
        paragraphs[current].classList.remove("active");
        // снять возможные «зависшие» exit
        paragraphs.forEach((p) => p.classList.remove("exit"));
        current--;
        paragraphs[current].classList.add("active");
        counter.textContent = `${current + 1}/${paragraphs.length}`;
        return true;
      }
      return false;
    }

    // Добавим крестик в правом верхнем углу шапки
    const metaTop = block.querySelector(".meta-top");
    if (metaTop) {
      const closeBtn = document.createElement("span");
      closeBtn.className = "close-init";
      closeBtn.setAttribute("role", "button");
      closeBtn.setAttribute("aria-label", "закрыть");
      closeBtn.textContent = "×";
      metaTop.appendChild(closeBtn);
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeOverlay();
      });
    }

    document.getElementById("inition-field").appendChild(block);
    // Явно перекрашиваем текст, чтобы не побеждал .text-el { color: white } из third-layer.css
    block.style.setProperty("color", "#000", "important");
    block.style.zIndex = "2001";
  }

  renderTextElement(dataInit);

  // API: показать/скрыть инициализационный слой по требованию
  const showOverlay = () => {
    // если уже виден — ничего не делаем
    if (
      initEl.style.display !== "none" &&
      !initEl.classList.contains("closing")
    )
      return;
    // убедимся, что есть контент (на случай, если его удалят вручную)
    if (!initEl.querySelector(".text-el")) {
      renderTextElement(dataInit);
    }
    // стартуем с прозрачности, затем уберём класс и дадим transition сработать до 1
    initEl.style.display = "block";
    initEl.classList.add("closing"); // opacity:0
    // следующий кадр — убрать closing, чтобы анимироваться к opacity:1
    requestAnimationFrame(() => {
      initEl.classList.remove("closing");
    });
  };

  const closeOverlay = () => {
    if (initEl.classList.contains("closing")) return;
    initEl.classList.add("closing");
    initEl.addEventListener(
      "transitionend",
      () => {
        initEl.style.display = "none";
      },
      { once: true }
    );
  };

  // Повесим на глобал (по желанию) и на #init-span
  window.InitOverlay = { show: showOverlay, hide: closeOverlay };
  const trigger = document.getElementById("init-span");
  if (trigger) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      showOverlay();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInitionField);
} else {
  // DOM уже готов, запускаем сразу (скрипт подключён внизу body)
  initInitionField();
}

// Lightweight floating images overlay: no Pixi, RAF-based
// Expects window.PICS = [url1, url2, ...] (25 images). If missing, uses a single fallback.

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("pixi-wrapper");
  if (!container) return;

  const IMAGES =
    Array.isArray(window.PICS) && window.PICS.length
      ? window.PICS
      : [
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/ar.webp",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_17c39b5ebfce6f63b622346d966b34af.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_1c300758673bb2ee8924571c026759f9.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_1ce340ea95ce6d0563f89516c962eec9.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_28562d4eccd70a092c4cb30e55b127c3.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_2b1485cbb03ce46dfbece20f7276832d.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_312f8af9f2526694cafa3771878119e4.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_51625c7960e1a7352fa89e0e3af7dd42.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_5a99021cb90714869e7cc137ddd22399.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_5eb9627659ec24f59495d63c19a40018.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_6397cdfea5ad82371d31c34c47f7f46c.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_6c9f5a2bd1ba0be3c780d158c19d483d.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_871653cae6f9aa282f4cfde634ee84f2.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_91b46e8287a9abf6c95782d3cb3152b2.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_9f050f313cabc8e0f726c561f82a7640.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_a4c9255738bb3b4397b0261171264e7c.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_b8755ea1b592d62b999df170a82b4a19.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_d217e6a9a2ad80c3fe16a6e5c1a7fd28.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_dbc5c8a6eeae6710fb5a398abcd4adad.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_de4a16120dd519bd604013775f828464.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_e34b08a5d5957be5d2b32e976b2ca1ae.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/original_e8ab5d1c14f7d75ce10ac5170fb868ab.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/ssdv.png",
          "https://dunchekk.github.io/stud-2_01-struct-lending/body-parts/svczx.png",
        ];

  // Config
  const MAX_CONCURRENT = 1; // 2–3 at a time
  const SPAWN_DELAY_MS = [1800, 3400]; // randomized between
  const OFFSCREEN_MARGIN = 120; // px beyond viewport to spawn/expire
  const SIZE_VW = [60, 110]; // large images in vw
  const OPACITY = [0.1, 0.2];
  const DURATION_S = [16, 32]; // traverse duration in seconds

  const active = new Set();
  let rafId = 0;
  let spawnTimer = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function randInt(a, b) {
    return Math.floor(rand(a, b));
  }
  function pick(arr) {
    return arr[randInt(0, arr.length)];
  }

  function viewport() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
    };
  }

  function makeImgEl(src) {
    const img = new Image();
    img.src = src;
    img.className = "floating-img";
    img.decoding = "async";
    img.loading = "eager";
    img.draggable = false;
    img.style.position = "absolute";
    img.style.pointerEvents = "none";
    img.style.mixBlendMode = "color-dodge";
    img.style.willChange = "transform, opacity";
    img.style.opacity = String(rand(OPACITY[0], OPACITY[1]));
    // size via vw to scale with viewport width; height auto to preserve ratio
    img.style.width = `${rand(SIZE_VW[0], SIZE_VW[1]).toFixed(1)}vw`;
    img.style.height = "auto";
    return img;
  }

  // Compute start and end points just outside the screen
  function randomPath() {
    const { w, h } = viewport();
    const m = OFFSCREEN_MARGIN;
    // choose start edge: 0=left,1=right,2=top,3=bottom
    const edge = randInt(0, 4);
    let x0, y0, x1, y1;
    switch (edge) {
      case 0: // left → any other side
        x0 = -m;
        y0 = rand(-m, h + m);
        x1 = w + m;
        y1 = rand(-m, h + m);
        break;
      case 1: // right → any other side
        x0 = w + m;
        y0 = rand(-m, h + m);
        x1 = -m;
        y1 = rand(-m, h + m);
        break;
      case 2: // top → bottom-ish
        x0 = rand(-m, w + m);
        y0 = -m;
        x1 = rand(-m, w + m);
        y1 = h + m;
        break;
      default: // bottom → top-ish
        x0 = rand(-m, w + m);
        y0 = h + m;
        x1 = rand(-m, w + m);
        y1 = -m;
        break;
    }
    // small jitter so not perfectly straight 1:1 opposites
    x1 += rand(-m * 0.5, m * 0.5);
    y1 += rand(-m * 0.5, m * 0.5);
    return { x0, y0, x1, y1 };
  }

  function spawnOne() {
    if (active.size >= MAX_CONCURRENT) return;
    const src = pick(IMAGES);
    const el = makeImgEl(src);
    container.appendChild(el);

    const { x0, y0, x1, y1 } = randomPath();
    const start = performance.now();
    const dur = rand(DURATION_S[0], DURATION_S[1]) * 1000; // ms

    // center the image around its position after it loads (approx via naturalWidth)
    let offsetX = 0;
    let offsetY = 0;
    const setOffsets = () => {
      // Use current rendered size
      const rect = el.getBoundingClientRect();
      offsetX = rect.width * 0.5;
      offsetY = rect.height * 0.5;
    };
    el.onload = setOffsets;
    // in case of cache
    if (el.complete) setOffsets();

    const item = {
      el,
      start,
      dur,
      x0,
      y0,
      x1,
      y1,
      dead: false,
      get offsetX() {
        return offsetX;
      },
      get offsetY() {
        return offsetY;
      },
    };
    active.add(item);
  }

  function animate(now) {
    if (active.size) {
      active.forEach((it) => {
        if (it.dead) return;
        const t = Math.min(1, (now - it.start) / it.dur);
        const x = it.x0 + (it.x1 - it.x0) * t - (it.offsetX || 0);
        const y = it.y0 + (it.y1 - it.y0) * t - (it.offsetY || 0);
        it.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        it.el.style.opacity = String(
          // ease-in-out opacity subtlety
          0.1 + 0.3 * Math.sin(Math.PI * Math.min(t, 1))
        );
        if (t >= 1) {
          it.dead = true;
          it.el.remove();
          active.delete(it);
        }
      });
    }

    rafId = requestAnimationFrame(animate);
  }

  function scheduleNextSpawn() {
    clearTimeout(spawnTimer);
    const delay = randInt(SPAWN_DELAY_MS[0], SPAWN_DELAY_MS[1]);
    spawnTimer = setTimeout(() => {
      // keep at most MAX_CONCURRENT moving
      if (active.size < MAX_CONCURRENT) spawnOne();
      scheduleNextSpawn();
    }, delay);
  }

  function start() {
    // ensure container is enabled
    container.style.display = "block";
    if (!rafId) rafId = requestAnimationFrame(animate);
    scheduleNextSpawn();
  }
  function stop() {
    clearTimeout(spawnTimer);
    cancelAnimationFrame(rafId);
    rafId = 0;
    active.forEach((it) => it.el.remove());
    active.clear();
  }

  // Auto-start only if there are images
  if (IMAGES && IMAGES.length) start();

  // Expose simple controls if needed
  window.FloatingImages = { start, stop };

  // Handle tab visibility to reduce work
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const html = document.documentElement;
  const overlay = document.getElementById("inition-field");
  const openBtn = document.getElementById("init-span");
  const questions = document.getElementById("quastions");

  // Гладкая анимация смены фильтра
  if (!html.style.transition) html.style.transition = "filter 500ms ease";

  const setInvert = (value) => {
    html.style.filter = `invert(${value})`;
  };

  const isOverlayVisible = () => {
    if (!overlay) return false;
    const style = window.getComputedStyle(overlay);
    return style.display !== "none" && !overlay.classList.contains("closing");
  };

  const syncUI = () => {
    const vis = isOverlayVisible();
    setInvert(vis ? 1 : 0);
    if (questions) questions.style.display = vis ? "none" : "";
  };

  // Старт: синхронизуем инверсию и видимость ??? с состоянием init-field
  syncUI();

  // Клик по крестику внутри init-field (делегирование — крестик создаётся динамически)
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target.closest(".close-init")) {
        setInvert(0); // плавный переход к нормальному виду
        // Появление ??? произойдёт по факту закрытия слоя (наблюдатель ниже)
      }
    });
  }

  // Кнопка повторного открытия init (инициирует обратную инверсию)
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      setInvert(1);
      if (questions) questions.style.display = "none"; // сразу скрываем ??? при открытии
    });
  }

  // Слежение за состоянием оверлея — синхронизируем фильтр, если его скрыли/открыли кодом
  if (overlay) {
    const mo = new MutationObserver(() => {
      syncUI();
    });
    mo.observe(overlay, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }
});

