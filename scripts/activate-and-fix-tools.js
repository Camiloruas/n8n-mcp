
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function activateAndFixTools() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const toolIds = [
        "nj8BbsVlFjHFYWDoE-qA9", // Cancelar
        "20Rq4ar-aW-W3s3CvO_px", // Consultar
        "8C195OrvhCXh3biQ"         // Agendar
    ];

    try {
        // 1. Activate sub-workflows
        for (const id of toolIds) {
            console.log(`Activating workflow ${id}...`);
            await axios.post(`${API_URL}/api/v1/workflows/${id}/activate`, {}, {
                headers: { 'X-N8N-API-KEY': API_KEY }
            }).catch(e => console.log(`Workflow ${id} already active or error:`, e.response?.data || e.message));
        }

        // 2. Fix Tool Nodes in Portfolio Main Workflow
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const tools = [
            {
                name: "consultar_horarios",
                id: "20Rq4ar-aW-W3s3CvO_px",
                desc: "Consulta os horários disponíveis para uma data específica (Formato YYYY-MM-DD).",
                schema: [{ id: "data", displayName: "Data", required: true, type: "string" }],
                mapping: { data: "={{ $json.data }}" }
            },
            {
                name: "agendar_reserva",
                id: "8C195OrvhCXh3biQ",
                desc: "Agenda um horário. Passe o 'Identificador_Tecnico' no campo slot_id, OU o horário (ex: 08:00) no campo 'horario' e a data no campo 'data'.",
                schema: [
                    { id: "slot_id", displayName: "ID do Slot (UUID)", required: false, type: "string" },
                    { id: "horario", displayName: "Horário (HH:mm)", required: false, type: "string" },
                    { id: "data", displayName: "Data (YYYY-MM-DD)", required: false, type: "string" },
                    { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                ],
                mapping: {
                    slot_id: "={{ $json.slot_id }}",
                    horario: "={{ $json.horario }}",
                    data: "={{ $json.data }}",
                    telefone: "={{ $('Preparar Dados').item.json.telefone }}"
                }
            },
            {
                name: "cancelar_reserva",
                id: "nj8BbsVlFjHFYWDoE-qA9",
                desc: "Cancela a reserva ativa do cliente usando seu telefone.",
                schema: [{ id: "telefone", displayName: "Telefone", required: true, type: "string" }],
                mapping: { telefone: "={{ $('Preparar Dados').item.json.telefone }}" }
            }
        ];

        tools.forEach(t => {
            let node = wf.nodes.find(n => n.name === t.name);
            if (node) {
                node.parameters.description = t.desc;
                node.parameters.workflowInputs = {
                    mappingMode: "defineBelow",
                    value: t.mapping,
                    schema: t.schema
                };
            }
        });

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Sub-workflows activated and Portfolio tools fixed.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

activateAndFixTools();
