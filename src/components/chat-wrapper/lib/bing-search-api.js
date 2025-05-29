/**
 * Bing Search API 集成
 * 提供与 Bing Search API 交互的功能，允许 DeepSeek AI 执行网络搜索
 */

// Bing Search API 配置
// 注意: 实际部署时需要从环境变量或安全存储中获取
const BING_SEARCH_API_KEY = 'YOUR_BING_SEARCH_API_KEY';
const BING_SEARCH_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';

/**
 * 执行 Bing 搜索查询
 * @param {string} query - 搜索查询字符串
 * @param {object} options - 搜索选项
 * @param {number} options.count - 返回的结果数量 (默认: 5, 最大: 50)
 * @param {string} options.market - 市场代码 (默认: 'zh-CN')
 * @param {string} options.safeSearch - 安全搜索设置 ('Off', 'Moderate', 'Strict', 默认: 'Moderate')
 * @returns {Promise<object>} 搜索结果对象
 */
const search = async (query, options = {}) => {
    try {
        const {
            count = 5,
            market = 'zh-CN',
            safeSearch = 'Moderate'
        } = options;

        // 构建查询参数
        const params = new URLSearchParams({
            q: query,
            count,
            mkt: market,
            safeSearch: safeSearch
        });

        console.log(`执行 Bing 搜索: "${query}"`);

        // 发送 API 请求
        const response = await fetch(`${BING_SEARCH_ENDPOINT}?${params.toString()}`, {
            headers: {
                'Ocp-Apim-Subscription-Key': BING_SEARCH_API_KEY
            }
        });

        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorMessage;
            } catch (e) {
                // 如果响应不是 JSON 格式，保持原始状态文本
            }
            throw new Error(`Bing 搜索 API 错误 (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();
        return processSearchResults(data);
    } catch (error) {
        console.error('Bing 搜索请求失败:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
};

/**
 * 处理搜索结果，提取和格式化有用信息
 * @param {object} rawResults - 原始 API 响应数据
 * @returns {object} 处理后的搜索结果
 */
const processSearchResults = rawResults => {
    try {
        if (!rawResults.webPages || !rawResults.webPages.value) {
            return {
                success: true,
                totalResults: 0,
                results: []
            };
        }

        // 提取网页搜索结果
        const webResults = rawResults.webPages.value.map(result => ({
            title: result.name,
            url: result.url,
            snippet: result.snippet,
            dateLastCrawled: result.dateLastCrawled
        }));

        // 提取相关查询建议 (如果有)
        const relatedQueries = rawResults.relatedSearches?.value?.map(item => item.text) || [];

        return {
            success: true,
            totalResults: rawResults.webPages.totalEstimatedMatches || webResults.length,
            results: webResults,
            relatedQueries: relatedQueries
        };
    } catch (error) {
        console.error('处理搜索结果时出错:', error);
        return {
            success: false,
            error: `处理搜索结果失败: ${error.message}`,
            results: []
        };
    }
};

/**
 * 搜索并总结结果，提供适合儿童的内容
 * @param {string} query - 搜索查询
 * @param {object} options - 搜索选项
 * @returns {Promise<object>} 搜索结果，针对儿童友好的格式
 */
const searchForChildren = async (query, options = {}) => {
    try {
        // 为儿童设置安全搜索
        const safeOptions = {
            ...options,
            safeSearch: 'Strict'
        };
        
        const searchResults = await search(query, safeOptions);
        
        // 如果搜索失败，返回错误信息
        if (!searchResults.success) {
            return searchResults;
        }
        
        return {
            success: true,
            query: query,
            totalResults: searchResults.totalResults,
            results: searchResults.results,
            relatedQueries: searchResults.relatedQueries,
            // 添加搜索时间戳
            searchTime: new Date().toISOString()
        };
    } catch (error) {
        console.error('儿童搜索请求失败:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
};

export default {
    search,
    searchForChildren
};
