export function activeQuestionField() {
  const questSpan = document.getElementById("questions");
  const layer = document.getElementById("blending-explenation");
  const containerInv = document.querySelector("html");
  const initBtn = document.getElementById("init-span");
  if (!questSpan || !layer) return;

  if (window.devicePixelRatio > 2 || navigator.hardwareConcurrency <= 4) {
    document.documentElement.classList.add("low-perf");
  }

  layer.style.opacity = "0";

  const HIDE_DELAY_MS = 0; // небольшая задержка перед скрытием
  let isOpen = false;

  const clearAnims = () => {
    layer.classList.remove("blend-anim-in", "blend-anim-out");
    containerInv.classList.remove("pixi-anim-in", "pixi-anim-out");
  };

  const open = () => {
    if (isOpen) return;
    clearAnims();
    containerInv.style.filter = "invert(0)";
    layer.classList.remove("blend-hidden"); // сделать видимым для анимации

    layer.classList.add("blend-anim-in"); // запустить fade-in
    containerInv.classList.add("pixi-anim-in");

    layer.addEventListener(
      "animationend",
      function h(e) {
        if (e.animationName !== "blendFadeIn") return;
        layer.removeEventListener("animationend", h);
        layer.classList.remove("blend-anim-in"); // очистить класс анимации
        containerInv.classList.remove("pixi-anim-in");

        layer.classList.add("blend-open"); // зафиксировать видимое состояние
        containerInv.style.filter = "invert(1)";

        layer.style.opacity = "1";
        // При открытии ??? гасим только текст кнопки init (opacity)
        if (initBtn) {
          if (!initBtn.style.transition)
            initBtn.style.transition = "opacity 300ms ease";
          initBtn.style.opacity = "0";
        }
        isOpen = true;
      },
      { once: true }
    );
  };

  const close = (delay = HIDE_DELAY_MS) => {
    if (!isOpen) return;
    clearAnims();
    const doClose = () => {
      layer.classList.add("blend-anim-out"); // запустить fade-out (анимация перекроет opacity:1)
      containerInv.classList.add("pixi-anim-out"); // запустить fade-out
      // (анимация перекроет opacity:1)

      layer.addEventListener(
        "animationend",
        function h(e) {
          if (e.animationName !== "blendFadeOut") return;
          layer.removeEventListener("animationend", h);
          layer.classList.remove("blend-anim-out");
          containerInv.classList.remove("pixi-anim-out");

          layer.classList.remove("blend-open"); // убрать видимое состояние
          layer.classList.add("blend-hidden"); // скрыть полностью
          layer.style.opacity = "0";
          containerInv.style.filter = "";
          // При закрытии ??? возвращаем opacity кнопки init
          if (initBtn) {
            if (!initBtn.style.transition)
              initBtn.style.transition = "opacity 300ms ease";
            initBtn.style.opacity = "1";
          }
          isOpen = false;
        },
        { once: true }
      );
    };
    delay > 0 ? setTimeout(doClose, delay) : doClose();
  };

  // Включаем/выключаем строго по клику на “???”
  questSpan.addEventListener("click", (e) => {
    e.preventDefault();
    isOpen ? close() : open();
  });
}
