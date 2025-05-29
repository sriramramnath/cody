// 聊天组件的自定义 hooks 和业务逻辑
import React, { useState, useEffect, useRef, useCallback } from 'react';
import layout from '../../lib/layout-constants';
import deepseekAPI from './lib/deepseek-api';
import indexedDBHelper from './lib/indexed-db-helper';

// 会话管理相关的 hook
export const useSessionManager = () => {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editingSessionTitle, setEditingSessionTitle] = useState('');
    const [clearSessionsResult, setClearSessionsResult] = useState(null);

    // 初始化时加载会话
    useEffect(() => {
        initializeSessions();
    }, []);

    // 初始化会话
    const initializeSessions = async () => {
        const existingSessionId = await loadSessions();
        if (!existingSessionId) {
            await createNewSession();
        }
    };

    // 加载会话列表
    const loadSessions = async () => {
        try {
            console.log('开始加载会话列表...');
            const allSessions = await indexedDBHelper.getSessions();
            console.log('获取到的会话列表:', allSessions);
            setSessions(allSessions);
            
            // 如果有会话，自动加载最近的会话
            if (allSessions && allSessions.length > 0) {
                console.log('找到现有会话，加载最近的会话:', allSessions[0].id);
                setCurrentSessionId(allSessions[0].id);
                return allSessions[0].id;
            } else {
                console.log('没有找到现有会话，准备创建新会话');
                return null;
            }
        } catch (e) {
            console.error('加载会话列表失败:', e);
            return null;
        }
    };

    // 创建新会话
    const createNewSession = async () => {
        try {
            console.log('开始创建新会话...');
            const sessionId = await indexedDBHelper.createSession('新会话');
            
            if (!sessionId) {
                console.error('创建会话失败：indexedDBHelper.createSession 返回了 null');
                return null;
            }
            
            console.log('新会话创建成功，ID:', sessionId);
            
            // 更新会话列表
            const allSessions = await indexedDBHelper.getSessions();
            console.log('获取所有会话列表:', allSessions);
            setSessions(allSessions);
            
            // 切换到新会话
            console.log('设置当前会话ID为:', sessionId);
            setCurrentSessionId(sessionId);
            
            return sessionId;
        } catch (e) {
            console.error('创建新会话失败，捕获到异常:', e);
            return null;
        }
    };

    // 切换会话
    const switchSession = async (sessionId) => {
        if (sessionId === currentSessionId) return;
        setCurrentSessionId(sessionId);
        
        // 如果是在小屏幕上，切换会话后关闭会话抽屉
        if (window.innerWidth < 768) {
            setShowSessionsDrawer(false);
        }
    };

    // 删除会话
    const deleteSession = async (sessionId) => {
        // 确认是否要删除
        const confirmDelete = window.confirm('确定要删除这个会话吗？');
        if (!confirmDelete) return { success: false };
        
        try {
            await indexedDBHelper.deleteSession(sessionId);
            
            // 更新会话列表
            const remainingSessions = await indexedDBHelper.getSessions();
            setSessions(remainingSessions);
            
            // 如果删除的是当前会话，切换到另一个会话或创建新会话
            if (sessionId === currentSessionId) {
                if (remainingSessions.length > 0) {
                    setCurrentSessionId(remainingSessions[0].id);
                    return { success: true, newSessionId: remainingSessions[0].id };
                } else {
                    const newSessionId = await createNewSession();
                    return { success: true, newSessionId };
                }
            }
            return { success: true };
        } catch (e) {
            console.error('删除会话失败:', e);
            return { success: false, error: e.message };
        }
    };

    // 开始编辑会话标题
    const startEditing = (sessionId, currentTitle) => {
        setEditingSessionId(sessionId);
        setEditingSessionTitle(currentTitle);
    };

    // 保存会话标题
    const saveSessionTitle = async () => {
        if (!editingSessionId || editingSessionTitle.trim() === '') {
            setEditingSessionId(null);
            setEditingSessionTitle('');
            return false;
        }
        
        try {
            await indexedDBHelper.updateSessionTitle(editingSessionId, editingSessionTitle.trim());
            
            // 更新会话列表
            const updatedSessions = await indexedDBHelper.getSessions();
            setSessions(updatedSessions);
            
            // 清除编辑状态
            setEditingSessionId(null);
            setEditingSessionTitle('');
            
            return true;
        } catch (e) {
            console.error('更新会话标题失败:', e);
            return false;
        }
    };

    // 清空所有会话
    const handleClearAllSessions = async () => {
        const confirmClear = window.confirm('确定要删除所有会话历史吗？此操作不可恢复。');
        if (!confirmClear) return { success: false };
        
        try {
            const success = await indexedDBHelper.clearAllSessions();
            
            if (success) {
                setSessions([]);
                const newSessionId = await createNewSession();
                const result = { success: true, message: '所有会话已清空', newSessionId };
                setClearSessionsResult(result);
                // 3秒后清除结果消息
                setTimeout(() => setClearSessionsResult(null), 3000);
                return result;
            } else {
                const result = { success: false, message: '清空会话历史失败' };
                setClearSessionsResult(result);
                setTimeout(() => setClearSessionsResult(null), 3000);
                return result;
            }
        } catch (error) {
            console.error('清空会话历史失败:', error);
            const result = { success: false, message: `清空失败: ${error.message}` };
            setClearSessionsResult(result);
            setTimeout(() => setClearSessionsResult(null), 3000);
            return result;
        }
    };

    return {
        sessions,
        currentSessionId,
        showSessionsDrawer,
        editingSessionId,
        editingSessionTitle,
        clearSessionsResult,
        setShowSessionsDrawer,
        setEditingSessionId,
        setEditingSessionTitle,
        loadSessions,
        createNewSession,
        switchSession,
        deleteSession,
        startEditing,
        saveSessionTitle,
        handleClearAllSessions
    };
};

