// api/tts.js
export default async function handler(req, res) {
  try {
    const { text } = await req.json();
    if (!text) return res.status(400).json({ error: "No text provided" });

    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy", // 자연스럽고 부드러운 기본 목소리
        input: text,
        format: "mp3",
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return res.status(500).json({ error: "TTS failed", detail: err });
    }

    const audioBuffer = await openaiRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
