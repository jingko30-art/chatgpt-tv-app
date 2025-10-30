// 🎤 ChatGPT TV Assistant (최신 안정 버전)
// - 키보드로 말하기(항상 듣기 + PTT모드)
// - 글자 크기 조절(저장)
// - 모바일 반응형 UI (CSS 처리)
// - 대화 기억(localStorage)
// - 여성 음성(alloy)
// - 병렬 TTS
// - 채팅창 고정 + 스크롤

// DOM 요소
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");
const startBtn = document.getElementById("startBtn");
const voiceSel = document.getElementById("voiceSelect");
const overlay = document.getElementById("overlay");
const fontUpBtn = document.getElementById("fontUp");
const fontDnBtn = document.getElementById("fontDown");

// 🎚️ 설정 저장/복원 (목소리 + 글자 크기)
const savedVoice = localStorage.getItem("ttsVoice") || "alloy";
voiceSel.value = savedVoice;
voiceSel.addEventListener("change", () => {
  localStorage.setItem("ttsVoice", voiceSel.value);
});

let scale = parseFloat(localStorage.getItem("fontScale") || "1");
applyScale();
fontUpBtn.addEventListener("click", () => setScale(scale + 0.1));
fontDnBtn.addEventListener("click", () => setScale(scale - 0.1));

function setScale(v) {
  scale = Math.min(1.8, Math.max(0.8, Number(v.toFixed(2))));
  localStorage.setItem("fontScale", String(scale));
  applyScale();
}
function applyScale() {
  document.documentElement.style.setProperty("--scale", scale);
}

// 🧠 대화 히스토리 (최근 6턴)
const MAX_TURNS = 6;
let history = [];
try {
  history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}
function saveHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(history));
}

// 🎙️ 음성 인식 설정
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = true;

let isListening = false;
let pushToTalkMode = false;
let holdingPTT = false;
let queue = [];
let isProcessing = false;

// 🎧 시작 버튼 클릭 시 듣기 시작
startBtn.addEventListener("click", () => startListening());

// ⌨️ 키보드 제어
document.addEventListener("keydown", (e) => {
  if (e.key === "]") setScale(scale + 0.05);
  if (e.key === "[") setScale(scale - 0.05);

  // P: PTT 모드 토글
  if (e.key.toLowerCase() === "p") {
    pushToTalkMode = !pushToTalkMode;
    toast(pushToTalkMode ? "PTT 모드 ON (V를 누르고 말해)" : "PTT 모드 OFF (항상 듣기)");
  }

  // V: 말하기 시작
  if (e.key.toLowerCase() === "v") {
    if (!isListening) startListening();
    holdingPTT = true;
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "v") holdingPTT = false;
});

// 🎤 음성 인식 이벤트
recognition.onstart = () => {
  isListening = true;
  statusDiv.innerText = "🎧 듣는 중...";
  startBtn.textContent = "🛑 듣기 중지";
  overlay.style.display = "none";
};
recognition.onend = () => {
  isListening = false;
  statusDiv.innerText = "⏸️ 멈춤";
  startBtn.textContent = "🎙️ 말하기 시작";
  setTimeout(() => {
    if (!pushToTalkMode) {
      try {
        recognition.start();
      } catch {}
    }
  }, 500);
};
recognition.onerror = (e) => {
  console.warn("음성 인식 오류:", e.error);
  statusDiv.innerText = "⚠️ 오류 발생. 복구 중...";
  setTimeout(() => {
    if (isListening || !pushToTalkMode) {
      try {
        recognition.start();
      } catch {}
    }
  }, 1500);
};

// 🎙️ 말이 끝났을 때만 큐에 추가
recognition.onresult = (event) => {
  const result = event.results[event.resultIndex];
  if (!result.isFinal) return;
  if (pushToTalkMode && !holdingPTT) return;

  const text = result[0].transcript.trim();
  if (!text) return;

  queue.push(text);
  processQueue();
};

// 🎧 듣기 시작
function startListening() {
  try {
    recognition.start();
    overlay.style.display = "none";
  } catch (e) {}
}
startBtn.addEventListener("click", () => {
  if (isListening) recognition.stop();
  else startListening();
});

// 💬 대화 처리 (GPT 요청 + 병렬 TTS + 자동 스크롤)
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const userText = queue.shift();
  chatDiv.innerHTML += `<p><b>🗣️ 나:</b> ${escapeHTML(userText)}</p>`;
  chatDiv.scrollTop = chatDiv.scrollHeight;
  statusDiv.innerText = "💬 GPT에게 묻는 중...";

  history.push({ role: "user", content: userText });
  history = history.slice(-MAX_TURNS);
  saveHistory();

  let retry = 0;
  let replyText = "";

  while (retry < 3) {
    try {
      replyText = await askGPTWithHistory(history);
      break;
    } catch (err) {
      if (String(err.message).includes("429")) {
        retry++;
        const wait = retry * 10000;
        chatDiv.innerHTML += `<p><b>⏳ 대기:</b> 요청이 많아 ${wait / 1000}초 후 재시도...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
        await waitMs(wait);
      } else {
        chatDiv.innerHTML += `<p><b>⚠️ 오류:</b> ${escapeHTML(err.message)}</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
        break;
      }
    }
  }

  if (replyText) {
    chatDiv.innerHTML += `<p><b>🤖 GPT:</b> ${escapeHTML(replyText)}</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;
    statusDiv.innerText = "🎧 계속 듣는 중...";

    const chosen = localStorage.getItem("ttsVoice") || "alloy";
    (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: replyText, voice: chosen }),
        });
        if (!res.ok) throw new Error("TTS 요청 실패");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.oncanplaythrough = () =>
          audio.play().catch((err) => console.warn("재생 실패:", err));
      } catch (err) {
        console.error("🔇 TTS 오류:", err);
      }
    })();

    history.push({ role: "assistant", content: replyText });
    history = history.slice(-MAX_TURNS);
    saveHistory();
  }

  isProcessing = false;
  setTimeout(processQueue, 15000);
}

// 🔗 GPT API 호출
async function askGPTWithHistory(msgs) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: msgs }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("429: Too Many Requests");
    throw new Error(`GPT 요청 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// 🛠️ 유틸리티 함수
function waitMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function toast(msg) {
  statusDiv.innerText = `💡 ${msg}`;
  setTimeout(
    () => (statusDiv.innerText = isListening ? "🎧 듣는 중..." : "⏸️ 멈춤"),
    1800
  );
}
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
