const statusDiv = document.getElementById('status');
const chatDiv = document.getElementById('chat');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ko-KR';
recognition.continuous = true;
recognition.interimResults = false;

let lastRequestTime = 0;
let isProcessing = false;
let lastTranscript = "";

// 🎙️ 음성 인식 시작
recognition.onstart = () => {
  statusDiv.innerText = '🎧 듣는 중...';
};

// 🎧 음성 결과 감지
recognition.onresult = async (event) => {
  if (isProcessing) return;

  const text = event.results[event.resultIndex][0].transcript.trim();
  if (!text || text === lastTranscript) return;
  lastTranscript = text;

  const now = Date.now();
  if (now - lastRequestTime < 5000) return; // 5초 쿨다운
  lastRequestTime = now;

  chatDiv.innerHTML += `<p><b>🗣️ 나:</b> ${text}</p>`;
  statusDiv.innerText = '💬 GPT에게 묻는 중...';
  isProcessing = true;

  try {
    const reply = await askGPT(text);
    chatDiv.innerHTML += `<p><b>🤖 GPT:</b> ${reply}</p>`;
    speak(reply);
    statusDiv.innerText = '🎧 계속 듣는 중...';
  } catch (err) {
    chatDiv.innerHTML += `<p><b>⚠️ 오류:</b> ${err.message}</p>`;
    statusDiv.innerText = '⚠️ 오류 발생... 다시 시도 중';
  } finally {
    isProcessing = false;
  }
};

// 🔁 인식 중단 시 자동 재시작
recognition.onend = () => {
  setTimeout(() => recognition.start(), 1000);
};

// ⚠️ 오류 시 복구
recognition.onerror = (e) => {
  console.warn('음성 인식 오류:', e.error);
  statusDiv.innerText = '⚠️ 오류 발생. 복구 중...';
  setTimeout(() => recognition.start(), 2000);
};

// 💬 GPT 요청 함수 (Vercel 프록시로 요청)
async function askGPT(prompt) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) throw new Error(`GPT 요청 실패 (${res.status})`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "응답을 받지 못했어.";
}

// 🔊 음성 출력
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = 1.0;
  speechSynthesis.speak(utter);
}

// 🚀 시작 시 자동 듣기
recognition.start();
