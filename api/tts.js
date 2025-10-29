// api/tts.js
export const config = { runtime: "edge" };

export default async function handler(request) {
  const { text } = await request.json();
  if (!text) return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });

  const tts = await fetch("https://api.openai.com/v1/audio/speech", {
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

  if (!tts.ok) {
    const err = await tts.text();
    return new Response(JSON.stringify({ error: "TTS failed", detail: err }), { status: 500 });
  }

  const audioArray = await tts.arrayBuffer();
  return new Response(audioArray, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