// 消息管理相关的 hook
export const useMessageManager = (mcpServer, currentSessionId) => {
    const [messages, setMessages] = useState(() => {
        return deepseekAPI.initializeChat().filter(msg => msg.role !== 'system');
    });
    const [isLoading, setIsLoading] = useState(false);
    const [toolExecuting, setToolExecuting] = useState(false);
    const [searchExecuting, setSearchExecuting] = useState(false);
    const [abortController, setAbortController] = useState(null);

    // 当会话ID改变时，加载对应的消息
    useEffect(() => {
        if (currentSessionId) {
            loadSessionMessages(currentSessionId);
        }
    }, [currentSessionId]);

    // 加载指定会话的消息
    const loadSessionMessages = async (sessionId) => {
        if (!sessionId) {
            console.error('无法加载会话消息：会话ID为空');
            return;
        }
        
        try {
            console.log(`开始加载会话 ${sessionId} 的消息...`);
            const sessionMessages = await indexedDBHelper.getSessionMessages(sessionId);
            console.log(`会话 ${sessionId} 中的消息:`, sessionMessages);
            
            if (sessionMessages && sessionMessages.length > 0) {
                // 过滤掉系统消息，不显示给用户
                const filteredMessages = sessionMessages.filter(msg => msg.role !== 'system');
                console.log('过滤后的消息:', filteredMessages);
                setMessages(filteredMessages);
            } else {
                console.log('会话中没有消息，初始化空对话');
                // 如果会话没有消息，则初始化一个空的对话
                const initialMessages = deepseekAPI.initializeChat().filter(msg => msg.role !== 'system');
                setMessages(initialMessages);
                
                // 保存系统提示到该会话
                const systemPrompt = deepseekAPI.initializeChat().find(msg => msg.role === 'system');
                if (systemPrompt) {
                    console.log('保存系统提示到新会话:', systemPrompt);
                    try {
                        await indexedDBHelper.saveMessageToSession(sessionId, systemPrompt);
                    } catch (err) {
                        console.error('保存系统提示失败:', err);
                    }
                }
            }
        } catch (e) {
            console.error('加载会话消息失败:', e);
            // 初始化一个空对话
            setMessages(deepseekAPI.initializeChat().filter(msg => msg.role !== 'system'));
        }
    };

    // 清空聊天记录
    const handleClearChat = useCallback(async () => {
        const confirmClear = window.confirm('确定要清空当前会话的聊天记录吗？');
        if (!confirmClear) return;
        
        try {
            if (currentSessionId) {
                // 清空当前会话的消息
                await indexedDBHelper.clearSessionMessages(currentSessionId);
                
                // 重新保存系统提示
                const systemPrompt = deepseekAPI.initializeChat().find(msg => msg.role === 'system');
                if (systemPrompt) {
                    await indexedDBHelper.saveMessageToSession(currentSessionId, systemPrompt);
                }
            }
            
            // 更新UI
            const initialMessages = deepseekAPI.initializeChat().filter(msg => msg.role !== 'system');
            setMessages(initialMessages);
        } catch (error) {
            console.error('清空聊天记录失败:', error);
            alert('清空聊天记录失败，请重试');
        }
    }, [currentSessionId]);

    // 发送消息的处理函数
    const handleSendMessage = useCallback(async (messageText) => {
        if (!messageText || !messageText.trim() || isLoading) return;
        
        const userMessage = {
            role: 'user',
            content: messageText.trim()
        };

        // 创建新的中断控制器
        let newAbortController;

        try {
            // 中断之前的请求
            if (abortController) {
                abortController.abort();
            }

            // 创建新的中断控制器
            newAbortController = new AbortController();
            setAbortController(newAbortController);

            // 添加用户消息到界面
            setMessages(prevMessages => [...prevMessages, userMessage]);
            
            // 保存用户消息到数据库
            if (currentSessionId) {
                await indexedDBHelper.saveMessageToSession(currentSessionId, userMessage);
            }

            setIsLoading(true);

            // 获取完整的消息历史，并添加系统提示
            const systemPrompt = deepseekAPI.initializeChat().find(msg => msg.role === 'system');
            const visibleMessages = [...messages, userMessage]; // 当前显示的消息
            
            // 将系统提示放在消息历史的开头
            const messageHistory = systemPrompt ? [systemPrompt, ...visibleMessages] : visibleMessages;
            
            // 调用 DeepSeek API，传入 AbortController 的 signal
            const response = await deepseekAPI.sendMessage(messageHistory, {
                signal: newAbortController.signal
            });
            
            // 如果请求已被取消，不继续处理
            if (newAbortController.signal.aborted) {
                return;
            }

            // 检查是否有待处理的工具调用
            if (response.pendingToolCalls && response.pendingToolCalls.length > 0) {
                // 显示工具调用开始消息
                const toolCallsCount = response.pendingToolCalls.length;
                
                // 检查是否有搜索工具调用
                const hasSearchCall = response.pendingToolCalls.some(
                    tc => tc.name === 'bingSearch'
                );
                
                // 根据工具类型显示适当的消息
                let toolType = '操作';
                if (hasSearchCall) {
                    setSearchExecuting(true);
                    toolType = hasSearchCall && toolCallsCount === 1 ? '搜索' : '搜索和操作';
                } else {
                    setToolExecuting(true);
                }
                
                const toolNames = response.pendingToolCalls
                    .map(tc => tc.name)
                    .filter(Boolean)
                    .join(', ');
                
                const toolCallMsg = {
                    role: 'assistant',
                    content: `正在执行 ${toolCallsCount} 个 Scratch ${toolType}: ${toolNames}...`,
                    isToolCall: true,
                    timestamp: Date.now() // 添加时间戳
                };
                
                setMessages(prev => [...prev, toolCallMsg]);
                setToolExecuting(true);
                
                // 在本地执行工具调用
                const toolExecutionResult = await deepseekAPI.executeToolCalls(response.pendingToolCalls);
                
                // 将工具执行结果发送回 DeepSeek API
                const finalResponse = await deepseekAPI.sendToolResults(
                    messageHistory,
                    response,
                    toolExecutionResult
                );
                
                const assistantMessage = {
                    role: 'assistant',
                    content: finalResponse.content,
                    timestamp: Date.now(),
                    followUpQuestions: finalResponse.followUpQuestions || []
                };
                
                // 使用更新函数替换临时消息
                setMessages(prev => {
                    const newMessages = [...prev];
                    // 去掉最后一条临时工具消息
                    if (newMessages[newMessages.length - 1].isToolCall) {
                        newMessages.pop();
                    }
                    // 添加助手的最终回复
                    return [...newMessages, assistantMessage];
                });
                
                // 保存助手回复到会话
                if (currentSessionId) {
                    await indexedDBHelper.saveMessageToSession(currentSessionId, assistantMessage);
                }
            } else {
                // 没有工具调用，直接显示回复
                const assistantMessage = {
                    role: 'assistant',
                    content: response.content,
                    timestamp: Date.now(),
                    followUpQuestions: response.followUpQuestions || []
                };
                
                // 添加助手回复到界面
                setMessages(prevMessages => [...prevMessages, assistantMessage]);
                
                // 保存助手回复到数据库
                if (currentSessionId) {
                    await indexedDBHelper.saveMessageToSession(currentSessionId, assistantMessage);
                }
            }

        } catch (error) {
            if (error.name === 'AbortError' || 
               (newAbortController && newAbortController.signal.aborted)) {
                console.log('请求被取消');
                return;
            }
            
            console.error('发送消息失败:', error);
            
            // 添加错误消息到界面
            const errorMessage = {
                role: 'assistant',
                content: `抱歉，发生了错误：${error.message}`,
                timestamp: Date.now()
            };
            
            setMessages(prevMessages => {
                // 如果最后一条消息是工具调用临时消息，则去掉它
                if (prevMessages.length > 0 && prevMessages[prevMessages.length - 1].isToolCall) {
                    return [...prevMessages.slice(0, -1), errorMessage];
                }
                return [...prevMessages, errorMessage];
            });
            
            // 保存错误消息到会话
            if (currentSessionId) {
                try {
                    await indexedDBHelper.saveMessageToSession(currentSessionId, errorMessage);
                } catch (e) {
                    console.error('保存错误消息失败:', e);
                }
            }
        } finally {
            setIsLoading(false);
            setSearchExecuting(false);
            setToolExecuting(false);
            setAbortController(null);
        }
    }, [messages, currentSessionId, isLoading, abortController]);

    // 添加消息
    const addMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    // 更新消息（用于替换临时消息）
    const updateMessages = (updateFn) => {
        setMessages(updateFn);
    };

    return {
        messages,
        isLoading,
        toolExecuting,
        searchExecuting,
        abortController,
        loadSessionMessages,
        handleClearChat,
        handleSendMessage,
        addMessage,
        updateMessages
    };
};

