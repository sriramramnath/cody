import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {atomDark} from 'react-syntax-highlighter/dist/esm/styles/prism';

import styles from './markdown-styles.css';

/**
 * 将Markdown文本渲染为React组件，支持代码块语法高亮
 * @param {string} content - Markdown格式的文本内容
 * @returns {React.Component} 渲染后的Markdown组件
 */
const MessageWithMarkdown = ({content}) => {
    const [copied, setCopied] = React.useState(false);
    
    // 如果是空内容，返回null
    if (!content) return null;
    
    return (
        <div className={styles.markdown}>
            <ReactMarkdown
                components={{
                    // 自定义代码块渲染，使用SyntaxHighlighter
                    code ({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : 'text';
                        
                        // 内联代码使用简单样式
                        if (inline) {
                            return (
                                <code
                                    className={styles.inlineCode}
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }
                        
                        // 代码块使用语法高亮
                        return (
                            <div className={styles.codeBlockWrapper}>
                                <div className={styles.codeHeader}>
                                    {language}
                                    <button
                                        className={styles.copyCodeButton}
                                        onClick={() => {
                                            const code = String(children).replace(/\n$/, '');
                                            navigator.clipboard.writeText(code);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        aria-label="复制代码"
                                        title="复制代码"
                                    >
                                        {copied ? (
                                            '已复制!'
                                        ) : (
                                            <>
                                                <svg
                                                    width="10"
                                                    height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                >
                                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                                                </svg>
                                                复制
                                            </>
                                        )}
                                    </button>
                                </div>
                                <SyntaxHighlighter
                                    style={atomDark}
                                    language={language}
                                    PreTag="div"
                                    // 当语言不支持时尝试自动检测
                                    useInlineStyles
                                    wrapLines
                                    wrapLongLines
                                    customStyle={{
                                        margin: 0,
                                        borderBottomLeftRadius: '6px',
                                        borderBottomRightRadius: '6px',
                                        padding: '0.75rem',
                                        fontSize: '0.75rem' // 与 menu-bar 标准字体大小一致
                                    }}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        );
                    },
                    // 自定义链接渲染，添加target="_blank"
                    a ({node, ...props}) {
                        return (<a
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                        />);
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

MessageWithMarkdown.propTypes = {
    content: PropTypes.string.isRequired
};

export default MessageWithMarkdown;
