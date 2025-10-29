// 🎤 ChatGPT TV Assistant (Free Plan Safe Mode + Start Button)
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");
const startBtn = document.createElement("button");
startBtn.textContent = "🎙️ 말하기 시작";
startBtn.style.padding = "10px 20px";
startBtn.style.fontSize = "16px";
startBtn.style.borderRadius = "8px";
startBtn.style.marginTop = "10px";
document.body.insertBefore(startBtn, statusDiv.nextSibling);

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = true;

let queue = [];
let isProcessing = false;
let isListening = false;

// 🎧 듣기 시작 버튼 클릭
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
        const waitTime = retryCount * 10 * 1000; // 10초→20초→30초
        chatDiv.innerHTML += `<p><b>⏳ 대기:</b> 요청이 많아 ${waitTime / 1000}초 후 재시도...</p>`;
        await new Promise((r) => setTimeout(r, waitTime));
      } else {
        chatDiv.innerHTML += `<p><b>⚠️ 오류:</b> ${err.message}</p>`;
        break;
      }
    }
  }

  isProcessing = false;
  setTimeout(processQueue, 15000); // 다음 요청 15초 후
}

// 💬 GPT 호출
async function askGPT(prompt) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("429: Too Many Requests");
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

// 오류 복구
recognition.onerror = (e) => {
  console.warn("음성 인식 오류:", e.error);
  statusDiv.innerText = "⚠️ 오류 발생. 복구 중...";
  setTimeout(() => {
    if (isListening) recognition.start();
  }, 2000);
};
