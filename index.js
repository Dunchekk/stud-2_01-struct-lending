/* global PIXI */
window.onload = function() {

  console.log(PIXI);

	//--------------------------------------- pixi start -----------------------------------> init

  const containerEl = document.getElementById("pixi-container-waves-blur");

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
  const videoSprite = PIXI.Sprite.from("./imgs/vod.webm"); 

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
        const blurVideoSprite = new PIXI.Sprite(videoSprite.texture);
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
        focus.anchor.set(0.5);              // центр спрайта = центр дырки
        app.stage.addChild(focus);

        // применяем маску к размытым слоям — центр теперь «дырка»
        blurVideoSprite.mask = focus;

        // === 4. движение маски за курсором ===
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;
        app.stage.on('pointermove', (e) => {
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
        });

  }
	//--------------------------------------- pixi --------------------------------> noisy textures
  

  // === Загрузка displacement-карты ===
  const displacementTexture = PIXI.Texture.from(
    "https://pixijs.com/assets/pixi-filters/displacement_map_repeat.jpg",
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
    "./imgs/noisy.png", // мягкая прозрачная noise-текстура
  );
  const noiseSprite = new PIXI.TilingSprite(
    noiseTexture,
    app.renderer.width,
    app.renderer.height,
  );
  noiseSprite.alpha = 0.5; // лёгкая прозрачность, чтобы “мерцало”
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
    if (displacementSprite.x > 0) displacementSprite.x = -app.renderer.width / 2;
    if (displacementSprite.y > 0) displacementSprite.y = -app.renderer.height / 2;

    // лёгкое движение шумового слоя для "жизни"
    noiseSprite.tilePosition.x += 0.09 * delta;
    noiseSprite.tilePosition.y += 0.05 * delta;
  });



	//--------------------------------------- pixi --------------------------------> add stuff

  // === Реакция на resize ===
  window.addEventListener("resize", () => {

    window.addEventListener('orientationchange', () => {
      app.renderer.resize(containerEl.clientWidth, containerEl.clientHeight);
    });

    videoSprite.width = app.renderer.width * 1.8;
    videoSprite.height = app.renderer.height * 1.8;
    videoSprite.x = app.renderer.width / 2;
    videoSprite.y = app.renderer.height / 2;

    

    noiseSprite.tileScale.set(
      app.renderer.width / noiseSprite.texture.width,
      app.renderer.height / noiseSprite.texture.height,
    );

    displacementSprite.width = app.renderer.width * 2;
    displacementSprite.height = app.renderer.height * 2;
    displacementSprite.x = -app.renderer.width / 2;
    displacementSprite.y = -app.renderer.height / 2;

    noiseSprite.width = app.renderer.width;
    noiseSprite.height = app.renderer.height;


  });

	//--------------------------------------- vanilla --------------------------------> add stuff

  // === (чтобы тильда не страдала хренью) ===

	document.body.style.overflow = "hidden";
};

