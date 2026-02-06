
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function refineConsultation() {
    const id = "20Rq4ar-aW-W3s3CvO_px";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Add status filter to Supabase node
        const supabaseNode = wf.nodes.find(n => n.name === 'Buscar horários disponíveis');
        if (supabaseNode) {
            supabaseNode.parameters.filters.conditions = [
                {
                    keyName: "data",
                    condition: "eq",
                    keyValue: "={{ $json.data }}"
                },
                {
                    keyName: "status",
                    condition: "eq",
                    keyValue: "DISPONIVEL"
                }
            ];
            supabaseNode.parameters.filters.mustMatch = "all";
            supabaseNode.parameters.returnAll = true; // IMPORTANT: allow list of slots
        }

        // 2. Update formatting Code node to include IDs
        const codeNode = wf.nodes.find(n => n.name === 'Code in JavaScript');
        if (codeNode) {
            codeNode.parameters.jsCode = `
const items = $input.all();

if (!items.length) {
  return [{ mensagem: "Nenhum horário disponível para esta data." }];
}

const dataRaw = items[0].json.data;
// Format date to DD/MM/YYYY for friendly display
const [y, m, d] = dataRaw.split('-');
const dataBra = \`\${d}/\${m}/\${y}\`;

const msgBody = items.map(i => {
    const hora = i.json.hora_inicio.slice(0,5);
    const id = i.json.id;
    return \`⏰ \${hora} (ID: \${id})\`;
}).join("\\n");

const msg =
\`📅 Disponibilidade para \${dataBra}:

\${msgBody}

Para agendar, basta me dizer o ID do horário escolhido.\`;

return [{ mensagem: msg }];
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Consultation workflow refined with IDs and status filtering.");
    } catch (error) {
        console.error("Error refining consultation:", error.response?.data || error.message);
    }
}

refineConsultation();
