/**
 * 辅助函数，用于检测文本内容中是否包含Markdown语法
 */

/**
 * 检查文本是否包含代码块
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含代码块返回true
 */
export const hasCodeBlocks = content => {
    if (!content) return false;
    return /```[\s\S]*?```/g.test(content);
};

/**
 * 检查文本是否包含标题
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含标题返回true
 */
export const hasHeadings = content => {
    if (!content) return false;
    return /^#{1,6}\s+.+/m.test(content);
};

/**
 * 检查文本是否包含列表
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含列表返回true
 */
export const hasLists = content => {
    if (!content) return false;
    // 检查无序列表（* - +）和有序列表（数字+点）
    return /^[*\-+]\s+.+/m.test(content) || /^\d+\.\s+.+/m.test(content);
};

/**
 * 检查文本是否包含链接
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含链接返回true
 */
export const hasLinks = content => {
    if (!content) return false;
    return /\[.+?\]\(.+?\)/g.test(content) || /https?:\/\/\S+/g.test(content);
};

/**
 * 检查文本是否包含表格
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含表格返回true
 */
export const hasTables = content => {
    if (!content) return false;
    return /\|.+\|/g.test(content);
};

/**
 * 检查文本是否包含引用块
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含引用块返回true
 */
export const hasBlockquotes = content => {
    if (!content) return false;
    return /^>\s+.+/m.test(content);
};

/**
 * 检查文本是否包含内联代码
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含内联代码返回true
 */
export const hasInlineCode = content => {
    if (!content) return false;
    return /`[^`]+`/g.test(content);
};

/**
 * 检查文本是否包含任何Markdown语法
 * @param {string} content - 要检查的文本内容
 * @returns {boolean} - 如果包含任何Markdown语法返回true
 */
export const hasMarkdown = content => {
    if (!content) return false;
    return (
        hasCodeBlocks(content) ||
        hasHeadings(content) ||
        hasLists(content) ||
        hasLinks(content) ||
        hasTables(content) ||
        hasBlockquotes(content) ||
        hasInlineCode(content)
    );
};

export default {
    hasCodeBlocks,
    hasHeadings,
    hasLists,
    hasLinks,
    hasTables,
    hasBlockquotes,
    hasInlineCode,
    hasMarkdown
};
