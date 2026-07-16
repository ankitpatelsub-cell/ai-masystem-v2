// mcp-server.mjs — exposes our shared SQLite DB as MCP tools.
// Run: node mcp-server.mjs   (stdio transport, called by the agent-sdk)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url) });
import { z } from 'zod';
import db from './db.js';

const server = new McpServer({ name: 'ai-masystem-db', version: '1.0.0' });

// --- Lead tools ---
server.tool('query_leads', 'List recent leads (optionally filter by status)', {
  status: z.string().optional(),
  limit: z.number().optional(),
}, async ({ status, limit = 50 }) => {
  const rows = status
    ? db.prepare('SELECT * FROM leads WHERE status=? ORDER BY id DESC LIMIT ?').all(status, limit)
    : db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT ?').all(limit);
  return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
});

server.tool('add_lead', 'Insert a new lead (name + email required)', {
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  interest: z.string().optional(),
  source: z.string().optional(),
}, async (b) => {
  const id = db.prepare('INSERT INTO leads (name,email,phone,interest,source,status,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(b.name, b.email, b.phone || '', b.interest || '', b.source || 'mcp', 'new', Date.now()).lastInsertRowid;
  return { content: [{ type: 'text', text: `lead ${id} created` }] };
});

server.tool('set_lead_status', 'Update a lead status/owner', {
  id: z.number(),
  status: z.string().optional(),
  owner: z.string().optional(),
}, async ({ id, status, owner }) => {
  if (status) db.prepare('UPDATE leads SET status=? WHERE id=?').run(status, id);
  if (owner) db.prepare('UPDATE leads SET owner=? WHERE id=?').run(owner, id);
  return { content: [{ type: 'text', text: `lead ${id} updated` }] };
});

// --- Car tools ---
server.tool('query_cars', 'List available cars (optionally by brand)', {
  brand: z.string().optional(),
}, async ({ brand }) => {
  const rows = brand
    ? db.prepare('SELECT * FROM car_cars WHERE status=? AND brand=? ORDER BY price').all('available', brand)
    : db.prepare('SELECT * FROM car_cars WHERE status=? ORDER BY price').all('available');
  return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
});

server.tool('add_car', 'Add a car to inventory', {
  brand: z.string(),
  model: z.string(),
  year: z.number().optional(),
  price: z.number().optional(),
  city: z.string().optional(),
}, async (c) => {
  const id = db.prepare('INSERT INTO car_cars (brand,model,year,price,city,status) VALUES (?,?,?,?,?,?)')
    .run(c.brand, c.model, c.year || 2024, c.price || 0, c.city || '', 'available').lastInsertRowid;
  return { content: [{ type: 'text', text: `car ${id} added` }] };
});

// --- Hospital tools ---
server.tool('hospital_queue', 'Show current patient queue', {}, async () => {
  const rows = db.prepare('SELECT * FROM hospital_queue ORDER BY position').all();
  return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
});

// --- Hotel tools ---
server.tool('hotel_bookings', 'Show recent hotel bookings', {}, async () => {
  const rows = db.prepare('SELECT * FROM hotel_bookings ORDER BY id DESC LIMIT 20').all();
  return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
});

// --- Activity tools ---
server.tool('recent_activity', 'Show recent cross-agent activity', {
  limit: z.number().optional(),
}, async ({ limit = 20 }) => {
  const rows = db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT ?').all(limit);
  return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('MCP DB server running on stdio');
