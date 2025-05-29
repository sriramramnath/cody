import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import Box from '../box/box.jsx';
import layout from '../../lib/layout-constants';

// Import modular components
import {
    ChatIcon,
    ToolIcon,
    SearchIcon,
    SettingsIcon,
    SessionsIcon,
    AddSessionIcon,
    EditIcon,
    DeleteIcon,
    CloseIcon
} from './chat-icons.jsx';

import {
    useSessionManager,
    useMessageManager,
    useInputHistory,
    useWindowSize,
    useDatabaseHealth,
    useChatSettings,
    useAutoScroll,
    useMessageCopy,
    useKeyboardShortcuts
} from './chat-hooks.js';

import {
    MessageWithMarkdown,
    MessageComponent,
    LoadingIndicator,
    ChatHeader,
    MessagesList,
    InputArea,
    CollapsedContent,
    SessionsDrawer,
    SettingsModal
} from './chat-components.jsx';

import { generateFollowUpQuestions } from './chat-utils.js';

import styles from './chat-wrapper.css';

const ChatWrapperComponent = props => {
    const {vm, mcpServer, className} = props;
    
    // 使用模块化钩子替换所有状态管理
    const {
        sessions,
        currentSessionId,
        showSessionsDrawer,
        editingSessionId,
        editingSessionTitle,
        setShowSessionsDrawer,
        setEditingSessionId,
        setEditingSessionTitle,
        createNewSession,
        switchSession,
        deleteSession: deleteSessionHandler,
        startEditing,
        saveSessionTitle,
        handleClearAllSessions,
        clearSessionsResult
    } = useSessionManager();
    
    const {
        messages,
        isLoading,
        toolExecuting,
        searchExecuting,
        abortController,
        handleSendMessage: sendMessage,
        handleClearChat
    } = useMessageManager(mcpServer, currentSessionId);
    
    const {
        inputValue,
        setInputValue,
        inputHistory,
        historyIndex,
        temporaryInput,
        handleInputChange,
        handleKeyDown,
        textareaRef,
        handleClearInputHistory,
        clearHistoryResult
    } = useInputHistory(sendMessage);
    
    const {
        collapsed,
        setCollapsed,
        expanded,
        setExpanded,
        width,
        setWidth,
        lastWidth,
        setLastWidth
    } = useWindowSize();
    
    const {
        isDatabaseHealthy,
        checkDatabaseHealth
    } = useDatabaseHealth();
    
    const {
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
        saveSettings,
        testApiConnection
    } = useChatSettings();
    
    const {
        messagesEndRef,
        scrollToBottom
    } = useAutoScroll(messages);
    
    const {
        handleCopyMessage
    } = useMessageCopy();
    
    useKeyboardShortcuts(handleInputChange, sendMessage);
    
    const chatRefObject = React.useRef(null);
    const chatRef = element => { chatRefObject.current = element; };
    
    // 处理折叠/展开状态
    const toggleCollapse = () => {
        if (collapsed) {
            // 展开时恢复上一次的宽度
            setWidth(lastWidth);
        } else {
            // 折叠前保存当前宽度
            setLastWidth(width);
        }
        setCollapsed(!collapsed);
    };
    
    // 处理放大/缩小状态
    const toggleExpand = () => {
        // 切换放大状态
        const newExpandedState = !expanded;
        setExpanded(newExpandedState);
        
        // 根据视口宽度调整聊天区域宽度
        const viewportWidth = window.innerWidth;
        let baseWidth;
        
        // 根据不同的视口宽度设置不同的聊天区域宽度
        if (viewportWidth >= 1400) {
            baseWidth = Math.min(500, viewportWidth * 0.25);
        } else if (viewportWidth >= layout.fullSizeMinWidth) {
            baseWidth = layout.standardStageWidth;
        } else {
            baseWidth = Math.max(280, Math.min(layout.standardStageWidth, viewportWidth * 0.3));
        }
        
        // 更新宽度
        const newWidth = newExpandedState ? baseWidth * 2 : baseWidth;
        setWidth(newWidth);
    };
    
    return (
        <Box 
            className={`${styles.chatWrapper} ${collapsed ? styles.collapsed : ''} ${className || ''}`}
            style={!collapsed ? { width: `${width}px` } : {}}
            componentRef={chatRef}
        >
            {/* 折叠/展开按钮 */}
            <button 
                className={styles.toggleButton} 
                onClick={toggleCollapse}
                title={collapsed ? '展开聊天' : '折叠聊天'}
                aria-label={collapsed ? '展开聊天' : '折叠聊天'}
                aria-expanded={!collapsed}
            >
                <div className={styles.toggleButtonIcon}>
                    {collapsed ? (
                        /* 折叠状态：显示向右箭头，表示可以展开聊天区域 */
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M18.12 4.12L10.24 12l7.88 7.88L16 22L6 12l10-10z" />
                            <path d="M22.12 4.12L14.24 12l7.88 7.88L20 22l-10-10 10-10z" />
                        </svg>
                    ) : (
                        /* 展开状态：显示向左箭头，表示可以收起聊天区域 */
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M5.88 4.12L13.76 12l-7.88 7.88L8 22l10-10L8 2z" />
                            <path d="M1.88 4.12L9.76 12l-7.88 7.88L4 22l10-10L4 2z" />
                        </svg>
                    )}
                </div>
            </button>
            
            {/* 展开按钮移动到toggle按钮旁边 */}
            {!collapsed && (
                <button 
                    className={styles.expandButton}
                    onClick={toggleExpand}
                    title={expanded ? "缩小聊天区域" : "放大聊天区域"}
                    aria-label={expanded ? "缩小聊天区域" : "放大聊天区域"}
                >
                    {expanded ? (
                        /* 缩小图标 - 减号 */
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="11" width="12" height="2" rx="1" />
                        </svg>
                    ) : (
                        /* 放大图标 - 加号 */
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                </button>
            )}
            
            {!collapsed ? (
                <React.Fragment>
                    {/* 聊天头部 */}
                    <ChatHeader 
                        onSessionsClick={() => setShowSessionsDrawer(!showSessionsDrawer)}
                        onClearClick={createNewSession}
                        onSettingsClick={() => setShowSettingsModal(true)}
                    />
                    
                    <Box className={styles.chatCanvasWrapper}>
                        {/* 消息列表 */}
                        <MessagesList 
                            messages={messages}
                            isLoading={isLoading}
                            toolExecuting={toolExecuting}
                            searchExecuting={searchExecuting}
                            onCopyMessage={handleCopyMessage}
                            onSendMessage={sendMessage}
                            messagesEndRef={messagesEndRef}
                        />
                    </Box>
                    
                    {/* 输入区域 */}
                    <InputArea 
                        inputValue={inputValue}
                        onInputChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onSendMessage={sendMessage}
                        isLoading={isLoading}
                        historyIndex={historyIndex}
                        inputHistory={inputHistory}
                        textareaRef={textareaRef}
                        onAbort={() => {
                            // 如果有请求正在进行中，则中断它
                            if (abortController) {
                                abortController.abort();
                            }
                        }}
                    />
                </React.Fragment>
            ) : (
                /* 折叠状态内容 */
                <CollapsedContent />
            )}
            
            {/* 会话抽屉 */}
            {!collapsed && (
                <SessionsDrawer 
                    visible={showSessionsDrawer}
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    editingSessionId={editingSessionId}
                    editingSessionTitle={editingSessionTitle}
                    onClose={() => setShowSessionsDrawer(false)}
                    onSessionClick={switchSession}
                    onEditStart={startEditing}
                    onEditSave={saveSessionTitle}
                    onEditCancel={() => {
                        setEditingSessionId(null);
                        setEditingSessionTitle('');
                    }}
                    onDeleteSession={deleteSessionHandler}
                    onEditTitleChange={setEditingSessionTitle}
                />
            )}
            
            {/* 设置模态框 */}
            {showSettingsModal && (
                <SettingsModal 
                    visible={showSettingsModal}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    apiUrl={apiUrl}
                    setApiUrl={setApiUrl}
                    modelName={modelName}
                    setModelName={setModelName}
                    temperature={temperature}
                    setTemperature={setTemperature}
                    isTestingConnection={isTestingConnection}
                    testConnectionResult={testConnectionResult}
                    clearHistoryResult={clearHistoryResult}
                    clearSessionsResult={clearSessionsResult}
                    sessions={sessions}
                    onClose={() => setShowSettingsModal(false)}
                    onSave={saveSettings}
                    onTestConnection={testApiConnection}
                    onClearInputHistory={handleClearInputHistory}
                    onClearAllSessions={handleClearAllSessions}
                />
            )}
        </Box>
    );
};

ChatWrapperComponent.propTypes = {
    vm: PropTypes.object.isRequired,
    mcpServer: PropTypes.shape({}),
    className: PropTypes.string
};

export default ChatWrapperComponent;
