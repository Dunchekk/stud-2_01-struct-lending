export function activeNodesObserver() {
  const root = document.getElementById("main-field-wrapper");
  const field = document.getElementById("main-field");
  if (!root || !field) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.5) {
          entry.target.classList.add("in-view");
        } else {
          entry.target.classList.remove("in-view");
        }
      }
    },
    {
      root,
      threshold: [0, 0.4, 1],
    }
  );

  const enhance = (el) => {
    if (!el.classList.contains("reveal")) el.classList.add("reveal");
    io.observe(el);
  };

  // обработать уже отрендеренные
  document.querySelectorAll(".map-item").forEach(enhance);

  // и любые будущие вставки из third-layer.js
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.matches(".map-item")) enhance(n);
        n.querySelectorAll?.(".map-item").forEach(enhance);
      });
    }
  });
  mo.observe(field, { childList: true, subtree: true });

  //---------------------------

  const wrapper = document.getElementById("main-field-wrapper");
  if (!wrapper || !field) return;

  // вычисляем целевые координаты центра
  const computeCenter = () => {
    const maxX = Math.max(0, field.scrollWidth - wrapper.clientWidth);
    const maxY = Math.max(0, field.scrollHeight - wrapper.clientHeight);
    return {
      left: maxX / 2,
      top: maxY / 2,
    };
  };

  // один раз проскроллить в центр, с фоллбеком если размеры меняются
  const scrollToCenter = (behavior = "auto") => {
    const { left, top } = computeCenter();
    wrapper.scrollTo({ left, top, behavior });
    // На некоторых платформах программный скролл не всегда шлёт событие:
    // форсим, чтобы параллакс/маска обновились.
    wrapper.dispatchEvent(new Event("scroll", { bubbles: false }));
  };

  // ждём, пока third-layer и стили зададут размеры поля
  let done = false;
  const tryCenter = () => {
    if (done) return;
    const ready =
      field.scrollWidth > wrapper.clientWidth + 100 &&
      field.scrollHeight > wrapper.clientHeight + 100;

    if (ready) {
      done = true;
      // первый раз — без анимации (мгновенно к центру)
      scrollToCenter("auto");
      return true;
    }
    return false;
  };

  // 1) пробуем сразу после layout
  requestAnimationFrame(() => {
    if (tryCenter()) return;

    // 2) слушаем изменения размеров поля и контейнера, центрируем один раз
    const ro = new ResizeObserver(() => {
      if (tryCenter()) ro.disconnect();
    });
    ro.observe(field);
    ro.observe(wrapper);

    // 3) запасной таймер (если ResizeObserver недоступен/не сработал)
    const t0 = performance.now();
    const poll = () => {
      if (tryCenter()) return;
      if (performance.now() - t0 > 2000) return; // не ждём больше 2с
      requestAnimationFrame(poll);
    };
    poll();
  });

  // На полную загрузку (видео/картинки) ещё раз подровнять центр
  window.addEventListener("load", () => {
    if (!done) scrollToCenter("auto");
  });
}
