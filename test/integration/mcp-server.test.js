/**
 * MCP Server Integration Test
 * Tests the MCP Server and its integration with DeepSeek API
 */

import MCPServer from '../../src/lib/mcp-server';
import MCPVMBridge from '../../src/lib/mcp-vm-bridge';

// Mock VM for testing
const mockVM = {
    runtime: {
        targets: [],
        makeBlock: jest.fn().mockReturnValue('test-block-id'),
        deleteBlock: jest.fn(),
        connectBlocks: jest.fn(),
        isRunning: false,
        threads: []
    },
    editingTarget: {
        id: 'sprite1',
        sprite: { name: 'Test Sprite' },
        blocks: {
            createBlock: jest.fn().mockReturnValue('test-block-id'),
            deleteBlock: jest.fn(),
            getBlock: jest.fn().mockReturnValue({ id: 'test-block-id', opcode: 'motion_movesteps' }),
            connect: jest.fn()
        }
    },
    greenFlag: jest.fn(),
    stopAll: jest.fn(),
    setXYPosition: jest.fn(),
    refreshWorkspace: jest.fn(),
    emitWorkspaceUpdate: jest.fn()
};

// Mock blocks object
const mockBlocks = {
    Blocks: {},
    ScratchBlocks: {
        FieldVariable: {}
    }
};