// 输入历史管理的 hook
export const useInputHistory = (onSendMessage) => {
    const [inputValue, setInputValue] = useState('');
    const [inputHistory, setInputHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [temporaryInput, setTemporaryInput] = useState('');
    const [clearHistoryResult, setClearHistoryResult] = useState(null);
    const textareaRef = useRef(null);

    // 初始化时加载输入历史记录
    useEffect(() => {
        loadInputHistory();
    }, []);

    // 加载输入历史记录
    const loadInputHistory = async () => {
        try {
            const history = await indexedDBHelper.getInputHistory();
            if (history && history.length > 0) {
                setInputHistory(history);
            }
        } catch (e) {
            console.error('加载输入历史失败:', e);
        }
    };

    // 保存输入到历史
    const saveToHistory = async (input) => {
        // 检查是否与最近的历史记录重复
        const isDuplicate = inputHistory.length > 0 && 
            inputHistory[inputHistory.length - 1] === input;
        
        // 只在非重复的情况下保存历史记录
        if (!isDuplicate) {
            // 保存输入历史到IndexedDB (最多保存100条)
            indexedDBHelper.saveInputHistory(input, 100);
            
            // 更新本地输入历史状态
            setInputHistory(prev => {
                const newHistory = [...prev, input];
                return newHistory.slice(-100); // 只保留最近100条
            });
        }
        
        // 重置历史导航索引
        setHistoryIndex(-1);
        setTemporaryInput('');
    };

    // 清空输入历史
    const handleClearInputHistory = async () => {
        try {
            const success = await indexedDBHelper.clearInputHistory();
            
            if (success) {
                setInputHistory([]);
                setHistoryIndex(-1);
                setTemporaryInput('');
                const result = { success: true, message: '历史记录已清空' };
                setClearHistoryResult(result);
                // 3秒后清除结果消息
                setTimeout(() => setClearHistoryResult(null), 3000);
                return result;
            } else {
                const result = { success: false, message: '清空历史记录失败' };
                setClearHistoryResult(result);
                setTimeout(() => setClearHistoryResult(null), 3000);
                return result;
            }
        } catch (error) {
            console.error('清空输入历史记录失败:', error);
            const result = { success: false, message: `清空失败: ${error.message}` };
            setClearHistoryResult(result);
            setTimeout(() => setClearHistoryResult(null), 3000);
            return result;
        }
    };

    // 历史导航
    const navigateHistory = (direction, currentInput) => {
        if (inputHistory.length === 0) return currentInput;

        // 第一次按上箭头键，保存当前输入作为临时输入
        if (historyIndex === -1 && direction === 'up') {
            setTemporaryInput(currentInput);
        }

        // 计算新的历史索引
        let newIndex = historyIndex;

        if (direction === 'up') {
            // 向上浏览历史（更早的消息）
            newIndex = historyIndex >= inputHistory.length - 1 ? inputHistory.length - 1 : historyIndex + 1;
        } else {
            // 向下浏览历史（更新的消息）
            newIndex = historyIndex <= 0 ? -1 : historyIndex - 1;
        }

        // 更新历史索引
        setHistoryIndex(newIndex);

        // 返回对应的输入内容
        if (newIndex === -1) {
            // 恢复临时输入
            return temporaryInput;
        } else {
            // 使用历史记录
            return inputHistory[inputHistory.length - 1 - newIndex];
        }
    };

    // 处理输入变化
    const handleInputChange = useCallback((e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        
        // 如果正在浏览历史，退出历史模式
        if (historyIndex !== -1) {
            setHistoryIndex(-1);
            setTemporaryInput('');
        }
    }, [historyIndex]);

    // 处理键盘按键
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            
            const direction = e.key === 'ArrowUp' ? 'up' : 'down';
            const newValue = navigateHistory(direction, inputValue);
            setInputValue(newValue);
            
            // 将光标移到文本末尾
            setTimeout(() => {
                if (textareaRef.current) {
                    const length = newValue.length;
                    textareaRef.current.setSelectionRange(length, length);
                }
            }, 0);
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // 发送消息
            if (inputValue.trim()) {
                // 保存到历史记录
                saveToHistory(inputValue.trim());
                // 调用发送消息回调
                if (onSendMessage) {
                    onSendMessage(inputValue.trim());
                }
                // 清空输入
                setInputValue('');
                setHistoryIndex(-1);
                setTemporaryInput('');
            }
        }
    }, [inputValue, historyIndex, temporaryInput, inputHistory, onSendMessage]);

    return {
        inputValue,
        setInputValue,
        inputHistory,
        historyIndex,
        temporaryInput,
        textareaRef,
        clearHistoryResult,
        handleInputChange,
        handleKeyDown,
        handleClearInputHistory,
        loadInputHistory,
        saveToHistory,
        navigateHistory
    };
};

