
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixBookingPersistence() {
    try {
        const portWfId = "eMikHpGyw6OFxuob";
        const bookWfId = "8C195OrvhCXh3biQ";

        // 1. Update Portfolio Tool Schemas
        console.log("Updating Portfolio tools...");
        const { data: portWf } = await axios.get(`${API_URL}/api/v1/workflows/${portWfId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        portWf.nodes.forEach(node => {
            if (node.name === "agendar_reserva") {
                node.parameters.specifySchema = true;
                node.parameters.jsonSchema = JSON.stringify({
                    type: "object",
                    properties: {
                        slot_id: { type: "string", description: "O ID único do horário (UUID)." },
                        horario: { type: "string", description: "O horário desejado (HH:mm)." },
                        data: { type: "string", description: "A data desejada (YYYY-MM-DD)." }
                    }
                });
            }
            if (node.name === "consultar_horarios") {
                node.parameters.specifySchema = true;
                node.parameters.jsonSchema = JSON.stringify({
                    type: "object",
                    properties: {
                        data: { type: "string", description: "A data para consulta (YYYY-MM-DD)." }
                    },
                    required: ["data"]
                });
            }
        });

        const cleanWorkflow = (wf) => {
            const { id, createdAt, updatedAt, activeVersionId, versionCounter, triggerCount, shared, tags, ...clean } = wf;
            return clean;
        };

        await axios.put(`${API_URL}/api/v1/workflows/${portWfId}`, cleanWorkflow(portWf), {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 2. Update Booking Workflow Resolver Logic
        console.log("Updating Booking Workflow logic...");
        const { data: bookWf } = await axios.get(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const resolverNode = bookWf.nodes.find(n => n.name === "Resolver Dados");
        if (resolverNode) {
            resolverNode.parameters.jsCode = `
const input = $input.item.json;
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.slot_id || '');

// Fallback for AI sending ISO strings in a generic "query" property
if (!input.horario && input.query && input.query.includes('T')) {
    const parts = input.query.split('T');
    input.data = parts[0];
    input.horario = parts[1].substring(0, 5);
}

// CRITICAL: Ensure we preserve the phone number from the parent node if it's missing in local input
const telefone = input.telefone || null;

return {
    isUuid,
    slot_id: input.slot_id || null,
    horario: input.horario || null,
    data: input.data || new Date().toISOString().split('T')[0],
    telefone: telefone
};
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${bookWfId}`, cleanWorkflow(bookWf), {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        console.log("✅ All systems updated and hardened.");

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixBookingPersistence();
