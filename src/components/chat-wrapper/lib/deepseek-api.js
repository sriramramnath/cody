/**
 * DeepSeek API 调用工具函数
 * 提供与 DeepSeek API 交互的功能
 * 使用 OpenAI SDK 处理工具调用
 * 支持流式(stream)和非流式两种响应处理方式
 */

import bingSearchAPI from './bing-search-api';
import indexedDBHelper from './indexed-db-helper';
import OpenAI from 'openai';

// 默认API设置
const DEFAULT_API_KEY = '';
const DEFAULT_API_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL_NAME = 'deepseek-chat';
const DEFAULT_TEMPERATURE = 0.7;

// 创建 OpenAI Client 实例
let openaiClient = null;

// 从存储加载设置 (先检查IndexedDB，如果不可用则回退到localStorage)
const loadSettingsFromStorage = async () => {
    // 首先从 IndexedDB 加载
    try {
        const settings = await indexedDBHelper.getModelSettings();
        if (settings) {
            return {
                apiKey: settings.apiKey || DEFAULT_API_KEY,
                apiUrl: settings.apiUrl || DEFAULT_API_URL,
                modelName: settings.modelName || DEFAULT_MODEL_NAME,
                temperature: settings.temperature !== undefined ? settings.temperature : DEFAULT_TEMPERATURE
            };
        }
    } catch (e) {
        console.error('从 IndexedDB 加载设置失败，尝试从 localStorage 加载:', e);
    }
    
    // 如果 IndexedDB 不可用或没有设置，从 localStorage 加载
    try {
        const savedSettings = localStorage.getItem('deepseekSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            return {
                apiKey: settings.apiKey || DEFAULT_API_KEY,
                apiUrl: settings.apiUrl || DEFAULT_API_URL,
                modelName: settings.modelName || DEFAULT_MODEL_NAME,
                temperature: settings.temperature !== undefined ? settings.temperature : DEFAULT_TEMPERATURE
            };
        }
    } catch (e) {
        console.error('无法解析保存的设置:', e);
    }
    
    // 返回默认设置
    return {
        apiKey: DEFAULT_API_KEY,
        apiUrl: DEFAULT_API_URL,
        modelName: DEFAULT_MODEL_NAME,
        temperature: DEFAULT_TEMPERATURE
    };
};

/**
 * 默认系统提示，指导 AI 助手的行为
 */
const DEFAULT_SYSTEM_PROMPT = `你是 Scratch 助手，一个热情洋溢的编程伙伴，专为激发儿童创造力和编程兴趣而设计。
请使用生动活泼、充满想象力的语言回答问题，将编程描述为一次奇妙的冒险。
主动提供有趣且富有启发性的项目创意，比如"会跳舞的恐龙"、"互动故事"或"太空探险游戏"。
在解释 Scratch 概念时，尽可能将抽象概念与孩子熟悉的事物联系起来（例如："变量就像一个神奇的盒子，可以存放各种宝藏"）。
积极使用工具直接在 Scratch 画布上展示操作，让学习变得直观有趣。
保持回答简洁、友好且适合儿童，使用简单词汇和短句。
不要使用复杂的技术术语，除非必要并能用比喻解释它们。

## 交互指南

1. 在每次回答结束时，提供 3-5 个创意十足的后续问题选项，让用户可以点击继续对话。这些问题应该用"后续问题:"标记，每行一个问题，确保至少包含 1-2 个与画布和视觉创作相关的问题。例如：

后续问题:
如何让角色在画布上画出彩虹轨迹？
怎样给我们的游戏添加一个惊喜动画？
能让角色对鼠标点击做出反应吗？
如何创建一个会变换颜色的背景？
能设计一个有多个场景的冒险故事吗？

2. 后续问题应该：
   - 充满创意和想象力，激发探索欲望
   - 包含视觉效果和画布操作的创意
   - 与当前讨论的主题密切相关
   - 引导用户进一步探索或改进项目
   - 简洁明了，易于理解

## MCP 工具功能

你可以使用特殊的魔法工具直接操作 Scratch 项目，帮助用户创建和修改程序。要积极主动地展示这些魔法工具的使用，让用户看到代码"活"起来的惊喜。每当有机会展示如何创建有趣的效果、动画或互动元素时，应优先使用工具直接在画布上创建，而不仅仅是文字描述。

### 工具类别和功能

1. **代码块操作**
   - createBlock: 创建新的代码块 (参数: blockType, inputs, position)
   - deleteBlock: 删除代码块 (参数: blockId)
   - connectBlocks: 连接两个代码块 (参数: parentBlockId, childBlockId, connectionType, inputName)

2. **角色(精灵)操作**
   - createSprite: 创建新角色 (参数: name, libraryItem, x, y, size)
   - setSpritePosition: 设置角色位置 (参数: spriteId, x, y)
   - setSpriteSize: 设置角色大小 (参数: spriteId, size)
   - setSpriteDirection: 设置角色方向 (参数: spriteId, direction)

3. **项目管理**
   - getProjectInfo: 获取项目信息
   - loadProject: 加载项目 (参数: projectId 或 projectData)
   - saveProject: 保存项目 (参数: name, asNew)

4. **执行控制**
   - runProject: 运行项目(绿旗)
   - stopProject: 停止项目
   - getExecutionState: 获取项目执行状态

5. **网络搜索**
   - bingSearch: 使用 Bing 搜索信息 (参数: query, count)

### 工具使用示例

当用户需要创建移动的猫咪时，你可以：

1. 使用工具创建移动代码块:
   \`\`\`json
   {
     "name": "createBlock",
     "arguments": {
       "blockType": "motion_movesteps",
       "inputs": { "STEPS": 10 }
     }
   }
   \`\`\`

2. 使用工具重新定位角色:
   \`\`\`json
   {
     "name": "setSpritePosition",
     "arguments": {
       "x": 0,
       "y": 0
     }
   }
   \`\`\`

3. 当用户询问最新的 Scratch 更新或外部信息时，使用搜索工具:
   \`\`\`json
   {
     "name": "bingSearch",
     "arguments": {
       "query": "Scratch 最新版本特性",
       "count": 3
     }
   }
   \`\`\`

### 工具调用指南

- 主动使用工具为用户展示有趣的编程效果，即使用户没有明确要求也可以提出建议并展示
- 尽可能多地使用画布和视觉相关的功能，如创建角色、移动、旋转、改变颜色效果等
- 设计有创意的演示，例如让角色跳舞、画出图案、创建简单游戏等
- 在使用工具之前，用充满期待的语气简要说明即将创造的神奇效果
- 工具执行后，充满热情地解释结果，鼓励用户尝试修改参数
- 如果工具执行失败，用幽默的方式解释原因并提供替代方案

记住：你的目标是通过引人入胜的视觉效果和互动体验，激发儿童的好奇心和创造力，让编程成为一次奇妙的探险！`;

// 存储 MCP 服务器实例的引用
let mcpServer = null;

