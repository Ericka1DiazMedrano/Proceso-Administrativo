const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const axios = require('axios');
const app = express();

app.use(express.json());

// Leeremos la clave de forma segura desde Render
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/webhook', async (request, response) => {
  const agent = new WebhookClient({ request, response });

  async function fallback(agent) {
    const preguntaUsuario = agent.query;
    console.log('Pregunta recibida:', preguntaUsuario);

    try {
      const respuestaGroq = await axios({
        method: 'post',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          // CAMBIO AQUÍ: Usamos la versión 3.1 más reciente y activa de Groq
          model: 'llama-3.1-8b-instant', 
          messages: [
            { role: 'system', content: 'Eres un experto asistente de la Wiki del Proceso Administrativo. Responde de forma clara, formal y breve.' },
            { role: 'user', content: preguntaUsuario }
          ],
          stream: false
        }
      });

      const textoGenerado = respuestaGroq.data.choices[0].message.content;
      agent.add(textoGenerado);

    } catch (error) {
      console.error('ERROR EN GROQ:', error.response ? JSON.stringify(error.response.data) : error.message);
      agent.add('Error técnico con la IA. Revisa los logs de Render.');
    }
  }

  let intentMap = new Map();
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Default Welcome Intent', fallback);
  agent.handleRequest(intentMap);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en línea en el puerto ${PORT}`));