const express = require('express');

const SYSTEM_PROMPT = `Eres un asistente de ventas y CRM llamado "Asistente CUANTY".
Respondes en español, de forma concisa y profesional.
Ayudas a vendedores con consejos de ventas, técnicas de cierre, manejo de objeciones,
seguimiento de clientes, y mejores prácticas de CRM.
Si te preguntan algo fuera de ventas/CRM, responde brevemente pero redirige la conversación hacia ventas.
No uses markdown ni formato especial, responde en texto plano.`;

function createChatRouter(prisma) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
      }

      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      // Limit to last 10 messages
      const recentMessages = messages.slice(-10);

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...recentMessages,
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        return res.status(502).json({ error: 'Error al contactar el servicio de IA' });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

      res.json({ reply });
    } catch (err) {
      console.error('Chat route error:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
}

module.exports = { createChatRouter };