// 存储 API 设置
let apiSettings = {
    apiKey: DEFAULT_API_KEY,
    apiUrl: DEFAULT_API_URL,
    modelName: DEFAULT_MODEL_NAME,
    temperature: DEFAULT_TEMPERATURE
};

// 初始化加载设置
(async () => {
    apiSettings = await loadSettingsFromStorage();
})();

/**
 * 设置 MCP 服务器实例
 * @param {object} server - MCP 服务器实例
 */
const setMCPServer = server => {
    mcpServer = server;
};

/**
 * 更新 API 设置
 * @param {object} settings - 新的设置对象
 */
const updateSettings = async settings => {
    if (settings.apiKey) apiSettings.apiKey = settings.apiKey;
    if (settings.apiUrl) apiSettings.apiUrl = settings.apiUrl;
    if (settings.modelName) apiSettings.modelName = settings.modelName;
    if (settings.temperature !== undefined) apiSettings.temperature = settings.temperature;
    
    // 保存到 IndexedDB
    try {
        await indexedDBHelper.saveModelSettings(apiSettings);
    } catch (e) {
        console.error('无法保存设置到 IndexedDB:', e);
    }
    
    // 同时保存到 localStorage 作为备份
    try {
        localStorage.setItem('deepseekSettings', JSON.stringify(apiSettings));
    } catch (e) {
        console.error('无法保存设置到 localStorage:', e);
    }
    
    // 初始化 OpenAI 客户端
    initializeOpenAIClient();
    
    console.log('DeepSeek API 设置已更新:', apiSettings);
};

/**
 * 初始化 OpenAI 客户端
 */
const initializeOpenAIClient = () => {
    try {
        // 创建新的 OpenAI 客户端实例
        openaiClient = new OpenAI({
            apiKey: apiSettings.apiKey,
            baseURL: apiSettings.apiUrl,
            dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
            timeout: 60000, // 设置60秒超时
            maxRetries: 2 // 最多重试2次
        });
        console.log('OpenAI 客户端已初始化');
    } catch (error) {
        console.error('初始化 OpenAI 客户端失败:', error);
        openaiClient = null;
    }
};

/**
 * 规范化工具调用参数格式
 * 处理可能的不同参数格式，确保返回有效的对象
 * @param {string|object} args - 工具调用的参数
 * @returns {object} 规范化后的参数对象
 */
const normalizeToolArguments = args => {
    // 如果已经是对象，直接返回
    if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
        return args;
    }
    
    // 如果是字符串，尝试解析JSON
    if (typeof args === 'string') {
        try {
            // 首先尝试标准JSON解析
            return JSON.parse(args);
        } catch (jsonError) {
            console.warn('标准JSON解析失败，尝试替代方法:', jsonError.message);
            
            // 如果失败，尝试修复常见的JSON格式问题
            try {
                // 将单引号替换为双引号
                let fixedArgs = args.replace(/'/g, '"');
                
                // 添加引号到属性名称
                fixedArgs = fixedArgs.replace(/(\w+):/g, '"$1":');
                
                // 确保布尔值和数字正确格式化
                fixedArgs = fixedArgs
                    .replace(/:\s*true\b/g, ': true')
                    .replace(/:\s*false\b/g, ': false')
                    .replace(/:\s*(\d+)([,}])/g, ': $1$2');
                
                return JSON.parse(fixedArgs);
            } catch (fixError) {
                console.error('无法修复JSON格式:', fixError);
                
                // 最后手段：尝试提取键值对
                const result = {};
                const keyValuePairs = args.split(',');
                for (const pair of keyValuePairs) {
                    if (pair.includes(':')) {
                        const [key, value] = pair.split(':').map(s => s.trim());
                        if (key && value !== undefined) {
                            // 尝试转换值的类型
                            const numValue = Number(value);
                            if (!isNaN(numValue)) {
                                result[key] = numValue;
                            } else if (value.toLowerCase() === 'true') {
                                result[key] = true;
                            } else if (value.toLowerCase() === 'false') {
                                result[key] = false;
                            } else {
                                // 移除可能的引号
                                result[key] = value.replace(/^["']|["']$/g, '');
                            }
                        }
                    }
                }
                
                // 如果至少有一个键值对，返回结果对象
                if (Object.keys(result).length > 0) {
                    console.log('手动解析参数结果:', result);
                    return result;
                }
                
                // 完全无法解析，返回空对象
                console.error('无法解析工具参数，返回空对象');
                return {};
            }
        }
    }
    
    // 如果是其他类型，返回空对象
    console.warn(`无法处理的参数类型: ${typeof args}`);
    return {};
};

/**
 * 测试与 DeepSeek API 的连接
 * @param {object} testSettings - 用于测试的设置对象
 * @returns {Promise<object>} - 包含连接结果的对象
 */
const testConnection = async (testSettings = {}) => {
    try {
        // 使用提供的测试设置或当前设置
        const apiKey = testSettings.apiKey || apiSettings.apiKey;
        const apiUrl = testSettings.apiUrl || apiSettings.apiUrl;
        const modelName = testSettings.modelName || apiSettings.modelName;
        
        // 创建 OpenAI 测试客户端
        const testClient = new OpenAI({
            apiKey: apiKey,
            baseURL: apiUrl,
            dangerouslyAllowBrowser: true // 允许在浏览器环境中使用
        });
        
        // 使用 OpenAI SDK 发送简单请求
        try {
            await testClient.chat.completions.create({
                model: modelName,
                messages: [{role: 'user', content: '测试连接'}],
                max_tokens: 10
            });
            
            // 连接成功
            return {
                success: true,
                message: '连接成功！API 设置有效。'
            };
        } catch (error) {
            // 提取错误信息
            let errorMessage = error.message;
            let statusCode = 'unknown';
            
            if (error.response) {
                errorMessage = error.response.error?.message || error.message;
                statusCode = error.status || 'unknown';
            }
            
            return {
                success: false,
                message: `连接失败: ${errorMessage} (状态码: ${statusCode})`
            };
        }
    } catch (error) {
        // 处理所有类型的错误
        return {
            success: false,
            message: `连接错误: ${error.message}`
        };
    }
};

/**
 * 初始化聊天会话，返回初始消息数组
 * @returns {Array} 初始消息数组，包含系统提示
 */
const initializeChat = () => [
    {
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT
    },
    {
        role: 'assistant',
        content: '你好！我是 Scratch 助手，有什么可以帮助你的吗？我可以直接操作 Scratch 项目，帮助你创建和修改程序。'
    }
];

/**
 * 获取所有可用工具的定义
 * @returns {Array} 工具定义数组
 */
const getToolDefinitions = () => {
    const tools = [];
    
    // 如果 MCP 服务器可用，添加其工具定义
    if (mcpServer) {
        const mcpToolDefinitions = mcpServer.getToolDefinitions();
        if (mcpToolDefinitions && mcpToolDefinitions.length > 0) {
            tools.push(...mcpToolDefinitions);
        }
    }
    
    // 添加搜索工具定义
    tools.push({
        type: 'function',
        function: {
            name: 'bingSearch',
            description: '使用 Bing 搜索引擎查找网络信息',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '搜索查询内容'
                    },
                    count: {
                        type: 'integer',
                        description: '返回结果数量（可选，默认为3，最大为5）',
                        default: 3
                    }
                },
                required: ['query']
            }
        }
    });
    
    return tools;
};

