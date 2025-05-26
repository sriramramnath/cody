/**
 * DeepSeek API 调用工具函数
 * 提供与 DeepSeek API 交互的功能
 */

const API_KEY = 'sk-7a9202f7b723433991b772e4cde4c7e9';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 默认系统提示，指导 AI 助手的行为
 */
const DEFAULT_SYSTEM_PROMPT = `你是 Scratch 助手，一个专门帮助儿童学习编程的 AI。
请使用简单易懂的语言回答问题，侧重于鼓励创造力和探索性学习。
对于 Scratch 相关问题，提供具体的代码块和步骤指导。
保持回答简洁、友好且适合儿童。
如果不确定或不知道某个问题的答案，诚实地承认并建议用户尝试在 Scratch 社区寻求帮助。
不要使用复杂的技术术语，除非必要并能解释它们。`;

/**
 * 初始化聊天会话，返回初始消息数组
 * @returns {Array} 初始消息数组，包含系统提示
 */
const initializeChat = () => {
    return [
        {
            role: 'system',
            content: DEFAULT_SYSTEM_PROMPT
        },
        {
            role: 'assistant',
            content: '你好！我是 Scratch 助手，有什么可以帮助你的吗？'
        }
    ];
};

/**
 * 发送消息到 DeepSeek API 并获取回复
 * @param {Array} messages 消息历史 [{role: "user" | "assistant", content: string}]
 * @param {Object} options 可选参数
 * @returns {Promise<Object>} API 响应对象
 */
const sendMessage = async (messages, options = {}) => {
    const {
        temperature = 0.7,
        maxTokens = 2048,
        model = 'deepseek-chat'
    } = options;
    
    try {
        console.log('发送请求到 DeepSeek API:', { messages, model });
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false
            })
        });
        
        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorMessage;
            } catch (e) {
                // 如果响应不是 JSON 格式，保持原始状态文本
            }
            throw new Error(`DeepSeek API 错误 (${response.status}): ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log('收到 DeepSeek API 回复:', data);
        return data;
    } catch (error) {
        console.error('DeepSeek API 请求失败:', error);
        throw error;
    }
};

export default {
    sendMessage,
    initializeChat
};