describe('MCP Server', () => {
    let mcpServer;
    let vmBridge;

    beforeEach(() => {
        // Create VM bridge and MCP server
        vmBridge = new MCPVMBridge(mockVM);
        mcpServer = new MCPServer(mockVM, mockBlocks, { vmBridge });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should initialize with all required tool definitions', () => {
        const toolDefinitions = mcpServer.getToolDefinitions();
        
        // Verify tool categories exist
        expect(toolDefinitions).toBeInstanceOf(Array);
        expect(toolDefinitions.length).toBeGreaterThan(0);
        
        // Check for specific required tools
        const toolNames = toolDefinitions.map(tool => tool.function ? tool.function.name : tool.name);
        
        // Block tools
        expect(toolNames).toContain('createBlock');
        expect(toolNames).toContain('deleteBlock');
        expect(toolNames).toContain('connectBlocks');
        
        // Sprite tools
        expect(toolNames).toContain('createSprite');
        expect(toolNames).toContain('setSpritePosition');
        expect(toolNames).toContain('setSpriteSize');
        expect(toolNames).toContain('setSpriteDirection');
        
        // Project tools
        expect(toolNames).toContain('loadProject');
        expect(toolNames).toContain('saveProject');
        expect(toolNames).toContain('getProjectInfo');
        
        // Execution tools
        expect(toolNames).toContain('runProject');
        expect(toolNames).toContain('stopProject');
        expect(toolNames).toContain('getExecutionState');
    });

    test('should format block inputs correctly', async () => {
        // This is a direct access to the private method for testing
        // We're using a hack to access a private method for testing purposes
        const formatInputs = mcpServer._formatBlockInputs({
            NUMBER: 10,
            TEXT: "Hello",
            VARIABLE: "$myVar",
            BOOLEAN: true,
            BLOCK: { blockId: "test-block-123", shadow: false },
            COMPLEX: { shadow: true, value: { type: "field_dropdown", value: "option1" } }
        });
        
        // Check each formatted input type
        expect(formatInputs.NUMBER.type).toBe('number');
        expect(formatInputs.NUMBER.value).toBe(10);
        
        expect(formatInputs.TEXT.type).toBe('text');
        expect(formatInputs.TEXT.value).toBe('Hello');
        
        expect(formatInputs.VARIABLE.type).toBe('variable');
        expect(formatInputs.VARIABLE.variable).toBe('myVar');
        
        expect(formatInputs.BOOLEAN.type).toBe('number');
        expect(formatInputs.BOOLEAN.value).toBe(true);
        
        expect(formatInputs.BLOCK.type).toBe('block');
        expect(formatInputs.BLOCK.block).toBe('test-block-123');
        
        expect(formatInputs.COMPLEX.type).toBe('shadow');
        expect(formatInputs.COMPLEX.shadow).toBe(true);
    });

    test('should process tool calls correctly', async () => {
        const toolCall = {
            name: 'createBlock',
            arguments: JSON.stringify({
                blockType: 'motion_movesteps',
                inputs: { STEPS: 10 }
            })
        };

        const result = await mcpServer.processToolCall(toolCall);
        
        expect(result).toHaveProperty('success', true);
    });

    test('should return project information', async () => {
        // Setup mock sprites and stage
        mockVM.runtime.targets = [
            {
                isStage: true,
                runtime: {
                    stageWidth: 480,
                    stageHeight: 360
                },
                tempo: 60,
                videoState: 'on',
                textToSpeechLanguage: 'en',
                volume: 100,
                sprite: {
                    name: 'Stage',
                    costumes: [{ name: 'backdrop1', assetId: 'backdrop1-id' }],
                    sounds: [{ name: 'pop', assetId: 'pop-id' }]
                },
                currentCostume: 0
            },
            {
                isStage: false,
                isOriginal: true,
                id: 'sprite1',
                sprite: {
                    name: 'Sprite1',
                    costumes: [{ name: 'costume1', assetId: 'costume1-id' }],
                    sounds: []
                },
                visible: true,
                x: 0,
                y: 0,
                size: 100,
                direction: 90,
                currentCostume: 0
            }
        ];
        
        const result = await mcpServer.executeTool('getProjectInfo', {});
        
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('project');
        expect(result.project).toHaveProperty('sprites');
        expect(result.project).toHaveProperty('stage');
        expect(result.project.sprites.length).toBe(1);
        expect(result.project.sprites[0].name).toBe('Sprite1');
    });

    test('should handle project execution tools', async () => {
        const runResult = await mcpServer.executeTool('runProject', {});
        const stopResult = await mcpServer.executeTool('stopProject', {});
        
        expect(runResult).toHaveProperty('success', true);
        expect(stopResult).toHaveProperty('success', true);
        expect(mockVM.greenFlag).toHaveBeenCalled();
        expect(mockVM.stopAll).toHaveBeenCalled();
    });

    test('should handle sprite position tool', async () => {
        const result = await mcpServer.executeTool('setSpritePosition', {
            x: 100,
            y: 200
        });
        
        expect(result).toHaveProperty('success', true);
        expect(mockVM.setXYPosition).toHaveBeenCalledWith('sprite1', 100, 200);
    });

    test('should return error for unknown tool', async () => {
        const result = await mcpServer.executeTool('nonExistentTool', {});
        
        expect(result).toHaveProperty('success', false);
        expect(result.error).toContain('not found');
    });

    test('should refresh workspace after block operations', async () => {
        // Test createBlock triggers workspace refresh
        await mcpServer.executeTool('createBlock', {
            blockType: 'motion_movesteps',
            inputs: { STEPS: 10 }
        });
        expect(mockVM.refreshWorkspace).toHaveBeenCalled();

        // Reset mock
        mockVM.refreshWorkspace.mockClear();

        // Test deleteBlock triggers workspace refresh  
        await mcpServer.executeTool('deleteBlock', {
            blockId: 'test-block-id'
        });
        expect(mockVM.refreshWorkspace).toHaveBeenCalled();

        // Reset mock
        mockVM.refreshWorkspace.mockClear();

        // Test connectBlocks triggers workspace refresh
        await mcpServer.executeTool('connectBlocks', {
            parentBlockId: 'parent-block-id',
            childBlockId: 'child-block-id'
        });
        expect(mockVM.refreshWorkspace).toHaveBeenCalled();

        // Reset mock and verify non-block operations don't trigger refresh
        mockVM.refreshWorkspace.mockClear();
        
        await mcpServer.executeTool('runProject', {});
        expect(mockVM.refreshWorkspace).not.toHaveBeenCalled();
    });

    test('should refresh workspace in VM Bridge operations', async () => {
        // Test VM Bridge createBlock
        vmBridge.createBlock(null, 'motion_movesteps', {}, { x: 0, y: 0 });
        expect(mockVM.refreshWorkspace).toHaveBeenCalled();

        // Reset mock
        mockVM.refreshWorkspace.mockClear();

        // Test VM Bridge deleteBlock
        vmBridge.deleteBlock('test-block-id');
        expect(mockVM.refreshWorkspace).toHaveBeenCalled();

        // Reset mock
        mockVM.refreshWorkspace.mockClear();

        // Test VM Bridge connectBlocks
        vmBridge.connectBlocks('parent-id', 'child-id');
        expect(mockVM.refreshWorkspace).toHaveBeenCalled();
    });
});