/**
 * 准备 API 请求，包括工具定义和当前Scratch上下文
 * @param {Array} messages 消息历史
 * @param {object} options 选项
 * @returns {object} 请求体对象
 */
const prepareRequestBody = (messages, options) => {
    const {
        temperature = apiSettings.temperature,
        maxTokens = 2048,
        model = apiSettings.modelName
    } = options;
    
    // 获取并添加当前Scratch上下文信息
    if (mcpServer) {
        // 尝试获取Scratch上下文，如果失败则提供一个默认值
        let scratchContext;
        try {
            if (mcpServer && typeof mcpServer.getScratchContext === 'function') {
                scratchContext = mcpServer.getScratchContext();
            } else {
                console.warn('MCP服务器未初始化或缺少getScratchContext方法');
                throw new Error('MCP服务器未正确配置');
            }
        } catch (error) {
            console.error('获取Scratch上下文时出错:', error);
            // 提供一个更完善的默认上下文对象
            scratchContext = {
                sprites: [],
                currentBlocksInfo: {},
                stageInfo: {name: 'Stage', costumes: []},
                projectInfo: {name: '未命名项目', spriteCount: 0},
                canvasState: {isRunning: false, frameRate: 30}
            };
        }
        
        // 查找系统消息位置
        const systemMsgIndex = messages.findIndex(m => m.role === 'system');
        
        // 将上下文信息格式化为易于理解的文本，增加错误处理
        const spritesInfo = Array.isArray(scratchContext.sprites) ? scratchContext.sprites.map(s => {
            if (!s) return '- 未知角色';
            const name = s.name || '未命名角色';
            const x = typeof s.x === 'number' ? Math.round(s.x) : 0;
            const y = typeof s.y === 'number' ? Math.round(s.y) : 0;
            const direction = typeof s.direction === 'number' ? Math.round(s.direction) : 90;
            const size = typeof s.size === 'number' ? Math.round(s.size) : 100;
            return `- ${name}: 位置(${x},${y}), 方向:${direction}°, 大小:${size}%`;
        }).join('\n') : '- 无角色信息';
        
        // 汇总当前积木信息，增加错误处理
        const blocksInfo = Array.isArray(scratchContext.sprites) ? scratchContext.sprites.map(sprite => {
            if (!sprite) return '- 未知角色: 无积木信息';
            const name = sprite.name || '未命名角色';
            const blocks = sprite.blocks || {};
            const blockCount = typeof blocks === 'object' ? Object.keys(blocks).length : 0;
            return blockCount > 0 ?
                `- ${name}: 包含 ${blockCount} 个顶级积木` :
                `- ${name}: 没有积木`;
        }).join('\n') : '- 无积木信息';
        
        // 构建更详细的上下文信息，增加全面的错误处理
        const contextInfo = `
## 当前Scratch项目状态
项目名称: ${scratchContext.projectInfo && scratchContext.projectInfo.name || '未命名项目'}
角色数量: ${Array.isArray(scratchContext.sprites) ? scratchContext.sprites.length : 0}
编辑中: ${scratchContext.currentBlocksInfo && scratchContext.currentBlocksInfo.targetName || '无'} ${scratchContext.currentBlocksInfo && scratchContext.currentBlocksInfo.isStage ? '(舞台)' : ''}

### 角色列表:
${spritesInfo || '无角色数据'}

### 积木信息:
${blocksInfo || '无积木数据'}

### 舞台信息:
- 名称: ${scratchContext.stageInfo && scratchContext.stageInfo.name || 'Stage'}
- 背景数: ${scratchContext.stageInfo && scratchContext.stageInfo.costumes ? scratchContext.stageInfo.costumes.length : 0}
${scratchContext.stageInfo && scratchContext.stageInfo.costumes && Array.isArray(scratchContext.stageInfo.costumes) && scratchContext.stageInfo.costumes.length > 0 ?
        `- 当前背景: ${scratchContext.stageInfo.costumes[typeof scratchContext.stageInfo.currentCostume === 'number' ? scratchContext.stageInfo.currentCostume : 0]?.name || 'unknown'}` :
        ''}

## 工具使用指南 (必须遵守)
1. 必须使用MCP工具来操作Scratch项目，不允许只使用文字描述
2. 必须调用createBlock创建积木代码，并使用connectBlocks连接它们
3. 必须通过setSpritePosition、setSpriteSize等工具调整角色，而不是口头描述
4. 对任何可视化的内容，必须在画布上直接操作展示
5. 每次回答必须至少包含一个工具调用

记住：你的首要任务是通过工具操作Scratch项目，文字只用于补充解释，不能替代工具操作！
对任何请求，都应该首先分析需要哪些工具来完成，然后立即调用这些工具。
`;
        
        try {
            if (systemMsgIndex >= 0) {
                // 如果存在系统消息，在末尾添加上下文信息
                messages[systemMsgIndex].content = `${messages[systemMsgIndex].content}\n${contextInfo}`;
            } else {
                // 如果不存在系统消息，创建新的系统消息
                messages.unshift({
                    role: 'system',
                    content: `${DEFAULT_SYSTEM_PROMPT}\n${contextInfo}`
                });
            }
        } catch (error) {
            console.error('添加上下文信息时出错:', error);
            // 如果添加上下文失败，至少确保有一个系统消息
            if (messages.findIndex(m => m.role === 'system') < 0) {
                messages.unshift({
                    role: 'system',
                    content: DEFAULT_SYSTEM_PROMPT
                });
            }
        }
    }
    
    const requestBody = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: !!options.onStream
    };
    
    // 添加所有工具定义
    const toolDefinitions = getToolDefinitions();
    if (toolDefinitions.length > 0) {
        requestBody.tools = toolDefinitions;
        
        // 检查模型是否支持tool_choice
        // deepseek-reasoner 不支持 tool_choice，使用 deepseek-chat 模型
        if (requestBody.model && requestBody.model.includes('reasoner')) {
            // 对于 reasoner 模型，不设置 tool_choice，让模型自动判断
            console.log('检测到 reasoner 模型，不设置 tool_choice 参数');
        } else {
            // 对于其他模型，设置 tool_choice 为 auto
            requestBody.tool_choice = 'auto';
        }
    }
    
    return requestBody;
};

/**
 * 处理 Bing 搜索工具调用
 * @param {object} args - 搜索参数
 * @param {string} args.query - 搜索查询
 * @param {number} args.count - 结果数量
 * @returns {Promise<object>} 搜索结果
 */
