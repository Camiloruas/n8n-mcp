
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixBookingPersistence() {
    const bookWfId = "8C195OrvhCXh3biQ";

    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Ensure 'Reservar no Banco' (Update Slot) is perfect
        const updateNode = wf.nodes.find(n => n.name === 'Reservar no Banco');
        if (updateNode) {
            updateNode.parameters.operation = "update";
            updateNode.parameters.tableId = "agenda_slots";
            updateNode.parameters.filters = {
                conditions: [
                    {
                        keyName: "id",
                        condition: "eq",
                        keyValue: "={{ $json.id }}"
                    }
                ]
            };
            updateNode.parameters.fieldsUi = {
                fieldValues: [
                    {
                        fieldId: "status",
                        fieldValue: "RESERVADO"
                    },
                    {
                        fieldId: "cliente_telefone",
                        fieldValue: "={{ $('Resolver Dados').item.json.telefone }}"
                    }
                ]
            };
        }

        // 2. Ensure 'Registrar Reserva' (Insert Log) is perfect
        const insertNode = wf.nodes.find(n => n.name === 'Registrar Reserva');
        if (insertNode) {
            insertNode.parameters.operation = "create";
            insertNode.parameters.tableId = "agenda_reservas";
            insertNode.parameters.dataToSend = "defineBelow";
            insertNode.parameters.fieldsUi = {
                fieldValues: [
                    { fieldId: "slot_id", fieldValue: "={{ $('Validar Slot').item.json.id }}" },
                    { fieldId: "cliente_telefone", fieldValue: "={{ $('Resolver Dados').item.json.telefone }}" },
                    { fieldId: "status", fieldValue: "RESERVADO" }
                ]
            };
        }

        await axios.put(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Booking persistence (update + insert) fixed and standardized.");

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
fixBookingPersistence();
