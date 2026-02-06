
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixToolMetadata() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const consultId = "20Rq4ar-aW-W3s3CvO_px";
    const bookId = "8C195OrvhCXh3biQ";
    const cancelId = "nj8BbsVlFjHFYWDoE-qA9";

    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const updateTool = (name, id, description, schema, valueMapping) => {
            let node = wf.nodes.find(n => n.name === name);
            if (!node) {
                console.log(`Node ${name} not found, recreating it...`);
                // Re-creating logic if needed, but they should exist
                return;
            }
            node.parameters.description = description;
            node.parameters.workflowInputs = {
                mappingMode: "defineBelow",
                value: valueMapping,
                schema: schema
            };
        };

        // 1. Consultar
        updateTool(
            "consultar_horarios",
            consultId,
            "Consulta os horários disponíveis para uma data específica (Formato YYYY-MM-DD).",
            [
                {
                    id: "data",
                    displayName: "Data da Consulta",
                    required: true,
                    type: "string",
                    default: "",
                    description: "Data para ver disponibilidade no formato YYYY-MM-DD (ex: 2026-02-07)"
                }
            ],
            {
                data: "={{ $json.data }}"
            }
        );

        // 2. Agendar
        updateTool(
            "agendar_reserva",
            bookId,
            "Realiza o agendamento de um horário específico usando o slot_id.",
            [
                { id: "slot_id", displayName: "ID do Horário", required: true, type: "string", default: "", description: "O ID do horário escolhido retornado na consulta." },
                { id: "telefone", displayName: "Telefone", required: true, type: "string", default: "", description: "O telefone do cliente." }
            ],
            {
                slot_id: "={{ $json.slot_id }}",
                telefone: "={{ $('Preparar Dados').item.json.telefone }}"
            }
        );

        // 3. Cancelar
        updateTool(
            "cancelar_reserva",
            cancelId,
            "Cancela a reserva ativa do cliente.",
            [
                { id: "telefone", displayName: "Telefone", required: true, type: "string", default: "", description: "O telefone do cliente." }
            ],
            {
                telefone: "={{ $('Preparar Dados').item.json.telefone }}"
            }
        );

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: { executionOrder: "v1", timezone: "America/Sao_Paulo" },
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Successfully fixed tool metadata and schemas.");
    } catch (error) {
        console.error("Error fixing tool metadata:", error.response?.data || error.message);
    }
}

fixToolMetadata();
