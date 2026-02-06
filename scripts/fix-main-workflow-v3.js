
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function updateMainWorkflow() {
    const workflowId = "Wn8FfWkBfgt56QPm";
    try {
        // 1. Get current workflow
        const getResponse = await axios.get(`${API_URL}/api/v1/workflows/${workflowId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const workflow = getResponse.data;

        // 2. Modify "consultar_horarios" node
        const node = workflow.nodes.find(n => n.name === "consultar_horarios");
        if (node) {
            node.parameters.workflowInputs = {
                mappingMode: "defineBelow",
                value: {
                    data: "={{ $json.data }}"
                },
                matchingColumns: [],
                schema: [
                    {
                        id: "data",
                        displayName: "Data",
                        required: true,
                        default: "",
                        type: "string",
                        displayOptions: {},
                        description: "Data para verificar disponibilidade (formato YYYY-MM-DD)"
                    }
                ],
                attemptToConvertTypes: false,
                convertFieldsToString: false
            };
            console.log("Updated 'consultar_horarios' node parameters.");
        } else {
            throw new Error("Node 'consultar_horarios' not found");
        }

        // 3. Clean up settings to avoid validation errors
        // n8n API often rejects fields like 'callerId' or internal metadata
        if (workflow.settings) {
            delete workflow.settings.callerId;
            delete workflow.settings.lastExecutionId;
        }

        // 4. Update workflow
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

        console.log("Successfully updated Main Workflow.");
    } catch (error) {
        console.error("Error updating main workflow:", error.response?.data || error.message);
        if (error.response?.data?.message) {
            console.error("Validation error details:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

updateMainWorkflow();
