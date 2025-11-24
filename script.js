let isPaused = true;
let loadedText = '';
let currentTimeout;
let isHighlighting = false;
let isDone = false;
let wordMode = true;
let restartParagraph = false;

let elementIndex = 0;
let charIndex = 0;

let elements = [];
let totalChars = 0;
let wordCounts = [];

let speed = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitIntoWords(text) {
  const words = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    words.push({ start: match.index, end: match.index + match[0].length });
  }
  return words;
}

async function processTextToElements(text) {
  const contentDiv = document.querySelector(".reading-content");
  const paragraphs = contentDiv.querySelectorAll('p');
  paragraphs.forEach(p => p.remove());

  elements = [];
  totalChars = 0;
  wordCounts = [];

  text.split("\n").forEach((line) => {
    line = line.trim();
    if (line === "") return;
    let p = document.createElement("p");
    p.textContent = line;
    elements.push(p);
    contentDiv.appendChild(p);
    totalChars += line.length;
    wordCounts.push(splitIntoWords(line).length);

    p.addEventListener('click', () => {
      stopHighlighting();
      resetHighlighting();
      charIndex = 0;
      elementIndex = elements.indexOf(p);
      updateProgress();
      updateTime();
      isPaused = false;
      highlightText();
    });
  });

  return { elements, totalChars };
}

function updateProgress() {
  const pct = elements.length === 0 ? 0 : (elementIndex / elements.length) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
}

