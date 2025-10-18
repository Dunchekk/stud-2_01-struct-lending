window.onload = function () {
  document.getElementById("pixi-container").style.width = "100vw";
  document.getElementById("pixi-container").style.height = "100vh";
  document.getElementById("pixi-container").style.position = "fixed";
  document.getElementById("pixi-container").style.top = "0";
  document.getElementById("pixi-container").style.left = "0";

  //----------------------------------- pixi start

  const container = document.getElementById("pixi-container");
  //   const rect = container.getBoundingClientRect();

  // --------------------- PIXI START ---------------------
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0d0d0d,
    resizeTo: window,
  });
  container.appendChild(app.view);

  // --------------------- ТЕКСТУРЫ ---------------------
  const textureBunny = PIXI.Texture.from("https://i.imgur.com/IaUrttj.png");
  const texturePlane = PIXI.Texture.from(
    "https://d2w9rnfcy7mm78.cloudfront.net/40129545/original_7951f370943e154f3bb3111458d4c780.png"
  );

  // --------------------- ФОН ---------------------
  const bg = new PIXI.Graphics();
  bg.beginFill(0x00ffff);
  bg.drawRect(0, 0, app.screen.width, app.screen.height);
  bg.endFill();
  app.stage.addChild(bg);

  // --------------------- PLANE ---------------------
  const plane = new PIXI.SimplePlane(texturePlane, 20, 10);
  app.stage.addChild(plane);

  function resizePlane() {
    plane.width = app.screen.width * 1.5;
    plane.height = app.screen.height * 1.5;
    // обновляем базу после каждого ресайза
    base = plane.geometry.getBuffer("aVertexPosition").data.slice();
  }

  const buffer = plane.geometry.getBuffer("aVertexPosition");
  let base = buffer.data.slice();
  resizePlane();
  window.addEventListener("resize", resizePlane);

  let timer2 = 0;
  app.ticker.add((delta) => {
    timer2 += 0.01 * delta;
    for (let i = 0; i < buffer.data.length; i += 2) {
      const x = base[i];
      const y = base[i + 1];
      const wave =
        Math.sin(x / 120 + timer2) * 5 + Math.cos(y / 100 + timer2 * 1.1) * 5;
      buffer.data[i + 1] = y + wave;
    }
    buffer.update();
  });

  // --------------------- ЗАЯЦ ---------------------
  const bunny = new PIXI.Sprite(textureBunny);
  bunny.anchor.set(0.5);
  bunny.x = app.screen.width / 2;
  bunny.y = app.screen.height / 2;
  bunny.scale.set(2);
  bunny.blendMode = PIXI.BLEND_MODES.ADD;
  app.stage.addChild(bunny);

  // вращение + “пружинка”
  let t = 0;
  app.ticker.add((delta) => {
    bunny.rotation += 0.03 * delta;
    t += 0.03;
    bunny.y = app.screen.height / 2 + Math.sin(t) * 40;
  });

  // центр при ресайзе
  window.addEventListener("resize", () => {
    bunny.x = app.screen.width / 2;
    bunny.y = app.screen.height / 2;
  });

  // блокируем скролл страницы (для Тильды)
  document.body.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
};
// console.log(PIXI.BLEND_MODES[11]);
