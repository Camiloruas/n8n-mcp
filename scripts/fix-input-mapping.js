
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixInputMapping() {
    const portfolioId = "eMikHpGyw6OFxuob";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const prepNode = wf.nodes.find(n => n.name === 'Preparar Dados');
        if (prepNode) {
            const msgAssign = prepNode.parameters.assignments.assignments.find(a => a.name === 'mensagem');
            if (msgAssign) {
                msgAssign.name = "input";
            }
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Input mapping fixed: 'mensagem' changed to 'input'.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixInputMapping();