// 窗口大小管理的 hook
export const useWindowSize = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [width, setWidth] = useState(layout.standardStageWidth);
    const [lastWidth, setLastWidth] = useState(layout.standardStageWidth);

    useEffect(() => {
        const handleResize = () => {
            if (collapsed) return; // 折叠状态下不调整宽度
            
            // 根据视口宽度自适应调整聊天区域宽度
            const viewportWidth = window.innerWidth;
            let baseWidth;
            
            // 根据不同的视口宽度设置不同的聊天区域宽度
            if (viewportWidth >= 1400) {
                // 较大屏幕，使用较大宽度
                baseWidth = Math.min(500, viewportWidth * 0.25);
            } else if (viewportWidth >= layout.fullSizeMinWidth) {
                // 中等屏幕，使用标准舞台宽度
                baseWidth = layout.standardStageWidth;
            } else {
                // 较小屏幕，使用更窄的宽度以适应
                baseWidth = Math.max(280, Math.min(layout.standardStageWidth, viewportWidth * 0.3));
            }
            
            // 如果是放大状态，宽度加倍
            const finalWidth = expanded ? baseWidth * 2 : baseWidth;
            setWidth(finalWidth);
        };
        
        // 初始化调整一次
        handleResize();
        
        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);
        
        // 清理函数
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [collapsed, expanded]);

    const updateWidthForExpansion = (newExpandedState) => {
        const viewportWidth = window.innerWidth;
        let baseWidth;
        
        if (viewportWidth >= 1400) {
            baseWidth = Math.min(500, viewportWidth * 0.25);
        } else if (viewportWidth >= layout.fullSizeMinWidth) {
            baseWidth = layout.standardStageWidth;
        } else {
            baseWidth = Math.max(280, Math.min(layout.standardStageWidth, viewportWidth * 0.3));
        }
        
        const newWidth = newExpandedState ? baseWidth * 2 : baseWidth;
        setWidth(newWidth);
    };

    return {
        collapsed,
        setCollapsed,
        expanded,
        setExpanded,
        width,
        lastWidth,
        setWidth,
        setLastWidth,
        updateWidthForExpansion
    };
};

