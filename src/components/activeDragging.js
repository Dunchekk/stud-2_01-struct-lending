export function activeDragging() {
  const wrapper = document.getElementById("main-field-wrapper");
  const field = document.getElementById("main-field");
  if (!wrapper || !field) return;

  let isPointerDown = false;
  let isDragging = false;
  let startX = 0,
    startY = 0;
  let startScrollLeft = 0,
    startScrollTop = 0;

  wrapper.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return; // только мышь, ЛКМ

    isPointerDown = true;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = wrapper.scrollLeft;
    startScrollTop = wrapper.scrollTop;

    wrapper.setPointerCapture?.(e.pointerId); // захват указателя
  });

  wrapper.addEventListener("pointermove", (e) => {
    if (!isPointerDown) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // порог, чтобы не ломать клики/выделение при микродвижениях
    if (!isDragging && Math.abs(dx) + Math.abs(dy) > 3) {
      isDragging = true;
      wrapper.classList.add("dragging");
    }
    if (!isDragging) return;

    // двигаем скролл поля в противоположную сторону движения указателя
    wrapper.scrollLeft = startScrollLeft - dx;
    wrapper.scrollTop = startScrollTop - dy;

    e.preventDefault(); // чтобы текст при drag не выделялся
  });

  const endDrag = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (isDragging) {
      wrapper.classList.remove("dragging");
      isDragging = false;
    }
    wrapper.releasePointerCapture?.(e.pointerId);
  };

  wrapper.addEventListener("pointerup", endDrag);
  wrapper.addEventListener("pointercancel", endDrag);
  wrapper.addEventListener("pointerleave", endDrag);
}
