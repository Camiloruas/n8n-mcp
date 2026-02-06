
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function updateEngine() {
    const id = "2KtkOaUAIx_IntJD-wHya";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const codeNode = wf.nodes.find(n => n.name === 'Code in JavaScript');
        if (codeNode) {
            codeNode.parameters.jsCode = `
const config = items[0].json;

function toMinutes(t){
  const [h,m] = t.split(':').map(Number);
  return h*60+m;
}

function toTime(m){
  const h = Math.floor(m/60);
  const mm = m%60;
  return \`\${h.toString().padStart(2,'0')}:\${mm.toString().padStart(2,'0')}\`;
}

const intervalo = config.intervalo_minutos;
const inicio = toMinutes(config.horario_inicio);
const fim = toMinutes(config.horario_fim);
const pausaIni = toMinutes(config.pausa_inicio);
const pausaFim = toMinutes(config.pausa_fim);

let allSlots = [];

// Generate for the next 7 days
for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    
    // Skip weekends? Let's assume Mon-Fri for now to be safe, or just check config if it exists
    // The user said "segunda a sexta", so let's skip Sat (6) and Sun (0)
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dataStr = d.toISOString().split('T')[0];

    for(let t=inicio; t+intervalo<=fim; t+=intervalo){
      if(t>=pausaIni && t<pausaFim) continue;

      allSlots.push({
        json:{
          data: dataStr,
          hora_inicio: toTime(t),
          hora_fim: toTime(t+intervalo),
          status: "DISPONIVEL"
        }
      });
    }
}

return allSlots;
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Engine updated to generate weekly slots (Mon-Fri).");

        // Proactively run the engine once to fill the DB
        // We can do this by triggering the workflow if it has a webhook, but it has a Schedule Trigger.
        // We can just execute it via API? n8n API doesn't have a direct "run now" for schedule, 
        // but we can manually POST to the active version if it had a webhook.
        // Or we can just wait or tell the user.
    } catch (error) {
        console.error("Error updating engine:", error.response?.data || error.message);
    }
}

updateEngine();
