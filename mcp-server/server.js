#!/usr/bin/env node
// Library Management MCP server (stdio).
// It talks to your DEPLOYED Render REST API, so the three-tier design is preserved:
// Claude -> MCP server -> Render API -> MongoDB Atlas  (and the Netlify UI reads the same data).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = (process.env.LIBRARY_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function call(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(60000) // Render free tier can take ~50s to wake up
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.message || `API request failed (${res.status})`);
  return payload;
}

const ok = (text, data) => ({
  content: [{ type: "text", text: data === undefined ? text : `${text}\n${JSON.stringify(data, null, 2)}` }]
});
const fail = (e) => ({ isError: true, content: [{ type: "text", text: `Error: ${e.message}` }] });
const wrap = (fn) => async (args) => { try { return await fn(args); } catch (e) { return fail(e); } };

const server = new McpServer({ name: "library-management", version: "1.0.0" });

// ---------- Books ----------
server.tool("list_books", "List books, optionally filtered by a search text (title, author, ISBN, category).",
  { query: z.string().optional() },
  wrap(async ({ query }) => {
    const r = await call(`/books${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    return ok(`Found ${r.data.length} book(s).`, r.data);
  }));

server.tool("add_book", "Add a new book to the library.",
  {
    title: z.string(), author: z.string(), isbn: z.string(), category: z.string(),
    totalCopies: z.number().int().min(1).default(1), shelf: z.string().optional()
  },
  wrap(async (args) => {
    const r = await call("/books", { method: "POST", body: JSON.stringify(args) });
    return ok(r.message, r.data);
  }));

server.tool("update_book", "Update fields of an existing book by its ID.",
  {
    id: z.string(), title: z.string().optional(), author: z.string().optional(), isbn: z.string().optional(),
    category: z.string().optional(), totalCopies: z.number().int().min(1).optional(), shelf: z.string().optional()
  },
  wrap(async ({ id, ...body }) => {
    const r = await call(`/books/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return ok(r.message, r.data);
  }));

server.tool("delete_book", "Delete a book by ID (fails if copies are currently issued).",
  { id: z.string() },
  wrap(async ({ id }) => ok((await call(`/books/${id}`, { method: "DELETE" })).message)));

// ---------- Members ----------
server.tool("list_members", "List library members, optionally filtered by search text.",
  { query: z.string().optional() },
  wrap(async ({ query }) => {
    const r = await call(`/members${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    return ok(`Found ${r.data.length} member(s).`, r.data);
  }));

server.tool("add_member", "Register a new library member.",
  { name: z.string(), email: z.string().email(), memberCode: z.string(), phone: z.string().optional() },
  wrap(async (args) => {
    const r = await call("/members", { method: "POST", body: JSON.stringify(args) });
    return ok(r.message, r.data);
  }));

server.tool("update_member", "Update an existing member by ID.",
  {
    id: z.string(), name: z.string().optional(), email: z.string().email().optional(),
    memberCode: z.string().optional(), phone: z.string().optional()
  },
  wrap(async ({ id, ...body }) => {
    const r = await call(`/members/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return ok(r.message, r.data);
  }));

server.tool("delete_member", "Delete a member by ID.",
  { id: z.string() },
  wrap(async ({ id }) => ok((await call(`/members/${id}`, { method: "DELETE" })).message)));

// ---------- Transactions ----------
server.tool("list_transactions", "List all issue/return transactions (newest first).", {},
  wrap(async () => {
    const r = await call("/transactions");
    return ok(`Found ${r.data.length} transaction(s).`, r.data);
  }));

server.tool("issue_book", "Issue a book to a member. dueDate must be a future date (ISO, e.g. 2026-11-15).",
  { bookId: z.string(), memberId: z.string(), dueDate: z.string() },
  wrap(async (args) => {
    const r = await call("/transactions/issue", { method: "POST", body: JSON.stringify(args) });
    return ok(r.message, r.data);
  }));

server.tool("return_book", "Mark an issued book as returned using the transaction ID.",
  { transactionId: z.string() },
  wrap(async ({ transactionId }) => {
    const r = await call(`/transactions/${transactionId}/return`, { method: "PATCH" });
    return ok(r.message, r.data);
  }));

await server.connect(new StdioServerTransport());
console.error(`Library MCP server running (API: ${API_BASE})`);
