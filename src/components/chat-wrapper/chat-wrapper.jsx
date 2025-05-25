import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import {FormattedMessage} from 'react-intl';
import Box from '../box/box.jsx';
import layout from '../../lib/layout-constants';

import styles from './chat-wrapper.css';

const ChatIcon = () => (
    <svg 
        className={styles.chatIcon} 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* 超简洁儿童友好的圆形机器人图标 */}
        <defs>
            <linearGradient id="robotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4C97FF" /> {/* $motion-primary */}
                <stop offset="100%" stopColor="#855CD6" /> {/* $looks-secondary */}
            </linearGradient>
        </defs>
        {/* 圆形背景 */}
        <circle cx="16" cy="16" r="15" fill="white" stroke="#E5F0FF" strokeWidth="0.5" />
        
        {/* 圆形机器人头部 */}
        <circle cx="16" cy="16" r="10" fill="url(#robotGradient)" />
        
        {/* 机器人眼睛 - 更大更明显 */}
        <circle cx="12" cy="13" r="2.5" fill="white" />
        <circle cx="20" cy="13" r="2.5" fill="white" />
        
        {/* 机器人嘴巴 - 简单的笑脸 */}
        <path d="M12,19 Q16,23 20,19" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* 机器人天线 */}
        <circle cx="16" cy="3" r="1.5" fill="#4C97FF" />
        <line x1="16" y1="3" x2="16" y2="6" stroke="#4C97FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const ChatWrapperComponent = props => {
    const {vm, className} = props;
    const [collapsed, setCollapsed] = useState(false);
    const [width, setWidth] = useState(layout.standardStageWidth); // 使用标准舞台宽度作为默认宽度
    const [lastWidth, setLastWidth] = useState(layout.standardStageWidth); // 记住上一次展开时的宽度
    const chatRef = React.useRef(null);
    
    // 窗口大小改变时，根据屏幕宽度调整聊天区域宽度
    useEffect(() => {
        const handleResize = () => {
            if (collapsed) return; // 折叠状态下不调整宽度
            
            // 根据视口宽度自适应调整聊天区域宽度
            const viewportWidth = window.innerWidth;
            
            // 根据不同的视口宽度设置不同的聊天区域宽度
            if (viewportWidth >= 1400) {
                // 较大屏幕，使用较大宽度
                const newWidth = Math.min(500, viewportWidth * 0.25);
                setWidth(newWidth);
                setLastWidth(newWidth);
            } else if (viewportWidth >= layout.fullSizeMinWidth) {
                // 中等屏幕，使用标准舞台宽度
                setWidth(layout.standardStageWidth);
                setLastWidth(layout.standardStageWidth);
            } else {
                // 较小屏幕，使用更窄的宽度以适应
                const newWidth = Math.max(280, Math.min(layout.standardStageWidth, viewportWidth * 0.3));
                setWidth(newWidth);
                setLastWidth(newWidth);
            }
        };
        
        // 初始化调整一次
        handleResize();
        
        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);
        
        // 清理函数
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [collapsed]);
    
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
    
    // 删除了拖动调整宽度的功能
    
    return (
        <Box 
            className={`${styles.chatWrapper} ${collapsed ? styles.collapsed : ''} ${className || ''}`}
            style={!collapsed ? { width: `${width}px` } : {}}
            ref={chatRef}
        >
            <button 
                className={styles.toggleButton} 
                onClick={toggleCollapse}
                title={collapsed ? '展开聊天' : '折叠聊天'}
                aria-label={collapsed ? '展开聊天' : '折叠聊天'}
                aria-expanded={!collapsed}
            >
                <div className={styles.toggleButtonIcon}>
                    {collapsed ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                        </svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                    )}
                </div>
            </button>
            
            {!collapsed ? (
                <React.Fragment>
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
                        </div>
                    </Box>
                    <Box className={styles.chatCanvasWrapper}>
                        <div className={styles.chatMessages}>
                            <div className={styles.messageBot}>
                                <div className={styles.messageContent}>
                                    你好！我是 Scratch 助手，有什么可以帮助你的吗？
                                </div>
                            </div>
                            <div className={styles.messageUser}>
                                <div className={styles.messageContent}>
                                    我想创建一个游戏！
                                </div>
                            </div>
                            <div className={styles.messageBot}>
                                <div className={styles.messageContent}>
                                    太棒了！你可以使用 Scratch 轻松创建游戏。先从添加角色开始，然后编写移动和互动的代码块。需要我帮你开始吗？
                                </div>
                            </div>
                        </div>
                    </Box>
                    <Box className={styles.chatInputWrapper}>
                        <div className={styles.chatInput}>
                            <textarea 
                                placeholder="输入消息..." 
                                className={styles.chatInputField}
                                rows="1"
                                onChange={e => {
                                    // 自动调整高度
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
                                    // 触发父容器重新布局以确保发送按钮居中
                                    e.target.parentElement.style.alignItems = 'center';
                                }}
                            />
                            <button 
                                className={styles.sendButton} 
                                title="发送消息"
                                aria-label="发送消息"
                            >
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
                            </button>
                        </div>
                    </Box>
                </React.Fragment>
            ) : (
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
            )}
        </Box>
    );
};

ChatWrapperComponent.propTypes = {
    vm: PropTypes.instanceOf(PropTypes.object).isRequired,
    className: PropTypes.string
};

export default ChatWrapperComponent;
