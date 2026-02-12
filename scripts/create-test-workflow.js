import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

if (!API_URL || !API_KEY) {
  console.error('Missing N8N_API_URL or N8N_API_KEY in environment.');
  process.exit(1);
}

const workflowData = {
  name: 'mcp_test_hello_world',
  active: false,
  nodes: [
    {
      parameters: {},
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [0, 0],
      id: 'manual-trigger',
      name: 'Manual Trigger'
    },
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: 'msg',
              name: 'message',
              value: 'Hello from MCP test',
              type: 'string'
            }
          ]
        }
      },
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [260, 0],
      id: 'set-message',
      name: 'Set Message'
    }
  ],
  connections: {
    'Manual Trigger': {
      main: [[{ node: 'Set Message', type: 'main', index: 0 }]]
    }
  },
  settings: { executionOrder: 'v1' }
};

async function createTestWorkflow() {
  try {
    const { data } = await axios.post(`${API_URL}/api/v1/workflows`, workflowData, {
      headers: { 'X-N8N-API-KEY': API_KEY }
    });
    console.log(`Test workflow created with ID: ${data.id}`);
  } catch (error) {
    console.error('Error creating workflow:', error.response?.data || error.message);
    process.exit(1);
  }
}

createTestWorkflow();
