/**
 * IndexedDB 辅助函数
 * 提供与 IndexedDB 交互的功能，用于存储聊天历史和设置
 */

// 数据库名称和版本
const DB_NAME = 'scratch-chat-db';
const DB_VERSION = 3;  // 增加版本号以更新数据库结构

// 对象存储的名称
const STORES = {
    CHAT_HISTORY: 'chatHistory',
    SETTINGS: 'settings',
    CHAT_SESSIONS: 'chatSessions',  // 新增会话存储
    CHAT_MESSAGES: 'chatMessages'   // 新增消息存储
};

/**
 * 初始化数据库
 * @returns {Promise<IDBDatabase>} 返回数据库实例
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        // 如果不在浏览器环境，返回 null
        if (typeof indexedDB === 'undefined') {
            console.warn('IndexedDB is not supported in this environment');
            return resolve(null);
        }
        
        console.log(`正在初始化数据库: ${DB_NAME}, 版本: ${DB_VERSION}`);
        
        // 打开数据库
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        // 处理数据库版本升级
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            console.log(`数据库正在升级: 从版本 ${oldVersion} 到版本 ${DB_VERSION}`);
            
            // 创建聊天历史对象存储
            if (!db.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
                const chatHistoryStore = db.createObjectStore(STORES.CHAT_HISTORY, { keyPath: 'timestamp' });
                chatHistoryStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('创建聊天历史存储成功');
            } else {
                console.log('聊天历史存储已存在');
            }
            
            // 创建设置对象存储
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                console.log('创建设置存储成功');
            } else {
                console.log('设置存储已存在');
            }
            
            // 确保创建会话和消息存储（无论版本如何）
            console.log('检查并确保聊天会话和消息存储存在');
            
            // 创建聊天会话存储
            try {
                if (!db.objectStoreNames.contains(STORES.CHAT_SESSIONS)) {
                    console.log('准备创建聊天会话存储');
                    const sessionStore = db.createObjectStore(STORES.CHAT_SESSIONS, { keyPath: 'id' });
                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionStore.createIndex('title', 'title', { unique: false });
                    console.log('创建聊天会话存储成功');
                } else {
                    console.log('聊天会话存储已存在');
                }
            } catch (e) {
                console.error('创建会话存储失败:', e);
            }
            
            // 创建聊天消息存储
            try {
                if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
                    console.log('准备创建聊天消息存储');
                    const messageStore = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id', autoIncrement: true });
                    messageStore.createIndex('sessionId', 'sessionId', { unique: false });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('创建聊天消息存储成功');
                } else {
                    console.log('聊天消息存储已存在');
                }
            } catch (e) {
                console.error('创建消息存储失败:', e);
            }
            
            console.log('数据库版本升级完成');
        };
        
        // 处理版本被阻塞的情况
        request.onblocked = (event) => {
            console.warn('数据库升级被阻塞。可能还有其他页面打开了该数据库', event);
        };
        
        // 处理成功和错误
        request.onsuccess = (event) => {
            const db = event.target.result;
            console.log('数据库初始化成功，当前版本:', db.version);
            
            // 验证存储是否存在
            const storeNames = Array.from(db.objectStoreNames);
            console.log('当前存在的存储:', storeNames);
            
            // 确认所有需要的存储都已创建
            const requiredStores = Object.values(STORES);
            const missingStores = requiredStores.filter(store => !storeNames.includes(store));
            
            if (missingStores.length > 0) {
                console.warn('缺少必要的存储:', missingStores);
                
                // 当存在缺失的必要存储时，强制升级数据库版本
                console.log('检测到缺少必要的存储，需要重置数据库...');
                
                // 关闭当前数据库连接
                db.close();
                
                // 强制升级数据库版本以触发 onupgradeneeded 事件
                const newVersion = db.version + 1;
                console.log(`尝试升级数据库到新版本: ${newVersion}`);
                
                const reopenRequest = indexedDB.open(DB_NAME, newVersion);
                
                reopenRequest.onupgradeneeded = (upgradeEvent) => {
                    const upgradedDb = upgradeEvent.target.result;
                    
                    // 检查并创建缺失的存储
                    missingStores.forEach(storeName => {
                        try {
                            if (!upgradedDb.objectStoreNames.contains(storeName)) {
                                console.log(`正在创建缺失的存储: ${storeName}`);
                                
                                if (storeName === STORES.CHAT_SESSIONS) {
                                    const sessionStore = upgradedDb.createObjectStore(STORES.CHAT_SESSIONS, { keyPath: 'id' });
                                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                                    sessionStore.createIndex('title', 'title', { unique: false });
                                    console.log('创建聊天会话存储成功');
                                } else if (storeName === STORES.CHAT_MESSAGES) {
                                    const messageStore = upgradedDb.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id', autoIncrement: true });
                                    messageStore.createIndex('sessionId', 'sessionId', { unique: false });
                                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                                    console.log('创建聊天消息存储成功');
                                } else {
                                    // 处理其他缺失的存储
                                    upgradedDb.createObjectStore(storeName);
                                    console.log(`创建存储 ${storeName} 成功`);
                                }
                            }
                        } catch (error) {
                            console.error(`创建存储 ${storeName} 失败:`, error);
                        }
                    });
                };
                
                reopenRequest.onsuccess = (reopenEvent) => {
                    console.log('数据库重新打开成功，存储已修复');
                    resolve(reopenEvent.target.result);
                };
                
                reopenRequest.onerror = (errorEvent) => {
                    console.error('重新打开数据库失败:', errorEvent.target.error);
                    reject(errorEvent.target.error);
                };
                
                return;
            }
            
            resolve(db);
        };
        
        request.onerror = (event) => {
            console.error('数据库初始化失败:', event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * 保存聊天输入历史
 * @param {string} input 用户输入文本
 * @param {number} maxItems 最大保存数量
 * @returns {Promise<void>}
 */
