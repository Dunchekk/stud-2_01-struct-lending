export function initPixi() {
  //--------------------------------------- pixi start ----------------------------------->

  const containerEl = document.getElementById("pixi-container-waves-blur"); // волны на фоне

  const wrapperEl = document.getElementById("main-field-wrapper"); // после создания stageContainer
  const fieldEl = document.getElementById("main-field");

  let blurVideoSprite = null; // чтобы был доступен вне блока условий

  // === Создание приложения ===
  const app = new PIXI.Application({
    resizeTo: containerEl,
    backgroundAlpha: 0, // прозрачный фон
    antialias: true,
  });

  containerEl.appendChild(app.view);
  app.ticker.maxFPS = 45; // ограничение FPS

  // === Контейнер для нойза и блюра ===
  const stageContainer = new PIXI.Container();
  app.stage.addChild(stageContainer);

  //--------------------------------------- video upl ---------------------------------->

  // MP4 для Safari + WebM
  const mp4URL = withBase("media/background/wod2_safari.mp4"); // withBase хендлер в конце файла
  const webmURL = withBase("media/background/wod2.webm");

  const videoEl = document.createElement("video");
  videoEl.crossOrigin = "anonymous";
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.setAttribute("playsinline", "");
  videoEl.preload = "auto";

  const srcMp4 = document.createElement("source");
  srcMp4.src = mp4URL;
  srcMp4.type = "video/mp4";

  const srcWebm = document.createElement("source");
  srcWebm.src = webmURL;
  srcWebm.type = "video/webm";

  videoEl.append(srcMp4, srcWebm); // нужный source сам пикнется браузером

  // Безопасный автозапуск + запасной запуск по пользовательскому жесту (для iOS/Safari)
  const tryPlay = () => videoEl.play().catch(() => {});
  videoEl.addEventListener("canplay", tryPlay, { once: true });
  window.addEventListener("pointerdown", tryPlay, { once: true });

  // Создаём Pixi-текстуру и спрайт из <video>
  const videoTexture = PIXI.Texture.from(videoEl);
  const videoSprite = new PIXI.Sprite(videoTexture);

  // масштабируем соотношения сторон видео и добавляем overscan для параллакс-эффекта
  const OVERSCAN = 1.4;
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

  // ждем пока у тега <video> появятся метаданные, и запускаем подгонку размера ровно тогда,
  // когда расчёты уже имеют смысл
  const applyInitialSizing = () => sizeVideoToCover();
  if (videoEl.readyState >= 1) applyInitialSizing();
  else
    videoEl.addEventListener("loadedmetadata", applyInitialSizing, {
      once: true,
    });

  // Добавляем В САМОЕ НАЧАЛО stageContainer (до текстур)
  stageContainer.addChildAt(videoSprite, 0);

  //--------------------------------------- pixi blur -------------------------------->

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const lowPerf = window.devicePixelRatio > 2 || app.screen.width < 800;

  if (!isMobile && !lowPerf) {
    // ... включаем блюр с маской ...

    // параметры
    const radius = 300; // радиус отверстия (дырки) в маске, в координатах pixi
    const blurSize = 250; // сила размытия для краев дырки

    // создаём размытый слой поверх
    blurVideoSprite = new PIXI.Sprite(videoSprite.texture);
    blurVideoSprite.anchor.set(0.5);

    const blurFilter = new PIXI.BlurFilter();
    blurFilter.blur = 6;
    blurVideoSprite.filters = [blurFilter];

    // добавляем поверх оригинала
    stageContainer.addChild(blurVideoSprite);

    // создаём МАСКУ, которая скрывает блюр в центре
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

    // движение маски за курсором
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

  //--------------------------------------- motion pixi video on scroll ------------------>

  // параллакс по скроллу main-field-wrapper
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

  //--------------------------------------- pixi noisy textures -------------------------------->

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

  // создаём полупрозрачный слой для "волнового" шума
  const noiseTexture = PIXI.Texture.from(
    withBase("media/media-nodes/noisy.png") // мягкая прозрачная
    // noise-текстура
  );
  const noiseSprite = new PIXI.TilingSprite(
    noiseTexture,
    app.screen.width,
    app.screen.height
  );
  noiseSprite.alpha = 0.2; // лёгкая прозрачность, чтобы “мерцало”
  stageContainer.addChild(noiseSprite);

  // фильтр смещения ===
  const displacementFilter = new PIXI.DisplacementFilter(displacementSprite);
  displacementFilter.scale.x = 20;
  displacementFilter.scale.y = 40;

  // анимация дребезжания
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

  //--------------------------------------- pixi resize -------------------------------->

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
}

const withBase = (path) =>
  `${import.meta.env.BASE_URL}${String(path).replace(/^\/+/, "")}`;
