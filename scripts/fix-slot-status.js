
import axios from 'axios';

const API_URL = 'https://n8n.camiloruas.dev';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYTdjZDdjZi03ZDliLTQwYjctYThjNy1hYWFjOTYzNmExOWYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwMzc2MTcyfQ.00F6pXRx0dd4wKMmYW6C9vgsApJP_3I7rqDMD98Wf0c';

const MAIN_WORKFLOW_ID = 'eMikHpGyw6OFxuob';
const BOOKING_WORKFLOW_ID = '8C195OrvhCXh3biQ';

async function fixWorkflows() {
    try {
        console.log("Fetching Main Workflow...");
        const { data: mainWf } = await axios.get(`${API_URL}/api/v1/workflows/${MAIN_WORKFLOW_ID}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const agendarToolNode = mainWf.nodes.find(n => n.name === 'agendar_reserva');
        if (agendarToolNode) {
            console.log("Fixing agendar_reserva tool in Main Workflow...");
            agendarToolNode.parameters.workflowInputs.value.telefone = "={{ $('Preparar Dados').first().json.telefone }}";
        }

        console.log("Updating Main Workflow...");
        await axios.put(`${API_URL}/api/v1/workflows/${MAIN_WORKFLOW_ID}`, {
            name: mainWf.name,
            nodes: mainWf.nodes,
            connections: mainWf.connections,
            settings: mainWf.settings,
            staticData: mainWf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Fetching Booking Workflow...");
        const { data: bookingWf } = await axios.get(`${API_URL}/api/v1/workflows/${BOOKING_WORKFLOW_ID}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const updateNode = bookingWf.nodes.find(n => n.name === 'Reservar no Banco');
        if (updateNode) {
            console.log("Fixing Reservar no Banco node...");
            const telField = updateNode.parameters.fieldsUi.fieldValues.find(f => f.fieldId === 'cliente_telefone');
            if (telField) {
                telField.fieldValue = "={{ $('Resolver Dados').first().json.telefone }}";
            }
        }

        const insertNode = bookingWf.nodes.find(n => n.name === 'Registrar Reserva');
        if (insertNode) {
            console.log("Fixing Registrar Reserva node...");
            const telField = insertNode.parameters.fieldsUi.fieldValues.find(f => f.fieldId === 'cliente_telefone');
            if (telField) {
                telField.fieldValue = "={{ $('Resolver Dados').first().json.telefone }}";
            }
        }

        console.log("Updating Booking Workflow...");
        await axios.put(`${API_URL}/api/v1/workflows/${BOOKING_WORKFLOW_ID}`, {
            name: bookingWf.name,
            nodes: bookingWf.nodes,
            connections: bookingWf.connections,
            settings: bookingWf.settings,
            staticData: bookingWf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("All workflows fixed successfully!");
    } catch (error) {
        console.error("Error fixing workflows:", error.response?.data || error.message);
    }
}

fixWorkflows();
