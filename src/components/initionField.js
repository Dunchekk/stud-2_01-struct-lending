export function activeInitionField() {
  const CONFIG = {
    text: {
      switchCooldownMs: 1000,
      swipeThresholdPx: 50,
      exitClassDurationMs: 600,
    },
    styles: {
      // чтобы не побеждал .text-el { color: white } из third-layer.css
      textColor: "#000",
      zIndex: "2001",
    },
  };

  const initEl = document.getElementById("inition-field");
  if (!initEl) return;

  const closeOverlay = () => {
    if (initEl.classList.contains("closing")) return;
    initEl.classList.add("closing");
    initEl.addEventListener(
      "transitionend",
      () => {
        initEl.style.display = "none";
      },
      { once: true }
    );
  };

  const dataInit = {
    id: 1,
    name: "инициализация",
    paragraphs: [
      "«В&nbsp;целях соблюдения академических норм они [студенты] обязаны выделять результаты своей деятельности, при&nbsp;реализации которой был использован ИИ, указывая характер и&nbsp;объем работ, выполненных с&nbsp;его помощью. В&nbsp;противном случае это рассматривается как нарушение академических норм, что может повлечь за&nbsp;собой дисциплинарное взыскание» — пишется в&nbsp;справочнике учебного процесса НИУ ВШЭ.",
      "Было ли выписано хотя бы одно дисциплинарное взыскание на&nbsp;основании отсутствия указания об&nbsp;использовании студентом языковой модели? Преподаватели, вероятно, знают, насколько много студенческих текстов на&nbsp;самом деле написано не&nbsp;студентами — если не&nbsp;знают, то&nbsp;чувствуют.",
      "За&nbsp;последний год 85 % (а&nbsp;то и&nbsp;больше) всех студенческих текстов, которые я&nbsp;читала (включая тексты дизайн-проектов, визуальных исследований, эссе и&nbsp;в&nbsp;целом любых заданий, где можно было бы&nbsp;сдать нечто, напоминающее текст), были написаны нейросетями. Говорил ли об&nbsp;этом хоть кто-то при&nbsp;его сдаче? Нет. По&nbsp;крайней мере, не преподавателю, а&nbsp;мне — одногруппнику, у&nbsp;которого явно нет намерений никого «сдать».",
      "Пока что НИУ ВШЭ даже на&nbsp;первый взгляд не&nbsp;справляется с&nbsp;выполнением своих предписаний в&nbsp;справочнике учебного процесса, ведь полагаться в&nbsp;вопросе «авторства» (термин существующей традиции академии, все еще используемой ею) можно разве что на&nbsp;честность студента, которой, увы (судя по&nbsp;тому, что творится вокруг), у&nbsp;него нет.",
      "Учебный процесс столкнулся с&nbsp;чем-то совершенно новым, и&nbsp;составители «академических норм» и&nbsp;«справочника учебного процесса» пока что вообще не&nbsp;понимают, как действовать. Бакалавриат можно закончить, не&nbsp;написав ни&nbsp;строчки текста самостоятельно — многие мои одногруппники упорно пытаются&nbsp;выполнить такой челлендж и&nbsp;пока что идут очень успешно — это пугает и&nbsp;вдохновляет одновременно.",
      "Это определённо требует обсуждения, постановки совершенно новых вопросов, пересмотра уже существующих, но&nbsp;более не&nbsp;работающих концепций, обновления старых понятий и&nbsp;логики, которая уже не&nbsp;актуальна. Времени на&nbsp;это обсуждение у&nbsp;нас нет: темпы ежегодного роста способностей ИИ огромные и&nbsp;останавливаться не&nbsp;планируют.",
      "В&nbsp;этом обсуждении придётся дойти и&nbsp;до&nbsp;новых «академических норм», хотя это будет далеко не первым шагом. Этот лонгрид — частичка в&nbsp;потоке этого бесконечного обсуждения, попытка собрать и&nbsp;использовать те&nbsp;концепции, которые, кажется, всё ещё работают в&nbsp;законах нового мира. Попытка найти что-то уже знакомое, чтобы стоять на&nbsp;теоретической почве было не&nbsp;так&nbsp;шатко.",
      "Концепции, которыми я пользуюсь здесь, в&nbsp;основном будут взяты из&nbsp;методологии постструктурализма — большинство из&nbsp;них не просто пережили появление языковых моделей, но&nbsp;были ими обновлены / доказаны / выделены. Возможно, меня может куда-то занести, ноя&nbsp;буду стараться следовать обозначенному плану.",
      "А теперь задачка. Был ли&nbsp;этот текст написан человеком? Если да,&nbsp;то&nbsp;какая его часть? Как вы&nbsp;это поняли?",
    ],
  };

  function renderTextElement(data) {
    const block = document.createElement("div");
    block.classList.add("text-el");
    block.classList.add("init-item");

    // позиционирование — по центру экрана
    block.style.position = "absolute";
    block.style.left = "50vw";
    block.style.top = "50vh";
    block.style.transform = "translate(-50%, -50%)";

    block.innerHTML = `
    <div class="meta-top">
      <span class="title">${data.name}</span>
    </div>
    <div class="text-content">
      ${data.paragraphs
        .map((p, i) => `<p ${i === 0 ? 'class="active"' : ""}>${p}</p>`)
        .join("")}
    </div>
    <div class="meta-bottom">
      <span class="counter">1/${data.paragraphs.length}</span>
      <span class="scroll-hint">scroll it</span>
    </div>  `;

    let current = 0;
    const paragraphs = block.querySelectorAll("p");
    const counter = block.querySelector(".counter");

    let switching = false;

    const SWITCH_COOLDOWN = CONFIG.text.switchCooldownMs; // пауза между листаниями в мс
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

    block.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (e.deltaY > 0) withCooldown(nextParagraph);
        else withCooldown(prevParagraph);
      },
      { passive: false }
    );

    // -------------- листание свайпом для тач
    let startY = null;
    const SWIPE_THRESHOLD = CONFIG.text.swipeThresholdPx;

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

    //--------------------

    function nextParagraph() {
      if (current < paragraphs.length - 1) {
        paragraphs[current].classList.remove("active");
        paragraphs[current].classList.add("exit");
        current++;
        paragraphs[current].classList.add("active");
        counter.textContent = `${current + 1}/${paragraphs.length}`;
        setTimeout(() => {
          paragraphs.forEach((p) => p.classList.remove("exit"));
        }, CONFIG.text.exitClassDurationMs);
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

    // Добавим крестик в правом верхнем углу шапки
    const metaTop = block.querySelector(".meta-top");
    if (metaTop) {
      const closeBtn = document.createElement("span");
      closeBtn.className = "close-init";
      closeBtn.setAttribute("role", "button");
      closeBtn.setAttribute("aria-label", "закрыть");
      closeBtn.textContent = "×";
      metaTop.appendChild(closeBtn);
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeOverlay();
      });
    }

    initEl.appendChild(block);
    block.style.setProperty("color", CONFIG.styles.textColor, "important");
    block.style.zIndex = CONFIG.styles.zIndex;
  }

  renderTextElement(dataInit);

  // показать/скрыть инициализационный слой по требованию
  const showOverlay = () => {
    // если уже виден — ничего не делаем
    if (
      initEl.style.display !== "none" &&
      !initEl.classList.contains("closing")
    )
      return;
    // убедимся, что есть контент (на случай, если его удалят вручную)
    if (!initEl.querySelector(".text-el")) {
      renderTextElement(dataInit);
    }
    // стартуем с прозрачности, затем уберём класс и дадим transition сработать до 1
    initEl.style.display = "block";
    initEl.classList.add("closing"); // opacity:0
    // следующий кадр — убрать closing, чтобы анимироваться к opacity:1
    requestAnimationFrame(() => {
      initEl.classList.remove("closing");
    });
  };

  // Повесим на #init-span
  const trigger = document.getElementById("init-span");
  if (trigger) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      showOverlay();
    });
  }
}
