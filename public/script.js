// 🎤 ChatGPT TV Assistant Script
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = false;

let lastRequestTime = 0;
let lastTranscript = "";
let isProcessing = false;

// 🎧 음성 인식 시작
recognition.onstart = () => {
  statusDiv.innerText = "🎧 듣는 중...";
};

// 🎙️ 음성 결과 처리
recognition.onresult = async (event) => {
  const text = event.results[event.resultIndex][0].transcript.trim();
  if (!text || text === lastTranscript) return;
  lastTranscript = text;

  // 사용자가 말을 멈춘 뒤 1.5초 동안 추가 입력이 없을 때 GPT 호출
  clearTimeout(window._speechTimeout);
  window._speechTimeout = setTimeout(async () => {
    const now = Date.now();
    if (now - lastRequestTime < 6000) return; // 6초 쿨다운
    lastRequestTime = now;

    chatDiv.innerHTML += `<p><b>🗣️ 나:</b> ${text}</p>`;
    statusDiv.innerText = "💬 GPT에게 묻는 중...";
    isProcessing = true;

    try {
      const reply = await askGPT(text);
      chatDiv.innerHTML += `<p><b>🤖 GPT:</b> ${reply}</p>`;
      speak(reply);
      statusDiv.innerText = "🎧 계속 듣는 중...";
    } catch (err) {
      chatDiv.innerHTML += `<p><b>⚠️ 오류:</b> ${err.message}</p>`;
      statusDiv.innerText = "⚠️ 오류 발생... 다시 시도 중";
    } finally {
      isProcessing = false;
    }
  }, 1500);
};

// 🔁 인식 중단 시 자동 재시작
recognition.onend = () => {
  setTimeout(() => recognition.start(), 1000);
};

// ⚠️ 오류 시 자동 복구
recognition.onerror = (e) => {
  console.warn("음성 인식 오류:", e.error);
  statusDiv.innerText = "⚠️ 오류 발생. 복구 중...";
  setTimeout(() => recognition.start(), 2000);
};

// 💬 GPT 요청 (Vercel 프록시 API 사용)
async function askGPT(prompt) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error(`GPT 요청 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "응답을 받지 못했어.";
}

// 🔊 음성 출력
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ko-KR";
  utter.rate = 1.0;
  speechSynthesis.speak(utter);
}

// 🚀 페이지 로드 시 자동 시작
recognition.start();
statusDiv.innerText = "🎧 대기 중...";