function updateTime() {
  const timeElement = document.getElementById('time');
  if (elements.length === 0) {
    timeElement.textContent = '';
    return;
  }
  if (isDone) {
    timeElement.textContent = 'Done';
    return;
  }
  let remaining = -charIndex;
  if (wordMode) {
    for (let i = elementIndex; i < elements.length; i++) {
      remaining += wordCounts[i];
    }
  } else {
    for (let i = elementIndex; i < elements.length; i++) {
      remaining += elements[i].textContent.length;
    }
  }
  const ms = remaining * speed;
  const s = Math.ceil(ms / 1000);
  timeElement.textContent = s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s left` : `${s}s left`;
}

function scrollToHighlight(child) {
  const span = child.querySelector('.highlight');
  if (span) {
    const scrollTo = span.offsetTop - (window.innerHeight / 3) + (span.offsetHeight / 2);
    window.scrollTo({ top: scrollTo, behavior: 'smooth' });
  }
}

async function waitForResume() {
  return new Promise(resolve => {
    const checkPause = () => {
      if (!isPaused) {
        resolve();
      } else {
        currentTimeout = setTimeout(checkPause, 100);
      }
    };
    checkPause();
  });
}

async function highlightText() {
  if (isHighlighting) return;
  isHighlighting = true;

  try {
    while (elementIndex < elements.length) {
      const child = elements[elementIndex];
      const textContent = child.textContent;

      if (wordMode) {
        const words = splitIntoWords(textContent);
        while (charIndex < words.length && !restartParagraph) {
          if (isPaused) await waitForResume();
          const { start, end } = words[charIndex];
          child.innerHTML = `${textContent.slice(0, start)}<span class="highlight">${textContent.slice(start, end)}</span>${textContent.slice(end)}`;
          scrollToHighlight(child);
          await sleep(speed);
          charIndex++;
          updateTime();
        }
      } else {
        while (charIndex < textContent.length && !restartParagraph) {
          if (isPaused) await waitForResume();
          child.innerHTML = `${textContent.slice(0, charIndex)}<span class="highlight">${textContent[charIndex]}</span>${textContent.slice(charIndex + 1)}`;
          scrollToHighlight(child);
          await sleep(speed);
          charIndex++;
          updateTime();
        }
      }

      if (restartParagraph) {
        restartParagraph = false;
        charIndex = 0;
        child.innerHTML = textContent;
        continue;
      }

      child.innerHTML = textContent;
      elementIndex++;
      charIndex = 0;
      updateProgress();
      updateTime();

      if (elementIndex >= elements.length) break;
    }

    // Finished naturally
    isDone = true;
    isPaused = true;
    playPauseButton.textContent = 'Play';
    elementIndex = 0;
    charIndex = 0;
    updateProgress();
  } catch (error) {
    console.error("Error processing content:", error);
  } finally {
    isHighlighting = false;
  }
}

function stopHighlighting() {
  isPaused = true;
  clearTimeout(currentTimeout);
}

function resetHighlighting() {
  elements.forEach(el => el.innerHTML = el.textContent);
  elementIndex = 0;
  charIndex = 0;
  isDone = false;
  isPaused = false;
  playPauseButton.textContent = 'Pause';
  updateProgress();
  updateTime();
}

const playPauseButton = document.getElementById('playPauseButton');
const textInput = document.getElementById('textInput');
const speedInput = document.getElementById('speed');
const setup = document.querySelector('.setup');
const editTextButton = document.getElementById('editTextButton');
const modeToggle = document.getElementById('modeToggle');

function collapseSetup() {
  setup.classList.add('collapsed');
  editTextButton.hidden = false;
}

function expandSetup() {
  setup.classList.remove('collapsed');
  editTextButton.hidden = true;
}

editTextButton.addEventListener('click', () => {
  expandSetup();
  isPaused = true;
  playPauseButton.textContent = 'Play';
});

playPauseButton.addEventListener('click', async () => {
  if (textInput.value !== loadedText) {
    loadedText = textInput.value;
    const result = await processTextToElements(loadedText);
    elements = result.elements;
    totalChars = result.totalChars;
    collapseSetup();
    resetHighlighting();
    highlightText();
  } else {
    isDone = false;
    isPaused = !isPaused;
    playPauseButton.textContent = isPaused ? 'Play' : 'Pause';
    if (!isPaused) {
      highlightText();
    }
  }
});

modeToggle.addEventListener('click', () => {
  wordMode = !wordMode;
  modeToggle.textContent = wordMode ? 'Word' : 'Char';
  charIndex = 0;
  updateTime();
  if (isHighlighting) restartParagraph = true;
});

document.addEventListener('keydown', (event) => {
  if (document.activeElement === textInput) return;

  if (event.code === 'Space') {
    event.preventDefault();
    isDone = false;
    isPaused = !isPaused;
    playPauseButton.textContent = isPaused ? 'Play' : 'Pause';
    if (!isPaused) highlightText();
  } else if (event.code === 'ArrowRight' || event.code === 'KeyN') {
    if (elementIndex < elements.length - 1) {
      elements[elementIndex].innerHTML = elements[elementIndex].textContent;
      elementIndex++;
      charIndex = 0;
      isDone = false;
      updateProgress();
      updateTime();
      isPaused = false;
      playPauseButton.textContent = 'Pause';
      highlightText();
    }
  } else if (event.code === 'ArrowLeft' || event.code === 'KeyP') {
    if (elementIndex > 0) {
      elements[elementIndex].innerHTML = elements[elementIndex].textContent;
      elementIndex--;
      charIndex = 0;
      isDone = false;
      updateProgress();
      updateTime();
      isPaused = false;
      playPauseButton.textContent = 'Pause';
      highlightText();
    }
  } else if (event.code === 'ArrowUp') {
    event.preventDefault();
    speed = Math.max(1, speed - 1);
    speedInput.value = speed;
    updateTime();
  } else if (event.code === 'ArrowDown') {
    event.preventDefault();
    speed = Math.min(100, speed + 1);
    speedInput.value = speed;
    updateTime();
  } else if (event.code === 'KeyR') {
    resetHighlighting();
    highlightText();
  } else {
    console.log('Other key pressed:', event.code);
  }
});

const darkModeToggle = document.getElementById('darkModeToggle');

if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
  darkModeToggle.textContent = 'Light';
}

darkModeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  darkModeToggle.textContent = isDark ? 'Light' : 'Dark';
  localStorage.setItem('darkMode', isDark);
});

speedInput.addEventListener('change', () => {
  speed = parseInt(speedInput.value, 10);
  if (isNaN(speed) || speed < 1) {
    speed = 1;
    speedInput.value = 1;
  }
  updateTime();
});