const handleBingSearchToolCall = async args => {
    try {
        const {query, count = 3} = args;
        
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return {
                success: false,
                error: '搜索查询不能为空'
            };
        }
        
        // 确保搜索结果适合儿童
        const searchResults = await bingSearchAPI.searchForChildren(query, {
            count: Math.min(Math.max(1, count || 3), 5) // 限制结果在 1-5 之间
        });
        
        // 添加搜索消息
        const message = searchResults.success ?
            `搜索 "${query}" 成功，找到 ${searchResults.results.length} 个结果` :
            `搜索 "${query}" 失败`;
            
        return {
            ...searchResults,
            message
        };
    } catch (error) {
        console.error('处理 Bing 搜索调用时出错:', error);
        return {
            success: false,
            error: `搜索失败: ${error.message}`,
            query: args.query
        };
    }
};

/**
 * 处理可能的工具调用
 * @param {object} data API 响应数据
 * @returns {object} 处理后的响应数据，包含工具调用信息
 */
const handleToolCalls = async data => {
    // 如果没有工具调用，直接返回
    if (!data.choices ||
        !data.choices[0] ||
        !data.choices[0].message ||
        !data.choices[0].message.tool_calls) {
        return data;
    }
    
    // 获取工具调用
    const message = data.choices[0].message;
    const toolCalls = message.tool_calls;
    
    // 我们不再直接执行工具调用，而是解析并返回工具调用请求
    const pendingToolCalls = [];
    
    // 记录调试信息
    console.log('检测到工具调用:', JSON.stringify(toolCalls));
    
    for (const toolCall of toolCalls) {
        try {
            // OpenAI SDK 返回工具调用的格式统一处理
            if (!toolCall.function) {
                console.error('工具调用格式错误，缺少function属性:', toolCall);
                continue;
            }
            
            // 规范化提取工具名称
            const toolName = toolCall.function?.name;
            console.log(`解析工具调用: ${toolName}`);
            
            if (!toolName) {
                console.error('工具调用缺少名称:', toolCall);
                continue;
            }
            
            // 使用通用的参数规范化函数处理参数
            let parsedArgs;
            try {
                // 获取原始参数
                const args = toolCall.function.arguments;
                
                // 使用我们的通用工具规范化参数
                parsedArgs = normalizeToolArguments(args);
                
                // 打印规范化后的参数
                console.log(`规范化工具参数:`, JSON.stringify(parsedArgs));
                console.log(`工具参数:`, parsedArgs);
            } catch (e) {
                console.error(`工具参数解析错误:`, e, '原始参数:', toolCall.function.arguments);
                // 记录为待处理的错误工具调用
                pendingToolCalls.push({
                    id: toolCall.id,
                    name: toolName,
                    arguments: toolCall.function?.arguments || {},
                    parseError: e.message
                });
                continue;
            }
            
            // 添加到待处理工具调用列表
            pendingToolCalls.push({
                id: toolCall.id,
                name: toolName,
                arguments: parsedArgs
            });
            
        } catch (error) {
            const toolName = toolCall.function?.name || 'unknown';
            console.error(`处理工具 ${toolName} 时出错:`, error);
            pendingToolCalls.push({
                id: toolCall.id,
                name: toolName,
                error: error.message
            });
        }
    }
    
    // 将原始消息内容保存
    const assistantMessage = message.content || '';
    
    // 提供工具调用的摘要信息
    const toolCallsSummary = pendingToolCalls.map(tc => ({
        name: tc.name,
        hasError: !!tc.error || !!tc.parseError,
        id: tc.id
    }));
    
    console.log(`工具调用摘要: ${pendingToolCalls.length} 个工具调用`,
        JSON.stringify(toolCallsSummary));
    
    // 修改返回数据，包含原始回复和待处理的工具调用
    return {
        ...data,
        pendingToolCalls,
        originalMessage: assistantMessage,
        toolCallsInfo: {
            count: pendingToolCalls.length,
            timestamp: Date.now(),
            summary: toolCallsSummary
        }
    };
};

/**
 * 执行待处理的工具调用
 * @param {Array} pendingToolCalls - 待处理的工具调用数组
 * @returns {Promise<object>} 工具调用结果
 */
