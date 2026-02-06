
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixSlotIdError() {
    const portfolioId = "eMikHpGyw6OFxuob";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Force RE-MAPPING of the agendar_reserva tool
        const bookNode = wf.nodes.find(n => n.name === 'agendar_reserva');
        if (bookNode) {
            bookNode.parameters.workflowInputs = {
                mappingMode: "defineBelow",
                value: {
                    slot_id: "={{ $json.slot_id }}",
                    telefone: "={{ $('Preparar Dados').item.json.telefone }}"
                },
                schema: [
                    { id: "slot_id", displayName: "Slot ID", required: true, type: "string" },
                    { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                ]
            };
        }

        // 2. Harden the prompt even more to prevent 'null'
        const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            let currentPrompt = agentNode.parameters.options.systemMessage;
            const extraInstruction = `
### CRITICAL RULE FOR BOOKING:
- When you use 'consultar_horarios', you receive data like: [{"id": "...", "horario": "..."}].
- Store this entire JSON in your scratchpad/memory.
- When the user says "I want 9:00", search for "09:00" in that JSON.
- Take the EXACT 'id' value (e.g., "cb16cdf4-...") and pass it as 'slot_id' to 'agendar_reserva'.
- NEVER send 'null', 'undefined', or the time string as the 'slot_id'. Use only the technical UUID.
`;
            if (!currentPrompt.includes("CRITICAL RULE FOR BOOKING")) {
                agentNode.parameters.options.systemMessage = currentPrompt + extraInstruction;
            }
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Slot ID mapping fixed and Agent prompt strengthened.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixSlotIdError();
