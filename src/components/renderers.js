export function renderPictureElement(
  item,
  i,
  { field, positions, blocks, clampCenterToField }
) {
  const block = document.createElement("div");
  block.classList.add("pic-el");
  block.classList.add("map-item");
  block.dataset.id = item.id;
  block.dataset.name = item.name;
  block.dataset.link = (item.link || "—").trim();

  // базовые стили
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
      item.style &&
      typeof item.style === "object" &&
      (item.style.width || item.style.height)
    )
  ) {
    block.style.width = "auto";
    block.style.height = "auto";
  }

  // индивидуальные стили из JSON, если есть
  if (item.style && typeof item.style === "object") {
    Object.assign(block.style, item.style);
  }

  // выбор: картинка или видео
  const isVideo =
    typeof item.url === "string" && /\.(mp4|webm|ogg)$/i.test(item.url);
  let mediaEl;

  if (isVideo) {
    const video = document.createElement("video");
    video.src = item.url;
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
    img.src = item.url;
    img.alt = item.name || "";
    img.decoding = "async";
    img.loading = "lazy";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.transition = "transform 0.6s ease";

    mediaEl = img;
  }

  block.appendChild(mediaEl);

  field.appendChild(block);
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
}

export function renderTextElement(
  item,
  i,
  { field, positions, blocks, clampCenterToField, config }
) {
  const block = document.createElement("div");
  block.classList.add("text-el");
  block.classList.add("map-item");

  // можно позже задать координаты block.style.left/top из функции рандомного позиционирования

  // позиционирование
  block.style.position = "absolute";
  block.style.left = positions[i].x + "px";
  block.style.top = positions[i].y + "px";
  block.style.transform = "translate(-50%, -50%)";
  block.dataset.id = item.id;
  block.dataset.name = item.name;
  block.dataset.link = "—";

  block.innerHTML = `
    <div class="meta-top">
      <span class="title">${item.name}</span>
    </div>
    <div class="text-content">
      ${item.paragraphs
        .map((p, i) => `<p ${i === 0 ? 'class="active"' : ""}>${p}</p>`)
        .join("")}
    </div>
    <div class="meta-bottom">
      <span class="counter">1/${item.paragraphs.length}</span>
      <span class="scroll-hint">scroll it</span>
    </div>
  `;

  let current = 0;
  const paragraphs = block.querySelectorAll("p");
  const counter = block.querySelector(".counter");

  let switching = false;

  const SWITCH_COOLDOWN = config.text.switchCooldownMs; // пауза между листаниями в мс
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

  // --------------  листание свайпом для тач
  let startY = null;
  const SWIPE_THRESHOLD = config.text.swipeThresholdPx;

  block.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
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
  });

  // функции для листания текстовых нодов
  function nextParagraph() {
    if (current < paragraphs.length - 1) {
      paragraphs[current].classList.remove("active");
      paragraphs[current].classList.add("exit");
      current++;
      paragraphs[current].classList.add("active");
      counter.textContent = `${current + 1}/${paragraphs.length}`;
      setTimeout(() => {
        paragraphs.forEach((p) => p.classList.remove("exit"));
      }, config.text.exitClassDurationMs);
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

  field.appendChild(block);
  blocks[i] = block;
  clampCenterToField(block, positions[i].x, positions[i].y);
}
