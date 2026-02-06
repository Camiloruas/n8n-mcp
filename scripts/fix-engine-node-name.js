
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixEngineNodeName() {
    const engineId = "2KtkOaUAIx_IntJD-wHya";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${engineId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const codeNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.code' && (n.name === 'Gerar Slots' || n.name === 'Code in JavaScript'));
        if (codeNode) {
            codeNode.name = "Gerar Slots"; // Standardize it
            codeNode.parameters.jsCode = `
const items = $input.all();
const config = items[0].json;

const startHour = config.horario_inicio || "08:00";
const endHour = config.horario_fim || "18:00";
const interval = parseInt(config.intervalo) || 30;
const breakStart = config.pausa_inicio || "12:00";
const breakEnd = config.pausa_fim || "13:30";

let slots = [];

// Generate for next 7 days
for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    
    // Skip weekends
    const day = d.getDay();
    if (day === 0 || day === 6) continue;

    const dataStr = d.toISOString().split('T')[0];
    
    let current = new Date(\`\${dataStr}T\${startHour}:00\`);
    const end = new Date(\`\${dataStr}T\${endHour}:00\`);

    while (current < end) {
        const timeStr = current.toTimeString().split(' ')[0].slice(0, 5);
        
        // Check break
        const isBreak = timeStr >= breakStart && timeStr < breakEnd;
        
        if (!isBreak) {
            const slotEnd = new Date(current.getTime() + interval * 60000);
            slots.push({
                json: {
                    data: dataStr,
                    hora_inicio: timeStr + ":00",
                    hora_fim: slotEnd.toTimeString().split(' ')[0].slice(0, 5) + ":00",
                    status: "DISPONIVEL"
                }
            });
        }
        current = new Date(current.getTime() + interval * 60000);
    }
}

return slots;
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${engineId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("Engine node renamed and weekly logic applied successfully.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
fixEngineNodeName();
