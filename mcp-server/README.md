# Library MCP Server

Lets Claude manage the Library Management System through MCP tools.
Flow: Claude -> MCP server -> Render REST API -> MongoDB Atlas -> Netlify UI (auto-refreshes every 10s).

## Run locally
    cd mcp-server
    npm install
    LIBRARY_API_URL=https://YOUR-SERVICE.onrender.com/api node server.js

## Tools
list_books, add_book, update_book, delete_book, list_members, add_member,
update_member, delete_member, list_transactions, issue_book, return_book

## Connect to Claude Code
    claude mcp add library --env LIBRARY_API_URL=https://YOUR-SERVICE.onrender.com/api -- node /full/path/to/mcp-server/server.js

## Connect to Claude Desktop (claude_desktop_config.json)
    {
      "mcpServers": {
        "library": {
          "command": "node",
          "args": ["C:/full/path/to/library-management-system/mcp-server/server.js"],
          "env": { "LIBRARY_API_URL": "https://YOUR-SERVICE.onrender.com/api" }
        }
      }
    }
