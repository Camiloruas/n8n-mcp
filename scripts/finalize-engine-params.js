
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function finalizeEngineFix() {
    const engineId = "2KtkOaUAIx_IntJD-wHya";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${engineId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const codeNode = wf.nodes.find(n => n.name === 'Gerar Slots');
        if (codeNode) {
            codeNode.parameters.jsCode = `
const items = $input.all();
if (!items.length) return [];
const config = items[0].json;

// Map from the actual schema shown in the user's image
const startHourRaw = config.horario_inicio || "08:00";
const endHourRaw = config.horario_fim || "18:00";
const interval = parseInt(config.intervalo_minutos) || 30;
const breakStartRaw = config.pausa_inicio || "12:00";
const breakEndRaw = config.pausa_fim || "13:30";
const activeDays = config.dias_ativos || [1, 2, 3, 4, 5];

// Helper to normalize time to HH:mm
function normalizeTime(t) {
    if (!t) return "00:00";
    return t.slice(0, 5);
}

const startHour = normalizeTime(startHourRaw);
const endHour = normalizeTime(endHourRaw);
const breakStart = normalizeTime(breakStartRaw);
const breakEnd = normalizeTime(breakEndRaw);

let slots = [];

// Generate for next 7 days
for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    
    // Check if this weekday is active (0=Sun, 1=Mon, ..., 6=Sat)
    const dayOfWeek = d.getDay();
    if (!activeDays.includes(dayOfWeek)) continue;

    const dataStr = d.toISOString().split('T')[0];
    
    // Create base date for calculations
    let current = new Date(\`\${dataStr}T\${startHour}:00\`);
    const end = new Date(\`\${dataStr}T\${endHour}:00\`);

    while (current < end) {
        const timeStr = current.toTimeString().split(' ')[0].slice(0, 5);
        
        // Check break
        const isBreak = timeStr >= breakStart && timeStr < breakEnd;
        
        if (!isBreak) {
            const slotEnd = new Date(current.getTime() + interval * 60000);
            const timeEndStr = slotEnd.toTimeString().split(' ')[0].slice(0, 5);
            
            // Don't generate slot if it ends after closing time
            if (timeEndStr <= endHour || (timeEndStr > endHour && timeStr < endHour)) {
                 slots.push({
                    json: {
                        data: dataStr,
                        hora_inicio: timeStr + ":00",
                        hora_fim: timeEndStr + ":00",
                        status: "DISPONIVEL"
                    }
                });
            }
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

        console.log("Engine fixed with correct property mapping and robust time parsing.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
finalizeEngineFix();
