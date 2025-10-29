// 🎤 ChatGPT TV Assistant (Free Plan Safe Mode)
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = true;

let queue = [];
let isProcessing = false;

// 🎧 듣기 시작
recognition.onstart = () => {
  statusDiv.innerText = "🎧 듣는 중...";
};

// 🎙️ 말이 끝났을 때만 문장 큐에 추가
recognition.onresult = (event) => {
  const result = event.results[event.resultIndex];
  if (!result.isFinal) return;

  const text = result[0].transcript.trim();
  if (!text) return;

  queue.push(text);
  processQueue();
};

// 💬 GPT 요청 처리 (큐 + 재시도)
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const text = queue.shift();
  chatDiv.innerHTML += `<p><b>🗣️ 나:</b> ${text}</p>`;
  statusDiv.innerText = "💬 GPT에게 묻는 중...";

  let retryCount = 0;
  while (retryCount < 3) {
    try {
      const reply = await askGPT(text);
      chatDiv.innerHTML += `<p><b>🤖 GPT:</b> ${reply}</p>`;
      speak(reply);
      statusDiv.innerText = "🎧 계속 듣는 중...";
      break;
    } catch (err) {
      if (err.message.includes("429")) {
        retryCount++;
        const waitTime = retryCount * 10 * 1000; // 재시도마다 10초, 20초, 30초 대기
        chatDiv.innerHTML += `<p><b>⏳ 대기:</b> 요청이 많아 ${waitTime / 1000}초 후 재시도...</p>`;
        await new Promise((r) => setTimeout(r, waitTime));
      } else {
        chatDiv.innerHTML += `<p><b>⚠️ 오류:</b> ${err.message}</p>`;
        break;
      }
    }
  }

  isProcessing = false;
  // 다음 요청은 15초 후 실행
  setTimeout(processQueue, 15000);
}

// 🧠 GPT 호출
async function askGPT(prompt) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error
