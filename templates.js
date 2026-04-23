// Markdown 模板库 - 预置学科常用模板
const markdownTemplates = {
    // 英语单词模板
    englishVocabulary: {
        id: 'englishVocabulary',
        name: '英语单词笔记',
        icon: '📝',
        category: '语言学习',
        description: '记录单词、音标、词性、释义、例句和记忆技巧',
        content: `# 英语单词笔记

## Word: 【单词】

**音标**: /【音标】/

**词性**: 【n./v./adj./adv.】

**中文释义**: 【中文意思】

---

### 例句

1. 【英文例句1】
   - 【中文翻译1】

2. 【英文例句2】
   - 【中文翻译2】

---

### 词组搭配

- **【搭配1】**: 【释义】
- **【搭配2】**: 【释义】

---

### 同义词/反义词

- **同义词**: 【synonym1】, 【synonym2】
- **反义词**: 【antonym】

---

### 易错点

- 【拼写易错点】
- 【用法易错点】

---

### 记忆技巧

【记录你的记忆方法或联想】

---

*创建于: 【日期】*
`
    },

    // 公式定理模板
    mathFormula: {
        id: 'mathFormula',
        name: '公式定理笔记',
        icon: '📐',
        category: '数学/理科',
        description: '记录公式、定理、适用条件、推导思路和例题',
        content: `# 【学科】 - 【章节标题】

## 定理/公式名称: 【名称】

---

### 内容表述

**文字描述**: 【定理的文字描述】

**数学表达式**:
$$
【公式内容】
$$

---

### 适用条件

- 【条件1】
- 【条件2】
- 【条件3】

---

### 推导思路

**核心思路**: 【推导的核心思路】

**推导步骤**:
1. 【步骤1】
2. 【步骤2】
3. 【步骤3】

---

### 典型例题

**题目**:
【例题内容】

**解答**:
【解答过程】

---

### 易错提醒

- 【易错点1】
- 【易错点2】

---

### 相关公式

- 【相关公式1】
- 【相关公式2】

---

*记录时间: 【日期】*
`
    },

    // 作业计划模板
    homeworkPlan: {
        id: 'homeworkPlan',
        name: '作业计划',
        icon: '📚',
        category: '学习管理',
        description: '每日任务、完成进度、截止时间、重难点和复盘总结',
        content: `# 作业计划 - 【日期/周次】

## 今日/本周任务概览

**目标**: 【学习目标简述】

**截止时间**: 【截止日期】

---

### 任务清单

#### 优先级: 高 ⭐⭐⭐
- [ ] 【科目】 - 【作业内容】 (预计用时: 【X】分钟)
- [ ] 【科目】 - 【作业内容】 (预计用时: 【X】分钟)

#### 优先级: 中 ⭐⭐
- [ ] 【科目】 - 【作业内容】 (预计用时: 【X】分钟)
- [ ] 【科目】 - 【作业内容】 (预计用时: 【X】分钟)

#### 优先级: 低 ⭐
- [ ] 【科目】 - 【作业内容】 (预计用时: 【X】分钟)

---

### 时间安排

| 时间段 | 任务 | 实际完成 |
|--------|------|----------|
| 【时间1】 | 【任务1】 | [ ] |
| 【时间2】 | 【任务2】 | [ ] |
| 【时间3】 | 【任务3】 | [ ] |

---

### 重难点记录

**重点内容**:
- 【重点1】
- 【重点2】

**难点及解决方案**:
- 【难点1】: 【解决方案】
- 【难点2】: 【解决方案】

---

### 完成情况总结

**已完成**:
- 【列出已完成的任务】

**未完成原因**:
- 【说明未完成的原因】

**明日/下周计划**:
- 【后续计划】

---

### 复盘总结

**做得好的地方**:
- 【优点1】
- 【优点2】

**需要改进的地方**:
- 【改进点1】
- 【改进点2】

**学习效率评分**: ⭐⭐⭐⭐⭐

---

*计划制定时间: 【日期时间】*
`
    }
};

// 模板管理器类
class TemplateManager {
    constructor() {
        this.templates = markdownTemplates;
    }

    // 获取所有模板
    getAllTemplates() {
        return Object.values(this.templates);
    }

    // 根据ID获取模板
    getTemplateById(id) {
        return this.templates[id] || null;
    }

    // 按分类获取模板
    getTemplatesByCategory(category) {
        return this.getAllTemplates().filter(t => t.category === category);
    }

    // 获取所有分类
    getCategories() {
        const categories = new Set();
        this.getAllTemplates().forEach(t => categories.add(t.category));
        return Array.from(categories);
    }

    // 插入模板内容到编辑器
    insertTemplate(templateId, editorElement) {
        const template = this.getTemplateById(templateId);
        if (!template || !editorElement) return false;

        const content = template.content;
        const cursorPos = editorElement.selectionStart;
        const textBefore = editorElement.value.substring(0, cursorPos);
        const textAfter = editorElement.value.substring(cursorPos);

        editorElement.value = textBefore + content + textAfter;

        // 设置光标位置到插入内容的末尾
        const newCursorPos = cursorPos + content.length;
        editorElement.setSelectionRange(newCursorPos, newCursorPos);
        editorElement.focus();

        return true;
    }

    // 替换编辑器内容为模板
    replaceWithTemplate(templateId, editorElement) {
        const template = this.getTemplateById(templateId);
        if (!template || !editorElement) return false;

        editorElement.value = template.content;
        editorElement.focus();

        return true;
    }
}

// 导出模板数据（支持多种模块规范）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { markdownTemplates, TemplateManager };
}
