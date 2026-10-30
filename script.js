(() => {
  "use strict";

  const STORAGE_KEY = "junglaNumerosProgressV1";
  const praiseMessages = [
    "¡Muy bien, lo estás haciendo genial!",
    "¡Eres increíble, corazón!",
    "¡Lo lograste, qué orgullo!",
    "¡Sigue así, pequeño explorador!"
  ];
  const levelInfo = [
    { title: "Números del 1 al 5", icon: "🔢", topic: "Reconoce los números" },
    { title: "Frutas para contar", icon: "🍎", topic: "Cuenta las frutas" },
    { title: "Números del 1 al 10", icon: "🔟", topic: "Reconoce los números" },
    { title: "Sumas saltarinas", icon: "➕", topic: "¡Vamos a sumar!" },
    { title: "Sumas en el río", icon: "🐸", topic: "¡Vamos a sumar!" },
    { title: "Restas en la selva", icon: "🍌", topic: "¡Vamos a restar!" },
    { title: "Monos y bananas", icon: "🐒", topic: "¡Vamos a restar!" },
    { title: "Historias con frutas", icon: "🍊", topic: "Problemas ilustrados" },
    { title: "Amigos de la jungla", icon: "🦜", topic: "Problemas ilustrados" },
    { title: "Gran desafío final", icon: "🏆", topic: "Desafío final" }
  ];

  const defaultProgress = () => ({ completed: [], points: 0, stars: 0, medals: 0, sound: true, audioPreferenceVersion: 2 });
  let progress = loadProgress();
  let currentLevel = 0;
  let currentQuestionIndex = 0;
  let firstTryCorrect = 0;
  let earnedPointsThisLevel = 0;
  let answering = false;
  let hadWrongAnswer = false;
  let countedItems = new Set();
  let audioContext;
  let musicTimer = null;
  let musicNoteIndex = 0;
  let usedAnswerOrders = new Set();
  let mathInteractionCount = 0;
  const numberNames = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

  const $ = (selector) => document.querySelector(selector);
  const screens = {
    home: $("#screen-home"),
    map: $("#screen-map"),
    game: $("#screen-game"),
    celebration: $("#screen-celebration"),
    final: $("#screen-final")
  };

  function loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultProgress();
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.completed)) return defaultProgress();
      return {
        completed: [...new Set(parsed.completed.filter((level) => Number.isInteger(level) && level >= 0 && level < levelInfo.length))],
        points: Number.isFinite(parsed.points) && parsed.points >= 0 ? parsed.points : 0,
        stars: Number.isFinite(parsed.stars) && parsed.stars >= 0 ? parsed.stars : 0,
        medals: Number.isFinite(parsed.medals) && parsed.medals >= 0 ? parsed.medals : 0,
        sound: parsed.audioPreferenceVersion === 2 ? parsed.sound === true : true,
        audioPreferenceVersion: 2
      };
    } catch (error) {
      console.warn("No se pudo leer el progreso guardado.", error);
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      $("#saved-note").textContent = progress.completed.length
        ? `¡Ya llevas ${progress.completed.length} ${progress.completed.length === 1 ? "nivel" : "niveles"} completados!`
        : "";
    } catch (error) {
      console.error("No se pudo guardar el progreso.", error);
      $("#saved-note").textContent = "No se pudo guardar el progreso en este navegador.";
    }
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([screenName, element]) => {
      element.classList.toggle("hidden", screenName !== name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateHeader() {
    $("#score-total").textContent = progress.points;
    $("#sound-icon").textContent = progress.sound ? "🔊" : "🔇";
    $("#sound-toggle").setAttribute("aria-label", progress.sound ? "Desactivar música y efectos" : "Activar música y efectos");
    $("#sound-toggle").setAttribute("aria-pressed", String(progress.sound));
    $("#sound-toggle .control-label").textContent = progress.sound ? "Audio: sí" : "Audio: no";
    $("#saved-note").textContent = progress.completed.length
      ? `¡Ya llevas ${progress.completed.length} ${progress.completed.length === 1 ? "nivel" : "niveles"} completados!`
      : "";
  }

  function renderMap() {
    const grid = $("#level-grid");
    const furthestUnlocked = Math.min(progress.completed.length, levelInfo.length - 1);
    grid.replaceChildren();
    levelInfo.forEach((level, index) => {
      const isUnlocked = index <= furthestUnlocked;
      const isComplete = progress.completed.includes(index);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `level-card${isComplete ? " is-complete" : ""}`;
      button.disabled = !isUnlocked;
      button.setAttribute("aria-label", `Nivel ${index + 1}: ${level.title}${isComplete ? ", completado" : isUnlocked ? "" : ", bloqueado"}`);
      button.innerHTML = `
        <span class="level-icon" aria-hidden="true">${level.icon}</span>
        <span class="level-number">Nivel ${index + 1}</span>
        <span class="level-name">${level.title}</span>
        <span class="level-stars" aria-label="${isComplete ? "Completado" : isUnlocked ? "Disponible" : "Bloqueado"}">${isComplete ? "⭐" : isUnlocked ? "¡Vamos!" : ""}</span>
        ${isUnlocked ? "" : '<span class="level-lock" aria-hidden="true">🔒</span>'}`;
      if (isUnlocked) button.addEventListener("click", () => startLevel(index));
      grid.append(button);
    });
    const completedCount = progress.completed.length;
    $("#map-progress-fill").style.width = `${completedCount * 10}%`;
    $("#map-progress-text").textContent = `${completedCount} de 10`;
  }

  function startLevel(index) {
    currentLevel = index;
    currentQuestionIndex = 0;
    firstTryCorrect = 0;
    earnedPointsThisLevel = 0;
    answering = false;
    usedAnswerOrders = new Set();
    showScreen("game");
    renderQuestion();
  }

  function buildQuestions(levelIndex) {
    const fixedSets = {
      0: [
        { prompt: "¿Qué número ves?", visual: '<span class="visual-number">1</span>', answer: "1", options: ["1", "2", "3"], numberRange: 5 },
        { prompt: "Busca el número cuatro.", visual: '<span class="visual-number">4</span>', answer: "4", options: ["2", "4", "5"], numberRange: 5 },
        { prompt: "¿Qué número está aquí?", visual: '<span class="visual-number">2</span>', answer: "2", options: ["1", "2", "4"], numberRange: 5 },
        { prompt: "Toca el número cinco.", visual: '<span class="visual-number">5</span>', answer: "5", options: ["3", "5", "4"], numberRange: 5 },
        { prompt: "¿Qué número ves?", visual: '<span class="visual-number">3</span>', answer: "3", options: ["3", "1", "5"], numberRange: 5 }
      ],
      1: [
        { prompt: "¿Cuántas manzanas hay?", visual: "🍎", count: 1 },
        { prompt: "Cuenta las bananas.", visual: "🍌", count: 3 },
        { prompt: "¿Cuántas naranjas ves?", visual: "🍊", count: 5 },
        { prompt: "Cuenta las fresas.", visual: "🍓", count: 2 },
        { prompt: "¿Cuántas piñas hay?", visual: "🍍", count: 4 }
      ],
      2: [
        { prompt: "¿Qué número muestra el cartel?", visual: '<span class="visual-number">8</span>', answer: "8", options: ["6", "8", "9"], numberRange: 10 },
        { prompt: "Encuentra el número diez.", visual: '<span class="visual-number">10</span>', answer: "10", options: ["8", "9", "10"], numberRange: 10 },
        { prompt: "¿Qué número ves?", visual: '<span class="visual-number">6</span>', answer: "6", options: ["6", "7", "9"], numberRange: 10 },
        { prompt: "Toca el número siete.", visual: '<span class="visual-number">7</span>', answer: "7", options: ["5", "7", "8"], numberRange: 10 },
        { prompt: "¿Qué número está aquí?", visual: '<span class="visual-number">9</span>', answer: "9", options: ["7", "8", "9"], numberRange: 10 }
      ],
      3: [
        { a: 1, b: 2 }, { a: 2, b: 2 }, { a: 3, b: 1 }, { a: 2, b: 3 }, { a: 4, b: 1 }
      ],
      4: [
        { a: 4, b: 3 }, { a: 5, b: 2 }, { a: 3, b: 4 }, { a: 6, b: 2 }, { a: 5, b: 4 }
      ],
      5: [
        { a: 3, b: 1 }, { a: 5, b: 2 }, { a: 4, b: 3 }, { a: 6, b: 1 }, { a: 5, b: 4 }
      ],
      6: [
        { a: 7, b: 3 }, { a: 8, b: 4 }, { a: 9, b: 5 }, { a: 6, b: 2 }, { a: 10, b: 6 }
      ],
      7: [
        { kind: "sum", a: 2, b: 3, fruit: "🍊", story: "El mono encontró" },
        { kind: "sum", a: 4, b: 2, fruit: "🍌", story: "El tucán encontró" },
        { kind: "subtract", a: 6, b: 2, fruit: "🍎", story: "Había 6 manzanas y se comieron 2." },
        { kind: "sum", a: 3, b: 4, fruit: "🥭", story: "La ardilla encontró" },
        { kind: "subtract", a: 8, b: 3, fruit: "🍐", story: "Había 8 peras y se comieron 3." }
      ],
      8: [
        { kind: "sum", a: 3, b: 2, fruit: "🦜", story: "Hay 3 loros en un árbol y llegan 2 más." },
        { kind: "subtract", a: 7, b: 3, fruit: "🐒", story: "Había 7 monos y 3 se fueron a jugar." },
        { kind: "sum", a: 4, b: 4, fruit: "🐸", story: "Hay 4 ranas en el río y llegan 4 más." },
        { kind: "subtract", a: 9, b: 5, fruit: "🦋", story: "Había 9 mariposas y 5 volaron." },
        { kind: "sum", a: 5, b: 3, fruit: "🐢", story: "Hay 5 tortugas y llegan 3 amigas." }
      ],
      9: [
        { kind: "number", visual: "4", answer: 4, prompt: "Elige el número del cartel." },
        { kind: "count", fruit: "🥭", a: 4, prompt: "Cuenta los mangos del mono." },
        { kind: "sum", a: 6, b: 3, fruit: "🍌", story: "El mono recoge 6 bananas y luego 3 más." },
        { kind: "subtract", a: 10, b: 4, fruit: "🦜", story: "Había 10 loros y 4 volaron a otro árbol." },
        { kind: "sum", a: 5, b: 5, fruit: "🍍", story: "Hay 5 piñas aquí y 5 más en la cesta." }
      ]
    };

    const raw = fixedSets[levelIndex];
    if (levelIndex === 1) {
      return raw.map((item) => ({
        prompt: item.prompt,
        visual: `${item.visual.repeat(item.count)}`,
        count: item.count,
        countEmoji: item.visual,
        answer: String(item.count),
        options: createOptions(item.count, 1, 7)
      }));
    }
    if (levelIndex === 3 || levelIndex === 4) {
      return raw.map(({ a, b }) => makeArithmeticQuestion({ a, b }, "sum", "🍊"));
    }
    if (levelIndex === 5 || levelIndex === 6) {
      return raw.map(({ a, b }) => makeArithmeticQuestion({ a, b }, "subtract", "🍌"));
    }
    if (levelIndex === 7 || levelIndex === 8) return raw.map(makeStoryQuestion);
    if (levelIndex === 9) {
      return raw.map((item) => {
        if (item.kind === "number") {
          return { prompt: item.prompt, visual: `<span class="visual-number">${item.visual}</span>`, answer: String(item.answer), options: createOptions(item.answer, 1, 10), numberRange: 10 };
        }
        if (item.kind === "count") {
          return { prompt: item.prompt, visual: item.fruit.repeat(item.a), count: item.a, countEmoji: item.fruit, answer: String(item.a), options: createOptions(item.a, 1, 10) };
        }
        return makeStoryQuestion(item);
      });
    }
    return raw;
  }

  function createOptions(answer, min, max) {
    const choices = new Set([answer]);
    for (let distance = 1; choices.size < 3; distance += 1) {
      const lower = answer - distance;
      const upper = answer + distance;
      if (lower >= min) choices.add(lower);
      if (upper <= max && choices.size < 3) choices.add(upper);
    }
    return [...choices].sort((a, b) => a - b).map(String);
  }

  function makeArithmeticQuestion({ a, b }, operation, fruit) {
    const answer = operation === "sum" ? a + b : a - b;
    const sign = operation === "sum" ? "+" : "−";
    return {
      prompt: operation === "sum" ? "¿Cuánto es?" : "¿Cuántas quedan?",
      audioText: operation === "sum" ? `¿Cuánto es ${a} más ${b}?` : `Si tienes ${a} y quitas ${b}, ¿cuántas quedan?`,
      visual: `<span class="visual-number">${a} ${sign} ${b} = ?</span>`,
      answer: String(answer),
      options: createOptions(answer, 0, 15),
      fruit,
      manipulative: { a, b, operation, fruit }
    };
  }

  function makeStoryQuestion(item) {
    if (item.kind === "sum") {
      const answer = item.a + item.b;
      const text = item.story.startsWith("El mono encontró") || item.story.startsWith("El tucán encontró")
        ? `${item.story} ${item.a} frutas y luego ${item.b} más. ¿Cuántas tiene ahora?`
        : `${item.story} ¿Cuántos hay en total?`;
      return { prompt: text, visual: `<span class="visual-story">${item.fruit} ${item.a} + ${item.b} ${item.fruit}</span>`, answer: String(answer), options: createOptions(answer, 0, 15), manipulative: { a: item.a, b: item.b, operation: "sum", fruit: item.fruit } };
    }
    const answer = item.a - item.b;
    const text = item.story.includes("se comieron")
      ? `${item.story} ¿Cuántas quedan?`
      : `${item.story} ¿Cuántos quedan?`;
    return { prompt: text, visual: `<span class="visual-story">${item.fruit} ${item.a} − ${item.b}</span>`, answer: String(answer), options: createOptions(answer, 0, 15), manipulative: { a: item.a, b: item.b, operation: "subtract", fruit: item.fruit } };
  }

  function renderQuestion() {
    const question = buildQuestions(currentLevel)[currentQuestionIndex];
    const info = levelInfo[currentLevel];
    const activity = currentLevel === 1 ? "counting" : currentLevel < 3 ? "numbers" : currentLevel < 5 ? "addition" : currentLevel < 7 ? "subtraction" : currentLevel < 9 ? "stories" : "challenge";
    const guideByActivity = {
      numbers: { animal: "🐵", message: "¡Busca el número!" },
      counting: { animal: "🦜", message: "¡Cuenta conmigo!" },
      addition: { animal: "🐸", message: "¡Juntemos frutas!" },
      subtraction: { animal: "🐯", message: "¡A contar lo que queda!" },
      stories: { animal: currentQuestionIndex % 2 === 0 ? "🦜" : "🐘", message: "¡Resolvamos la historia!" },
      challenge: { animal: ["🐵", "🦜", "🐸", "🐯", "🐘"][currentQuestionIndex], message: "¡Tú puedes, explorador!" }
    };
    const guide = guideByActivity[activity];
    hadWrongAnswer = false;
    countedItems = new Set();
    mathInteractionCount = 0;
    $("#screen-game").dataset.activity = activity;
    $("#game-level-label").textContent = `Nivel ${currentLevel + 1}`;
    $("#question-count").textContent = `Pregunta ${currentQuestionIndex + 1} de 5`;
    const progressPercent = ((currentQuestionIndex + 1) / 5) * 100;
    $("#question-progress-fill").style.width = `${progressPercent}%`;
    $(".question-progress").setAttribute("aria-valuenow", String(currentQuestionIndex + 1));
    $("#question-trail").querySelectorAll(".trail-step").forEach((step, index) => {
      step.classList.toggle("is-reached", index <= currentQuestionIndex);
    });
    $("#question-topic").textContent = info.topic;
    $("#question-title").textContent = question.prompt;
    $("#question-guide-animal").textContent = guide.animal;
    $("#question-guide-message").textContent = guide.message;
    $("#question-guide-animal").classList.remove("is-celebrating", "is-encouraging");
    $("#question-guide-message").classList.remove("is-celebrating", "is-encouraging");
    replayQuestionEntrance($("#question-title"));
    replayQuestionEntrance($("#question-guide-message"));
    const visual = $("#question-visual");
    const countHelper = $("#count-helper");
    const mathPlayground = $("#math-playground");
    const numberPath = $("#number-path");
    const canTapToCount = Number.isInteger(question.count) && question.count > 0;
    countHelper.classList.toggle("hidden", !canTapToCount);
    mathPlayground.classList.toggle("hidden", !question.manipulative);
    numberPath.classList.toggle("hidden", !question.numberRange);
    if (canTapToCount) {
      $("#count-instruction").textContent = "Toca cada fruta mientras cuentas.";
      $("#count-tally").textContent = `Has contado 0 de ${question.count} ${question.count === 1 ? "fruta" : "frutas"}.`;
      visual.replaceChildren();
      visual.classList.add("counting-visual");
      for (let index = 0; index < question.count; index += 1) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "count-item";
        item.textContent = question.countEmoji;
        item.setAttribute("aria-label", `Contar fruta ${index + 1} de ${question.count}`);
        item.setAttribute("aria-pressed", "false");
        item.addEventListener("click", () => countFruit(index, question.count));
        visual.append(item);
      }
    } else {
      visual.classList.remove("counting-visual");
      visual.innerHTML = question.visual;
    }
    replayQuestionEntrance(visual);
    if (question.manipulative) renderMathPlayground(question.manipulative);
    if (question.numberRange) renderNumberPath(question.numberRange, question.answer);
    $("#level-earned-preview").textContent = `⭐ ${earnedPointsThisLevel}`;
    $("#answer-feedback").textContent = "";
    $("#answer-feedback").classList.remove("is-gentle");
    const options = $("#answer-options");
    options.replaceChildren();
    options.classList.remove("is-ready");
    const needsActivity = canTapToCount || Boolean(question.manipulative) || Boolean(question.numberRange);
    shuffleAnswers(question.options).forEach((answer) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.textContent = answer;
      button.setAttribute("aria-label", `Responder ${answer}`);
      button.disabled = needsActivity;
      button.addEventListener("click", () => checkAnswer(answer, question.answer, button));
      options.append(button);
    });
    if (needsActivity) {
      $("#answer-feedback").textContent = canTapToCount
        ? "Cuenta todas las frutas para elegir tu respuesta."
        : question.manipulative
          ? "Ayuda a los animalitos con las frutas y luego responde."
          : "Encuentra el número en el camino para continuar.";
    }
    const narration = question.audioText || (canTapToCount
      ? `${question.prompt} Toca cada fruta para contar.`
      : question.prompt);
    speak(narration);
  }

  function replayQuestionEntrance(element) {
    element.classList.remove("question-pop");
    void element.offsetWidth;
    element.classList.add("question-pop");
  }

  function renderNumberPath(maximum, answer) {
    const path = $("#number-path-buttons");
    path.replaceChildren();
    $("#number-path-prompt").textContent = "Toca un número para verlo y escucharlo.";
    $("#number-path-feedback").textContent = "¡Vamos a explorar los números!";
    for (let number = 1; number <= maximum; number += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "path-number";
      button.textContent = String(number);
      button.setAttribute("aria-label", `Escuchar el número ${numberNames[number]}`);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        path.querySelectorAll(".path-number").forEach((item) => {
          item.classList.remove("is-selected", "is-target", "is-not-target");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
        const found = String(number) === answer;
        $("#number-path-feedback").textContent = found
          ? `¡Sí! Encontraste el ${numberNames[number]}. Ahora elige tu respuesta.`
          : `Este es el ${numberNames[number]}. Sigue buscando.`;
        button.classList.toggle("is-target", found);
        button.classList.toggle("is-not-target", !found);
        if (!found) {
          button.classList.remove("is-not-target");
          void button.offsetWidth;
          button.classList.add("is-not-target");
        }
        if (found) {
          $("#number-path-prompt").textContent = "¡Camino encontrado! Elige una respuesta.";
          $("#question-guide-message").textContent = "¡Encontraste el número!";
          setAnswerOptionsEnabled(true);
          createSparkleBurst($("#number-path"), ["⭐", "✨", "🌟"], 8);
        }
        speak(numberNames[number]);
        playTone(true);
      });
      path.append(button);
    }
  }

  function renderMathPlayground(manipulative) {
    const { a, b, operation, fruit } = manipulative;
    const groups = $("#math-groups");
    const reset = $("#math-reset");
    groups.replaceChildren();
    reset.classList.add("hidden");

    const makeGroup = (label) => {
      const group = document.createElement("div");
      group.className = "math-group";
      const title = document.createElement("span");
      title.className = "math-group-label";
      title.textContent = label;
      group.append(title);
      return group;
    };

    if (operation === "sum") {
      $("#math-instruction").textContent = "Toca las frutas nuevas para juntarlas con las que ya tienes.";
      const firstGroup = makeGroup(`Ya tienes ${a}`);
      for (let index = 0; index < a; index += 1) {
        const token = document.createElement("span");
        token.className = "math-token is-kept";
        token.textContent = fruit;
        token.setAttribute("aria-hidden", "true");
        firstGroup.append(token);
      }
      const secondGroup = makeGroup(`Agrega ${b}`);
      for (let index = 0; index < b; index += 1) {
        const token = document.createElement("button");
        token.type = "button";
        token.className = "math-token math-token-button";
        token.textContent = fruit;
        token.setAttribute("aria-label", `Agregar fruta ${index + 1} de ${b}`);
        token.setAttribute("aria-pressed", "false");
        token.addEventListener("click", () => useMathToken(token, b, a, "sum"));
        secondGroup.append(token);
      }
      groups.append(firstGroup, secondGroup);
      $("#math-feedback").textContent = `Empieza con ${a}. Toca las ${b} frutas que llegan.`;
    } else {
      $("#math-instruction").textContent = "Toca las frutas que se van para descubrir cuántas quedan.";
      const firstGroup = makeGroup(`Había ${a}`);
      for (let index = 0; index < a; index += 1) {
        const token = document.createElement("button");
        token.type = "button";
        token.className = "math-token math-token-button";
        token.textContent = fruit;
        token.setAttribute("aria-label", `Quitar fruta ${index + 1}, ${b} en total`);
        token.setAttribute("aria-pressed", "false");
        token.addEventListener("click", () => useMathToken(token, b, a, "subtract"));
        firstGroup.append(token);
      }
      groups.append(firstGroup);
      $("#math-feedback").textContent = `Hay ${a}. Toca ${b} frutas para quitarlas.`;
    }

    reset.onclick = () => {
      mathInteractionCount = 0;
      setAnswerOptionsEnabled(false);
      $("#question-guide-message").textContent = "¡Vamos a intentarlo otra vez!";
      renderMathPlayground(manipulative);
    };
  }

  function useMathToken(token, target, total, operation) {
    if (token.classList.contains("is-used")) return;
    token.classList.add("is-used");
    token.setAttribute("aria-pressed", "true");
    mathInteractionCount += 1;
    token.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-12deg)" }, { transform: "scale(.85)" }],
      { duration: 380, easing: "cubic-bezier(.2, 1.7, .4, 1)" }
    );
    const remaining = operation === "sum" ? total + mathInteractionCount : total - mathInteractionCount;
    const action = operation === "sum" ? "Juntaste" : "Quitaste";
    $("#math-feedback").textContent = mathInteractionCount < target
      ? `${action} ${mathInteractionCount}. ${operation === "sum" ? "En total van" : "Todavía quedan"} ${remaining}.`
      : `¡Muy bien! ${operation === "sum" ? `Ahora tienes ${remaining} en total.` : `Quedan ${remaining}.`}`;
    $("#math-reset").classList.toggle("hidden", mathInteractionCount < target);
    if (mathInteractionCount === target) {
      $("#math-groups").querySelectorAll(".math-token-button:not(.is-used)").forEach((item) => { item.disabled = true; });
      $("#math-instruction").textContent = "¡Actividad lista! Ahora elige tu respuesta.";
      $("#question-guide-message").textContent = "¡Muy bien! Ya puedes responder.";
      setAnswerOptionsEnabled(true);
    }
    playTone(true);
  }

  function setAnswerOptionsEnabled(enabled) {
    const options = $("#answer-options");
    options.classList.toggle("is-ready", enabled);
    options.querySelectorAll("button").forEach((button) => { button.disabled = !enabled; });
  }

  function shuffleAnswers(options) {
    const shuffle = (items) => {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
      }
      return items;
    };
    const shuffled = shuffle([...options]);
    let order = shuffled.join("|");
    if (usedAnswerOrders.has(order)) {
      const permutations = [];
      const buildPermutations = (remaining, current = []) => {
        if (remaining.length === 0) {
          permutations.push(current);
          return;
        }
        remaining.forEach((value, index) => {
          buildPermutations([...remaining.slice(0, index), ...remaining.slice(index + 1)], [...current, value]);
        });
      };
      buildPermutations(options);
      const available = permutations.filter((candidate) => !usedAnswerOrders.has(candidate.join("|")));
      const fallback = available[Math.floor(Math.random() * available.length)];
      if (fallback) {
        shuffled.splice(0, shuffled.length, ...fallback);
        order = shuffled.join("|");
      }
    }
    usedAnswerOrders.add(order);
    return shuffled;
  }

  function countFruit(index, total) {
    if (countedItems.has(index)) return;
    countedItems.add(index);
    const item = $("#question-visual").children[index];
    item.classList.add("is-counted");
    item.setAttribute("aria-pressed", "true");
    item.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.3) rotate(-8deg)" }, { transform: "scale(.92)" }],
      { duration: 420, easing: "cubic-bezier(.2, 1.8, .4, 1)" }
    );
    const counted = countedItems.size;
    $("#count-tally").textContent = `Has contado ${counted} de ${total} ${total === 1 ? "fruta" : "frutas"}.`;
    $("#announcements").textContent = String(counted);
    if (counted === total) {
      $("#count-instruction").textContent = "¡Muy bien contado! Ahora elige la respuesta.";
      setAnswerOptionsEnabled(true);
      playTone(true);
    } else {
      playTone(true);
    }
  }

  function checkAnswer(selected, correct, selectedButton) {
    if (answering) return;
    const feedback = $("#answer-feedback");
    if (selected !== correct) {
      hadWrongAnswer = true;
      const encouragement = "No pasa nada, cariño. Inténtalo otra vez, yo te acompaño. ¡Tú puedes!";
      feedback.textContent = encouragement;
      feedback.classList.add("is-gentle");
      $("#question-guide-message").textContent = "¡Inténtalo otra vez, cariño!";
      $("#question-guide-message").classList.remove("is-celebrating");
      $("#question-guide-message").classList.add("is-encouraging");
      $("#question-guide-animal").classList.remove("is-celebrating");
      $("#question-guide-animal").classList.add("is-encouraging");
      selectedButton.classList.remove("is-wrong");
      void selectedButton.offsetWidth;
      selectedButton.classList.add("is-wrong");
      playTone(false);
      speak(encouragement);
      return;
    }
    answering = true;
    firstTryCorrect += hadWrongAnswer ? 0 : 1;
    earnedPointsThisLevel += 10;
    progress.points += 10;
    updateHeader();
    const score = $(".score-pill");
    score.classList.remove("score-pop");
    void score.offsetWidth;
    score.classList.add("score-pop");
    $("#level-earned-preview").textContent = `⭐ ${earnedPointsThisLevel}`;
    feedback.textContent = `${praiseMessages[currentQuestionIndex % praiseMessages.length]} ✨`;
    feedback.classList.remove("is-gentle");
    $("#question-guide-message").textContent = "¡Lo hiciste genial!";
    $("#question-guide-message").classList.remove("is-encouraging");
    $("#question-guide-message").classList.add("is-celebrating");
    $("#question-guide-animal").classList.remove("is-encouraging");
    $("#question-guide-animal").classList.add("is-celebrating");
    selectedButton.classList.add("is-correct");
    createSparkleBurst($(".game-card"), ["⭐", "✨", "🌟", "💚", "🎉"], 12);
    $("#answer-options").querySelectorAll("button").forEach((button) => { button.disabled = true; });
    playTone(true);
    speak(feedback.textContent).then(() => {
      window.setTimeout(() => {
        currentQuestionIndex += 1;
        if (currentQuestionIndex === 5) completeLevel();
        else {
          answering = false;
          renderQuestion();
        }
      }, 250);
    });
  }

  function completeLevel() {
    const stars = firstTryCorrect === 5 ? 3 : firstTryCorrect >= 3 ? 2 : 1;
    const isNewCompletion = !progress.completed.includes(currentLevel);
    if (isNewCompletion) {
      progress.completed.push(currentLevel);
      progress.completed.sort((a, b) => a - b);
    }
    progress.stars += stars;
    const earnedMedal = [2, 5, 9].includes(currentLevel) && isNewCompletion;
    if (earnedMedal) progress.medals += 1;
    saveProgress();
    updateHeader();

    if (currentLevel === 9 && progress.completed.length === 10) {
      showFinalResults();
      return;
    }
    $("#celebration-kicker").textContent = `¡Nivel ${currentLevel + 1} completado!`;
    $("#celebration-title").textContent = praiseMessages[(currentLevel + 1) % praiseMessages.length];
    $("#celebration-message").textContent = "¡La jungla celebra contigo! Cada día sabes un poquito más.";
    $("#earned-stars").textContent = "⭐".repeat(stars);
    $("#earned-points").textContent = `+${earnedPointsThisLevel} puntos`;
    $("#earned-medal").textContent = earnedMedal ? "🏅" : "🌟";
    $("#earned-medal-label").textContent = earnedMedal ? "¡Medalla exploradora!" : "¡Gran explorador!";
    const nextButton = $("#next-level-button");
    nextButton.textContent = currentLevel < 9 ? "Siguiente nivel →" : "¡Ver mi aventura! →";
    nextButton.onclick = () => {
      if (currentLevel < 9) {
        startLevel(currentLevel + 1);
        return;
      }
      showFinalResults();
    };
    showScreen("celebration");
    createSparkleBurst($(".celebration-card"), ["⭐", "✨", "🌟", "🎉", "🌈", "💛"], 32);
    speak(`¡Qué orgullo, explorador querido! Completaste el nivel ${currentLevel + 1}. ${stars} ${stars === 1 ? "estrella" : "estrellas"} para ti.`);
    playCelebration();
  }

  function showFinalResults() {
    $("#final-points").textContent = progress.points;
    $("#final-stars").textContent = progress.stars;
    $("#final-medals").textContent = progress.medals;
    showScreen("final");
    createSparkleBurst($(".final-card"), ["⭐", "✨", "🌟", "🎉", "🌈", "💛"], 36);
    speak("¡Lo lograste, cariño! Estoy muy orgulloso de ti. Completaste toda la aventura de la jungla. ¡Eres increíble!");
  }

  function createSparkleBurst(container, symbols, amount) {
    const burst = document.createElement("div");
    burst.className = "sparkle-burst";
    burst.setAttribute("aria-hidden", "true");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    for (let index = 0; index < amount; index += 1) {
      const particle = document.createElement("span");
      particle.className = "sparkle-particle";
      particle.textContent = symbols[index % symbols.length];
      const angle = ((360 / amount) * index + Math.random() * 12) * Math.PI / 180;
      const distance = 70 + Math.random() * 180;
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      particle.style.setProperty("--spin", `${Math.random() * 100 - 50}deg`);
      particle.style.setProperty("--delay", `${Math.random() * 180}ms`);
      burst.append(particle);
    }

    container.append(burst);
    window.setTimeout(() => burst.remove(), 1500);
  }

  function playTone(isCorrect) {
    if (!progress.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      resumeAudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = isCorrect ? 660 : 240;
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
    } catch (error) {
      console.warn("No se pudo reproducir el sonido.", error);
    }
  }

  function playCelebration() {
    if (!progress.sound) return;
    [523, 659, 784, 1047].forEach((frequency, index) => {
      window.setTimeout(() => playFrequency(frequency), index * 140);
    });
  }

  function playFrequency(frequency) {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      resumeAudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.06, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn("No se pudo reproducir la celebración.", error);
    }
  }

  function startJungleMusic() {
    if (!progress.sound || musicTimer !== null) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      resumeAudioContext();
      const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
      const playNextNote = () => {
        if (!progress.sound || audioContext.state !== "running") return;
        const frequency = melody[musicNoteIndex % melody.length];
        playFrequency(frequency);
        if (musicNoteIndex % 4 === 0) playSoftBeat(musicNoteIndex % 8 === 0 ? 261.63 : 196);
        musicNoteIndex += 1;
      };
      playNextNote();
      musicTimer = window.setInterval(playNextNote, 620);
    } catch (error) {
      console.warn("No se pudo iniciar la música de la jungla.", error);
    }
  }

  function stopJungleMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function resumeAudioContext() {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch((error) => console.warn("No se pudo reanudar el audio.", error));
    }
  }

  function playSoftBeat(frequency) {
    if (!audioContext || !progress.sound) return;
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.018, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.38);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.warn("No se pudo reproducir el acompañamiento.", error);
    }
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      $("#announcements").textContent = "La lectura en voz alta no está disponible en este navegador.";
      return Promise.resolve();
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 0.88;
    utterance.pitch = 1.12;
    return new Promise((resolve) => {
      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        window.clearTimeout(fallbackTimer);
        resolve();
      };
      const fallbackTimer = window.setTimeout(finish, Math.max(2500, text.length * 75));
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }

  document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a");
    if (control && progress.sound) {
      startJungleMusic();
      playUiSound();
    }
    const discovery = event.target.closest("[data-discovery]");
    if (discovery) {
      const description = discovery.dataset.discovery;
      $("#discovery-feedback").textContent = description;
      speak(description);
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "home") showScreen("home");
    if (action === "show-map") {
      renderMap();
      showScreen("map");
    }
    if (action === "replay") {
      if (!window.confirm("¿Quieres empezar una nueva aventura? Se borrará el progreso guardado.")) return;
      progress = defaultProgress();
      saveProgress();
      updateHeader();
      showScreen("home");
    }
  });

  $("#sound-toggle").addEventListener("click", () => {
    progress.sound = !progress.sound;
    saveProgress();
    updateHeader();
    if (progress.sound) {
      startJungleMusic();
      playTone(true);
    } else {
      stopJungleMusic();
    }
  });

  $("#reset-button").addEventListener("click", () => {
    if (!window.confirm("¿Quieres reiniciar toda la partida y borrar tu progreso?")) return;
    progress = defaultProgress();
    saveProgress();
    updateHeader();
    renderMap();
    showScreen("home");
  });

  updateHeader();
  if (!progress.sound) stopJungleMusic();

  document.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty("--view-near-x", `${-x * 18}px`);
    document.documentElement.style.setProperty("--view-near-y", `${-y * 12}px`);
    document.documentElement.style.setProperty("--view-far-x", `${-x * 8}px`);
    document.documentElement.style.setProperty("--view-far-y", `${-y * 6}px`);
    document.documentElement.style.setProperty("--question-view-x", `${-x * 16}px`);
    document.documentElement.style.setProperty("--question-view-y", `${-y * 10}px`);
    document.documentElement.style.setProperty("--question-tilt-x", `${y * -5}deg`);
    document.documentElement.style.setProperty("--question-tilt-z", `${x * 2}deg`);
  }, { passive: true });

  function playUiSound() {
    if (!progress.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.018, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.055);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.06);
    } catch (error) {
      console.warn("No se pudo reproducir el sonido del botón.", error);
    }
  }
})();
