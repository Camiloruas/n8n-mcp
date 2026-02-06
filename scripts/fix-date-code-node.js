
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixDateWithCodeNode() {
    const id = "20Rq4ar-aW-W3s3CvO_px";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Remove the old Set node "Receber data consulta"
        wf.nodes = wf.nodes.filter(n => n.name !== 'Receber data consulta');

        // 2. Add the new Code node
        const codeNode = {
            parameters: {
                jsCode: `
const input = items[0].json;
let rawDate = input.data || input.consulta || input.date || input.data_consulta;

let d;
if (rawDate) {
    // Try to parse the incoming date
    d = new Date(rawDate);
}

// Fallback to today if invalid or missing
if (!d || isNaN(d.getTime())) {
    d = new Date();
}

// Format as YYYY-MM-DD
const year = d.getFullYear();
const month = String(d.getMonth() + 1).padStart(2, '0');
const day = String(d.getDate()).padStart(2, '0');

return {
    data: \`\${year}-\${month}-\${day}\`
};
`
            },
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [200, 0],
            name: "Sanitizar Data"
        };
        wf.nodes.push(codeNode);

        // 3. Update connections
        // Trigger -> Sanitizar Data -> Buscar horários disponíveis
        // First, rewire existing connections
        wf.connections["When Executed by Another Workflow"].main = [[{ node: "Sanitizar Data", type: "main", index: 0 }]];
        wf.connections["Sanitizar Data"] = {
            main: [
                [
                    {
                        node: "Buscar horários disponíveis",
                        type: "main",
                        index: 0
                    }
                ]
            ]
        };

        // 4. Update the Supabase node to use the sanitized data
        const supabaseNode = wf.nodes.find(n => n.name === 'Buscar horários disponíveis');
        if (supabaseNode) {
            // Ensure it uses {{ $json.data }} from the Code node
            supabaseNode.parameters.filters.conditions[0].keyValue = "={{ $json.data }}";
        }

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Sub-workflow updated with robust Code node for date sanitization.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixDateWithCodeNode();