const saveInputHistory = async (input, maxItems = 100) => {
    if (!input || input.trim() === '') return;
    
    try {
        const db = await initDB();
        if (!db) return;
        
        const transaction = db.transaction([STORES.CHAT_HISTORY], 'readwrite');
        const store = transaction.objectStore(STORES.CHAT_HISTORY);
        
        // 检查是否重复并管理历史记录大小
        const checkAndSave = async () => {
            return new Promise((resolve, reject) => {
                const allHistoryRequest = store.index('timestamp').getAll();
                
                allHistoryRequest.onsuccess = () => {
                    const allHistory = allHistoryRequest.result;
                    
                    // 如果有历史记录，检查最近的一条是否与当前输入相同
                    if (allHistory.length > 0) {
                        // 按时间排序（最旧的在前面）
                        allHistory.sort((a, b) => a.timestamp - b.timestamp);
                        
                        // 检查最近的一条记录
                        const mostRecent = allHistory[allHistory.length - 1];
                        if (mostRecent && mostRecent.text === input) {
                            // 如果与最近记录相同，不保存
                            console.log('跳过保存重复的输入历史');
                            resolve();
                            return;
                        }
                        
                        // 如果超过最大数量，删除旧的
                        if (allHistory.length >= maxItems) {
                            // 需要删除的记录数量
                            const toDelete = allHistory.length - maxItems + 1; // +1 为即将添加的新记录留出空间
                            
                            // 删除最旧的记录
                            for (let i = 0; i < toDelete; i++) {
                                store.delete(allHistory[i].timestamp);
                            }
                        }
                    }
                    
                    // 添加新输入到历史记录
                    const addRequest = store.add({
                        text: input,
                        timestamp: Date.now()
                    });
                    
                    addRequest.onsuccess = () => resolve();
                    addRequest.onerror = (e) => reject(e.target.error);
                };
                
                allHistoryRequest.onerror = (e) => reject(e.target.error);
            });
        };
        
        await checkAndSave();
        
        // 此处已由上面的 checkAndSave 函数处理
        
    } catch (error) {
        console.error('保存聊天历史失败:', error);
    }
};

