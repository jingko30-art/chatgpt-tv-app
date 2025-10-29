// 🎤 ChatGPT TV Assistant Script (Free API Safe Version)
const statusDiv = document.getElementById("status");
const chatDiv = document.getElementById("chat");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "ko-KR";
recognition.continuous = true;
recognition.interimResults = true;

let queue = [];
let isProcessing = false;

// 🎧 음성 인식 시작
recognition.onstart = () => {
  statusDiv.innerText = "🎧 듣는 중...";
};

// 🎙️ 인식 결과 (최종 문장만 큐에 추가)
recognition.onresult = (event) => {
  const result = event.results[event.resultIndex];
  if (!result.isFinal) return;

  const text = result[0].transcript.trim();
  if (!text) return;

  queue.push(text);
  processQueue();
};

// ⚙️ GPT 요청 큐 순차 처리
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const text = queue.shift();
  chatDiv.innerHTML += `<p><b>🗣️ 나:</b> ${text}</p>`;
  statusDiv.innerText = "💬 GPT에게 묻는 중...";

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
    // 10초 간격으로 다음 요청 (무료 계정 안정화)
    setTimeout(processQueue, 10000);
  }
}

// 💬 GPT 호출
async function askGPT(prompt) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("요청이 너무 많아. 잠시 후 다시 시도해줘.");
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

// 🔁 인식 종료 시 자동 재시작
recognition.onend = () => {
  setTimeout(() => recognition.start(), 1000);
};

// ⚠️ 오류 시 자동 복구
recognition.onerror = (e) => {
  console.warn("음성 인식 오류:", e.error);
  statusDiv.innerText = "⚠️ 오류 발생. 복구 중...";
  setTimeout(() => recognition.start(), 2000);
};

// 🚀 페이지 로드 시 시작
recognition.start();
statusDiv.innerText = "🎧 대기 중...";
