window.onload = function() {
  // 1. Создаём приложение
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1e1e1e,
    resizeTo: window
  });

  document.getElementById('pixi-container').appendChild(app.view);

  // 2. Загружаем текстуру (любой CORS-friendly PNG)
  const texture = PIXI.Texture.from('https://pixijs.io/examples/examples/assets/bunny.png'); // стандартный bunny.png на Imgur без ограничений
  const bunny = new PIXI.Sprite(texture);

  // 3. Настраиваем спрайт
  bunny.anchor.set(0.5);
  bunny.x = app.screen.width / 2;
  bunny.y = app.screen.height / 2;
  bunny.scale.set(2);

  app.stage.addChild(bunny);

  // 4. Простая анимация вращения и “пружинки”
  let t = 0;
  app.ticker.add((delta) => {
    bunny.rotation += 0.03 * delta;
    t += 0.03;
    bunny.y = app.screen.height / 2 + Math.sin(t) * 40;
  });

  // 5. Обновляем при ресайзе
  window.addEventListener('resize', () => {
    bunny.x = app.screen.width / 2;
    bunny.y = app.screen.height / 2;
  });
};