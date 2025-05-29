// 聊天相关的工具函数

/**
 * 从AI回复中提取或生成后续问题建议
 * @param {string} content - AI回复的内容
 * @return {Array<string>} - 后续问题数组，最多5个
 */
export const generateFollowUpQuestions = content => {
    // 检查是否有特定格式的后续问题标记
    const followUpRegex = /后续问题[：:]\s*([\s\S]*?)(?:\n\n|$)/i;
    const match = content.match(followUpRegex);
    
    if (match && match[1]) {
        // 提取后续问题列表
        const questionsText = match[1];
        const questions = questionsText
            .split(/\n/)  // 按行分割
            .map(q => q.replace(/^[0-9\-\*\.\s]+/, '').trim())  // 移除数字、破折号、星号等列表标记
            .filter(q => q && q.length > 0);  // 过滤空行
            
        // 返回最多5个问题
        return questions.slice(0, 5);
    }
    
    // 基于常见后续交互的默认问题，确保包含画布操作相关问题
    const defaultQuestions = [
        "如何让角色在画布上画出彩色图案？",
        "能让角色随着音乐跳舞吗？",
        "怎样创建一个会变色的特效？",
        "如何制作一个互动故事？",
        "能在舞台上添加一些有趣的动画效果吗？"
    ];
    
    // 根据内容选择合适的后续问题
    if (content.includes("创建") || content.includes("添加")) {
        return [
            "如何让角色在画布上留下痕迹？",
            "怎么添加会变色的视觉效果？",
            "能让角色对鼠标点击做出反应吗？",
            "如何创建一个角色之间的对话？",
            "能设计一个带有粒子效果的场景吗？"
        ];
    } else if (content.includes("移动") || content.includes("旋转")) {
        return [
            "如何让角色在舞台上画出螺旋图案？",
            "怎样让角色沿着自定义路径移动？",
            "能让多个角色跟随彼此移动吗？",
            "如何创建一个迷宫游戏的移动效果？",
            "能让角色在移动时改变颜色吗？"
        ];
    } else if (content.includes("变量") || content.includes("计分")) {
        return [
            "如何用变量控制角色的视觉效果？",
            "能用计分来改变舞台背景吗？",
            "怎样创建一个随分数变色的计分板？",
            "如何使用变量制作动态动画效果？",
            "能用变量控制画笔的粗细和颜色吗？"
        ];
    } else if (content.includes("画布") || content.includes("绘制") || content.includes("画笔")) {
        return [
            "如何用画笔创建万花筒效果？",
            "能让多个角色同时在画布上绘制吗？",
            "如何创建一个绘画游戏？",
            "怎样用画笔制作粒子爆炸效果？",
            "能用画笔绘制3D效果吗？"
        ];
    } else if (content.includes("背景") || content.includes("舞台")) {
        return [
            "如何创建一个视差滚动背景？",
            "能让背景随音乐节奏变化吗？",
            "怎样制作一个昼夜交替的舞台效果？",
            "如何让舞台上的元素产生互动？",
            "能设计一个多层次的舞台场景吗？"
        ];
    } else if (content.includes("颜色") || content.includes("效果")) {
        return [
            "如何创建彩虹渐变效果？",
            "能让角色随音乐变换颜色吗？",
            "怎样制作闪光或发光的特效？",
            "如何创建水波纹或波浪效果？",
            "能设计一个颜色混合的实验吗？"
        ];
    } else if (content.includes("游戏") || content.includes("互动")) {
        return [
            "如何制作一个带有视觉反馈的点击游戏？",
            "能创建一个有动态背景的迷宫游戏吗？",
            "怎样添加视觉特效作为游戏奖励？",
            "如何让游戏角色有多种视觉状态？",
            "能在游戏中添加粒子效果吗？"
        ];
    }
    
    return defaultQuestions;
};
