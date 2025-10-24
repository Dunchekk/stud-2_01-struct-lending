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
  noiseSprite.alpha = 0.3; // лёгкая прозрачность, чтобы “мерцало”
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

  //-----------------------------------------------------------------------------

  async function initField() {
    // 1️⃣ Загружаем JSON
    const response = await fetch(
      "https://dunchekk.github.io/stud-2_01-struct-lending/data.json"
    );
    const data = await response.json(); // теперь это массив из 39 объектов

    // 2️⃣ Настраиваем размеры поля
    const SCREEN_W = window.innerWidth;
    const SCREEN_H = window.innerHeight;
    const SCALE_FACTOR = 20;
    const FIELD_W = SCREEN_W * SCALE_FACTOR;
    const FIELD_H = SCREEN_H * SCALE_FACTOR;

    // минимальный отступ между краем нода и краем поля
    const EDGE_MARGIN_VW = 2; // поменяйте при желании
    const EDGE_MARGIN = window.innerWidth * (EDGE_MARGIN_VW / 100);

    const field = document.getElementById("main-field");
    field.style.width = FIELD_W + "px";
    field.style.height = FIELD_H + "px";

    // 3️⃣ Константы генерации координат
    // 3️⃣ Константы генерации координат: минимум 120vw между центрами
    // 3️⃣ Константы генерации координат: r_min=120vw, r_max=200vw
    // 3️⃣ Константы генерации координат (рекурсия по N, попытки — итерацией)
    const N = data.length;

    const MIN_DISTANCE_VW = 80;
    const MAX_DISTANCE_VW = 180;

    const MIN_DISTANCE = SCREEN_W * (MIN_DISTANCE_VW / 100);
    const MAX_DISTANCE = SCREEN_W * (MAX_DISTANCE_VW / 100);

    const PADDING_X = Math.min(SCREEN_W * 0.05, FIELD_W * 0.05);
    const PADDING_Y = Math.min(SCREEN_H * 0.05, FIELD_H * 0.05);

    const EFF_W = Math.max(1, FIELD_W - 2 * PADDING_X);
    const EFF_H = Math.max(1, FIELD_H - 2 * PADDING_Y);

    const positions = [];

    function nearestDist(x, y) {
      let m = Infinity;
      for (const pos of positions) {
        const dx = pos.x - x;
        const dy = pos.y - y;
        const d = Math.hypot(dx, dy);
        if (d < m) m = d;
      }
      return m;
    }
    function isFarEnough(x, y, dist) {
      const d2 = dist * dist;
      for (const pos of positions) {
        const dx = pos.x - x;
        const dy = pos.y - y;
        if (dx * dx + dy * dy < d2) return false;
      }
      return true;
    }

    function randomCandidate() {
      const x = PADDING_X + Math.random() * EFF_W;
      const y = PADDING_Y + Math.random() * EFF_H;
      return { x, y };
    }

    // Пытаемся найти позицию итеративно, с релаксацией дистанции
    function generatePositionFor(dist, maxAttempts = 4000) {
      let curDist = dist;
      const floorDist = dist * 0.6;

      for (let a = 0; a < maxAttempts; a++) {
        const c = randomCandidate();

        // минимум: не ближе curDist к уже поставленным
        if (!isFarEnough(c.x, c.y, curDist)) {
          // релаксация каждые 500 неудачных попыток
          if (a > 0 && a % 500 === 0) {
            curDist = Math.max(floorDist, curDist * 0.97);
          }
          continue;
        }

        // максимум: не дальше ближайшего, чем MAX (кроме первого)
        if (positions.length > 0) {
          const nd = nearestDist(c.x, c.y);
          if (nd > MAX_DISTANCE) {
            if (a > 0 && a % 500 === 0) {
              curDist = Math.max(floorDist, curDist * 0.97);
            }
            continue;
          }
        }

        // прошел обе проверки
        return c;
      }

      return null;
    }

    // Рекурсия только по количеству точек (≤ 39) — безопасно
    function placeAll(i = 0) {
      if (i >= N) return;
      const p = generatePositionFor(MIN_DISTANCE);
      if (p) {
        positions.push(p);
      } else {
        console.warn(
          `Не удалось поставить элемент #${i} при min=${MIN_DISTANCE_VW}vw. Увеличьте SCALE_FACTOR или снизьте min.`
        );
        // можно: return; // или продолжить попытаться ставить дальше
      }
      placeAll(i + 1);
    }

    placeAll();

    // Перемешиваем и нормализуем
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
      blocks[i] = block;
      clampCenterToField(block, positions[i].x, positions[i].y);
    }

    // --- pic render

    function renderPictureElement(data, i) {
      const block = document.createElement("div");
      block.classList.add("pic-el");
      block.classList.add("map-item");
      block.dataset.id = data.id;

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

      clampCenterToField(block, positions[i].x, positions[i].y);

      // эффекты при наведении (одинаково для img и video)
      block.addEventListener("mouseenter", () => {
        mediaEl.style.transform = "scale(1.05)";
      });
      block.addEventListener("mouseleave", () => {
        mediaEl.style.transform = "scale(1)";
      });

      document.getElementById("main-field").appendChild(block);
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

    // 5️⃣ Отслеживаем, какие элементы видны
    const items = document.querySelectorAll(".map-item");
    const visible = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);

          console.log(`Найдено: ${visible.size}/${items.length}`);
        });
      },
      { threshold: 0.6 }
    );

    items.forEach((el) => observer.observe(el));

    //--------------------------------движение экрана с main-field
  }

  initField();
});
