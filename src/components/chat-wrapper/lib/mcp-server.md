# Scratch MCP Server Documentation

## Overview

The Model Context Protocol (MCP) Server for Scratch allows DeepSeek AI to interact with the Scratch environment through function calls. This enables AI-assisted creation and modification of Scratch projects.

## Architecture

The MCP Server implementation consists of several key components:

1. **MCP Server (`src/lib/mcp-server.js`)**
   - Core protocol implementation
   - Tool definition and registration
   - Tool execution handling

2. **VM Bridge (`src/lib/mcp-vm-bridge.js`)**
   - Connection between MCP tools and Scratch VM
   - Abstracts VM operation details

3. **DeepSeek API Extension (`src/lib/deepseek-api.js`)**
   - Extended with MCP protocol support
   - Handles tool calls from DeepSeek responses
   - Sends tool results back to DeepSeek

4. **Chat Wrapper Integration (`src/containers/chat-wrapper.jsx` and `src/components/chat-wrapper/chat-wrapper.jsx`)**
   - UI for interacting with DeepSeek
   - Visualizes tool execution status

## Supported Tools

### Block Operations
- `createBlock` - Creates new blocks in the current or specified sprite
- `deleteBlock` - Removes blocks by ID
- `connectBlocks` - Connects blocks together

### Sprite Operations
- `createSprite` - Creates new sprites
- `setSpritePosition` - Sets sprite X,Y coordinates
- `setSpriteSize` - Changes sprite size
- `setSpriteDirection` - Sets sprite rotation direction

### Project Management
- `loadProject` - Loads a Scratch project
- `saveProject` - Saves the current project
- `getProjectInfo` - Gets information about sprites and stage

### Execution Controls
- `runProject` - Runs the Scratch project (green flag)
- `stopProject` - Stops all scripts
- `getExecutionState` - Gets information about running threads

## Usage Flow

1. User sends a message to DeepSeek through the chat interface
2. DeepSeek responds with a message that may include tool calls
3. MCP Server processes the tool calls using the Scratch VM
4. Results are sent back to DeepSeek for further processing
5. Final response is displayed to the user

## Example

```javascript
// Example DeepSeek tool call
const toolCall = {
  name: "createBlock",
  arguments: JSON.stringify({
    blockType: "motion_movesteps",
    inputs: { STEPS: 10 }
  })
};

// MCP Server processes the tool call
const result = await mcpServer.processToolCall(toolCall);
// { success: true, blockId: "someBlockId", message: "Created block" }

// Result is sent back to DeepSeek
```

## Integration Example

The Chat Wrapper component initializes the MCP Server:

```javascript
import MCPServer from '../lib/mcp-server';
import MCPVMBridge from '../lib/mcp-vm-bridge';
import deepseekAPI from '../lib/deepseek-api';

// Initialize components
const vmBridge = new MCPVMBridge(vm);
const mcpServer = new MCPServer(vm, blocks, { vmBridge });

// Register with DeepSeek API
deepseekAPI.setMCPServer(mcpServer);
```

## Error Handling

All tool operations include proper error handling:

- Invalid tool calls return an error object
- Errors during tool execution are caught and returned in a structured format
- UI components display appropriate error messages to users

## Testing

Use the test file `test/integration/mcp-server.test.js` to test the MCP Server functionality.