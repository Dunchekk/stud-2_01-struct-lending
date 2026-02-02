export function activeInitionUI() {
  const html = document.documentElement;
  const overlay = document.getElementById("inition-field");
  const openBtn = document.getElementById("init-span");
  const questions = document.getElementById("questions");

  const setInvert = (value) => {
    html.style.filter = `invert(${value})`;
  };

  const isOverlayVisible = () => {
    if (!overlay) return false;
    const style = window.getComputedStyle(overlay);
    return style.display !== "none" && !overlay.classList.contains("closing");
  };

  const syncUI = () => {
    const vis = isOverlayVisible();
    setInvert(vis ? 1 : 0);
    if (questions) questions.style.display = vis ? "none" : "";
  };

  // Старт: синхронизуем инверсию и видимость ??? с состоянием init-field
  syncUI();

  // Клик по крестику внутри init-field (делегирование — крестик создаётся динамически)
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target.closest(".close-init")) {
        setInvert(0); // плавный переход к нормальному виду
        // Появление ??? произойдёт по факту закрытия слоя (наблюдатель ниже)
      }
    });
  }

  // Кнопка повторного открытия init (инициирует обратную инверсию)
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      setInvert(1);
      if (questions) questions.style.display = "none"; // сразу скрываем ??? при открытии
    });
  }

  // Слежение за состоянием оверлея — синхронизируем фильтр, если его скрыли/открыли кодом
  if (overlay) {
    const mo = new MutationObserver(() => {
      syncUI();
    });
    mo.observe(overlay, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }
}
