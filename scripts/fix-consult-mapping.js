
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixConsultationMapping() {
    const consultId = "20Rq4ar-aW-W3s3CvO_px";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${consultId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const codeNode = wf.nodes.find(n => n.name === 'Simplificar Dados');
        if (codeNode) {
            codeNode.parameters.jsCode = `
const items = $input.all();
if (!items.length || (items.length === 1 && items[0].json.mensagem)) {
    return [{ mensagem: "Desculpe, não encontrei horários disponíveis para esta data." }];
}

let table = "| Horário | Identificador_Tecnico |\\n| --- | --- |\\n";
items.forEach(i => {
    // Correct mapping: Supabase uses 'hora_inicio'
    const hora = i.json.hora_inicio ? i.json.hora_inicio.slice(0, 5) : "??:??";
    table += \`| \${hora} | \${i.json.id} |\\n\`;
});

return [{ mensagem: "TABELA_HORARIOS:\\n" + table }];
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${consultId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Consultation mapping fixed: using 'hora_inicio' slice(0,5).");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixConsultationMapping();
