/* global PIXI */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Скрипт с GitHub Pages работает!");

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

  // === Контейнер для эффекта ===
  const stageContainer = new PIXI.Container();
  app.stage.addChild(stageContainer);

  //--------------------------------------- pixi ----------------------------------> video upl

  // === Загрузка видео в Pixi ===
  const videoSprite = PIXI.Sprite.from(
    "https://dunchekk.github.io/stud-2_01-struct-lending/imgs/wod2.webm"
  );

  // Получаем HTMLVideoElement, который Pixi создал под капотом
  const videoEl = videoSprite.texture.baseTexture.resource.source;

  // Настройки видео
  videoEl.loop = true;
  videoEl.muted = true;
  videoEl.playsInline = true; // важно для iOS / мобильных, чтобы не открывалось отдельным плеером

  // Запуск видео только после того, как поток реально готов
  videoEl.addEventListener("loadeddata", () => {
    videoEl.play().catch(() => {}); // безопасный запуск, даже если Chrome блокирует autoplay
  });

  // Растягиваем чуть больше экрана (чтобы можно было смещать и не было краёв)
  videoSprite.width = app.renderer.width * 1.8;
  videoSprite.height = app.renderer.height * 1.8;
  videoSprite.anchor.set(0.5);
  videoSprite.x = app.renderer.width / 2;
  videoSprite.y = app.renderer.height / 2;

  // Добавляем В САМОЕ НАЧАЛО stageContainer (до текстур)
  stageContainer.addChildAt(videoSprite, 0);

  //--------------------------------------- pixi --------------------------------> blur

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const lowPerf = window.devicePixelRatio > 2 || app.renderer.width < 800;

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
    blurVideoSprite.width = videoSprite.width;
    blurVideoSprite.height = videoSprite.height;
    blurVideoSprite.x = app.renderer.width / 2;
    blurVideoSprite.y = app.renderer.height / 2;

    const blurFilter = new PIXI.BlurFilter();
    blurFilter.blur = 8;
    blurVideoSprite.filters = [blurFilter];

    // добавляем поверх оригинала
    stageContainer.addChild(blurVideoSprite);

    // === 3. создаём МАСКУ, которая скрывает блюр в центре ===
    const circle = new PIXI.Graphics();

    // шаг 1: рисуем сплошной белый прямоугольник — вся область видна
    const pad = Math.max(app.renderer.width, app.renderer.height) * 2;
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
      const pad = Math.max(app.renderer.width, app.renderer.height) * 2;
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

      blurVideoSprite.width = videoSprite.width;
      blurVideoSprite.height = videoSprite.height;
      blurVideoSprite.x = app.renderer.width / 2;
      blurVideoSprite.y = app.renderer.height / 2;

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
    const travelX = Math.max(0, (videoSprite.width - app.renderer.width) / 2);
    const travelY = Math.max(0, (videoSprite.height - app.renderer.height) / 2);
    return { travelX, travelY };
  }

  function updateParallax() {
    const { rx, ry } = getScrollRatios();
    const { travelX, travelY } = getTravel();

    // 0..1 → [-travel, +travel] и «в ту же сторону»
    const ox = PARALLAX_DIR * lerp(-travelX, +travelX, rx);
    const oy = PARALLAX_DIR * lerp(-travelY, +travelY, ry);

    const cx = app.renderer.width / 2 + ox;
    const cy = app.renderer.height / 2 + oy;

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
  displacementSprite.width = app.renderer.width * 2;
  displacementSprite.height = app.renderer.height * 2;
  displacementSprite.x = -app.renderer.width / 2;
  displacementSprite.y = -app.renderer.height / 2;
  stageContainer.addChild(displacementSprite);

  // === Создаём полупрозрачный слой для "волнового" шума ===
  const noiseTexture = PIXI.Texture.from(
    "./imgs/noisy.png" // мягкая прозрачная noise-текстура
  );
  const noiseSprite = new PIXI.TilingSprite(
    noiseTexture,
    app.renderer.width,
    app.renderer.height
  );
  noiseSprite.alpha = 0.2; // лёгкая прозрачность, чтобы “мерцало”
  stageContainer.addChild(noiseSprite);

  // === Фильтр смещения ===
  const displacementFilter = new PIXI.DisplacementFilter(displacementSprite);
  displacementFilter.scale.x = 30;
  displacementFilter.scale.y = 60;

  // === Анимация дребезжания ===
  app.ticker.add((delta) => {
    // движение карты (создаёт эффект колебаний)
    displacementSprite.x += 0.6 * delta;
    displacementSprite.y += 0.4 * delta;

    // бесконечная прокрутка (wrap)
    if (displacementSprite.x > 0)
      displacementSprite.x = -app.renderer.width / 2;
    if (displacementSprite.y > 0)
      displacementSprite.y = -app.renderer.height / 2;

    // лёгкое движение шумового слоя для "жизни"
    noiseSprite.tilePosition.x += 0.09 * delta;
    noiseSprite.tilePosition.y += 0.05 * delta;
  });

  //--------------------------------------- pixi --------------------------------> add stuff

  // === Реакция на resize ===
  window.addEventListener("resize", () => {
    window.addEventListener("orientationchange", () => {
      app.renderer.resize(containerEl.clientWidth, containerEl.clientHeight);
    });

    videoSprite.width = app.renderer.width * 1.8;
    videoSprite.height = app.renderer.height * 1.8;
    videoSprite.x = app.renderer.width / 2;
    videoSprite.y = app.renderer.height / 2;

    noiseSprite.tileScale.set(
      app.renderer.width / noiseSprite.texture.width,
      app.renderer.height / noiseSprite.texture.height
    );

    displacementSprite.width = app.renderer.width * 2;
    displacementSprite.height = app.renderer.height * 2;
    displacementSprite.x = -app.renderer.width / 2;
    displacementSprite.y = -app.renderer.height / 2;

    noiseSprite.width = app.renderer.width;
    noiseSprite.height = app.renderer.height;

    updateParallax();
  });

  //--------------------------------------- vanilla --------------------------------> add stuff

  // === (чтобы тильда не страдала хренью) ===

  document.body.style.overflow = "hidden";
});

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
  const FIELD_W = SCREEN_W * SCALE_FACTOR;
  const FIELD_H = SCREEN_H * SCALE_FACTOR;

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
      `Разместили ${positions.length}/${N} при min=${MIN_DISTANCE_VW}vw, max=${MAX_DISTANCE_VW}vw. Увеличьте SCALE_FACTOR или скорректируйте min/max.`
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
    console.log(`rendered ${i}`);
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
    console.log(`rendered ${i}`);
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
    console.log(`rendered ${i}`);
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
      const newW = SW * SCALE_FACTOR;
      const newH = SH * SCALE_FACTOR;
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
      console.log(`Найдено: ${found.size}/${items.length}`);
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
  const questSpan = document.getElementById("quastions");
  const layer = document.getElementById("blending-explenation");
  const containerInv = document.querySelector("html");
  if (!questSpan || !layer) return;

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
      containerInv.classList.add("pixi-anim-out"); // запустить fade-out (анимация перекроет opacity:1)

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