const executeToolCalls = async pendingToolCalls => {
    const toolResults = [];
    const toolSummaries = [];
    let hasErrors = false;
    let visualToolsUsed = 0;
    let informationToolsUsed = 0;
    
    for (const toolCall of pendingToolCalls) {
        try {
            const toolName = toolCall.name;
            console.log(`执行工具调用: ${toolName}`);
            
            // 检查解析错误
            if (toolCall.parseError) {
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: toolName,
                    content: JSON.stringify({
                        success: false,
                        error: `参数解析错误: ${toolCall.parseError}`,
                        originalArguments: toolCall.arguments
                    })
                });
                
                toolSummaries.push(`❌ ${toolName}: 参数解析错误`);
                hasErrors = true;
                continue;
            }
            
            // 计算视觉工具使用次数
            if (['createBlock', 'connectBlocks', 'createSprite', 'setSpritePosition',
                'setSpriteSize', 'setSpriteDirection', 'runProject', 'stopProject'].includes(toolName)) {
                visualToolsUsed++;
            } else if (['getProjectInfo', 'getExecutionState'].includes(toolName)) {
                informationToolsUsed++;
            }
            
            let result;
            
            // 规范化工具参数以确保一致性
            const normalizedArgs = normalizeToolArguments(toolCall.arguments);
            console.log(`执行 ${toolName} 的规范化参数:`, JSON.stringify(normalizedArgs));
            
            // 为创建积木操作准备额外的调试信息
            if (toolName === 'createBlock') {
                console.log(`创建积木: 类型=${normalizedArgs.blockType}, 参数=`, normalizedArgs.inputs);
            } else if (toolName === 'connectBlocks') {
                console.log(`连接积木: 父块=${normalizedArgs.parentBlockId}, 子块=${normalizedArgs.childBlockId}`);
            }
            
            // 处理不同类型的工具调用
            if (toolName === 'bingSearch') {
                // 处理 Bing 搜索工具调用
                result = await handleBingSearchToolCall(normalizedArgs);
            } else if (mcpServer) {
                try {
                    // 使用 MCP 服务器处理其他工具调用
                    result = await mcpServer.processToolCall({
                        name: toolName,
                        arguments: normalizedArgs
                    });
                    
                    // 如果是创建块，保存块ID供后续可能的连接使用
                    if (toolName === 'createBlock' && result.success && result.blockId) {
                        // 跟踪创建的块，为后续连接做准备
                        console.log(`块创建成功: ${result.blockId} (${result.opcode})`);
                        
                        // 将创建的块ID保存到全局缓存，使其可用于后续操作
                        if (!window.mcpBlockCache) {
                            window.mcpBlockCache = {};
                        }
                        
                        // 保存块信息到缓存
                        window.mcpBlockCache[result.blockId] = {
                            id: result.blockId,
                            opcode: result.opcode,
                            createdAt: Date.now()
                        };
                        
                        // 记录最新创建的块，便于后续连接
                        window.mcpBlockCache.lastCreatedBlockId = result.blockId;
                        
                        console.log(`已将块信息保存到缓存，当前缓存中有 ${Object.keys(window.mcpBlockCache).length - 1} 个块`);
                    }
                } catch (processError) {
                    console.error(`MCP 服务器处理工具调用时出错:`, processError);
                    result = {
                        success: false,
                        error: `处理工具调用时出错: ${processError.message}`
                    };
                }
            } else {
                result = {
                    success: false,
                    error: `未知工具: ${toolName}`
                };
            } // 为返回结果添加更多上下文信息
            if (result.success) {
                // 添加额外信息以帮助 DeepSeek 理解结果
                if (toolName === 'createBlock') {
                    result.contextHint = `你成功创建了一个 ${result.opcode} 块，块ID是 ${result.blockId}。使用这个块ID进行后续操作。`;
                    
                    // 提醒AI保存块ID以供后续连接
                    result.nextSteps = `要连接这个块，请记住块ID: ${result.blockId}。你可以用它作为parentBlockId或childBlockId参数`;
                    
                    // 检查块是否真的被创建
                    if (result.blockStatus === 'not-found-after-creation') {
                        result.warning = `警告：块已创建但无法立即访问。这可能是暂时性问题，尝试连接时仍可使用此ID。`;
                    }
                } else if (toolName === 'connectBlocks') {
                    result.contextHint = `你成功将块 ${result.childBlockId} 连接到了块 ${result.parentBlockId}。`;
                    
                    // 添加有关是否需要刷新工作区的建议
                    if (result.connectionDetails) {
                        result.nextSteps = `连接已建立但可能需要几毫秒才会在工作区中可见。`;
                    }
                }
            } else {
                // 对于常见错误提供更多指导和自动恢复建议
                if (result.error && result.error.includes('not found')) {
                    result.troubleshootingHint = '确保在连接块之前先创建它们，并使用准确的块ID。';
                    
                    // 如果块创建后未找到，添加恢复建议
                    if (toolName === 'createBlock') {
                        result.recoveryTips = '尝试再次创建块，或使用不同的块类型。某些类型在特定上下文中可能无法创建。';
                    } else if (toolName === 'connectBlocks') {
                        // 提供块缓存中的可用块ID
                        const availableBlockIds = window.mcpBlockCache ?
                            Object.keys(window.mcpBlockCache).filter(k => k !== 'lastCreatedBlockId') : [];
                            
                        if (availableBlockIds.length > 0) {
                            result.availableBlocks = availableBlockIds;
                            result.recoveryTips = `尝试使用这些已知有效的块ID: ${availableBlockIds.slice(0, 3).join(', ')}${availableBlockIds.length > 3 ? '...' : ''}`;
                        }
                    }
                } else if (toolName === 'connectBlocks') {
                    result.troubleshootingHint = '检查块ID是否正确，并确保块类型兼容。某些块不能直接连接。';
                    
                    // 建议使用最近创建的块
                    if (window.mcpBlockCache && window.mcpBlockCache.lastCreatedBlockId) {
                        result.lastCreatedBlockId = window.mcpBlockCache.lastCreatedBlockId;
                        result.recoveryTips = `尝试使用最近创建的块ID: ${window.mcpBlockCache.lastCreatedBlockId}`;
                    }
                }
            }

            toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolName,
                content: JSON.stringify(result)
            });
            
            // 添加到操作摘要，丰富信息
            if (result.success) {
                let successMsg = `✅ ${toolName}: ${result.message || '成功'}`;
                
                // 对特定工具添加更多信息
                if (toolName === 'createBlock' && result.blockId) {
                    successMsg += ` (ID: ${result.blockId})`;
                }
                
                toolSummaries.push(successMsg);
            } else {
                let errorMsg = `❌ ${toolName}: ${result.error || '失败'}`;
                
                // 对特定工具的错误添加提示
                if (toolName === 'connectBlocks' && result.error && result.error.includes('not found')) {
                    errorMsg += ' - 请先创建所需的块';
                }
                
                toolSummaries.push(errorMsg);
                hasErrors = true;
            }
        } catch (error) {
            console.error(`执行工具 ${toolCall.name} 时出错:`, error);
            toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolCall.name,
                content: JSON.stringify({
                    success: false,
                    error: `工具执行错误: ${error.message}`
                })
            });
            
            toolSummaries.push(`❌ ${toolCall.name}: 执行错误`);
            hasErrors = true;
        }
    }
    
    return {
        toolResults,
        toolSummaries,
        hasErrors,
        stats: {
            visualToolsUsed,
            informationToolsUsed
        }
    };
};

/**
 * 发送消息到 DeepSeek API 并获取回复
 * @param {Array} messages 消息历史 [{role: "user" | "assistant", content: string}]
 * @param {object} options 可选参数
 * @param {Function} options.onStream 流式处理回调函数，启用时会以流式方式处理响应
 * @returns {Promise<object>} API 响应对象
 *
 * @example
 * // 非流式处理示例
 * const response = await sendMessage([{role: 'user', content: '你好'}]);
 *
 * @example
 * // 流式处理示例
 * const response = await sendMessage([{role: 'user', content: '你好'}], {
 *   onStream: (chunk) => {
 *     if (chunk.type === 'content') {
 *       console.log('收到内容:', chunk.content);
 *     } else if (chunk.type === 'tool_call') {
 *       console.log('收到工具调用:', chunk.toolCall);
 *     } else if (chunk.type === 'done') {
 *       console.log('流式处理完成');
 *     } else if (chunk.type === 'error') {
 *       console.error('流式处理错误:', chunk.error);
 *     }
 *   }
 * });
 */
