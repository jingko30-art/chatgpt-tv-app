// api/chatgpt.js
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
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
