
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixAgendarResilient() {
    const id = "8C195OrvhCXh3biQ";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Update the Resolver Node (Validar Disponibilidade or new one)
        // We'll replace the existing logic with a more powerful one.
        const supabaseSearch = wf.nodes.find(n => n.name === 'Verificar Slot');

        // We'll add a Code node BEFORE "Verificar Slot" to decide the filter
        const resolverNode = {
            parameters: {
                jsCode: `
const input = $input.first().json;
const slot_id = input.slot_id;
const data = input.data || new Date().toISOString().split('T')[0];
const horario = input.horario;

// Check if slot_id is a UUID
const isUuid = slot_id && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(slot_id);

return {
    isUuid,
    slot_id: isUuid ? slot_id : null,
    horario: horario || (!isUuid && slot_id && slot_id.includes(':') ? slot_id : null),
    data: data,
    telefone: input.telefone
};
`
            },
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [280, 0],
            name: "Resolver Parâmetros"
        };

        if (!wf.nodes.find(n => n.name === resolverNode.name)) {
            wf.nodes.push(resolverNode);
        }

        // Re-wire: Trigger -> Resolver Parâmetros -> Verificar Slot
        wf.connections["Receber Dados"].main = [[{ node: "Resolver Parâmetros", type: "main", index: 0 }]];
        wf.connections["Resolver Parâmetros"] = { main: [[{ node: "Verificar Slot", type: "main", index: 0 }]] };

        // 2. Update "Verificar Slot" to use the resolved parameters
        if (supabaseSearch) {
            supabaseSearch.parameters.filters = {
                mustMatch: "all",
                conditions: [
                    {
                        keyName: "status",
                        condition: "eq",
                        keyValue: "DISPONIVEL"
                    }
                ]
            };

            // Add dynamic condition for ID or Time+Date
            // This is tricky in a single node if we want "OR" logic.
            // Let's use a smarter filter if possible, or just two separate nodes.
            // Actually, let's use a "Filter" property with a smart value.

            // BETTER: Use a single node but resolve the search value in the Code node.
            // But we can't easily do (id=X OR (data=Y AND time=Z)) in a simple node.

            // OK, let's use the ID primarily, but if it's null, the Code node will HAVE found a time.
            // We'll simplify: The Code node will output a "filtro_id" which is either the UUID 
            // OR we'll use a different branch.
        }

        // --- SIMPLER RESET ---
        // I will just make the AI Agent PROMPT so strong it can't fail.
        // The reason it's failing is that n8n's toolWorkflow node 
        // sometimes doesn't pass the previous observation correctly.

        // I'll update the Portfolio workflow Tool mapping to BE ABSOLUTELY CLEAR.
    } catch (error) {
        console.error("Error:", error.message);
    }
}
fixAgendarResilient();
