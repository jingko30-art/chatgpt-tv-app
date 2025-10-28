// api/ping.js
module.exports = async (req, res) => {
  return res.status(200).json({
    ok: true,
    method: req.method,
    time: new Date().toISOString(),
    hasKey: !!process.env.OPENAI_API_KEY
  });
};
