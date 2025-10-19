/* global PIXI */
window.onload = function() {

  console.log(PIXI);

	//----------------------------------- pixi start -------------------------> waves-blur
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
//   stageContainer.filters = [displacementFilter];

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

  // === Реакция на resize ===
  window.addEventListener("resize", () => {
    displacementSprite.width = app.renderer.width * 2;
    displacementSprite.height = app.renderer.height * 2;
    displacementSprite.x = -app.renderer.width / 2;
    displacementSprite.y = -app.renderer.height / 2;

    noiseSprite.width = app.renderer.width;
    noiseSprite.height = app.renderer.height;
  });




	//----------------------------------- pixi -------------------------> waves-blur
  




  // === (чтобы тильда не страдала хренью) ===

	document.body.style.overflow = "hidden";
};
// console.log(PIXI.BLEND_MODES[11]);
