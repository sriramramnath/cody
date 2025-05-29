// 聊天组件使用的所有图标组件
import React from 'react';
import styles from './chat-wrapper.css';

// MCP Tool Icon component
export const ToolIcon = () => (
    <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
    </svg>
);

// Search Icon component
export const SearchIcon = () => (
    <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);

// 设置图标组件
export const SettingsIcon = () => (
    <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
    </svg>
);

// 添加会话图标组件
export const SessionsIcon = () => (
    <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17l-.59.59-.58.58V4h16v12zM6 12h2v2H6zm0-3h2v2H6zm0-3h2v2H6zm4 6h5v2h-5zm0-3h8v2h-8zm0-3h8v2h-8z" />
    </svg>
);

// 添加新建会话图标组件
export const AddSessionIcon = () => (
    <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
);

// 编辑图标
export const EditIcon = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
);

// 删除图标
export const DeleteIcon = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
);

// 关闭图标
export const CloseIcon = () => (
    <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

// 主聊天图标
export const ChatIcon = () => (
    <svg 
        className={styles.chatIcon} 
        width="28" 
        height="28" 
        viewBox="0 0 32 32" 
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* 卡通现代风格的聊天机器人图标 */}
        
        {/* 背景圆形 - 更鲜艳的背景 */}
        <circle cx="16" cy="16" r="15" fill="#5CD6FF" stroke="#4AAFFF" strokeWidth="1" />
        
        {/* 机器人主体 - 更现代的颜色 */}
        <rect x="7" y="9" width="18" height="16" fill="#6E64FF" rx="2" />
        
        {/* 主体顶部高光 */}
        <rect x="7" y="9" width="18" height="2" fill="#8A7DFF" rx="2" />
        
        {/* 主体左侧高光 */}
        <rect x="7" y="9" width="2" height="16" fill="#8A7DFF" rx="2" />
        
        {/* 主体底部阴影 */}
        <rect x="7" y="23" width="18" height="2" fill="#5A52CC" rx="2" />
        
        {/* 主体右侧阴影 */}
        <rect x="23" y="9" width="2" height="16" fill="#5A52CC" rx="2" />
        
        {/* 显示屏区域 - 更卡通的深色背景 */}
        <rect x="9" y="11" width="14" height="8" fill="#483D8B" rx="1" />
        
        {/* 显示屏边框 - 更现代的亮蓝色 */}
        <rect x="9" y="11" width="14" height="1" fill="#8BE9FD" rx="1" />
        <rect x="9" y="11" width="1" height="8" fill="#8BE9FD" rx="1" />
        <rect x="22" y="11" width="1" height="8" fill="#5A52CC" rx="1" />
        <rect x="9" y="18" width="14" height="1" fill="#5A52CC" rx="1" />
        
        {/* 眼睛 - 白色圆形眼睛 */}
        <circle cx="13" cy="14" r="2" fill="#FFFFFF" />
        <circle cx="19" cy="14" r="2" fill="#FFFFFF" />
        
        {/* 眼睛高光 - 更卡通的瞳孔 */}
        <circle cx="13" cy="14" r="1" fill="#FF618C" />
        <circle cx="19" cy="14" r="1" fill="#FF618C" />
        
        {/* 嘴巴 - 更现代的笑脸 */}
        <path d="M13,17 Q16,19 19,17" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        
        {/* 天线基座 */}
        <rect x="15" y="7" width="2" height="2" fill="#8A7DFF" rx="1" />
        
        {/* 天线顶部 - 更亮的颜色 */}
        <circle cx="16" cy="5" r="2" fill="#FF618C" />
        
        {/* 控制面板 - 更现代的按钮 */}
        <rect x="10" y="21" width="12" height="2" fill="#8A7DFF" rx="1" />
        
        {/* 按钮点缀 */}
        <circle cx="11" cy="22" r="0.5" fill="#FFFFFF" />
        <circle cx="16" cy="22" r="0.5" fill="#FFFFFF" />
        <circle cx="21" cy="22" r="0.5" fill="#FFFFFF" />
        
        {/* 聊天气泡装饰 - 更现代的风格 */}
        <circle cx="24" cy="8" r="3" fill="#FFFFFF" stroke="#4AAFFF" strokeWidth="1" />
        <circle cx="23" cy="8" r="0.7" fill="#5CD6FF" />
        <circle cx="25" cy="8" r="0.7" fill="#5CD6FF" />
        
        {/* 添加小三角形指示聊天 */}
        <polygon points="22,10 24,13 26,10" fill="#FFFFFF" stroke="#4AAFFF" strokeWidth="0.5" />
        
        {/* 小装饰光点 */}
        <circle cx="7" cy="7" r="1" fill="#8BE9FD" opacity="0.6" />
        <circle cx="25" cy="24" r="1" fill="#FF618C" opacity="0.6" />
        
        {/* 更现代的底部装饰 */}
        <rect x="9" y="25" width="14" height="1" fill="#5A52CC" rx="0.5" />
    </svg>
);