// 数据库健康检查和初始化的 hook
export const useDatabaseHealth = () => {
    const [isInitialized, setIsInitialized] = useState(false);

    // 测试和自动修复IndexedDB功能
    const testIndexedDB = async () => {
        console.log('===== 开始诊断IndexedDB =====');
        
        let needsRepair = false;
        
        // 1. 检查数据库版本
        try {
            const DB_NAME = 'scratch-chat-db';
            const request = indexedDB.open(DB_NAME);
            request.onsuccess = async (event) => {
                const db = event.target.result;
                console.log(`当前数据库版本: ${db.version}`);
                
                // 列出所有存储
                const storeNames = Array.from(db.objectStoreNames);
                console.log('数据库中的对象存储:', storeNames);
                
                // 检查是否缺少必要的存储
                const requiredStores = ['chatSessions', 'chatMessages'];
                const missingStores = requiredStores.filter(store => !storeNames.includes(store));
                
                if (missingStores.length > 0) {
                    console.warn('检测到缺失的存储:', missingStores);
                    needsRepair = true;
                    
                    // 自动修复：调用重置数据库函数
                    console.log('开始自动修复数据库...');
                    db.close();
                    const resetSuccess = await indexedDBHelper.resetDatabase();
                    console.log('数据库重置结果:', resetSuccess);
                    
                    if (resetSuccess) {
                        // 刷新页面以重新初始化所有内容
                        alert('数据库结构已修复，页面将重新加载以应用更改。');
                        window.location.reload();
                        return;
                    } else {
                        console.error('自动修复失败，尝试其他方法');
                    }
                } else {
                    console.log('数据库结构正确，所有必要的存储都已存在');
                }
                
                db.close();
                
                // 如果不需要修复，继续测试
                if (!needsRepair) {
                    await testDatabaseOperations();
                }
            };
            request.onerror = (event) => {
                console.error('无法打开数据库进行检查:', event.target.error);
            };
        } catch (e) {
            console.error('检查数据库版本失败:', e);
        }
        
        console.log('===== IndexedDB诊断结束 =====');
    };
    
    // 分离数据库操作测试为单独函数
    const testDatabaseOperations = async () => {
        try {
            console.log('测试数据库操作');
            
            // 测试创建新会话
            console.log('测试创建新会话');
            const sessionId = await indexedDBHelper.createSession('测试会话');
            console.log('创建的会话ID:', sessionId);
            
            // 获取所有会话
            const sessions = await indexedDBHelper.getSessions();
            console.log('当前所有会话:', sessions);
            
            // 测试保存消息
            if (sessionId) {
                const testMessage = {
                    role: 'user',
                    content: '这是一条测试消息'
                };
                
                const messageId = await indexedDBHelper.saveMessageToSession(sessionId, testMessage);
                console.log('保存测试消息ID:', messageId);
                
                // 获取会话消息
                const messages = await indexedDBHelper.getSessionMessages(sessionId);
                console.log('会话中的消息:', messages);
                
                // 清理测试数据
                await indexedDBHelper.deleteSession(sessionId);
                console.log('已清理测试会话');
            }
        } catch (e) {
            console.error('测试IndexedDB操作失败:', e);
            alert('数据库操作出错，请检查控制台日志。可能需要重新加载页面或清除浏览器数据。');
        }
    };

    // 执行数据库健康检查
    const checkDatabaseHealth = async () => {
        try {
            console.log('执行数据库健康检查...');
            const checkResult = await indexedDBHelper.checkAndRepairDatabase();
            
            if (!checkResult.success) {
                console.warn('数据库结构检查失败:', checkResult.message);
                
                // 尝试重置数据库
                console.log('尝试重置数据库...');
                const resetSuccess = await indexedDBHelper.resetDatabase();
                
                if (resetSuccess) {
                    console.log('数据库重置成功，刷新页面以应用更改');
                    alert('数据库已重置，页面将重新加载');
                    window.location.reload();
                    return;
                } else {
                    console.error('数据库重置失败');
                    alert('数据库修复失败，可能需要手动清除浏览器数据');
                }
            } else {
                console.log('数据库健康检查通过:', checkResult);
            }
            
            setIsInitialized(true);
        } catch (error) {
            console.error('数据库健康检查失败:', error);
            setIsInitialized(true); // 即使失败也设为已初始化，避免阻塞
        }

        // 诊断测试（可选，仅在开发环境下运行）
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                testIndexedDB();
            }, 2000);
        }
    };

    return {
        isInitialized,
        checkDatabaseHealth
    };
};

