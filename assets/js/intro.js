/* GDM Proposta: vinheta de entrada com efeito de digitação (painel e página do cliente).
   Carregue este arquivo SEM defer, logo no início do <body>, e chame GDMIntro.mount() para cobrir a tela
   enquanto o resto carrega. Depois, GDMIntro.type([...]) digita o texto e some sozinho. */
window.GDMIntro = (function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HTML = `<div class="intro" id="intro" aria-live="polite">
    <div class="intro-glow"></div><div class="intro-ray"></div>
    <div class="intro-in">
      <svg class="intro-mark" viewBox="0 0 655 677" aria-hidden="true">
        <defs><linearGradient id="introGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1E8C2"/><stop offset="1" stop-color="#B89C5E"/></linearGradient></defs>
        <path class="bar b1" d="M234 216 L329 216 L96 677 L0 677 Z" fill="url(#introGold)"/>
        <path class="bar b2" d="M476 0 L572 0 L338 461 L242 461 Z" fill="url(#introGold)"/>
        <path class="bar b3" d="M559 101 L655 101 L422 563 L325 563 Z" fill="url(#introGold)"/>
      </svg>
      <h1 class="intro-type"><span class="t1"></span><span class="t2"></span><i class="caret" aria-hidden="true"></i></h1>
      <p class="intro-sub"></p>
    </div>
    <button class="intro-skip" type="button">Pular</button>
  </div>`;
  let el = null, finishFn = null;

  function seen(k) { try { return sessionStorage.getItem(k) === "1"; } catch (e) { return false; } }
  function mark(k) { try { sessionStorage.setItem(k, "1"); } catch (e) {} }
  function mount() {
    if (el) return el;
    document.body.insertAdjacentHTML("afterbegin", HTML);
    el = document.getElementById("intro");
    document.body.classList.add("intro-on");
    el.querySelector(".intro-skip").onclick = () => finishFn && finishFn();
    el.addEventListener("click", e => { if (finishFn && !e.target.closest(".intro-skip")) finishFn(); });
    return el;
  }
  function dismiss() {
    if (!el) return;
    const node = el; el = null; finishFn = null;
    node.classList.add("done", "out"); document.body.classList.remove("intro-on");
    setTimeout(() => node.remove(), 900);
  }
  // parts: [["texto em peso fino", "t1"], ["texto em destaque", "t2"]]; sub: linha pequena embaixo.
  function type(parts, sub) {
    return new Promise(resolve => {
      if (!el) return resolve();
      const node = el, timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      const span = cls => node.querySelector("." + cls);
      node.querySelector(".intro-type").setAttribute("aria-label", parts.map(p => p[0]).join(""));
      node.querySelector(".intro-sub").innerHTML = sub || "";
      let done = false;
      const onKey = e => { if (["Escape", "Enter", " "].includes(e.key)) finish(); };
      function finish() {
        if (done) return; done = true; timers.forEach(clearTimeout);
        removeEventListener("keydown", onKey);
        parts.forEach(([t, c]) => { span(c).textContent = t; });
        node.classList.remove("typing");
        dismiss(); resolve();
      }
      finishFn = finish;
      addEventListener("keydown", onKey);
      if (reduce) { parts.forEach(([t, c]) => { span(c).textContent = t; }); node.classList.add("done"); later(finish, 1600); return; }
      const fonts = Promise.race([
        Promise.all([document.fonts.load('200 48px "Poppins"'), document.fonts.load('500 48px "Poppins"')]).catch(() => {}),
        new Promise(r => setTimeout(r, 1500))
      ]);
      fonts.then(() => {
        if (done) return;
        let t = 650; node.classList.add("typing");
        parts.forEach(([text, cls]) => {
          [...text].forEach(ch => { t += ch === " " ? 40 : 58 + Math.random() * 44; later(() => { span(cls).textContent += ch; }, t); });
          t += 120;
        });
        later(() => { node.classList.remove("typing"); node.classList.add("done"); }, t + 150);
        later(finish, t + 1500);
      });
    });
  }
  return { mount, dismiss, type, seen, mark, active: () => !!el };
})();
