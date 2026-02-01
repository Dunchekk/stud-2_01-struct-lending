const CONFIG = {
  id: "loading-screen",
  hiddenClass: "loading-hidden",
  fadeMs: 500,
  maxWaitMs: 1500,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function raf() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function getOverlay() {
  return document.getElementById(CONFIG.id);
}

function hasMainFieldContent() {
  const field = document.getElementById("main-field");
  if (!field) return false;
  if (!field.children.length) return false;
  return !!field.querySelector(".map-item");
}

function hasPixiCanvas() {
  const container = document.getElementById("pixi-container-waves-blur");
  if (!container) return false;
  const canvas = container.querySelector("canvas");
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function areMediaSized() {
  // ждём минимум метаданные у видео (readyState >= 1) и complete у картинок
  const scope = document.getElementById("main-wrapper") || document;
  const imgs = scope.querySelectorAll(".map-item img");
  for (const img of imgs) {
    if (!img.complete) return false;
  }
  const videos = scope.querySelectorAll(".map-item video");
  for (const video of videos) {
    if (video.readyState < 1) return false;
  }
  return true;
}

async function waitForWindowLoad(deadlineMs) {
  if (document.readyState === "complete") return;
  await new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
  if (nowMs() > deadlineMs) return;
}

async function waitForConditions(deadlineMs) {
  // ждём, пока:
  // - отрендерится поле (ноды в DOM)
  // - появится pixi canvas (фоновое видео/шейдеры)
  // - медиа хотя бы получили размеры (img complete / video metadata)
  // - layout успокоился (пара кадров)
  while (nowMs() < deadlineMs) {
    if (hasMainFieldContent() && hasPixiCanvas() && areMediaSized()) break;
    await raf();
  }

  // дать браузеру применить стили/лейаут после последней вставки
  await raf();
  await raf();
}

function hideOverlay() {
  const overlay = getOverlay();
  if (!overlay) return;
  overlay.classList.add(CONFIG.hiddenClass);
  // убрать из DOM после fade, чтобы не мешал tab/aria и не висел поверх
  window.setTimeout(() => overlay.remove(), CONFIG.fadeMs + 50);
}

/**
 * Скрывает белый экран загрузки, когда приложение "готово":
 * - `window.load` прошёл
 * - ноды поля отрендерились
 * - появился Pixi canvas
 * - картинки/видео-ноды получили размеры
 *
 * Есть таймаут-фоллбек, чтобы не зависнуть навсегда.
 */
export async function hideLoadingScreenWhenReady() {
  const overlay = getOverlay();
  if (!overlay) return;

  const deadlineMs = nowMs() + CONFIG.maxWaitMs;

  await Promise.race([waitForWindowLoad(deadlineMs), sleep(CONFIG.maxWaitMs)]);
  await waitForConditions(deadlineMs);

  hideOverlay();
}