const sendMessage = async (messages, options = {}) => {
    try {
        // 确保 OpenAI 客户端已初始化
        if (!openaiClient) {
            console.log('OpenAI 客户端未初始化，尝试初始化...');
            initializeOpenAIClient();
            if (!openaiClient) {
                throw new Error('OpenAI 客户端初始化失败，请检查 API 设置');
            }
        }
        
        const requestBody = prepareRequestBody(messages, options);
        
        console.log('发送请求到 DeepSeek API (通过 OpenAI SDK):', {
            messages,
            model: options.model || apiSettings.modelName,
            hasTools: !!requestBody.tools,
            toolSummary: options.toolSummary
        });
        
        // 如果有工具摘要，添加到系统消息中或创建新的系统消息
        if (options.toolSummary) {
            const systemMessages = messages.filter(m => m.role === 'system');
            
            // 构建更详细的工具摘要文本，更强烈地鼓励DeepSeek使用工具
            const summaryText = `
## 工具操作结果:
${options.toolSummary.operations.join('\n')}

## 工具使用评估:
${options.toolSummary.feedback || '请优先使用工具在Scratch中展示操作。'}

## 重要指导:
1. 必须主动使用工具操作Scratch项目来回复用户问题
2. 图形化演示 > 文字描述：始终优先用工具在画布上操作展示
3. 操作步骤：
   - 先评估用户需求需要哪些工具操作（如创建积木、移动角色）
   - 立即使用createBlock、setSpritePosition等工具实现
   - 然后简洁解释你做了什么（但重点是工具操作，而非解释）
4. 未来改进：对用户下一步可能的需求，提前考虑可使用的工具
5. 失败处理：若操作失败，明确解释原因并使用替代工具方案

这是MCP工具优先级：
- 最高：createBlock、connectBlocks、createSprite等直接操作画布的工具
- 中等：getProjectInfo等信息工具
- 低：只有在需要在线信息时才使用bingSearch

${options.toolSummary.visualToolsUsed > 2 ? '👍 很棒！继续使用工具让Scratch活起来！' : '⚠️ 你应该更多地使用视觉工具(createBlock, createSprite等)来操作Scratch，而不是只用文字描述。'}

请继续使用工具操作Scratch项目，为用户创造直观、互动的编程体验。
`;
            
            if (systemMessages.length > 0) {
                // 如果存在系统消息，更新最后一个系统消息
                const lastSystemIndex = messages.findIndex(m => m.role === 'system');
                const originalContent = systemMessages[0].content;
                
                // 更新系统消息
                messages[lastSystemIndex].content = `${originalContent}\n\n${summaryText}`;
            } else {
                // 如果不存在系统消息，创建新的系统消息
                messages.unshift({
                    role: 'system',
                    content: `${DEFAULT_SYSTEM_PROMPT}\n\n${summaryText}`
                });
            }
        }
        
        // 在每次请求中添加更强的工具使用提示
        // 分析用户意图并添加上下文相关的工具使用提示
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
            const originalContent = lastMessage.content;
            
            // 根据用户消息内容添加上下文相关的提示，使用更强烈的语气要求使用工具
            let toolPrompt = '(必须使用MCP工具在Scratch中直接展示，不要只用文字描述。必须调用function工具。例如：';
            
            // 分析消息内容，推荐可能相关的工具
            if (/添加|创建|新建|制作|做一个|加入|增加/.test(originalContent)) {
                if (/角色|精灵|小猫|动物|人物/.test(originalContent)) {
                    toolPrompt += '用createSprite创建新角色，用setSpritePosition放置位置';
                } else if (/积木|代码|程序|指令|命令|移动|旋转|转向|转动/.test(originalContent)) {
                    toolPrompt += '用createBlock创建积木，用connectBlocks连接积木';
                } else {
                    toolPrompt += '用createBlock创建积木，用createSprite创建角色';
                }
            } else if (/移动|位置|放置|摆放|改变位置|转向|旋转|方向/.test(originalContent)) {
                toolPrompt += '使用setSpritePosition定位角色，用setSpriteDirection改变朝向';
            } else if (/大小|尺寸|放大|缩小|改变大小/.test(originalContent)) {
                toolPrompt += '使用setSpriteSize改变角色大小';
            } else if (/运行|启动|开始|执行|停止|暂停/.test(originalContent)) {
                toolPrompt += '使用runProject或stopProject控制项目执行';
            } else if (/了解|查看|显示|展示|信息/.test(originalContent)) {
                toolPrompt += '使用getProjectInfo获取项目信息';
            } else {
                toolPrompt += '用createBlock创建示例积木，用setSpritePosition定位角色等';
            }
            
            // 添加通用工具使用指导
            toolPrompt += '。请始终优先使用工具直接操作Scratch项目，这比文字解释更直观有效)';
            
            // 附加工具使用提示
            lastMessage.content = `${originalContent}\n\n${toolPrompt}`;
        }
        
        
        try {
            // 确保 OpenAI 客户端已初始化
            if (!openaiClient) {
                console.log('OpenAI 客户端未初始化，尝试初始化...');
                initializeOpenAIClient();
                if (!openaiClient) {
                    throw new Error('OpenAI 客户端初始化失败，请检查 API 设置');
                }
            }
            
            // 打印请求参数的摘要以便调试
            console.log('OpenAI SDK请求参数摘要:', {
                model: requestBody.model,
                messagesCount: requestBody.messages.length,
                temperature: requestBody.temperature,
                max_tokens: requestBody.max_tokens,
                hasTools: Array.isArray(requestBody.tools) && requestBody.tools.length > 0,
                toolCount: Array.isArray(requestBody.tools) ? requestBody.tools.length : 0
            });
            
            // 检查是否提供了流式处理的回调函数
            const isStreamEnabled = !!options.onStream;
            
            // 设置超时控制
            const timeoutDuration = 60000 * 10; // 90秒超时
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('请求超时，API响应时间过长')), timeoutDuration);
            });
            
            // 如果启用流式处理
            if (isStreamEnabled) {
                console.log('启用流式处理模式');
                
                // 创建请求配置
                const streamConfig = {
                    model: requestBody.model,
                    messages: requestBody.messages,
                    temperature: requestBody.temperature,
                    max_tokens: requestBody.max_tokens,
                    stream: true,
                    tools: requestBody.tools
                };
                
                // 只有在支持的模型中才添加 tool_choice
                if (requestBody.tool_choice) {
                    streamConfig.tool_choice = requestBody.tool_choice;
                }
                
                try {
                    // 收集完整响应数据
                    let fullContent = '';
                    let responseId = `gen_${Date.now()}`;
                    let model = requestBody.model;
                    const toolCalls = [];
                    let finishReason = null;
                    const messageRole = 'assistant';
                    
                    // 创建流式请求
                    const stream = await openaiClient.chat.completions.create(streamConfig);
                    
                    // 清除超时定时器
                    clearTimeout(timeoutId);
                    
                    // 处理流式数据
                    for await (const chunk of stream) {
                        // 保存响应信息
                        if (chunk.id) responseId = chunk.id;
                        if (chunk.model) model = chunk.model;
                        
                        // 获取增量内容
                        const delta = chunk.choices[0]?.delta;
                        const content = delta?.content || '';
                        
                        // 如果有内容，追加到完整内容
                        if (content) {
                            fullContent += content;
                            
                            // 通知调用者有新内容
                            if (options.onStream) {
                                options.onStream({
                                    type: 'content',
                                    content,
                                    fullContent,
                                    done: false
                                });
                            }
                        }
                        
                        // 处理工具调用
                        if (delta?.tool_calls && delta.tool_calls.length > 0) {
                            const deltaToolCall = delta.tool_calls[0];
                            
                            // 查找或创建此工具调用的条目
                            let toolCall = toolCalls.find(tc => tc.index === chunk.choices[0].index);
                            
                            if (!toolCall) {
                                toolCall = {
                                    index: chunk.choices[0].index,
                                    id: deltaToolCall.id || `call_${Date.now()}_${toolCalls.length}`,
                                    type: 'function',
                                    function: {
                                        name: '',
                                        arguments: ''
                                    }
                                };
                                toolCalls.push(toolCall);
                            }
                            
                            // 更新工具调用信息
                            if (deltaToolCall.id) toolCall.id = deltaToolCall.id;
                            if (deltaToolCall.type) toolCall.type = deltaToolCall.type;
                            if (deltaToolCall.function?.name) toolCall.function.name = deltaToolCall.function.name;
                            if (deltaToolCall.function?.arguments) toolCall.function.arguments += deltaToolCall.function.arguments;
                            
                            // 通知调用者有新工具调用
                            if (options.onStream) {
                                options.onStream({
                                    type: 'tool_call',
                                    toolCall: {...toolCall},
                                    toolCalls: [...toolCalls],
                                    done: false
                                });
                            }
                        }
                        
                        // 检查是否完成
                        if (chunk.choices[0]?.finish_reason) {
                            finishReason = chunk.choices[0].finish_reason;
                        }
                    }
                    
                    // 生成最终响应对象
                    const data = {
                        id: responseId,
                        object: 'chat.completion',
                        created: Math.floor(Date.now() / 1000),
                        model: model,
                        choices: [{
                            index: 0,
                            message: {
                                role: messageRole,
                                content: fullContent,
                                tool_calls: toolCalls.length > 0 ? toolCalls : undefined
                            },
                            finish_reason: finishReason || 'stop'
                        }],
                        usage: {
                            prompt_tokens: 0,
                            completion_tokens: 0,
                            total_tokens: 0
                        }
                    };
                    
                    // 增加消息历史引用
                    data.messages = messages;
                    
                    // 通知调用者流式处理完成
                    if (options.onStream) {
                        options.onStream({
                            type: 'done',
                            content: fullContent,
                            fullContent: fullContent,
                            done: true,
                            response: data
                        });
                    }
                    
                    // 解析工具调用
                    console.log('流式处理完成，处理工具调用');
                    const processedData = await handleToolCalls(data);
                    
                    return processedData;
                } catch (streamError) {
                    // 清除超时定时器
                    clearTimeout(timeoutId);
                    
                    // 通知调用者流式处理错误
                    if (options.onStream) {
                        options.onStream({
                            type: 'error',
                            error: streamError.message || '流式处理错误',
                            done: true
                        });
                    }
                    
                    // 重新抛出错误
                    throw streamError;
                }
            } else {
                // 非流式处理模式
                console.log('使用非流式处理模式');
                
                // 创建API请求Promise
                const apiPromise = openaiClient.chat.completions.create({
                    model: requestBody.model,
                    messages: requestBody.messages,
                    temperature: requestBody.temperature,
                    max_tokens: requestBody.max_tokens,
                    stream: false,
                    tools: requestBody.tools,
                    tool_choice: requestBody.tool_choice
                });
                
                // 使用 Promise.race 实现超时控制
                const response = await Promise.race([apiPromise, timeoutPromise]);
                
                // 清除超时定时器
                clearTimeout(timeoutId);
                
                console.log('收到 DeepSeek API 回复 (通过 OpenAI SDK):',
                    response ? {
                        id: response.id,
                        model: response.model,
                        object: response.object,
                        hasChoices: Array.isArray(response.choices) && response.choices.length > 0,
                        finishReason: response.choices?.[0]?.finish_reason || 'unknown'
                    } : 'null'
                );
                
                // 验证响应数据的完整性
                if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
                    throw new Error('DeepSeek API 返回了无效的响应结构');
                }
                
                // 检查第一个选择是否有消息
                if (!response.choices[0].message) {
                    throw new Error('DeepSeek API 响应中缺少消息内容');
                }
                
                // 将响应格式转换为与旧版 API 一致的格式
                const data = {
                    id: response.id || `gen_${Date.now()}`,
                    object: response.object || 'chat.completion',
                    created: response.created || Math.floor(Date.now() / 1000),
                    model: response.model || requestBody.model,
                    choices: [{
                        index: 0,
                        message: response.choices[0].message,
                        finish_reason: response.choices[0].finish_reason || 'stop'
                    }],
                    usage: response.usage || {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    }
                };
                
                // 增加消息历史引用，以便处理工具调用
                data.messages = messages;
                
                // 解析工具调用，但不直接执行
                const processedData = await handleToolCalls(data);
                
                return processedData;
            }
            
            return processedData;
        } catch (error) {
            console.error('DeepSeek API 请求失败 (OpenAI SDK):', error);
            
            // 更详细的错误提取和处理
            let errorMessage = error.message || '未知错误';
            let errorStatus = 'unknown';
            let errorType = 'general';
            
            // 分析 OpenAI SDK 错误结构
            if (error.response && error.response.error) {
                errorMessage = error.response.error.message || errorMessage;
                errorStatus = error.response.status || error.status || errorStatus;
                errorType = error.response.error.type || error.response.error.code || errorType;
            } else if (error.status) {
                errorStatus = error.status;
            }
            
            // 网络或连接错误处理
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                errorType = 'connection';
                errorMessage = `无法连接到API服务器: ${error.message}`;
            } else if (error.name === 'AbortError') {
                errorType = 'timeout';
                errorMessage = '请求超时，请检查网络连接';
            }
            
            // 记录结构化错误信息
            console.error('API错误详情:', {
                message: errorMessage,
                status: errorStatus,
                type: errorType,
                original: error
            });
            
            throw new Error(`DeepSeek API 错误 (${errorStatus} - ${errorType}): ${errorMessage}`);
        }
    } catch (error) {
        console.error('DeepSeek API 请求失败:', error);
        throw error;
    }
};

