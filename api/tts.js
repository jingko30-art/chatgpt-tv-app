// api/tts.js
export default async function handler(request, response) {
  try {
    const { text } = await request.json();   // ✅ request.json()  ← req.json()이 아님
    if (!text) return response.status(400).json({ error: "No text provided" });

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: text,
        format: "mp3",
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      return response.status(500).json({ error: "TTS failed", detail: err });
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    response.setHeader("Content-Type", "audio/mpeg");
    response.send(Buffer.from(audioBuffer));
  } catch (e) {
    console.error(e);
    response.status(500).json({ error: "Server error" });
  }
}
