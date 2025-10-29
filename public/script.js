// 🎤 ChatGPT TV Assistant (Memory + Female Voice Select + Free-safe Queue)
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");

// ▶︎ UI: 시작 버튼
const startBtn = document.createElement("button");
startBtn.textContent = "🎙️ 말하기 시작";
startBtn.style.padding = "10px 20px";
startBtn.style.fontSize = "16px";
startBtn.style.borderRadius = "8px";
startBtn.style.marginTop = "10px";
document.body.insertBefore(startBtn, statusDiv.nextSibling);

// ▶︎ UI: 여성 목소리 선택 (OpenAI TTS의 안정적인 보이스만 노출)
const voiceWrap = document.createElement("div");
voiceWrap.style.marginTop = "8px";
const voiceLabel = document.createElement("label");
voiceLabel.textContent = "목소리: ";
const voiceSelect = document.createElement("select");
["verse","alloy"].forEach(v => {
  const opt = document.createElement("option");
  opt.value = v;
  opt.textContent = v === "verse" ? "verse (여성 추천)" : "alloy (중성)";
  voiceSelect.appendChild(opt);
});
voiceWrap.appendChild(voiceLabel);
voiceWrap.appendChild(voiceSelect);
document.body.insertBefore(voiceWrap, startBtn.nextSibling);

// 저장된 보이스/히스토리 복원
const SAVED_VOICE = localStorage.getItem("ttsVoice") || "verse";
voiceSelect.value = SAVED_VOICE;
voiceSelect.addEventListener("change", () => {
  localStorage.setItem("ttsVoice", voiceSelect.value);
});

// 대화 히스토리 (최근 6턴 유지)
const MAX_TURNS = 6;
let history = [];
try {
  history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
  if (!Array.isArray(history)) history = [];
} catch { history = []; }

// Web Speech (인식)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = true;

let queue = [];
let isProcessing = false;
let isListening = false;

// 🎧 듣기 시작/중지
startBtn.addEventListener("click", () => {
  if (isListening) {
    recognition.stop();
    startBtn.textContent = "🎙️ 말하기 시작";
    statusDiv.innerText = "⏸️ 멈춤";
    isListening = false;
  } else {
    recognition.start();
    startBtn.textContent = "🛑 듣기 중지";
    statusDiv.innerText = "🎧 듣는 중...";
    isListening = true;
  }
});

// 🎙️ 말이 끝났을 때만 문장 큐에 추가
recognition.onresult = (event) => {
  const result = event.results[event.resultIndex];
  if (!result.isFinal) return;
  const text = result[0].transcript.trim();
  if (!text) return;

  queue.push(text);
  processQueue();
};

// 💬 GPT 요청 처리 (큐 + 무료키도 안전하게 동작)
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const userText = queue.shift();
  chatDiv.innerHTML += `<p><b>🗣️ 나:</b> ${userText}</p>`;
  statusDiv.innerText = "💬 GPT에게 묻는 중...";

  // 히스토리에 user 추가
  history.push({ role: "user", content: userText });
  // 최근 6턴만 유지
  history = history.slice(-MAX_TURNS);
  saveHistory();

  // 서버에 messages로 전달 (system은 서버에서 주입)
  let retry = 0;
  let replyText = "";
  while (retry < 3) {
    try {
      replyText = await askGPTWithHistory(history);
      break;
    } catch (err) {
      if (String(err.message).includes("429")) {
        retry++;
        const wait = retry * 10000; // 10초→20초→30초
        chatDiv.innerHTML += `<p><b>⏳ 대기:</b> 요청이 많아 ${wait/1000}초 후 재시도...</p>`;
        await new Promise(r => setTimeout(r, wait));
      } else {
        chatDiv.innerHTML += `<p><b>⚠️ 오류:</b> ${err.message}</p>`;
        break;
      }
    }
  }

  if (replyText) {
    chatDiv.innerHTML += `<p><b>🤖 GPT:</b> ${replyText}</p>`;
    // 히스토리에 assistant 추가
    history.push({ role: "assistant", content: replyText });
    history = history.slice(-MAX_TURNS);
    saveHistory();
    // 선택된 여성 목소리로 말하기
    const chosen = localStorage.getItem("ttsVoice") || "verse";
    speak(replyText, chosen);
    statusDiv.innerText = "🎧 계속 듣는 중...";
  }

  isProcessing = false;
  setTimeout(processQueue, 15000); // 다음 요청 15초 후(무료키 안전)
}

function saveHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(history));
}

// 💬 히스토리 포함 GPT 호출
async function askGPTWithHistory(msgs) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: msgs })
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("429: Too Many Requests");
    throw new Error(`GPT 요청 실패 (${res.status})`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// 🔊 TTS (여성 추천: verse)
async function speak(text, voice = "verse") {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice })
    });
    if (!res.ok) throw new Error("TTS 요청 실패");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play(); // 버튼 클릭 컨텍스트 이후라 재생 허용
  } catch (err) {
    console.error("🔇 TTS 오류:", err);
  }
}

// 오류 복구
recognition.onerror = (e) => {
  console.warn("음성 인식 오류:", e.error);
  statusDiv.innerText = "⚠️ 오류 발생. 복구 중...";
  setTimeout(() => { if (isListening) recognition.start(); }, 2000);
};
