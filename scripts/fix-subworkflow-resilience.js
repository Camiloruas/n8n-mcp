
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixSubworkflowResilience() {
    const id = "20Rq4ar-aW-W3s3CvO_px";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Update "Receber data consulta" to be extremely flexible
        // It will try any key the AI might send.
        const setNode = wf.nodes.find(n => n.name === 'Receber data consulta');
        if (setNode) {
            setNode.parameters.assignments.assignments[0].value = "={{ $json.data || $json.consulta || $json.date || $json.data_consulta || $now.format('YYYY-MM-DD') }}";
            console.log("Updated sub-workflow node to be resilient.");
        }

        // 2. Double check the Supabase filter node
        const supabaseNode = wf.nodes.find(n => n.name === 'Buscar horários disponíveis');
        if (supabaseNode) {
            // Ensure the filter is correct. In user's image it's {{ $json.data }}
            // We'll keep it as {{ $json.data }} because the Set node above will ensure 'data' is populated.
        }

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Sub-workflow standardized and hardened.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixSubworkflowResilience();