/**
 * 发送工具调用结果到 DeepSeek API 以获取最终回复
 * @param {Array} messages - 原始消息历史
 * @param {object} data - 原始 API 响应数据
 * @param {object} toolResults - 工具调用结果
 * @param {object} options - 可选参数，包括 onStream 回调函数
 * @returns {Promise<object>} 最终回复对象
 */
const sendToolResults = async (messages, data, toolResults, options = {}) => {
    try {
        // 记录调试信息
        console.log('发送工具结果到DeepSeek API，原消息数:', messages.length);
        console.log('工具结果数量:', toolResults.toolResults.length);
        
        // 获取原始回复消息
        const assistantMessage = data.choices[0].message;
        console.log('助手消息:', JSON.stringify(assistantMessage));
        
        // 为了与 OpenAI 格式兼容，确保工具调用结果格式正确
        const formattedToolResults = toolResults.toolResults.map(result => {
            console.log('格式化工具结果:', result.name, result.tool_call_id);
            
            // 以OpenAI兼容格式强制构造工具结果
            return {
                role: 'tool',
                tool_call_id: result.tool_call_id,
                name: result.name,
                content: result.content
            };
        });
        
        // 创建包含工具调用结果的新消息数组
        // 创建助手消息，确保至少有content或tool_calls中的一个
        const assistantPayload = {
            role: 'assistant'
        };
        
        // 如果有内容，则添加content字段
        if (assistantMessage.content) {
            assistantPayload.content = assistantMessage.content;
        }
        
        // 如果有工具调用，则添加tool_calls字段
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            assistantPayload.tool_calls = assistantMessage.tool_calls;
        }
        
        // 如果既没有content也没有tool_calls，添加一个默认的content
        if (!assistantPayload.content && (!assistantPayload.tool_calls || assistantPayload.tool_calls.length === 0)) {
            assistantPayload.content = " "; // 使用空格作为最小内容以符合API要求
        }
        
        const newMessages = [
            ...messages, // 原始消息
            assistantPayload, // 确保格式正确的助手消息
            ...formattedToolResults // 格式化后的工具调用结果
        ];
        
        // 添加基于工具使用的评估和建议
        let toolFeedback = '';
        const {visualToolsUsed, informationToolsUsed} = toolResults.stats;
        
        if (visualToolsUsed > 0) {
            toolFeedback += `很好！你使用了${visualToolsUsed}个视觉操作工具来直接在Scratch上展示。`;
            if (informationToolsUsed > 0) {
                toolFeedback += `同时获取了${informationToolsUsed}次项目信息。`;
            }
        } else if (informationToolsUsed > 0) {
            toolFeedback += `你获取了项目信息，但没有使用visual工具在画布上操作。请尝试使用createBlock, setSpritePosition等工具创建可视化示例。`;
        } else {
            toolFeedback += `你没有使用任何工具在Scratch画布上操作。请优先使用工具而非文字描述，用createBlock, createSprite等工具在Scratch上展示效果。`;
        }
        
        // 打印消息数组以便调试
        console.log('原始消息格式:', newMessages.map(m => ({role: m.role, hasToolCalls: !!m.tool_calls})));
        
        // 更健壮的消息格式处理，确保消息格式符合 OpenAI SDK 的期望
        const cleanMessages = newMessages.map(msg => {
            // 创建基础消息对象
            const cleanMsg = {role: msg.role};
            
            // 处理内容字段
            if (msg.content !== undefined) {
                cleanMsg.content = msg.content;
            }
            
            // 特殊处理助手消息中的工具调用
            if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
                // 确保工具调用格式正确
                cleanMsg.tool_calls = msg.tool_calls.map(tc => {
                    // 如果已经是有效格式，直接使用
                    if (tc.id && tc.function && typeof tc.function === 'object') {
                        return tc;
                    }
                    
                    // 尝试构建有效格式
                    return {
                        id: tc.id || `call_${Date.now()}`,
                        type: 'function',
                        function: {
                            name: tc.function?.name || tc.name || 'unknown',
                            arguments: tc.function?.arguments || '{}'
                        }
                    };
                });
            }
            
            // 特殊处理工具消息
            if (msg.role === 'tool') {
                cleanMsg.tool_call_id = msg.tool_call_id;
                cleanMsg.name = msg.name;
                
                // 确保工具响应内容是正确格式的字符串
                if (typeof msg.content !== 'string') {
                    // 如果不是字符串，直接JSON序列化
                    cleanMsg.content = JSON.stringify(msg.content);
                } else {
                    try {
                        // 尝试解析内容，确保它是有效的JSON字符串
                        // 这样做是为了修复可能的格式问题，然后再重新序列化
                        const parsedContent = JSON.parse(msg.content);
                        cleanMsg.content = JSON.stringify(parsedContent);
                    } catch (e) {
                        // 如果解析失败，保留原始内容
                        console.warn('无法解析工具响应内容:', e);
                        cleanMsg.content = msg.content;
                    }
                }
            }
            
            return cleanMsg;
        });
        
        console.log('清理后消息格式:', cleanMessages.map(m => ({role: m.role, hasToolCalls: !!m.tool_calls})));
        
        // 准备发送请求的选项
        const sendOptions = {
            model: data.model,
            // 添加操作摘要
            toolSummary: {
                success: !toolResults.hasErrors,
                operations: toolResults.toolSummaries,
                feedback: toolFeedback,
                visualToolsUsed,
                informationToolsUsed
            }
        };
        
        // 如果提供了 onStream 回调函数，添加到选项中
        if (options.onStream && typeof options.onStream === 'function') {
            sendOptions.onStream = options.onStream;
        }
        
        // 发送第二次请求获取最终回复，包含操作摘要和工具使用评估
        const finalResponse = await sendMessage(cleanMessages, sendOptions);
        
        return finalResponse;
    } catch (error) {
        console.error('获取最终回复时出错:', error);
        // 如果第二次请求失败，我们返回原始数据和错误信息
        return {
            ...data,
            error: `获取最终回复时出错: ${error.message}`
        };
    }
};

