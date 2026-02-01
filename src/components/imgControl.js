export function imgActionControl() {
  const CONFIG = {
    images: {
      globalKey: "PICS",
      fallback: [
        "media/body-parts/ar.webp",
        "media/body-parts/original_17c39b5ebfce6f63b622346d966b34af.png",
        "media/body-parts/original_1c300758673bb2ee8924571c026759f9.png",
        "media/body-parts/original_1ce340ea95ce6d0563f89516c962eec9.png",
        "media/body-parts/original_28562d4eccd70a092c4cb30e55b127c3.png",
        "media/body-parts/original_2b1485cbb03ce46dfbece20f7276832d.png",
        "media/body-parts/original_312f8af9f2526694cafa3771878119e4.png",
        "media/body-parts/original_51625c7960e1a7352fa89e0e3af7dd42.png",
        "media/body-parts/original_5a99021cb90714869e7cc137ddd22399.png",
        "media/body-parts/original_5eb9627659ec24f59495d63c19a40018.png",
        "media/body-parts/original_6397cdfea5ad82371d31c34c47f7f46c.png",
        "media/body-parts/original_6c9f5a2bd1ba0be3c780d158c19d483d.png",
        "media/body-parts/original_871653cae6f9aa282f4cfde634ee84f2.png",
        "media/body-parts/original_91b46e8287a9abf6c95782d3cb3152b2.png",
        "media/body-parts/original_9f050f313cabc8e0f726c561f82a7640.png",
        "media/body-parts/original_a4c9255738bb3b4397b0261171264e7c.png",
        "media/body-parts/original_b8755ea1b592d62b999df170a82b4a19.png",
        "media/body-parts/original_d217e6a9a2ad80c3fe16a6e5c1a7fd28.png",
        "media/body-parts/original_dbc5c8a6eeae6710fb5a398abcd4adad.png",
        "media/body-parts/original_de4a16120dd519bd604013775f828464.png",
        "media/body-parts/original_e34b08a5d5957be5d2b32e976b2ca1ae.png",
        "media/body-parts/original_e8ab5d1c14f7d75ce10ac5170fb868ab.png",
        "media/body-parts/ssdv.png",
        "media/body-parts/svczx.png",
      ],
    },

    maxConcurrent: 1, // 2–3 at a time
    spawnDelayMs: [1800, 3400], // randomized between
    offscreenMarginPx: 120, // px beyond viewport to spawn/expire
    sizeVw: [60, 110], // large images in vw
    initialOpacity: [0.1, 0.2],
    durationS: [16, 32], // traverse duration in seconds

    img: {
      className: "floating-img",
      decoding: "async",
      loading: "eager",
      draggable: false,
      position: "absolute",
      pointerEvents: "none",
      mixBlendMode: "color-dodge",
      willChange: "transform, opacity",
      height: "auto",
    },

    opacityAnim: {
      base: 0.1,
      amplitude: 0.3,
    },
  };

  const container = document.getElementById("main-wrapper");
  if (!container) return;

  const globalImages = window[CONFIG.images.globalKey];
  const IMAGES =
    Array.isArray(globalImages) && globalImages.length
      ? globalImages
      : CONFIG.images.fallback;

  const active = new Set();
  let rafId = 0;
  let spawnTimer = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function randInt(a, b) {
    return Math.floor(rand(a, b));
  }
  function pick(arr) {
    return arr[randInt(0, arr.length)];
  }

  function viewport() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
    };
  }

  function makeImgEl(src) {
    const img = new Image();
    img.src = src;
    img.className = CONFIG.img.className;
    img.decoding = CONFIG.img.decoding;
    img.loading = CONFIG.img.loading;
    img.draggable = CONFIG.img.draggable;
    img.style.position = CONFIG.img.position;
    img.style.pointerEvents = CONFIG.img.pointerEvents;
    img.style.mixBlendMode = CONFIG.img.mixBlendMode;
    img.style.willChange = CONFIG.img.willChange;
    img.style.opacity = String(
      rand(CONFIG.initialOpacity[0], CONFIG.initialOpacity[1])
    );
    // size via vw to scale with viewport width; height auto to preserve ratio
    img.style.width = `${rand(CONFIG.sizeVw[0], CONFIG.sizeVw[1]).toFixed(1)}vw`;
    img.style.height = CONFIG.img.height;
    return img;
  }

  // Compute start and end points just outside the screen
  function randomPath() {
    const { w, h } = viewport();
    const m = CONFIG.offscreenMarginPx;
    // choose start edge: 0=left,1=right,2=top,3=bottom
    const edge = randInt(0, 4);
    let x0, y0, x1, y1;
    switch (edge) {
      case 0: // left → any other side
        x0 = -m;
        y0 = rand(-m, h + m);
        x1 = w + m;
        y1 = rand(-m, h + m);
        break;
      case 1: // right → any other side
        x0 = w + m;
        y0 = rand(-m, h + m);
        x1 = -m;
        y1 = rand(-m, h + m);
        break;
      case 2: // top → bottom-ish
        x0 = rand(-m, w + m);
        y0 = -m;
        x1 = rand(-m, w + m);
        y1 = h + m;
        break;
      default: // bottom → top-ish
        x0 = rand(-m, w + m);
        y0 = h + m;
        x1 = rand(-m, w + m);
        y1 = -m;
        break;
    }
    // small jitter so not perfectly straight 1:1 opposites
    x1 += rand(-m * 0.5, m * 0.5);
    y1 += rand(-m * 0.5, m * 0.5);
    return { x0, y0, x1, y1 };
  }

  function spawnOne() {
    if (active.size >= CONFIG.maxConcurrent) return;
    const src = pick(IMAGES);
    const el = makeImgEl(src);
    container.appendChild(el);

    const { x0, y0, x1, y1 } = randomPath();
    const start = performance.now();
    const dur = rand(CONFIG.durationS[0], CONFIG.durationS[1]) * 1000; // ms

    // center the image around its position after it loads (approx via naturalWidth)
    let offsetX = 0;
    let offsetY = 0;
    const setOffsets = () => {
      // Use current rendered size
      const rect = el.getBoundingClientRect();
      offsetX = rect.width * 0.5;
      offsetY = rect.height * 0.5;
    };
    el.onload = setOffsets;
    // in case of cache
    if (el.complete) setOffsets();

    const item = {
      el,
      start,
      dur,
      x0,
      y0,
      x1,
      y1,
      dead: false,
      get offsetX() {
        return offsetX;
      },
      get offsetY() {
        return offsetY;
      },
    };
    active.add(item);
  }

  function animate(now) {
    if (active.size) {
      active.forEach((it) => {
        if (it.dead) return;
        const t = Math.min(1, (now - it.start) / it.dur);
        const x = it.x0 + (it.x1 - it.x0) * t - (it.offsetX || 0);
        const y = it.y0 + (it.y1 - it.y0) * t - (it.offsetY || 0);
        it.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        it.el.style.opacity = String(
          // ease-in-out opacity subtlety
          CONFIG.opacityAnim.base +
            CONFIG.opacityAnim.amplitude * Math.sin(Math.PI * Math.min(t, 1))
        );
        if (t >= 1) {
          it.dead = true;
          it.el.remove();
          active.delete(it);
        }
      });
    }

    rafId = requestAnimationFrame(animate);
  }

  function scheduleNextSpawn() {
    clearTimeout(spawnTimer);
    const delay = randInt(CONFIG.spawnDelayMs[0], CONFIG.spawnDelayMs[1]);
    spawnTimer = setTimeout(() => {
      // keep at most maxConcurrent moving
      if (active.size < CONFIG.maxConcurrent) spawnOne();
      scheduleNextSpawn();
    }, delay);
  }

  function start() {
    // ensure container is enabled
    container.style.display = "block";
    if (!rafId) rafId = requestAnimationFrame(animate);
    scheduleNextSpawn();
  }
  function stop() {
    clearTimeout(spawnTimer);
    cancelAnimationFrame(rafId);
    rafId = 0;
    active.forEach((it) => it.el.remove());
    active.clear();
  }

  // Auto-start only if there are images
  if (IMAGES && IMAGES.length) start();

  // Expose simple controls if needed
  window.FloatingImages = { start, stop };

  // Handle tab visibility to reduce work
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });
}
