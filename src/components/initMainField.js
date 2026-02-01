import { renderPictureElement, renderTextElement } from "./renderers";

const CONFIG = {
  // размеры поля относительно viewport
  scaleFactor: 9,

  // UA-детект и коэффициенты для мобилок
  mobile: {
    userAgentRe: /Mobi|Android|iPhone|iPad|iPod/i,
    widthBoost: 1.8,
    heightShrink: 0.9,
  },

  // минимальный отступ между краем нода и краем поля (в vw)
  edgeMarginVw: 5,
  // минимальный паддинг (px), даже если edgeMargin маленький
  minPaddingPx: 10,

  // генерация позиций
  gridOversample: 1.0,
  cell: {
    inset: 0.3,
    jitter: 0.6,
  },

  // текстовые ноды
  text: {
    switchCooldownMs: 1000,
    swipeThresholdPx: 50,
    exitClassDurationMs: 600,
  },

  // "найденные" по видимости
  foundThreshold: 0.5,
};

export async function initField() {
  // Загружаем JSON
  const response = await fetch("data/data.json"); // (раньше была внешняя ссылка)
  const data = await response.json();

  // Настраиваем размеры поля
  const SCREEN_W = window.innerWidth;
  const SCREEN_H = window.innerHeight;
  const SCALE_FACTOR = CONFIG.scaleFactor;
  const isMobile = CONFIG.mobile.userAgentRe.test(navigator.userAgent);
  // на мобилках пропорции шире
  const WIDTH_BOOST = isMobile ? CONFIG.mobile.widthBoost : 1.0;
  const HEIGHT_SHRINK = isMobile ? CONFIG.mobile.heightShrink : 1.0;
  const FIELD_W = SCREEN_W * SCALE_FACTOR * WIDTH_BOOST;
  const FIELD_H = SCREEN_H * SCALE_FACTOR * HEIGHT_SHRINK;

  // минимальный отступ между краем нода и краем поля
  const EDGE_MARGIN_VW = CONFIG.edgeMarginVw; // можно поменять
  const EDGE_MARGIN = window.innerWidth * (EDGE_MARGIN_VW / 100);

  const field = document.getElementById("main-field");
  field.style.width = FIELD_W + "px";
  field.style.height = FIELD_H + "px";

  // Константы генерации координат
  // (рекурсия по N, попытки — итерацией)
  // равномерный разлёт по полю
  const N = data.length;

  const PADDING_X = Math.max(EDGE_MARGIN, CONFIG.minPaddingPx);
  const PADDING_Y = Math.max(EDGE_MARGIN, CONFIG.minPaddingPx);
  const EFF_W = Math.max(1, FIELD_W - 2 * PADDING_X);
  const EFF_H = Math.max(1, FIELD_H - 2 * PADDING_Y);

  const positions = [];

  // Кандидаты по сетке с джиттером
  // ровно N ячеек, по 1 ноду в ячейке

  (function buildGridOversampled() {
    const GRID_OVERSAMPLE = CONFIG.gridOversample; // 2× больше ячеек → клетки ~в √2 раз меньше
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
    const inset = CONFIG.cell.inset; // с каждой стороны
    const jitter = CONFIG.cell.jitter; // сдвиг внутри внутреннего прямоугольника

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
      `Разместили ${positions.length}/${N}. Увеличьте CONFIG.scaleFactor или скорректируйте параметры сетки (CONFIG.gridOversample / CONFIG.cell).`
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

  // размещаем элементы на поле
  data.forEach((item, i) => {
    if (!positions[i]) {
      console.warn(
        `Пропуск элемента #${i} (${item.name || item.id}) — нет позиции`
      );
      return;
    }
    if (item.type === "text-el") {
      renderTextElement(item, i, {
        field,
        positions,
        blocks,
        clampCenterToField,
        config: CONFIG,
      });
    } else {
      renderPictureElement(item, i, {
        field,
        positions,
        blocks,
        clampCenterToField,
      });
    }
  });

  // отслеживаем видимость и считаем найденные
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
    },
    {
      root: wrapper, // важно: скроллит именно wrapper
      threshold: [CONFIG.foundThreshold], // 50% на экране
    }
  );

  items.forEach((el) => observer.observe(el));
}
