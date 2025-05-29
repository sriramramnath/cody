/**
 * Model Context Protocol (MCP) Server for Scratch
 * Provides a standardized interface for DeepSeek to interact with Scratch
 * through function calls.
 */

import log from './log.js';

class MCPServer {
    /**
     * Creates a new MCP Server instance
     * @param {Object} vm - The Scratch virtual machine instance
     * @param {Object} blocks - The ScratchBlocks instance (optional)
     * @param {Object} props - Additional properties and components
     */
    constructor (vm, blocks, props = {}) {
        this.vm = vm;
        this.blocks = blocks || null; // Make blocks optional
        this.props = props;
        this.vmBridge = props.vmBridge || null; // Get VMBridge if provided

        // Store registered tools
        this.tools = {};

        // Initialize default tool sets
        this._initBlockTools();
        this._initSpriteTools();
        this._initProjectTools();
        this._initExecutionTools();
        
        log.info('MCP Server initialized');
    }

    /**
     * Initialize block manipulation tools
     * @private
     */
    _initBlockTools() {
        // Block creation and manipulation
        this.registerTool('createBlock', {
            description: 'Creates a new block in the current sprite',
            parameters: {
                type: 'object',
                properties: {
                    blockType: {
                        type: 'string',
                        description: 'Type of block to create (e.g., "motion_movesteps")'
                    },
                    inputs: {
                        type: 'object',
                        description: 'Inputs for the block, as key-value pairs'
                    },
                    position: {
                        type: 'object',
                        description: 'Position of the block (x and y coordinates)'
                    }
                },
                required: ['blockType']
            },
            handler: async (params) => {
                try {
                    if (!this.vm.editingTarget) {
                        return { success: false, error: 'No active sprite selected' };
                    }

                    const { blockType, inputs = {}, position = { x: 0, y: 0 } } = params;
                    
                    let blockId;
                    try {
                        // Use VMBridge if available, otherwise direct VM access
                        if (this.vmBridge) {
                            blockId = this.vmBridge.createBlock(
                                null, // current sprite
                                blockType,
                                inputs,
                                position
                            );
                        } else {
                            // Creating block directly in the VM using the editingTarget.blocks
                            const target = this.vm.editingTarget;
                            blockId = target.blocks.createBlock({
                                id: null, // Let the VM generate an ID
                                opcode: blockType,
                                fields: {},
                                inputs: this._formatBlockInputs(inputs),
                                topLevel: true,
                                shadow: false,
                                x: position.x,
                                y: position.y
                            });
                        }
                        
                        // Verify block was created by checking if it exists
                        if (!blockId) {
                            throw new Error('Block ID not returned after creation');
                        }
                        
                        // Double check block exists in the workspace
                        const blockExists = this.vmBridge ? 
                            this.vmBridge.getBlock(blockId) : 
                            this.vm.editingTarget.blocks.getBlock(blockId);
                            
                        if (!blockExists) {
                            throw new Error(`Block was created but not found in workspace: ${blockId}`);
                        }
                    } catch (createError) {
                        console.error('Error during block creation:', createError);
                        return {
                            success: false,
                            error: `Failed to create block: ${createError.message}`
                        };
                    }                    // 返回清晰的成功信息和块 ID
                    return { 
                        success: true,
                        blockId,
                        opcode: blockType,
                        message: `Created ${blockType} block with ID ${blockId}`
                    };
                } catch (error) {
                    log.error('Error creating block:', error);
                    return {
                        success: false,
                        error: `Failed to create block: ${error.message}`
                    };
                }
            }
        });

        this.registerTool('deleteBlock', {
            description: 'Deletes a block by its ID',
            parameters: {
                type: 'object',
                properties: {
                    blockId: {
                        type: 'string',
                        description: 'ID of the block to delete'
                    }
                },
                required: ['blockId']
            },
            handler: async (params) => {
                try {
                    const { blockId } = params;
                    
                    if (!this.vm.editingTarget) {
                        return { success: false, error: 'No active sprite selected' };
                    }
                    
                    if (this.vmBridge) {
                        const success = this.vmBridge.deleteBlock(blockId);
                        if (!success) {
                            return { success: false, error: `Failed to delete block ${blockId}` };
                        }
                    } else {
                        this.vm.editingTarget.blocks.deleteBlock(blockId);
                    }
                    
                    return { 
                        success: true,
                        message: `Block ${blockId} deleted successfully` 
                    };
                } catch (error) {
                    return { 
                        success: false, 
                        error: `Failed to delete block: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('connectBlocks', {
            description: 'Connects two blocks together',
            parameters: {
                type: 'object',
                properties: {
                    parentBlockId: {
                        type: 'string',
                        description: 'ID of the parent/container block'
                    },
                    childBlockId: {
                        type: 'string',
                        description: 'ID of the child/next block'
                    },
                    inputName: {
                        type: 'string',
                        description: 'Name of the input to connect to (for C-shaped blocks)'
                    },
                    connectionType: {
                        type: 'string',
                        description: 'Type of connection: "next" (sequence) or "input" (nested)',
                        enum: ['next', 'input']
                    }
                },
                required: ['parentBlockId', 'childBlockId']
            },
            handler: async (params) => {
                try {
                    const { parentBlockId, childBlockId, inputName, connectionType = 'next' } = params;
                    
                    if (!this.vm.editingTarget) {
                        return { success: false, error: 'No active sprite selected' };
                    }

                    // 确保块ID是字符串
                    const parentId = String(parentBlockId);
                    const childId = String(childBlockId);

                    // 无论使用什么方式，先检查块是否存在
                    const blocks = this.vm.editingTarget.blocks;
                    const parentBlock = blocks.getBlock(parentId);
                    const childBlock = blocks.getBlock(childId);

                    if (!parentBlock) {
                        return { success: false, error: `Parent block ${parentId} not found` };
                    }
                    
                    if (!childBlock) {
                        return { success: false, error: `Child block ${childId} not found` };
                    }

                    // 确定正确的连接输入
                    const actualInputName = connectionType === 'input' ? 
                        (inputName || 'next') : 'next';
                    
                    try {
                        // Use VMBridge if available
                        if (this.vmBridge) {
                            const connected = this.vmBridge.connectBlocks(
                                parentId, 
                                childId, 
                                actualInputName
                            );
                            
                            if (!connected) {
                                return { 
                                    success: false, 
                                    error: `Failed to connect blocks. Connection failed with VMBridge.` 
                                };
                            }
                        } else {
                            // 直接使用VM方式连接块
                            blocks.connect(parentId, childId, actualInputName);
                        }
                        
                        // 验证连接是否成功
                        const updatedParent = blocks.getBlock(parentId);
                        if (connectionType === 'next' && (!updatedParent.next || updatedParent.next !== childId)) {
                            return { 
                                success: false, 
                                error: `连接似乎已执行，但块未正确链接。请检查块类型是否兼容。` 
                            };
                        }
                        
                        // 成功连接
                        return {
                            success: true,
                            parentBlockId: parentId,
                            childBlockId: childId,
                            connectionType,
                            inputName: actualInputName,
                            message: `成功连接块 ${childId} 到 ${parentId}`
                        };
                        
                    } catch (connectionError) {
                        return { 
                            success: false, 
                            error: `Connection error: ${connectionError.message}` 
                        };
                    }
                    
                    return { 
                        success: true,
                        message: `Connected block ${childBlockId} to ${parentBlockId} (${connectionType})`
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to connect blocks: ${error.message}` 
                    };
                }
            }
        });
    }

