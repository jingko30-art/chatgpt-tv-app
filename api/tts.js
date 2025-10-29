// api/tts.js  (Vercel Edge Runtime 권장)
export const config = { runtime: "edge" };

export default async function handler(request) {
  try {
    const { text, voice } = await request.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    // 허용 보이스 화이트리스트 (안전하게)
    const allowedVoices = new Set(["verse","alloy"]);
    const chosen = allowedVoices.has(String(voice)) ? String(voice) : "verse";

    const tts = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: chosen,           // ← 선택 반영 (여성 추천: verse)
        input: text,
        format: "mp3",
      }),
    });

    if (!tts.ok) {
      const err = await tts.text();
      return new Response(JSON.stringify({ error: "TTS failed", detail: err }), { status: 500 });
    }

    const audioArray = await tts.arrayBuffer();
    return new Response(audioArray, { headers: { "Content-Type": "audio/mpeg" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", detail: String(e) }), { status: 500 });
  }
}
