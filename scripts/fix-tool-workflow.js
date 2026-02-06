
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function updateToolWorkflow() {
    const workflowId = "20Rq4ar-aW-W3s3CvO_px";
    try {
        // 1. Get current workflow
        const getResponse = await axios.get(`${API_URL}/api/v1/workflows/${workflowId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const workflow = getResponse.data;

        // 2. Modify "Receber data consulta" node
        const node = workflow.nodes.find(n => n.name === 'Receber data consulta');
        if (node) {
            node.parameters.assignments.assignments[0].value = "={{ $json.data }}";
            console.log("Updated node parameters.");
        } else {
            throw new Error("Node 'Receber data consulta' not found");
        }

        // 3. Update workflow (using PUT /api/v1/workflows/:id)
        // n8n API expect nodes, connections, name, settings, staticData in the body
        const updateData = {
            name: workflow.name,
            nodes: workflow.nodes,
            connections: workflow.connections,
            settings: workflow.settings,
            staticData: workflow.staticData
        };

        await axios.put(`${API_URL}/api/v1/workflows/${workflowId}`, updateData, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        console.log("Successfully updated Tool Workflow.");
    } catch (error) {
        console.error("Error updating tool workflow:", error.response?.data || error.message);
    }
}

updateToolWorkflow();
