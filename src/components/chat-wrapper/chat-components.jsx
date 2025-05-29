import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {FormattedMessage} from 'react-intl';
import Box from '../box/box.jsx';
import Modal from '../modal/modal.jsx';
import { hasMarkdown, hasCodeBlocks } from './markdown-utils.js';
import {
    ToolIcon,
    SearchIcon,
    SettingsIcon,
    SessionsIcon,
    AddSessionIcon,
    EditIcon,
    DeleteIcon,
    CloseIcon,
    ChatIcon
} from './chat-icons.jsx';
import styles from './chat-wrapper.css';

// 导入统一的Markdown渲染组件
import MessageWithMarkdown from './message-with-markdown.jsx';

// 消息组件
export const MessageComponent = ({ 
    message, 
    index, 
    onCopyMessage, 
    onSendMessage, 
    isLoading 
}) => {
    // Skip system messages in regular mode (show in development only)
    if (message.role === 'system' && !message.isToolSummary && process.env.NODE_ENV !== 'development') {
        return null;
    }
    
    // For tool summaries, show a different style
    if (message.isToolSummary) {
        return (
            <div 
                key={index} 
                className={styles.messageSystem}
            >
                <div className={styles.messageContent}>
                    <pre className={styles.toolSummary}>{message.content}</pre>
                </div>
            </div>
        );
    }
    
    return (
        <div 
            key={index} 
            className={`${message.role === 'assistant' ? styles.messageBot : styles.messageUser} ${
                message.role === 'assistant' && hasMarkdown(message.content) ? styles.hasMarkdown : ''
            } ${
                message.role === 'assistant' && hasCodeBlocks(message.content) ? styles.hasCodeBlock : ''
            }`}
        >
            <div className={styles.messageContent}>
                {/* 添加消息时间戳 */}
                <div className={styles.messageTimestamp}>
                    {message.timestamp ? new Date(message.timestamp).toLocaleString() : new Date().toLocaleString()}
                </div>
                {message.role === 'assistant' ? (
                    <MessageWithMarkdown content={message.content} />
                ) : (
                    message.content
                )}
                {message.content && message.content.length > 10 && message.role === 'assistant' && (
                    <button 
                        className={styles.copyButton}
                        onClick={() => onCopyMessage(message.content)}
                        title="复制消息"
                        aria-label="复制消息"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                    </button>
                )}
                
                {/* 后续问题按钮 */}
                {message.role === 'assistant' && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                    <div className={styles.followUpContainer}>
                        <h4 className={styles.followUpHeading}>尝试问:</h4>
                        {message.followUpQuestions.map((question, qIndex) => (
                            <button
                                key={`followup-${index}-${qIndex}`}
                                className={styles.followUpButton}
                                onClick={() => onSendMessage(question)}
                                disabled={isLoading}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// 加载状态组件
export const LoadingIndicator = ({ searchExecuting, toolExecuting }) => (
    <div className={styles.messageBot}>
        <div className={styles.messageContent}>
            {searchExecuting ? (
                <>
                    <SearchIcon />
                    <span style={{marginLeft: '8px'}}>正在搜索网络信息</span>
                    <span className={styles.loadingDots}>
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </span>
                </>
            ) : toolExecuting ? (
                <>
                    <ToolIcon />
                    <span style={{marginLeft: '8px'}}>正在执行 Scratch 操作</span>
                    <span className={styles.loadingDots}>
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </span>
                </>
            ) : (
                <>
                    思考中<span className={styles.loadingDots}>
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </span>
                </>
            )}
        </div>
    </div>
);

// 聊天头部组件
export const ChatHeader = ({ onSessionsClick, onClearClick, onSettingsClick }) => (
    <Box className={styles.chatHeaderWrapper}>
        <div className={styles.chatHeader}>
            <ChatIcon />
            <h1 className={styles.chatTitle}>
                <FormattedMessage
                    defaultMessage="Chat Scratch"
                    description="Title for chat area"
                    id="gui.chatWrapper.chatScratch"
                />
            </h1>
            <div className={styles.headerButtons}>
                <button 
                    className={styles.sessionsButton}
                    onClick={onSessionsClick}
                    title="会话历史"
                    aria-label="会话历史"
                >
                    <SessionsIcon />
                </button>
                <button 
                    className={styles.clearChatButton}
                    onClick={onClearClick}
                    title="新建会话"
                    aria-label="新建会话"
                >
                    <AddSessionIcon />
                </button>
                <button 
                    className={styles.settingsButton}
                    onClick={onSettingsClick}
                    title="设置"
                    aria-label="设置"
                >
                    <SettingsIcon />
                </button>
            </div>
        </div>
    </Box>
);

// 消息列表组件
export const MessagesList = ({ 
    messages, 
    onCopyMessage, 
    onSendMessage, 
    isLoading, 
    searchExecuting, 
    toolExecuting, 
    messagesEndRef 
}) => (
    <Box className={styles.chatCanvasWrapper}>
        <div className={styles.chatMessages}>
            {messages.map((message, index) => (
                <MessageComponent
                    key={index}
                    message={message}
                    index={index}
                    onCopyMessage={onCopyMessage}
                    onSendMessage={onSendMessage}
                    isLoading={isLoading}
                />
            ))}
            {isLoading && (
                <LoadingIndicator 
                    searchExecuting={searchExecuting}
                    toolExecuting={toolExecuting}
                />
            )}
            <div ref={messagesEndRef} />
        </div>
    </Box>
);

// 输入区域组件
export const InputArea = ({
    historyIndex,
    inputHistory,
    inputValue,
    onInputChange,
    onKeyDown,
    textareaRef,
    isLoading,
    onSendMessage,
    onAbort
}) => (
    <Box className={styles.chatInputWrapper}>
        <div className={styles.chatInput}>
            {historyIndex !== -1 && (
                <div className={styles.historyIndicator}>
                    {`历史 ${historyIndex + 1}/${inputHistory.length}`}
                </div>
            )}
            <textarea 
                placeholder="输入消息..." 
                className={`${styles.chatInputField} ${historyIndex !== -1 ? styles.historyNavActive : ''}`}
                rows="1"
                value={inputValue}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                ref={textareaRef}
                disabled={isLoading}
            />
            <button 
                className={`${styles.sendButton} ${isLoading ? styles.cancelButton : ''}`}
                title={isLoading ? "中断发送" : "发送消息"}
                aria-label={isLoading ? "中断发送" : "发送消息"}
                onClick={() => {
                    if (isLoading) {
                        // 处理取消逻辑 - 调用 abort 函数中断请求
                        if (onAbort) {
                            onAbort();
                        }
                    } else if (inputValue.trim() && onSendMessage) {
                        onSendMessage(inputValue.trim());
                    }
                }}
                disabled={!isLoading && inputValue.trim() === ''}
            >
                {isLoading ? (
                    <svg 
                        className={styles.cancelIcon} 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="white"
                    >
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                    </svg>
                ) : (
                    <svg 
                        className={styles.sendIcon} 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" 
                            fill="white"
                        />
                    </svg>
                )}
            </button>
        </div>
    </Box>
);

// 折叠状态内容组件
export const CollapsedContent = () => (
    <div className={styles.collapsedContent}>
        <ChatIcon />
        <div className={styles.verticalText}>
            <FormattedMessage
                defaultMessage="Chat Scratch"
                description="Title for chat area in collapsed state"
                id="gui.chatWrapper.collapsedChatScratch"
            />
        </div>
    </div>
);

// 会话抽屉组件
export const SessionsDrawer = ({
    visible,
    sessions,
    currentSessionId,
    editingSessionId,
    editingSessionTitle,
    onClose,
    onSessionClick,
    onEditStart,
    onEditSave,
    onEditCancel,
    onDeleteSession,
    onEditTitleChange
}) => (
    <>
        {/* 遮罩层，点击后关闭抽屉 */}
        <div 
            className={`${styles.drawerOverlay} ${visible ? styles.visible : ''}`}
            onClick={onClose}
        />
        
        {/* 会话抽屉 */}
        <div className={`${styles.sessionsDrawer} ${visible ? styles.visible : ''}`}>
            <div className={styles.sessionsHeader}>
                <h2 className={styles.sessionsTitle}>会话历史</h2>
                <button 
                    className={styles.closeSessionsButton}
                    onClick={onClose}
                    title="关闭"
                >
                    <CloseIcon />
                </button>
            </div>
            
            <div className={styles.sessionsList}>
                {sessions.map((session, index) => (
                    <div 
                        key={session.id} 
                        className={`${styles.sessionItem} ${currentSessionId === session.id ? styles.active : ''}`}
                    >
                        {editingSessionId === session.id ? (
                            <form 
                                className={styles.sessionEditForm}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    saveSessionTitle();
                                }}
                            >
                                <input 
                                    type="text"
                                    className={styles.sessionEditInput}
                                    value={editingSessionTitle}
                                    onChange={e => onEditTitleChange(e.target.value)}
                                    autoFocus
                                />
                                <button 
                                    type="submit" 
                                    className={styles.saveSessionButton}
                                    title="保存"
                                >
                                    保存
                                </button>
                                <button 
                                    type="button"
                                    className={styles.cancelEditButton}
                                    onClick={onEditCancel}
                                    title="取消"
                                >
                                    取消
                                </button>
                            </form>
                        ) : (
                            <>
                                <div className={styles.sessionHeader}>
                                    <div 
                                        className={styles.sessionTitle}
                                        onClick={() => onSessionClick(session.id)}
                                        title={session.title}
                                    >
                                        {session.title}
                                    </div>
                                    <div className={styles.sessionActions}>
                                        <button 
                                            className={styles.editSessionButton}
                                            onClick={() => onEditStart(session.id, session.title)}
                                            title="编辑标题"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button 
                                            className={styles.deleteSessionButton}
                                            onClick={() => onDeleteSession(session.id)}
                                            title="删除会话"
                                        >
                                            <DeleteIcon />
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.sessionInfo}>
                                    <span className={styles.sessionNumber}>#{sessions.length - index}</span>
                                    <span className={styles.sessionDate}>
                                        {new Date(session.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                
                {sessions.length === 0 && (
                    <div className={styles.noSessionsMessage}>
                        没有会话历史记录
                    </div>
                )}
            </div>
        </div>
    </>
);

// 设置模态框组件
export const SettingsModal = ({
    visible,
    apiKey,
    setApiKey,
    apiUrl,
    setApiUrl,
    modelName,
    setModelName,
    temperature,
    setTemperature,
    onClose,
    onSave,
    onClearInputHistory,
    clearHistoryResult,
    sessions,
    onClearAllSessions,
    clearSessionsResult,
    testConnectionResult,
    isTestingConnection,
    onTestConnection
}) => (
    visible && (
        <Modal 
            contentLabel="大模型设置"
            onRequestClose={onClose}
        >
            <Box className={styles.settingsModalContent}>
                <h2>大模型设置</h2>
                <p>在此处可以调整大模型的相关设置，设置将被保存在本地。</p>
                
                <div className={styles.settingItem}>
                    <label htmlFor="apiKey" className={styles.settingLabel}>
                        API Key
                    </label>
                    <input 
                        type="text" 
                        id="apiKey" 
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)} 
                        className={styles.settingInput}
                        placeholder="输入您的 API Key"
                    />
                </div>

                <div className={styles.settingItem}>
                    <label htmlFor="apiUrl" className={styles.settingLabel}>
                        API URL
                    </label>
                    <input 
                        type="text" 
                        id="apiUrl" 
                        value={apiUrl}
                        onChange={e => setApiUrl(e.target.value)}
                        className={styles.settingInput}
                        placeholder="https://api.deepseek.com/v1/chat/completions"
                    />
                </div>
                
                <div className={styles.settingItem}>
                    <label htmlFor="modelName" className={styles.settingLabel}>
                        模型名称
                    </label>
                    <input 
                        type="text" 
                        id="modelName" 
                        value={modelName}
                        onChange={e => setModelName(e.target.value)}
                        className={styles.settingInput}
                        placeholder="deepseek-chat"
                    />
                </div>
                
                <div className={styles.settingItem}>
                    <label htmlFor="temperature" className={styles.settingLabel}>
                        温度: {temperature}
                    </label>
                    <input 
                        type="range" 
                        id="temperature" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={temperature}
                        onChange={e => setTemperature(parseFloat(e.target.value))}
                        className={styles.settingSlider}
                    />
                    <div className={styles.rangeLabels}>
                        <span>精确</span>
                        <span>创造力</span>
                    </div>
                </div>
                
                <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>
                        输入历史记录
                    </label>
                    <button 
                        onClick={onClearInputHistory} 
                        className={styles.clearHistoryButton}
                        title="清空所有输入历史记录"
                    >
                        清空历史记录
                    </button>
                    {clearHistoryResult && (
                        <div className={`${styles.clearHistoryResult} ${styles.testSuccess}`}>
                            {clearHistoryResult}
                        </div>
                    )}
                </div>
                
                <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>
                        会话历史管理
                    </label>
                    <div>
                        <p className={styles.settingDescription}>
                            当前共有 {sessions.length} 个会话历史记录。
                        </p>
                        <button 
                            onClick={onClearAllSessions} 
                            className={styles.clearHistoryButton}
                            title="清空所有会话历史记录"
                        >
                            清空所有会话历史
                        </button>
                        {clearSessionsResult && (
                            <div className={`${styles.clearHistoryResult} ${styles.testSuccess}`}>
                                {clearSessionsResult}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 连接测试结果显示区域 */}
                {testConnectionResult && (
                    <div className={`${styles.testResult} ${testConnectionResult.success ? styles.testSuccess : styles.testError}`}>
                        {testConnectionResult.message}
                    </div>
                )}
                
                <div className={styles.modalButtons}>
                    <button 
                        onClick={onClose}
                        className={styles.cancelButton}
                    >
                        取消
                    </button>
                    <button
                        onClick={onTestConnection}
                        className={styles.testButton}
                        disabled={isTestingConnection}
                    >
                        {isTestingConnection ? '测试中...' : '测试连接'}
                    </button>
                    <button 
                        onClick={async () => {
                            // 异步执行保存操作，确保等待完成
                            await onSave();
                        }}
                        className={styles.saveButton}
                    >
                        保存设置
                    </button>
                </div>
            </Box>
        </Modal>
    )
);

// 重新导出 MessageWithMarkdown 组件
export { default as MessageWithMarkdown } from './message-with-markdown.jsx';
