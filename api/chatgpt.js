// api/chatgpt.js
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 클라이언트에서 messages 또는 prompt로 올 수 있게 유연 처리
    const { messages, prompt } = req.body || {};
    const persona = {
      role: "system",
      content:
        "너는 친근하고 유쾌한 한국어 비서야. 존댓말 대신 편하게 반말로 대답해줘. " +
        "답변은 간결하게, 필요하면 예시를 들어줘."
    };

    let finalMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      // 클라이언트 히스토리를 그대로 사용
      finalMessages = [persona, ...messages];
    } else if (typeof prompt === "string" && prompt.trim()) {
      // 구버전 호환: prompt 단건
      finalMessages = [persona, { role: "user", content: prompt.trim() }];
    } else {
      return res.status(400).json({ error: 'Missing prompt/messages' });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",           // 빠르고 저렴
        messages: finalMessages,
        temperature: 0.8
      })
    });

    const data = await upstream.json();
    return res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
