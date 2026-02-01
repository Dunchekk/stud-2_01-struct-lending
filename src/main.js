import "./css/keyframes.css";
import "./css/font.css";
import "./css/pixi.css";
import "./css/style.css";
import "./css/eges.css";
import "./css/nodes.css";
import "./css/blending-modes.css";
import "./css/adaptives.css";
import { initPixi } from "./components/pixi";
import { initField } from "./components/initMainField";
import { activeDragging } from "./components/activeDragging";
import { activeNodesObserver } from "./components/observer";
import { activeQuestionField } from "./components/questionField";
import { activeInitionField } from "./components/initionField";
import { imgActionControl } from "./components/imgControl";
import { activeInitionUI } from "./components/initionUI";
import { hideLoadingScreenWhenReady } from "./components/loading";

window.addEventListener("load", initPixi);

document.addEventListener("DOMContentLoaded", () => {
  const fieldReady = initField();
  activeNodesObserver();
  activeDragging();
  activeQuestionField();
  activeInitionField();
  imgActionControl();
  activeInitionUI();

  // ждём пока отрендерится поле + пройдут ключевые загрузки, и мягко убираем белый экран
  fieldReady.finally(() => {
    hideLoadingScreenWhenReady();
  });
});