/**
 * 合并流式消息碎片
 * @param {Array} chunks - 接收到的消息片段数组
 * @returns {object} 合并后的消息对象
 */
const mergeStreamChunks = chunks => {
    if (!chunks || chunks.length === 0) {
        // 确保返回一个有效的消息格式，避免 content 和 toolCalls 都为空的情况
        return {content: ' ', toolCalls: []};
    }
    
    let content = '';
    const toolCalls = [];
    
    // 遍历所有片段
    for (const chunk of chunks) {
        // 如果是内容类型，追加内容
        if (chunk.type === 'content' && chunk.content) {
            content += chunk.content;
        }
        
        // 如果是工具调用类型，收集工具调用
        if (chunk.type === 'tool_call' && chunk.toolCalls) {
            // 使用最新的工具调用状态
            const latestToolCalls = chunk.toolCalls;
            
            for (const tc of latestToolCalls) {
                // 查找现有的工具调用
                const existingIndex = toolCalls.findIndex(existing => existing.id === tc.id);
                
                if (existingIndex >= 0) {
                    // 更新现有工具调用
                    toolCalls[existingIndex] = {...tc};
                } else {
                    // 添加新工具调用
                    toolCalls.push({...tc});
                }
            }
        }
    }
    
    // 返回合并后的结果，确保content和toolCalls至少有一个不为空
    if (content === '' && (!toolCalls || toolCalls.length === 0)) {
        // 如果两者都为空，添加一个空格作为最小内容
        return {content: ' ', toolCalls};
    }
    
    return {content, toolCalls};
};

/**
 * 获取当前设置（异步）
 * 确保从存储中加载最新设置
 * @returns {Promise<object>} 当前的API设置
 */
const getSettings = async () => {
    // 从存储重新加载设置以确保数据一致性
    const latestSettings = await loadSettingsFromStorage();
    
    // 更新内存中的设置
    apiSettings = latestSettings;
    
    return { ...apiSettings };
};

export default {
    sendMessage,
    initializeChat,
    setMCPServer,
    getToolDefinitions,
    getSettings,
    updateSettings,
    testConnection,
    executeToolCalls,
    sendToolResults,
    normalizeToolArguments, // 导出参数规范化函数供其他模块使用
    mergeStreamChunks // 导出流式消息合并函数
};
