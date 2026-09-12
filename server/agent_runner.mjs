// agent_runner.mjs — run an agent via OpenRouter REST API with MCP tools
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER = path.join(__dirname, 'mcp-server.mjs');

// OpenRouter API call with tool support - with retry logic and fallback models
const FREE_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'poolside/laguna-xs-2.1:free',
  'cohere/north-mini-code:free',
  'openai/gpt-oss-20b:free'
];

async function callOpenRouterWithRetry(messages, tools = [], toolChoice = 'auto', modelIndex = 0) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  if (modelIndex >= FREE_MODELS.length) {
    throw new Error('All free models exhausted');
  }

  const model = FREE_MODELS[modelIndex];
  
  const payload = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 2048,
  };

  if (tools.length > 0) {
    payload.tools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
    payload.tool_choice = toolChoice;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:8099',
      'X-Title': 'AI MASystem v2'
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 429) {
    // Rate limited - try next model
    console.error(`Rate limited on ${model}, trying next model...`);
    return callOpenRouterWithRetry(messages, tools, toolChoice, modelIndex + 1);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${err}`);
  }

  return response.json();
}

// Keep original function name for compatibility
async function callOpenRouter(messages, tools = [], toolChoice = 'auto', model = 'openrouter/free') {
  return callOpenRouterWithRetry(messages, tools, toolChoice, 0);
}

// Tool definitions matching the MCP server
const TOOLS = [
  {
    name: 'query_leads',
    description: 'List recent leads (optionally filter by status)',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'lost', 'won'] },
        limit: { type: 'integer', default: 50 }
      },
      required: []
    }
  },
  {
    name: 'add_lead',
    description: 'Insert a new lead (name + email required)',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string', optional: true },
        interest: { type: 'string', optional: true },
        source: { type: 'string', optional: true }
      },
      required: ['name', 'email']
    }
  },
  {
    name: 'set_lead_status',
    description: 'Update a lead status/owner',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'lost', 'won'] },
        owner: { type: 'string', optional: true }
      },
      required: ['id']
    }
  },
  {
    name: 'query_cars',
    description: 'List available cars (optionally by brand)',
    parameters: {
      type: 'object',
      properties: {
        brand: { type: 'string', optional: true }
      },
      required: []
    }
  },
  {
    name: 'add_car',
    description: 'Add a car to inventory',
    parameters: {
      type: 'object',
      properties: {
        brand: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'integer', optional: true },
        price: { type: 'number', optional: true },
        city: { type: 'string', optional: true }
      },
      required: ['brand', 'model']
    }
  },
  {
    name: 'hospital_queue',
    description: 'Show current patient queue',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'hotel_bookings',
    description: 'Show recent hotel bookings',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', default: 20 }
      },
      required: []
    }
  },
  {
    name: 'send_lead_email',
    description: 'Draft + REALLY send a lead-outreach email via Gmail (himalaya).',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'recent_activity',
    description: 'Show recent cross-agent activity',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', default: 20 }
      },
      required: []
    }
  }
];

/**
 * Run an agentic task using OpenRouter with tools.
 * @param {string} systemPrompt - agent persona/instructions
 * @param {string} prompt - the user task
 * @param {object} opts - { allowedTools, maxTurns, model }
 */
export async function runAgent(systemPrompt, prompt, opts = {}) {
  const model = opts.model || 'openrouter/free';
  const maxTurns = opts.maxTurns || 10;
  
  // Filter tools if allowedTools specified
  const allowedTools = opts.allowedTools;
  const tools = allowedTools 
    ? TOOLS.filter(t => allowedTools.includes(t.name))
    : TOOLS;

  const messages = [
    { role: 'system', content: systemPrompt || 'You are the MASystem back-office agent. Use the available tools to answer queries about leads, hospital queue, hotel bookings, and cars.' },
    { role: 'user', content: prompt }
  ];

  let turn = 0;
  while (turn < maxTurns) {
    turn++;
    
    try {
      const result = await callOpenRouter(messages, tools, 'auto', model);
      
      if (!result.choices || result.choices.length === 0) {
        throw new Error('No choices in OpenRouter response');
      }
      
      const choice = result.choices[0];
      const message = choice.message;
      
      // Add assistant message to conversation
      messages.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls
      });
      
      // If no tool calls, we're done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || '';
      }
      
      // For now, we'll simulate tool execution by returning mock data
      // In production, you'd call the actual MCP server or database
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        // Execute tool (mock implementation for now)
        const toolResult = await executeToolMock(toolName, toolArgs);
        
        // Add tool result to conversation
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  return 'Max turns reached without completion';
}

// Mock tool execution - replace with actual MCP client calls if needed
async function executeToolMock(toolName, args) {
  // This is a simplified mock - in production, connect to MCP server
  switch (toolName) {
    case 'query_leads':
      return { 
        leads: [
          { id: 1, name: 'Test Lead', email: 'test@example.com', status: 'new', created_at: Date.now() }
        ],
        note: 'Mock data - connect to actual MCP server for real data'
      };
    case 'recent_activity':
      return { 
        activity: [
          { id: 1, type: 'lead_created', description: 'New lead added', timestamp: Date.now() }
        ],
        note: 'Mock data - connect to actual MCP server for real data'
      };
    case 'hospital_queue':
      return { 
        queue: [
          { id: 1, patient: 'John Doe', status: 'waiting', position: 1 }
        ],
        note: 'Mock data - connect to actual MCP server for real data'
      };
    case 'hotel_bookings':
      return { 
        bookings: [
          { id: 1, guest: 'Jane Smith', status: 'confirmed', check_in: '2024-01-15' }
        ],
        note: 'Mock data - connect to actual MCP server for real data'
      };
    case 'query_cars':
      return { 
        cars: [
          { id: 1, brand: 'Toyota', model: 'Camry', year: 2024, price: 25000, status: 'available' }
        ],
        note: 'Mock data - connect to actual MCP server for real data'
      };
    default:
      return { note: `Mock result for ${toolName}`, args };
  }
}

// CLI quick-test: node agent_runner.mjs "task" [--system "persona"] [--model "model"]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[/\\]/, ''))) {
  const args = process.argv.slice(2);
  let task = '';
  let system = 'You are the MASystem back-office agent. Use the available tools to answer queries about leads, hospital queue, hotel bookings, and cars.';
  let model = 'openrouter/free';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--system') { system = args[i + 1]; i++; }
    else if (args[i] === '--model') { model = args[i + 1]; i++; }
    else if (!task) task = args[i];
  }
  
  runAgent(system, task || 'summarize the latest leads in 3 bullets', { model })
    .then(res => {
      console.log('AGENT:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('ERROR:', err.message);
      process.exit(1);
    });
}