    /**
     * Initialize sprite manipulation tools
     * @private
     */
    _initSpriteTools() {
        this.registerTool('createSprite', {
            description: 'Creates a new sprite',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name for the new sprite'
                    },
                    costume: {
                        type: 'string',
                        description: 'Name of costume to use (optional)'
                    },
                    libraryItem: {
                        type: 'string',
                        description: 'Library item ID to use as base sprite'
                    },
                    x: {
                        type: 'number',
                        description: 'Initial X position'
                    },
                    y: {
                        type: 'number',
                        description: 'Initial Y position'
                    },
                    size: {
                        type: 'number',
                        description: 'Initial size (percentage)'
                    }
                },
                required: []
            },
            handler: async (params) => {
                try {
                    const { name, costume, libraryItem, x, y, size } = params;
                    let sprite = null;
                    
                    // Create sprite using the appropriate method
                    if (libraryItem) {
                        // Create from library item if specified
                        try {
                            if (this.props.assetLibrary && this.props.assetLibrary.sprites) {
                                const item = this.props.assetLibrary.sprites.find(s => 
                                    s.id === libraryItem || s.name === libraryItem
                                );
                                
                                if (item) {
                                    sprite = await this.vm.addSprite(item.json);
                                } else {
                                    return {
                                        success: false,
                                        error: `Library item "${libraryItem}" not found`
                                    };
                                }
                            } else {
                                return {
                                    success: false,
                                    error: 'Sprite library not available'
                                };
                            }
                        } catch (e) {
                            return {
                                success: false,
                                error: `Failed to add sprite from library: ${e.message}`
                            };
                        }
                    } else {
                        // Create empty sprite if no library item specified
                        sprite = await this.vm.addSprite('{}');
                    }
                    
                    // If we have a sprite, configure it
                    if (sprite) {
                        // Rename if name specified
                        if (name) {
                            this.vm.renameSprite(sprite.id, name);
                        }
                        
                        // Add costume if specified and not from library
                        if (costume && !libraryItem) {
                            try {
                                if (this.props.assetLibrary && this.props.assetLibrary.costumes) {
                                    const costumeAsset = this.props.assetLibrary.costumes.find(c => 
                                        c.name === costume
                                    );
                                    
                                    if (costumeAsset) {
                                        await this.vm.addCostume(
                                            costumeAsset.name,
                                            costumeAsset.md5,
                                            costumeAsset.rotationCenterX,
                                            costumeAsset.rotationCenterY,
                                            sprite.id
                                        );
                                    }
                                }
                            } catch (e) {
                                console.warn(`Failed to add costume "${costume}": ${e.message}`);
                                // Don't fail the entire operation if costume addition fails
                            }
                        }
                        
                        // Set position if specified
                        if (typeof x === 'number' && typeof y === 'number') {
                            this.vm.setXYPosition(sprite.id, x, y);
                        }
                        
                        // Set size if specified
                        if (typeof size === 'number') {
                            this.vm.renderer.updateDrawableSpriteScale(sprite.id, size / 100);
                        }
                        
                        // Get the updated sprite info
                        const target = this.vm.runtime.getTargetById(sprite.id);
                        const spriteInfo = target ? {
                            id: target.id,
                            name: target.sprite.name,
                            visible: target.visible,
                            x: target.x,
                            y: target.y,
                            size: target.size,
                            direction: target.direction,
                            currentCostume: target.currentCostume,
                            costumeCount: target.sprite.costumes.length
                        } : { id: sprite.id };
                        
                        return { 
                            success: true,
                            sprite: spriteInfo,
                            message: `Created sprite "${spriteInfo.name}" with ID ${spriteInfo.id}`
                        };
                    } else {
                        return {
                            success: false,
                            error: 'Failed to create sprite'
                        };
                    }
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to create sprite: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('setSpritePosition', {
            description: 'Sets the position of a sprite',
            parameters: {
                type: 'object',
                properties: {
                    spriteId: {
                        type: 'string', 
                        description: 'ID of the sprite to position (optional, uses current sprite if not provided)'
                    },
                    x: {
                        type: 'number',
                        description: 'X coordinate'
                    },
                    y: {
                        type: 'number',
                        description: 'Y coordinate'
                    }
                },
                required: ['x', 'y']
            },
            handler: async (params) => {
                try {
                    let { spriteId, x, y } = params;
                    
                    // Use current sprite if spriteId not provided
                    if (!spriteId && this.vm.editingTarget) {
                        spriteId = this.vm.editingTarget.id;
                    }
                    
                    if (!spriteId) {
                        return { success: false, error: 'No sprite specified or selected' };
                    }
                    
                    // Set sprite position using VM
                    this.vm.setXYPosition(spriteId, x, y);
                    
                    return { 
                        success: true,
                        message: `Set sprite position to (${x}, ${y})` 
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to set sprite position: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('setSpriteSize', {
            description: 'Sets the size of a sprite',
            parameters: {
                type: 'object',
                properties: {
                    spriteId: {
                        type: 'string',
                        description: 'ID of the sprite to resize (optional, uses current sprite if not provided)'
                    },
                    size: {
                        type: 'number',
                        description: 'Size percentage (100 is normal size)'
                    }
                },
                required: ['size']
            },
            handler: async (params) => {
                try {
                    let { spriteId, size } = params;
                    
                    // Use current sprite if spriteId not provided
                    if (!spriteId && this.vm.editingTarget) {
                        spriteId = this.vm.editingTarget.id;
                    }
                    
                    if (!spriteId) {
                        return { success: false, error: 'No sprite specified or selected' };
                    }
                    
                    // Set sprite size
                    this.vm.postSpriteInfo({ size: size });
                    
                    return { 
                        success: true,
                        message: `Set sprite size to ${size}%` 
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to set sprite size: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('setSpriteDirection', {
            description: 'Sets the direction of a sprite',
            parameters: {
                type: 'object',
                properties: {
                    spriteId: {
                        type: 'string',
                        description: 'ID of the sprite (optional, uses current sprite if not provided)'
                    },
                    direction: {
                        type: 'number',
                        description: 'Direction in degrees (0-360)'
                    }
                },
                required: ['direction']
            },
            handler: async (params) => {
                try {
                    let { spriteId, direction } = params;
                    
                    // Use current sprite if spriteId not provided
                    if (!spriteId && this.vm.editingTarget) {
                        spriteId = this.vm.editingTarget.id;
                    }
                    
                    if (!spriteId) {
                        return { success: false, error: 'No sprite specified or selected' };
                    }
                    
                    // Set sprite direction
                    this.vm.postSpriteInfo({ direction: direction });
                    
                    return { 
                        success: true,
                        message: `Set sprite direction to ${direction} degrees` 
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to set sprite direction: ${error.message}` 
                    };
                }
            }
        });
    }

    /**
     * Initialize project management tools
     * @private
     */
    _initProjectTools() {
        this.registerTool('loadProject', {
            description: 'Loads a Scratch project',
            parameters: {
                type: 'object',
                properties: {
                    projectId: {
                        type: 'string',
                        description: 'ID of the project to load'
                    },
                    projectData: {
                        type: 'string',
                        description: 'JSON string of project data (alternative to projectId)'
                    }
                },
                required: []
            },
            handler: async (params) => {
                try {
                    const { projectId, projectData } = params;
                    
                    if (!projectId && !projectData) {
                        return { 
                            success: false, 
                            error: 'Either projectId or projectData must be provided' 
                        };
                    }
                    
                    if (projectData) {
                        // Load project from provided data
                        try {
                            const projectDataObj = JSON.parse(projectData);
                            await this.vm.loadProject(projectDataObj);
                            return { 
                                success: true,
                                message: 'Project loaded from provided data' 
                            };
                        } catch (e) {
                            return { 
                                success: false, 
                                error: `Invalid project data: ${e.message}` 
                            };
                        }
                    }
                    
                    // If we get here, we're loading by ID (which may require network access)
                    // Implementation depends on project loading mechanism and where projects are stored
                    if (this.props.onLoadProject && typeof this.props.onLoadProject === 'function') {
                        try {
                            await this.props.onLoadProject(projectId);
                            return { 
                                success: true,
                                message: `Project ${projectId} loaded successfully` 
                            };
                        } catch (e) {
                            return { 
                                success: false, 
                                error: `Failed to load project by ID: ${e.message}` 
                            };
                        }
                    } else {
                        return { 
                            success: false, 
                            error: 'Project loading by ID not implemented in this environment' 
                        };
                    }
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to load project: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('saveProject', {
            description: 'Saves the current Scratch project',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name to save the project as'
                    },
                    asNew: {
                        type: 'boolean',
                        description: 'Whether to save as a new project'
                    }
                }
            },
            handler: async (params) => {
                try {
                    const { name, asNew } = params;
                    
                    // Get project data
                    const projectData = this.vm.saveProjectSb3();
                    
                    // Use provided save handler if available
                    if (this.props.onSaveProject && typeof this.props.onSaveProject === 'function') {
                        try {
                            const savedProjectInfo = await this.props.onSaveProject({
                                projectData,
                                name,
                                asNew: asNew || false
                            });
                            
                            return { 
                                success: true,
                                message: `Project saved${name ? ` as "${name}"` : ''}`,
                                projectInfo: savedProjectInfo
                            };
                        } catch (e) {
                            return { 
                                success: false, 
                                error: `Failed to save project: ${e.message}` 
                            };
                        }
                    }
                    
                    // If no save handler, just return the project data
                    return { 
                        success: true,
                        message: `Project data generated${name ? ` for "${name}"` : ''}`,
                        // Don't return actual binary data in the response as it would be too large
                        dataAvailable: true
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to save project: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('getProjectInfo', {
            description: 'Gets information about the current project',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async () => {
                try {
                    // Get sprites information
                    const sprites = this.vm.runtime.targets
                        .filter(target => !target.isStage && target.isOriginal)
                        .map(target => ({
                            id: target.id,
                            name: target.sprite.name,
                            visible: target.visible,
                            x: target.x,
                            y: target.y,
                            size: target.size,
                            direction: target.direction,
                            currentCostume: target.currentCostume,
                            costumes: target.sprite.costumes.map(costume => ({
                                name: costume.name,
                                id: costume.assetId
                            })),
                            sounds: target.sprite.sounds.map(sound => ({
                                name: sound.name,
                                id: sound.assetId
                            }))
                        }));
                    
                    // Get stage information
                    const stage = this.vm.runtime.targets.find(target => target.isStage);
                    const stageInfo = stage ? {
                        width: this.vm.runtime.stageWidth,
                        height: this.vm.runtime.stageHeight,
                        tempo: stage.tempo,
                        videoState: stage.videoState,
                        textToSpeechLanguage: stage.textToSpeechLanguage,
                        volume: stage.volume,
                        name: stage.sprite.name,
                        costumes: stage.sprite.costumes.map(costume => ({
                            name: costume.name,
                            id: costume.assetId
                        })),
                        sounds: stage.sprite.sounds.map(sound => ({
                            name: sound.name,
                            id: sound.assetId
                        })),
                        currentCostume: stage.currentCostume
                    } : null;
                    
                    // Project metadata
                    const projectInfo = {
                        sprites,
                        stage: stageInfo,
                        editingTarget: this.vm.editingTarget ? this.vm.editingTarget.id : null,
                        meta: {
                            semver: this.vm.runtime.version,
                            vm: this.vm.runtime.version,
                            agent: navigator.userAgent
                        }
                    };
                    
                    return { 
                        success: true,
                        project: projectInfo
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to get project info: ${error.message}` 
                    };
                }
            }
        });
    }

    /**
     * Initialize execution control tools
     * @private
     */
    _initExecutionTools() {
        this.registerTool('runProject', {
            description: 'Runs the Scratch project',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async () => {
                try {
                    this.vm.greenFlag();
                    return { 
                        success: true,
                        message: 'Project started running' 
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to run project: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('stopProject', {
            description: 'Stops the Scratch project execution',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async () => {
                try {
                    this.vm.stopAll();
                    return { 
                        success: true,
                        message: 'Project execution stopped' 
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to stop project: ${error.message}` 
                    };
                }
            }
        });

        this.registerTool('getExecutionState', {
            description: 'Gets the current execution state of the project',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: async () => {
                try {
                    const isRunning = this.vm.runtime.isRunning;
                    const activeThreads = this.vm.runtime.threads.filter(thread => thread.isRunning()).length;
                    
                    return { 
                        success: true,
                        state: {
                            isRunning,
                            activeThreads
                        }
                    };
                } catch (error) {
                    return { 
                        success: false,
                        error: `Failed to get execution state: ${error.message}` 
                    };
                }
            }
        });
    }

    /**
     * Format block inputs into the structure expected by the VM
     * @param {Object} inputs - Simple key-value pairs for inputs
     * @returns {Object} - Formatted inputs for VM
     * @private
     */
    _formatBlockInputs(inputs) {
        const formattedInputs = {};
        
        Object.entries(inputs).forEach(([key, value]) => {
            // Handle different value types
            if (typeof value === 'object' && value !== null) {
                if (value.blockId) {
                    // Another block is being used as an input
                    formattedInputs[key] = {
                        type: 'block',
                        block: value.blockId,
                        shadow: value.shadow || false
                    };
                } else {
                    // Complex object - likely a shadow block definition
                    formattedInputs[key] = {
                        type: 'shadow',
                        shadow: true,
                        value: value
                    };
                }
            } else if (typeof value === 'string') {
                // String values could be variables/fields or literal values
                if (value.startsWith('$')) {
                    // Variable reference (e.g., $variable1)
                    formattedInputs[key] = {
                        type: 'variable',
                        variable: value.substring(1)
                    };
                } else {
                    // String literal
                    formattedInputs[key] = {
                        type: 'text',
                        value: value
                    };
                }
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                // Number or boolean literal
                formattedInputs[key] = {
                    type: 'number',
                    value: value
                };
            } else {
                // Fallback for any other type
                formattedInputs[key] = {
                    type: 'text',
                    value: String(value)
                };
            }
        });
        
        return formattedInputs;
    }

    /**
     * Register a new tool
     * @param {string} name - Name of the tool
     * @param {Object} toolSpec - Tool specification including description, parameters, and handler
     */
    registerTool(name, toolSpec) {
        this.tools[name] = toolSpec;
        log.info(`Registered tool: ${name}`);
    }

    /**
     * Get all registered tools
     * @returns {Array} Array of tool definitions formatted for MCP
     */
    getToolDefinitions() {
        return Object.entries(this.tools).map(([name, tool]) => ({
            type: 'function',
            function: {
                name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
    }

    /**
     * Get current Scratch context information including sprites, blocks, and project state
     * @returns {Object} Current Scratch context with detailed information
     */
    getScratchContext() {
        try {
            const context = {
                sprites: [],
                currentBlocksInfo: {},
                stageInfo: {},
                projectInfo: {},
                canvasState: {}
            };
            
            // Get all sprites information
            const targets = this.vm.runtime.targets;
            if (targets) {
                targets.forEach(target => {
                    if (!target.isStage) {
                        // For sprites - include richer information
                        const spriteInfo = {
                            id: target.id,
                            name: target.sprite.name,
                            visible: target.visible,
                            x: target.x,
                            y: target.y,
                            size: target.size,
                            direction: target.direction,
                            layerOrder: target.layerOrder,
                            effects: target.effects,
                            currentCostume: target.currentCostume,
                            currentCostumeName: target.sprite.costumes[target.currentCostume] ? 
                                target.sprite.costumes[target.currentCostume].name : 'unknown',
                            costumes: target.sprite.costumes.map(c => ({
                                name: c.name,
                                assetId: c.assetId,
                                dataFormat: c.dataFormat
                            })),
                            blocks: {}
                        };
                        
                        // Get blocks for this sprite
                        if (target.blocks) {
                            const blocks = target.blocks._blocks;
                            if (blocks) {
                                // Only include top-level blocks to keep the context concise
                                const topLevelBlocks = {};
                                Object.values(blocks).forEach(block => {
                                    if (block.topLevel) {
                                        topLevelBlocks[block.id] = {
                                            opcode: block.opcode,
                                            next: block.next,
                                            inputs: block.inputs
                                        };
                                    }
                                });
                                spriteInfo.blocks = topLevelBlocks;
                            }
                        }
                        
                        context.sprites.push(spriteInfo);
                    } else {
                        // For stage
                        context.stageInfo = {
                            id: target.id,
                            name: 'Stage',
                            currentCostume: target.currentCostume,
                            costumes: target.sprite.costumes.map(c => ({
                                name: c.name,
                                assetId: c.assetId,
                                dataFormat: c.dataFormat
                            }))
                        };
                    }
                });
            }
            
            // Get current editing target's blocks
            const editingTarget = this.vm.editingTarget;
            if (editingTarget && editingTarget.blocks) {
                context.currentBlocksInfo = {
                    targetId: editingTarget.id,
                    targetName: editingTarget.sprite.name,
                    isStage: editingTarget.isStage
                };
            }
            
            // Get project info
            const projectData = this.vm.toJSON();
            if (projectData) {
                context.projectInfo = {
                    name: this.vm.runtime.projectTitle || 'Untitled',
                    hasUnsavedChanges: this.vm.runtime.hasUnsavedChanges || false,
                    spriteCount: context.sprites.length,
                    stageWidth: this.vm.runtime.stageWidth || 480,
                    stageHeight: this.vm.runtime.stageHeight || 360
                };
            }
            
            // Get canvas state for visual context
            context.canvasState = {
                isRunning: this.vm.runtime.isRunning, 
                editorMode: this.vm.runtime.isRealtimeMode ? 'realtime' : 'normal',
                visibleLayer: this.vm.runtime.renderer && this.vm.runtime.renderer._visibleDrawMode || 'default',
                frameRate: this.vm.runtime && this.vm.runtime.frameLoop && 
                    this.vm.runtime.frameLoop.framerate !== undefined && 
                    typeof this.vm.runtime.frameLoop.framerate === 'number' ? 
                    Math.round(this.vm.runtime.frameLoop.framerate) : 30 // 使用默认值30如果framerate不可用
            };
            
            // Add execution information if project is running
            if (this.vm.runtime.isRunning) {
                context.executionInfo = {
                    activeThreads: (this.vm.runtime && Array.isArray(this.vm.runtime.threads)) ? 
                        this.vm.runtime.threads.filter(thread => 
                            thread && 
                            typeof thread === 'object' && 
                            typeof thread.isRunning === 'function' && 
                            thread.isRunning()
                        ).length : 0,
                    isGreenFlagRunning: this.vm.runtime && 
                                      this.vm.runtime._events && 
                                      this.vm.runtime._events.PROJECT_RUN_START
                };
            }
            
            return context;
        } catch (error) {
            console.error('Error getting Scratch context:', error);
            // 返回一个最小但有效的上下文对象
            return {
                error: `获取Scratch上下文信息失败: ${error.message}`,
                sprites: [],
                blockInfo: {},
                stageInfo: {
                    name: 'Stage',
                    costumes: []
                },
                projectInfo: {
                    name: this.vm && this.vm.runtime && this.vm.runtime.projectTitle || 'Untitled',
                    spriteCount: 0
                },
                currentBlocksInfo: {},
                canvasState: {
                    isRunning: false,
                    editorMode: 'normal',
                    visibleLayer: 'default',
                    frameRate: 30
                }
            };
        }
    }

    /**
     * Execute a tool by name with provided parameters
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} params - Parameters to pass to the tool
     * @returns {Promise<Object>} Result of the tool execution
     */
    async executeTool(toolName, params) {
        try {
            const tool = this.tools[toolName];
            
            if (!tool) {
                return { 
                    success: false, 
                    error: `Tool "${toolName}" not found` 
                };
            }
            
            log.info(`Executing tool: ${toolName}`, params);
            const result = await tool.handler(params);
            log.info(`Tool execution result:`, result);
            
            return result;
        } catch (error) {
            log.error(`Error executing tool ${toolName}:`, error);
            return { 
                success: false, 
                error: `Tool execution failed: ${error.message}` 
            };
        }
    }

    /**
     * Process a tool call from the MCP protocol
     * @param {Object} toolCall - Tool call object from DeepSeek
     * @returns {Promise<Object>} Result of the tool execution
     */
    async processToolCall(toolCall) {
        try {
            const { name, arguments: args } = toolCall;
            
            log.info(`处理工具调用: ${name}`);
            
            let params = {};
            try {
                params = typeof args === 'string' ? JSON.parse(args) : args;
                log.info(`工具参数:`, params);
            } catch (e) {
                log.error(`参数解析错误:`, e);
                return { success: false, error: `无效的工具参数: ${e.message}` };
            }
            
            // 执行前验证VM和工具的可用性
            if (!this.vm) {
                return { success: false, error: `VM实例不可用` };
            }
            
            if (!this.tools[name]) {
                return { success: false, error: `未知工具: ${name}` };
            }
            
            // 记录块创建/连接操作的详细信息
            if (name === 'createBlock') {
                log.info(`创建块 ${params.blockType} 详情:`, JSON.stringify(params));
            } else if (name === 'connectBlocks') {
                log.info(`连接块 ${params.parentBlockId} -> ${params.childBlockId} 详情:`, JSON.stringify(params));
            }
            
            // 执行工具并捕获结果
            const result = await this.executeTool(name, params);
            
            // 增强结果信息以改进调试
            if (result.success) {
                // 成功结果增加更多诊断信息
                if (name === 'createBlock' && result.blockId) {
                    // 验证块是否实际存在
                    const blockExists = this.vmBridge ? 
                        this.vmBridge.getBlock(result.blockId) : 
                        this.vm.editingTarget.blocks.getBlock(result.blockId);
                        
                    // 增加诊断信息
                    result.blockStatus = blockExists ? 'confirmed' : 'not-found-after-creation';
                    result.blockDetails = blockExists || null;
                } else if (name === 'connectBlocks') {
                    result.connectionDetails = {
                        parentId: params.parentBlockId,
                        childId: params.childBlockId,
                        inputName: params.inputName || 'next',
                        timestamp: Date.now()
                    };
                }
            } else {
                // 失败结果增加故障排除信息
                result.timestamp = Date.now();
                result.troubleshootingTips = this._getTroubleshootingTips(name, params, result.error);
            }
            
            return result;
        } catch (error) {
            log.error('处理工具调用时出错:', error);
            return { 
                success: false, 
                error: `工具调用处理失败: ${error.message}`,
                timestamp: Date.now(),
                troubleshootingTips: this._getTroubleshootingTips('general', {}, error.message)
            };
        }
    }
    
    /**
     * 获取特定工具错误的故障排除提示
     * @private
     * @param {string} toolName - 工具名称
     * @param {Object} params - 工具参数
     * @param {string} errorMessage - 错误消息
     * @returns {Array} 故障排除提示列表
     */
    _getTroubleshootingTips(toolName, params, errorMessage) {
        const tips = [];
        
        // 通用提示
        tips.push('检查Scratch VM是否已初始化并准备好接受指令');
        
        // 特定工具提示
        switch (toolName) {
            case 'createBlock':
                tips.push('确保提供的块类型(blockType)在Scratch中有效');
                tips.push('检查输入参数是否符合块类型的要求');
                break;
                
            case 'connectBlocks':
                tips.push('确保要连接的两个块ID都有效并且块已创建成功');
                tips.push('验证父块和子块的类型是否兼容');
                tips.push('连接前先使用getBlock检查块是否存在');
                break;
                
            case 'general':
                tips.push('检查工具名称是否正确');
                tips.push('检查工具参数是否完整且格式正确');
                break;
        }
        
        // 基于错误消息的额外提示
        if (errorMessage) {
            if (errorMessage.includes('not found') || errorMessage.includes('未找到')) {
                tips.push('块可能未成功创建，检查之前的createBlock操作是否返回有效ID');
            } else if (errorMessage.includes('ID not returned') || errorMessage.includes('ID未返回')) {
                tips.push('尝试使用自定义ID创建块，而不是依赖VM生成ID');
            }
        }
        
        return tips;
    }
}

export default MCPServer;