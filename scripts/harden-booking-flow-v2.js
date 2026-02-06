
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function hardenBookingFlow() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const bookWfId = "8C195OrvhCXh3biQ";
    const credId = "cuLPizV1tj78XzSn";

    try {
        // 1. Update Portfolio Tool Schema
        const { data: wfP } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const toolNode = wfP.nodes.find(n => n.name === 'agendar_reserva');
        if (toolNode) {
            toolNode.parameters.workflowInputs = {
                mappingMode: "defineBelow",
                value: {
                    slot_id: "={{ $json.slot_id }}",
                    horario: "={{ $json.horario }}",
                    data: "={{ $json.data }}",
                    telefone: "={{ $('Preparar Dados').item.json.telefone }}"
                },
                schema: [
                    { id: "slot_id", displayName: "ID do Slot (UUID)", required: false, type: "string" },
                    { id: "horario", displayName: "Horário (HH:mm)", required: false, type: "string" },
                    { id: "data", displayName: "Data (YYYY-MM-DD)", required: false, type: "string" },
                    { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                ]
            };
            toolNode.parameters.description = "Agenda um horário. Passe o 'Identificador_Tecnico' no campo slot_id, OU o horário (ex: 08:00) no campo 'horario' e a data no campo 'data'.";
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wfP.name, nodes: wfP.nodes, connections: wfP.connections, settings: wfP.settings, staticData: wfP.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("Portfolio tool 'agendar_reserva' updated with flexible parameters.");

        // 2. Update Booking Workflow Resolver and Query
        const { data: wfB } = await axios.get(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const resolverNode = wfB.nodes.find(n => n.name === 'Resolver Dados');
        if (resolverNode) {
            resolverNode.parameters.jsCode = `
const input = $input.first().json;
const slot_id = input.slot_id;
const data = input.data || new Date().toISOString().split('T')[0];
const incomingHorario = input.horario;

// Check if slot_id is actually a UUID
const isUuid = slot_id && slot_id.length > 20 && slot_id.includes('-');

// If slot_id is not a UUID but has content, it might be the time
const fallbackHorario = (!isUuid && slot_id && slot_id.includes(':')) ? slot_id : null;

const finalHorario = incomingHorario || fallbackHorario;

return {
    isUuid,
    slot_id: isUuid ? slot_id : null,
    horario: finalHorario,
    data: data,
    telefone: input.telefone
};
`;
        }

        const queryNode = wfB.nodes.find(n => n.name === 'Buscar por Tempo');
        if (queryNode) {
            const timeCond = queryNode.parameters.filters.conditions.find(c => c.keyName === 'hora_inicio');
            if (timeCond) {
                timeCond.keyValue = "={{ $json.horario ? ($json.horario.split(':').length === 2 ? $json.horario + ':00' : $json.horario) : '00:00:00' }}";
            }
        }

        await axios.put(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            name: wfB.name, nodes: wfB.nodes, connections: wfB.connections, settings: wfB.settings, staticData: wfB.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("Booking sub-workflow hardened against undefined/null times.");

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
hardenBookingFlow();