/**
 * 获取聊天输入历史
 * @returns {Promise<Array>} 历史输入数组
 */
const getInputHistory = async () => {
    try {
        const db = await initDB();
        if (!db) return [];
        
        const transaction = db.transaction([STORES.CHAT_HISTORY], 'readonly');
        const store = transaction.objectStore(STORES.CHAT_HISTORY);
        
        return new Promise((resolve, reject) => {
            const request = store.index('timestamp').getAll();
            
            request.onsuccess = () => {
                // 返回排序后的数组（最新的在后面）
                const histories = request.result;
                histories.sort((a, b) => a.timestamp - b.timestamp);
                resolve(histories.map(h => h.text));
            };
            
            request.onerror = (event) => {
                console.error('获取聊天历史失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('获取聊天历史失败:', error);
        return [];
    }
};

/**
 * 保存设置
 * @param {string} key 设置键
 * @param {any} value 设置值
 * @returns {Promise<void>}
 */
const saveSetting = async (key, value) => {
    if (!key) return;
    
    try {
        const db = await initDB();
        if (!db) return;
        
        const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
        const store = transaction.objectStore(STORES.SETTINGS);
        
        // 使用 put 方法添加或更新设置
        store.put({
            key,
            value,
            timestamp: Date.now()
        });
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = event => reject(event.target.error);
        });
    } catch (error) {
        console.error(`保存设置 ${key} 失败:`, error);
    }
};

/**
 * 获取设置
 * @param {string} key 设置键
 * @returns {Promise<any>} 设置值
 */
const getSetting = async (key) => {
    if (!key) return null;
    
    try {
        const db = await initDB();
        if (!db) return null;
        
        const transaction = db.transaction([STORES.SETTINGS], 'readonly');
        const store = transaction.objectStore(STORES.SETTINGS);
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            
            request.onerror = (event) => {
                console.error(`获取设置 ${key} 失败:`, event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error(`获取设置 ${key} 失败:`, error);
        return null;
    }
};

/**
 * 保存大模型设置到 IndexedDB
 * @param {Object} settings 大模型设置
 * @returns {Promise<void>}
 */
const saveModelSettings = async (settings) => {
    return saveSetting('deepseekSettings', settings);
};

/**
 * 获取大模型设置
 * @returns {Promise<Object|null>} 大模型设置对象
 */
const getModelSettings = async () => {
    return getSetting('deepseekSettings');
};

/**
 * 清空聊天输入历史
 * @returns {Promise<boolean>} 是否成功清空
 */
const clearInputHistory = async () => {
    try {
        const db = await initDB();
        if (!db) return false;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.CHAT_HISTORY], 'readwrite');
            const store = transaction.objectStore(STORES.CHAT_HISTORY);
            
            // 清空历史记录
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                console.log('聊天输入历史已清空');
                resolve(true);
            };
            
            clearRequest.onerror = (event) => {
                console.error('清空聊天历史失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('清空聊天历史失败:', error);
        return false;
    }
};

/**
 * 创建新的聊天会话
 * @param {string} title 会话标题
 * @returns {Promise<string>} 返回新创建的会话ID
 */
const createSession = async (title = '新会话') => {
    try {
        console.log('开始创建新会话:', title);
        const db = await initDB();
        if (!db) {
            console.error('创建会话失败: 无法获取数据库实例');
            return null;
        }
        
        const transaction = db.transaction([STORES.CHAT_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.CHAT_SESSIONS);
        
        const sessionId = `session_${Date.now()}`;
        const session = {
            id: sessionId,
            title: title,
            timestamp: Date.now(),
            messageCount: 0
        };
        
        console.log('准备添加会话到存储:', session);
        
        return new Promise((resolve, reject) => {
            const request = store.add(session);
            
            request.onsuccess = () => {
                console.log('创建会话成功，完成添加操作:', sessionId);
                
                // 确认事务完成
                transaction.oncomplete = () => {
                    console.log('创建会话事务完成');
                };
                
                resolve(sessionId);
            };
            
            request.onerror = (event) => {
                console.error('创建会话失败，添加操作出错:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('创建会话失败，捕获到异常:', error);
        return null;
    }
};

/**
 * 获取所有聊天会话
 * @returns {Promise<Array>} 会话列表
 */
const getSessions = async () => {
    try {
        const db = await initDB();
        if (!db) return [];
        
        const transaction = db.transaction([STORES.CHAT_SESSIONS], 'readonly');
        const store = transaction.objectStore(STORES.CHAT_SESSIONS);
        
        return new Promise((resolve, reject) => {
            const request = store.index('timestamp').getAll();
            
            request.onsuccess = () => {
                // 按时间排序（最新的在前面）
                const sessions = request.result;
                sessions.sort((a, b) => b.timestamp - a.timestamp);
                resolve(sessions);
            };
            
            request.onerror = (event) => {
                console.error('获取会话列表失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('获取会话列表失败:', error);
        return [];
    }
};

/**
 * 获取指定会话的消息列表
 * @param {string} sessionId 会话ID
 * @returns {Promise<Array>} 消息列表
 */
const getSessionMessages = async (sessionId) => {
    if (!sessionId) {
        console.error('获取会话消息失败: 会话ID为空');
        return [];
    }
    
    try {
        console.log('开始获取会话消息:', sessionId);
        const db = await initDB();
        if (!db) {
            console.error('获取会话消息失败: 无法获取数据库实例');
            return [];
        }
        
        const transaction = db.transaction([STORES.CHAT_MESSAGES], 'readonly');
        const store = transaction.objectStore(STORES.CHAT_MESSAGES);
        
        // 确认索引存在
        if (!store.indexNames.contains('sessionId')) {
            console.error('获取会话消息失败: sessionId索引不存在');
            return [];
        }
        
        const index = store.index('sessionId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(sessionId);
            
            request.onsuccess = () => {
                // 按时间排序
                const messages = request.result;
                console.log(`获取会话消息成功, 共${messages.length}条消息:`);
                
                if (messages.length > 0) {
                    console.log('第一条消息:', messages[0]);
                    console.log('最后一条消息:', messages[messages.length - 1]);
                } else {
                    console.log('会话中没有消息');
                }
                
                messages.sort((a, b) => a.timestamp - b.timestamp);
                resolve(messages);
            };
            
            request.onerror = (event) => {
                console.error('获取会话消息失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('获取会话消息失败, 捕获到异常:', error);
        return [];
    }
};

/**
 * 保存消息到会话
 * @param {string} sessionId 会话ID
 * @param {Object} message 消息对象，包含 role 和 content
 * @returns {Promise<string>} 返回消息ID
 */
const saveMessageToSession = async (sessionId, message) => {
    if (!sessionId || !message) {
        console.error('保存消息失败: 会话ID或消息为空', { sessionId, message });
        return null;
    }
    
    try {
        console.log('开始保存消息到会话:', { sessionId, message });
        const db = await initDB();
        if (!db) {
            console.error('保存消息失败: 无法获取数据库实例');
            return null;
        }
        
        // 先检查会话是否存在
        const checkSessionTx = db.transaction([STORES.CHAT_SESSIONS], 'readonly');
        const checkSessionStore = checkSessionTx.objectStore(STORES.CHAT_SESSIONS);
        
        // 验证会话存在
        const sessionExists = await new Promise((resolve) => {
            const checkRequest = checkSessionStore.get(sessionId);
            
            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    console.log('会话验证成功:', sessionId);
                    resolve(true);
                } else {
                    console.error('会话不存在，尝试自动创建:', sessionId);
                    resolve(false);
                }
            };
            
            checkRequest.onerror = (event) => {
                console.error('会话验证失败:', event.target.error);
                resolve(false);
            };
        });
        
        // 如果会话不存在，先创建会话
        if (!sessionExists) {
            try {
                console.log('尝试自动创建会话:', sessionId);
                const createSessionTx = db.transaction([STORES.CHAT_SESSIONS], 'readwrite');
                const createSessionStore = createSessionTx.objectStore(STORES.CHAT_SESSIONS);
                
                const newSession = {
                    id: sessionId,
                    title: '新会话',
                    timestamp: Date.now(),
                    messageCount: 0
                };
                
                await new Promise((resolve, reject) => {
                    const createRequest = createSessionStore.add(newSession);
                    
                    createRequest.onsuccess = () => {
                        console.log('自动创建会话成功:', sessionId);
                        resolve();
                    };
                    
                    createRequest.onerror = (event) => {
                        console.error('自动创建会话失败:', event.target.error);
                        reject(event.target.error);
                    };
                });
            } catch (error) {
                console.error('创建会话过程中出错:', error);
                // 继续尝试保存消息，即使会话创建失败
            }
        }
        
        // 更新会话的消息数量
        console.log('准备更新会话消息数量');
        const sessionTx = db.transaction([STORES.CHAT_SESSIONS], 'readwrite');
        const sessionStore = sessionTx.objectStore(STORES.CHAT_SESSIONS);
        
        // 添加事务监听
        sessionTx.oncomplete = () => {
            console.log('会话更新事务已完成');
        };
        
        sessionTx.onerror = (event) => {
            console.error('会话更新事务出错:', event.target.error);
        };
        
        const sessionRequest = sessionStore.get(sessionId);
        sessionRequest.onsuccess = () => {
            if (sessionRequest.result) {
                const session = sessionRequest.result;
                console.log('找到会话，当前消息数量:', session.messageCount);
                
                session.messageCount = (session.messageCount || 0) + 1;
                session.timestamp = Date.now(); // 更新会话时间戳
                
                // 如果是第一条用户消息且还是默认标题，则使用消息内容的前20个字符作为标题
                if (session.messageCount === 1 && message.role === 'user' && session.title === '新会话') {
                    session.title = message.content.substring(0, 20) + (message.content.length > 20 ? '...' : '');
                    console.log('更新会话标题为:', session.title);
                }
                
                const putRequest = sessionStore.put(session);
                putRequest.onsuccess = () => {
                    console.log('会话更新成功');
                };
                putRequest.onerror = (event) => {
                    console.error('会话更新失败:', event.target.error);
                };
            } else {
                console.error('找不到会话:', sessionId);
            }
        };
        
        sessionRequest.onerror = (event) => {
            console.error('获取会话信息失败:', event.target.error);
        };
        
        // 保存消息
        console.log('准备保存消息内容到消息存储');
        const messageTx = db.transaction([STORES.CHAT_MESSAGES], 'readwrite');
        const messageStore = messageTx.objectStore(STORES.CHAT_MESSAGES);
        
        // 添加消息事务监听
        messageTx.oncomplete = () => {
            console.log('消息保存事务已完成');
        };
        
        messageTx.onerror = (event) => {
            console.error('消息保存事务出错:', event.target.error);
        };
        
        const messageObj = {
            ...message,
            sessionId,
            timestamp: Date.now()
        };
        
        return new Promise((resolve, reject) => {
            const request = messageStore.add(messageObj);
            
            request.onsuccess = (event) => {
                const messageId = event.target.result;
                console.log('保存消息成功, ID:', messageId);
                resolve(messageId); // 返回消息ID
            };
            
            request.onerror = (event) => {
                console.error('保存消息失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('保存消息失败:', error);
        return null;
    }
};

/**
 * 删除会话及其所有消息
 * @param {string} sessionId 会话ID
 * @returns {Promise<boolean>} 是否成功删除
 */
const deleteSession = async (sessionId) => {
    if (!sessionId) return false;
    
    try {
        const db = await initDB();
        if (!db) return false;
        
        // 删除会话
        const sessionTx = db.transaction([STORES.CHAT_SESSIONS], 'readwrite');
        const sessionStore = sessionTx.objectStore(STORES.CHAT_SESSIONS);
        sessionStore.delete(sessionId);
        
        // 删除会话的所有消息
        const messageTx = db.transaction([STORES.CHAT_MESSAGES], 'readwrite');
        const messageStore = messageTx.objectStore(STORES.CHAT_MESSAGES);
        const messageIndex = messageStore.index('sessionId');
        
        return new Promise((resolve, reject) => {
            const request = messageIndex.getAll(sessionId);
            
            request.onsuccess = () => {
                const messages = request.result;
                const deletePromises = messages.map(msg => 
                    new Promise((res) => {
                        messageStore.delete(msg.id).onsuccess = () => res();
                    })
                );
                
                Promise.all(deletePromises).then(() => {
                    console.log('删除会话及消息成功:', sessionId);
                    resolve(true);
                });
            };
            
            request.onerror = (event) => {
                console.error('删除会话消息失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('删除会话失败:', error);
        return false;
    }
};

/**
 * 更新会话标题
 * @param {string} sessionId 会话ID
 * @param {string} title 新标题
 * @returns {Promise<boolean>} 是否成功更新
 */
const updateSessionTitle = async (sessionId, title) => {
    if (!sessionId || !title) return false;
    
    try {
        const db = await initDB();
        if (!db) return false;
        
        const transaction = db.transaction([STORES.CHAT_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.CHAT_SESSIONS);
        
        return new Promise((resolve, reject) => {
            const request = store.get(sessionId);
            
            request.onsuccess = () => {
                if (request.result) {
                    const session = request.result;
                    session.title = title;
                    
                    const updateRequest = store.put(session);
                    updateRequest.onsuccess = () => {
                        console.log('更新会话标题成功');
                        resolve(true);
                    };
                    
                    updateRequest.onerror = (event) => {
                        console.error('更新会话标题失败:', event.target.error);
                        reject(event.target.error);
                    };
                } else {
                    console.error('未找到会话:', sessionId);
                    resolve(false);
                }
            };
            
            request.onerror = (event) => {
                console.error('获取会话失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('更新会话标题失败:', error);
        return false;
    }
};

/**
 * 清空所有会话和消息
 * @returns {Promise<boolean>} 是否成功清空
 */
const clearAllSessions = async () => {
    try {
        const db = await initDB();
        if (!db) return false;
        
        const sessionTx = db.transaction([STORES.CHAT_SESSIONS], 'readwrite');
        const sessionStore = sessionTx.objectStore(STORES.CHAT_SESSIONS);
        
        const messageTx = db.transaction([STORES.CHAT_MESSAGES], 'readwrite');
        const messageStore = messageTx.objectStore(STORES.CHAT_MESSAGES);
        
        return new Promise((resolve, reject) => {
            const clearSessionsRequest = sessionStore.clear();
            const clearMessagesRequest = messageStore.clear();
            
            clearSessionsRequest.onsuccess = () => {
                console.log('清空会话成功');
            };
            
            clearMessagesRequest.onsuccess = () => {
                console.log('清空消息成功');
                resolve(true);
            };
            
            clearMessagesRequest.onerror = (event) => {
                console.error('清空消息失败:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('清空会话和消息失败:', error);
        return false;
    }
};

/**
 * 重置数据库
 * 删除并重新创建数据库，用于解决严重的数据库问题
 * @returns {Promise<Boolean>} 操作是否成功
 */
const resetDatabase = async () => {
    return new Promise((resolve, reject) => {
        try {
            console.log('开始重置数据库...');
            
            // 首先尝试关闭所有可能的数据库连接
            const closeConnections = () => {
                return new Promise(resolveClose => {
                    try {
                        if ('databases' in indexedDB) {
                            indexedDB.databases().then(databases => {
                                const dbFound = databases.find(db => db.name === DB_NAME);
                                if (dbFound) {
                                    console.log('尝试关闭已有的数据库连接');
                                    const closeRequest = indexedDB.open(DB_NAME);
                                    closeRequest.onsuccess = event => {
                                        const db = event.target.result;
                                        db.close();
                                        console.log('已关闭数据库连接');
                                        resolveClose();
                                    };
                                    closeRequest.onerror = () => resolveClose();
                                } else {
                                    resolveClose();
                                }
                            }).catch(() => resolveClose());
                        } else {
                            resolveClose();
                        }
                    } catch (e) {
                        console.warn('关闭连接时出错:', e);
                        resolveClose();
                    }
                });
            };
            
            // 删除并重建数据库
            const deleteAndRebuild = async () => {
                return new Promise(resolveDelete => {
                    // 1. 删除数据库
                    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                    
                    deleteRequest.onsuccess = () => {
                        console.log('数据库删除成功');
                        
                        // 2. 重新初始化数据库
                        initDB().then(db => {
                            if (db) {
                                console.log('数据库重新初始化成功');
                                
                                // 验证所有需要的存储是否都已创建
                                const storeNames = Array.from(db.objectStoreNames);
                                const requiredStores = Object.values(STORES);
                                const missingStores = requiredStores.filter(store => !storeNames.includes(store));
                                
                                if (missingStores.length === 0) {
                                    console.log('所有必要的存储都已创建成功');
                                    resolveDelete(true);
                                } else {
                                    console.warn('重建后仍缺少存储:', missingStores);
                                    
                                    // 关闭数据库并强制创建新版本以添加缺失的存储
                                    db.close();
                                    
                                    const upgradeRequest = indexedDB.open(DB_NAME, db.version + 1);
                                    upgradeRequest.onupgradeneeded = event => {
                                        const upgradedDb = event.target.result;
                                        missingStores.forEach(storeName => {
                                            try {
                                                if (storeName === STORES.CHAT_SESSIONS) {
                                                    const sessionStore = upgradedDb.createObjectStore(STORES.CHAT_SESSIONS, { keyPath: 'id' });
                                                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                                                    sessionStore.createIndex('title', 'title', { unique: false });
                                                } else if (storeName === STORES.CHAT_MESSAGES) {
                                                    const messageStore = upgradedDb.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id', autoIncrement: true });
                                                    messageStore.createIndex('sessionId', 'sessionId', { unique: false });
                                                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                                                } else {
                                                    upgradedDb.createObjectStore(storeName);
                                                }
                                                console.log(`创建存储 ${storeName} 成功`);
                                            } catch (e) {
                                                console.error(`创建存储 ${storeName} 失败:`, e);
                                            }
                                        });
                                    };
                                    
                                    upgradeRequest.onsuccess = () => {
                                        console.log('强制升级并创建缺失存储成功');
                                        resolveDelete(true);
                                    };
                                    
                                    upgradeRequest.onerror = err => {
                                        console.error('强制升级失败:', err);
                                        resolveDelete(false);
                                    };
                                }
                            } else {
                                console.error('数据库重新初始化失败');
                                resolveDelete(false);
                            }
                        }).catch(error => {
                            console.error('数据库重新初始化失败:', error);
                            resolveDelete(false);
                        });
                    };
                    
                    deleteRequest.onerror = (event) => {
                        console.error('删除数据库失败:', event.target.error);
                        resolveDelete(false);
                    };
                    
                    deleteRequest.onblocked = () => {
                        console.warn('数据库删除操作被阻塞，可能是有其他连接尚未关闭');
                        // 稍等后重试
                        setTimeout(() => {
                            const retryRequest = indexedDB.deleteDatabase(DB_NAME);
                            retryRequest.onsuccess = () => {
                                console.log('重试删除数据库成功');
                                // 继续初始化
                                initDB().then(db => {
                                    if (db) {
                                        console.log('数据库重新初始化成功');
                                        resolveDelete(true);
                                    } else {
                                        console.error('数据库重新初始化失败');
                                        resolveDelete(false);
                                    }
                                });
                            };
                            retryRequest.onerror = () => resolveDelete(false);
                        }, 1000);
                    };
                });
            };
            
            // 执行重置流程
            closeConnections().then(() => {
                deleteAndRebuild().then(result => {
                    resolve(result);
                });
            });
        } catch (error) {
            console.error('重置数据库失败:', error);
            resolve(false);
        }
    });
};

/**
 * 检查数据库结构并修复问题
 * 如果存在存储结构问题，会尝试修复它们
 * @returns {Promise<Object>} 检查和修复结果
 */
const checkAndRepairDatabase = async () => {
    try {
        console.log('开始检查数据库结构...');
        
        // 打开并检查数据库
        const db = await initDB();
        if (!db) {
            console.error('无法打开数据库进行检查');
            return { success: false, message: '无法打开数据库' };
        }
        
        // 检查所需的存储是否存在
        const storeNames = Array.from(db.objectStoreNames);
        const requiredStores = Object.values(STORES);
        const missingStores = requiredStores.filter(store => !storeNames.includes(store));
        
        console.log('当前数据库版本:', db.version);
        console.log('现有存储:', storeNames);
        console.log('缺失的存储:', missingStores);
        
        if (missingStores.length === 0) {
            console.log('数据库结构检查完成: 所有存储都已正确创建');
            return { 
                success: true, 
                message: '数据库结构正常',
                version: db.version,
                stores: storeNames
            };
        }
        
        console.warn(`检测到缺失的存储: ${missingStores.join(', ')}`);
        console.log('尝试修复数据库...');
        
        // 关闭当前连接以便重置
        db.close();
        
        // 尝试重置数据库以修复问题
        const resetSuccess = await resetDatabase();
        if (resetSuccess) {
            console.log('数据库修复完成');
            
            // 再次检查修复后的数据库状态
            const repairedDb = await initDB();
            if (!repairedDb) return { success: false, message: '修复后无法打开数据库' };
            
            const repairedStores = Array.from(repairedDb.objectStoreNames);
            const stillMissing = requiredStores.filter(store => !repairedStores.includes(store));
            
            if (stillMissing.length === 0) {
                return { 
                    success: true, 
                    message: '数据库修复成功',
                    version: repairedDb.version,
                    stores: repairedStores
                };
            } else {
                return {
                    success: false, 
                    message: `修复后仍有缺失的存储: ${stillMissing.join(', ')}`,
                    version: repairedDb.version,
                    stores: repairedStores,
                    missing: stillMissing
                };
            }
        } else {
            console.error('数据库修复失败');
            return { 
                success: false, 
                message: '数据库修复失败, 请尝试清除浏览器数据后重新加载页面',
                version: db.version 
            };
        }
    } catch (error) {
        console.error('检查并修复数据库时出错:', error);
        return { 
            success: false, 
            message: `检查数据库时出错: ${error.message}` 
        };
    }
};

export default {
    saveInputHistory,
    getInputHistory,
    saveSetting,
    getSetting,
    saveModelSettings,
    getModelSettings,
    clearInputHistory,
    createSession,
    getSessions,
    getSessionMessages,
    saveMessageToSession,
    deleteSession,
    updateSessionTitle,
    clearAllSessions,
    resetDatabase,
    checkAndRepairDatabase  // 添加新的辅助函数
};
