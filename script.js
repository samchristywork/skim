let isPaused = true;
let currentTimeout;
let isHighlighting = false;

let elementIndex = 0;
let charIndex = 0;

let elements = [];
let totalChars = 0;

let speed = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processTextToElements(text) {
  const contentDiv = document.querySelector(".content");
  const paragraphs = contentDiv.querySelectorAll('p');
  paragraphs.forEach(p => p.remove());

  elements = [];
  totalChars = 0;

  text.split("\n").forEach((line) => {
    line = line.trim();
    if (line === "") return;
    let p = document.createElement("p");
    p.textContent = line;
    elements.push(p);
    contentDiv.appendChild(p);
    totalChars += line.length;

    p.addEventListener('click', () => {
      stopHighlighting();
      resetHighlighting();
      charIndex = 0;
      elementIndex = elements.indexOf(p);
      isPaused = false;
      highlightText();
    });
  });

  return {
    elements,
    totalChars
  };
}

function setTotalTime(totalChars, timePerChar) {
  let timeElement = document.getElementById('time');
  const ms = totalChars * timePerChar;
  const s = Math.ceil(ms / 1000);
  const t = s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  timeElement.textContent = t;
}

async function highlightCharacter(child, textContent, i, timePerChar) {
  if (isPaused) {
    await waitForResume();
  }

  let before = textContent.slice(0, i);
  let char = textContent[i];
  let after = textContent.slice(i + 1);
  let highlightedHTML = `${before}<span class="highlight">${char}</span>${after}`;
  child.innerHTML = highlightedHTML;

  scrollToHighlightedCharacter(child);

  await sleep(timePerChar);
}

function scrollToHighlightedCharacter(child) {
  const highlightedSpan = child.querySelector('.highlight');
  if (highlightedSpan) {
    const elementTop = highlightedSpan.offsetTop;
    const elementHeight = highlightedSpan.offsetHeight;
    const screenHeight = window.innerHeight;
    const scrollTo = elementTop - (screenHeight / 3) + (elementHeight / 2);

    window.scrollTo({
      top: scrollTo,
      behavior: 'smooth'
    });
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
  if (isHighlighting) {
    return;
  }
  isHighlighting = true;

  setTotalTime(totalChars, speed);

  try {
    while (elementIndex < elements.length) {
      const child = elements[elementIndex];
      const textContent = child.textContent;

      await highlightCharacter(child, textContent, charIndex, speed);
      charIndex++;

      if (charIndex >= textContent.length) {
        child.innerHTML = textContent;
        elementIndex++;
        charIndex = 0;

        if (elementIndex >= elements.length) {
          break;
        }
      }
    }
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
  isPaused = false;
  playPauseButton.textContent = 'Pause';
}

const playPauseButton = document.getElementById('playPauseButton');
const loadButton = document.getElementById('loadButton');
const textInput = document.getElementById('textInput');
const speedInput = document.getElementById('speed');

playPauseButton.addEventListener('click', () => {
  isPaused = !isPaused;
  playPauseButton.textContent = isPaused ? 'Play' : 'Pause';
  if (!isPaused) {
    highlightText();
  }
});

document.addEventListener('keydown', (event) => {
  if (document.activeElement === textInput) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    isPaused = !isPaused;
    playPauseButton.textContent = isPaused ? 'Play' : 'Pause';
    if (!isPaused) {
      highlightText();
    }
  } else if (event.code === 'ArrowRight' || event.code === 'KeyN') {
    if (elementIndex < elements.length - 1) {
      elements[elementIndex].innerHTML = elements[elementIndex].textContent;
      elementIndex++;
      charIndex = 0;
      isPaused = false;
      playPauseButton.textContent = 'Pause';
      highlightText();
    }
  } else if (event.code === 'ArrowLeft' || event.code === 'KeyP') {
    if (elementIndex > 0) {
      elements[elementIndex].innerHTML = elements[elementIndex].textContent;
      elementIndex--;
      charIndex = 0;
      isPaused = false;
      playPauseButton.textContent = 'Pause';
      highlightText();
    }
  } else if (event.code === 'ArrowUp') {
    event.preventDefault();
    speed = Math.max(1, speed - 1);
    speedInput.value = speed;
    setTotalTime(totalChars, speed);
  } else if (event.code === 'ArrowDown') {
    event.preventDefault();
    speed = Math.min(100, speed + 1);
    speedInput.value = speed;
    setTotalTime(totalChars, speed);
  } else if (event.code === 'KeyR') {
    resetHighlighting();
    highlightText();
  } else {
    console.log('Other key pressed:', event.code);
  }
});

loadButton.addEventListener('click', async () => {
  const text = textInput.value;
  const result = await processTextToElements(text);
  elements = result.elements;
  totalChars = result.totalChars;
  resetHighlighting();
  highlightText();
});

speedInput.addEventListener('change', () => {
  speed = parseInt(speedInput.value, 10);
  if (isNaN(speed) || speed < 1) {
    speed = 1;
    speedInput.value = 1;
  }
  setTotalTime(totalChars, speed);
});