// 聊天设置钩子
export const useChatSettings = () => {
    const [apiKey, setApiKey] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [modelName, setModelName] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testConnectionResult, setTestConnectionResult] = useState(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // 从存储加载设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // 现在 getSettings 是异步的，会从存储重新加载最新设置
                const settings = await deepseekAPI.getSettings();
                if (settings) {
                    setApiKey(settings.apiKey || '');
                    setApiUrl(settings.apiUrl || 'https://api.deepseek.com/v1');
                    setModelName(settings.modelName || 'deepseek-chat');
                    setTemperature(settings.temperature !== undefined ? settings.temperature : 0.7);
                } else {
                    // 如果没有设置，使用默认值
                    setApiKey('');
                    setApiUrl('https://api.deepseek.com/v1');
                    setModelName('deepseek-chat');
                    setTemperature(0.7);
                }
            } catch (error) {
                console.error('加载设置失败:', error);
                // 使用默认值
                setApiKey('');
                setApiUrl('https://api.deepseek.com/v1');
                setModelName('deepseek-chat');
                setTemperature(0.7);
            } finally {
                setSettingsLoaded(true);
            }
        };

        loadSettings();
    }, []);

    const saveSettings = async () => {
        const settings = {
            apiKey,
            apiUrl,
            modelName,
            temperature
        };
        
        try {
            // 使用 deepseekAPI 更新设置
            // updateSettings 函数会同时保存到 localStorage 和 IndexedDB
            // 并且会重新初始化 OpenAI 客户端
            await deepseekAPI.updateSettings(settings);
            
            // 关闭模态框
            setShowSettingsModal(false);
            
            // 清除测试结果
            setTestConnectionResult(null);
        } catch (error) {
            console.error('保存设置失败:', error);
            // 可以在这里添加错误提示给用户
        }
    };

    const testApiConnection = async () => {
        setIsTestingConnection(true);
        setTestConnectionResult(null);
        
        try {
            // 构建测试设置对象
            const testSettings = {
                apiKey,
                apiUrl,
                modelName,
                temperature
            };
            
            // 使用 deepseekAPI 测试连接
            // 这会使用 OpenAI SDK 进行测试，与实际使用时一致
            const result = await deepseekAPI.testConnection(testSettings);
            setTestConnectionResult(result);
        } catch (error) {
            setTestConnectionResult({
                success: false,
                message: `测试失败: ${error.message}`
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    return {
        apiKey,
        setApiKey,
        apiUrl,
        setApiUrl,
        modelName,
        setModelName,
        temperature,
        setTemperature,
        showSettingsModal,
        setShowSettingsModal,
        isTestingConnection,
        setIsTestingConnection,
        testConnectionResult,
        setTestConnectionResult,
        settingsLoaded,
        saveSettings,
        testApiConnection
    };
};

// 自动滚动钩子
export const useAutoScroll = (messages) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    return {
        messagesEndRef,
        scrollToBottom
    };
};

// 消息复制钩子
export const useMessageCopy = () => {
    const handleCopyMessage = useCallback(async (content) => {
        try {
            await navigator.clipboard.writeText(content);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, []);

    return {
        handleCopyMessage
    };
};

// 键盘快捷键钩子
export const useKeyboardShortcuts = (handleInputChange, sendMessage) => {
    useEffect(() => {
        const handleKeyboardShortcuts = (e) => {
            // Ctrl+Enter 发送消息
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        };

        document.addEventListener('keydown', handleKeyboardShortcuts);
        return () => {
            document.removeEventListener('keydown', handleKeyboardShortcuts);
        };
    }, [handleInputChange, sendMessage]);
};
