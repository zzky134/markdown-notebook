/**
 * 课表模块 - Schedule Module
 * 纯前端实现，LocalStorage 持久化
 * 支持周视图、课程管理、冲突检测、倒计时等功能
 */

// ==================== 配置常量 ====================
const SCHEDULE_CONFIG = {
    MAX_PERIODS: 12,        // 每天最大节次
    DAYS: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    DAY_SHORT: ['一', '二', '三', '四', '五', '六', '日'],
    COLORS: [
        '#4f46e5', // 靛蓝
        '#10b981', // 翠绿
        '#f59e0b', // 琥珀
        '#ef4444', // 红色
        '#8b5cf6', // 紫色
        '#06b6d4', // 青色
        '#ec4899', // 粉色
        '#84cc16', // 青柠
        '#f97316', // 橙色
        '#6366f1', // 靛紫
    ],
    SEMESTER_WEEKS: 20,     // 学期总周数
    PERIOD_MINUTES: 45,     // 每节课时长（分钟）
    BREAK_MINUTES: 10,      // 课间休息（分钟）
    STORAGE_KEY: 'courseSchedule'
};

// ==================== 课表管理器类 ====================
class ScheduleManager {
    constructor() {
        this.courses = [];          // 课程列表
        this.tempAdjustments = {};  // 临时调课 {courseId_week_period: {type, note}}
        this.currentWeek = this.getCurrentWeek();  // 当前查看的周次
        this.semesterStart = this.getSemesterStart(); // 学期开始日期
        this.init();
    }

    // 初始化
    init() {
        this.loadData();
        // 如果没有数据，初始化当前周
        if (this.currentWeek === null) {
            this.currentWeek = 1;
        }
    }

    // 获取学期开始日期（默认为每年9月1日或2月20日）
    getSemesterStart() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // 8月-1月：第一学期（秋季）
        if (month >= 8) {
            return new Date(year, 8, 1); // 9月1日
        } else if (month <= 2) {
            return new Date(year - 1, 8, 1); // 去年9月1日
        } else {
            return new Date(year, 1, 20); // 2月20日（春季学期）
        }
    }

    // 计算当前是第几周
    getCurrentWeek() {
        const now = new Date();
        const start = this.getSemesterStart();
        const diff = now - start;
        const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
        return Math.max(1, Math.min(weeks, SCHEDULE_CONFIG.SEMESTER_WEEKS));
    }

    // 获取今天是星期几（1-7）
    getTodayDay() {
        const day = new Date().getDay();
        return day === 0 ? 7 : day;
    }

    // 获取当前节次（基于时间计算）
    getCurrentPeriod() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const totalMinutes = hour * 60 + minute;

        // 假设第一节课 8:00 开始
        const firstPeriodStart = 8 * 60;
        const periodDuration = SCHEDULE_CONFIG.PERIOD_MINUTES + SCHEDULE_CONFIG.BREAK_MINUTES;

        if (totalMinutes < firstPeriodStart) return 0;

        const period = Math.floor((totalMinutes - firstPeriodStart) / periodDuration) + 1;
        return Math.min(period, SCHEDULE_CONFIG.MAX_PERIODS);
    }

    // 计算距离下一节课还有多久
    getCountdown() {
        const now = new Date();
        const todayDay = this.getTodayDay();
        const currentPeriod = this.getCurrentPeriod();

        // 查找今天还没上的课
        const todayCourses = this.getCoursesForDay(todayDay, this.currentWeek)
            .filter(c => c.endPeriod > currentPeriod);

        if (todayCourses.length > 0) {
            // 找到下一节课
            const nextCourse = todayCourses.sort((a, b) => a.startPeriod - b.startPeriod)[0];
            const minutesUntil = this.getMinutesUntilPeriod(nextCourse.startPeriod);
            return {
                hasNext: true,
                course: nextCourse,
                minutes: minutesUntil,
                text: minutesUntil <= 0 ? '正在上课中' : `距下一节课还有 ${minutesUntil} 分钟`
            };
        }

        // 今天没课了，找明天的课
        for (let offset = 1; offset <= 7; offset++) {
            const checkDay = ((todayDay - 1 + offset) % 7) + 1;
            const checkWeek = this.currentWeek + Math.floor((todayDay - 1 + offset) / 7);

            if (checkWeek > SCHEDULE_CONFIG.SEMESTER_WEEKS) break;

            const dayCourses = this.getCoursesForDay(checkDay, checkWeek);
            if (dayCourses.length > 0) {
                const nextCourse = dayCourses.sort((a, b) => a.startPeriod - b.startPeriod)[0];
                const dayNames = ['今天', '明天', '后天'];
                const dayText = offset <= 2 ? dayNames[offset] : SCHEDULE_CONFIG.DAYS[checkDay - 1];
                return {
                    hasNext: true,
                    course: nextCourse,
                    minutes: null,
                    text: `${dayText} ${nextCourse.name} 第${nextCourse.startPeriod}节`
                };
            }
        }

        return { hasNext: false, text: '本周暂无课程' };
    }

    // 计算距离某节次还有多少分钟
    getMinutesUntilPeriod(period) {
        const now = new Date();
        const firstPeriodStart = 8 * 60; // 8:00 开始
        const periodDuration = SCHEDULE_CONFIG.PERIOD_MINUTES + SCHEDULE_CONFIG.BREAK_MINUTES;
        const periodStartMinutes = firstPeriodStart + (period - 1) * periodDuration;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return periodStartMinutes - currentMinutes;
    }

    // 从 LocalStorage 加载数据
    loadData() {
        try {
            const data = localStorage.getItem(SCHEDULE_CONFIG.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.courses = parsed.courses || [];
                this.tempAdjustments = parsed.tempAdjustments || {};
                this.semesterStart = parsed.semesterStart ? new Date(parsed.semesterStart) : this.getSemesterStart();
            }
        } catch (e) {
            console.error('加载课表数据失败:', e);
            this.courses = [];
            this.tempAdjustments = {};
        }
    }

    // 保存数据到 LocalStorage
    saveData() {
        try {
            const data = {
                courses: this.courses,
                tempAdjustments: this.tempAdjustments,
                semesterStart: this.semesterStart.toISOString()
            };
            localStorage.setItem(SCHEDULE_CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('保存课表数据失败:', e);
        }
    }

    // 添加课程
    addCourse(course) {
        // 检查冲突
        const conflicts = this.checkConflict(course);
        if (conflicts.length > 0) {
            return { success: false, conflicts };
        }

        // 自动分配颜色
        if (!course.color) {
            course.color = this.assignColor();
        }

        course.id = Date.now().toString();
        this.courses.push(course);
        this.saveData();
        return { success: true, course };
    }

    // 更新课程
    updateCourse(courseId, updates) {
        const index = this.courses.findIndex(c => c.id === courseId);
        if (index === -1) return { success: false, error: '课程不存在' };

        const oldCourse = this.courses[index];
        const newCourse = { ...oldCourse, ...updates, id: courseId };

        // 检查冲突（排除自己）
        const conflicts = this.checkConflict(newCourse, courseId);
        if (conflicts.length > 0) {
            return { success: false, conflicts };
        }

        this.courses[index] = newCourse;
        this.saveData();
        return { success: true, course: newCourse };
    }

    // 删除课程
    deleteCourse(courseId) {
        this.courses = this.courses.filter(c => c.id !== courseId);
        // 清理相关的临时调课
        Object.keys(this.tempAdjustments).forEach(key => {
            if (key.startsWith(courseId + '_')) {
                delete this.tempAdjustments[key];
            }
        });
        this.saveData();
    }

    // 检查时间冲突
    checkConflict(course, excludeId = null) {
        const conflicts = [];

        this.courses.forEach(existing => {
            if (existing.id === excludeId) return;

            // 检查星期是否相同
            if (existing.day !== course.day) return;

            // 检查周次是否有重叠
            const weekOverlap = this.checkWeekOverlap(existing, course);
            if (!weekOverlap) return;

            // 检查节次是否有重叠
            const periodOverlap = this.checkPeriodOverlap(existing, course);
            if (!periodOverlap) return;

            conflicts.push(existing);
        });

        return conflicts;
    }

    // 检查周次重叠
    checkWeekOverlap(course1, course2) {
        // 检查是否有共同的周
        for (let week = Math.max(course1.startWeek, course2.startWeek);
             week <= Math.min(course1.endWeek, course2.endWeek); week++) {

            const isWeek1 = course1.weekType === 0 ||
                           (course1.weekType === 1 && week % 2 === 1) ||
                           (course1.weekType === 2 && week % 2 === 0);
            const isWeek2 = course2.weekType === 0 ||
                           (course2.weekType === 2 && week % 2 === 1) ||
                           (course2.weekType === 2 && week % 2 === 0);

            if (isWeek1 && isWeek2) return true;
        }
        return false;
    }

    // 检查节次重叠
    checkPeriodOverlap(course1, course2) {
        return !(course1.endPeriod < course2.startPeriod ||
                 course2.endPeriod < course1.startPeriod);
    }

    // 自动分配颜色
    assignColor() {
        const usedColors = this.courses.map(c => c.color);
        const availableColors = SCHEDULE_CONFIG.COLORS.filter(c => !usedColors.includes(c));

        if (availableColors.length > 0) {
            return availableColors[0];
        }
        // 如果都用完了，随机返回一个
        return SCHEDULE_CONFIG.COLORS[Math.floor(Math.random() * SCHEDULE_CONFIG.COLORS.length)];
    }

    // 获取某天的课程
    getCoursesForDay(day, week) {
        return this.courses.filter(course => {
            if (course.day !== day) return false;
            if (week < course.startWeek || week > course.endWeek) return false;

            // 检查单双周
            if (course.weekType === 1 && week % 2 === 0) return false; // 单周
            if (course.weekType === 2 && week % 2 === 1) return false; // 双周

            return true;
        }).map(course => {
            // 检查是否有临时调课
            const adjustment = this.getTempAdjustment(course.id, week, day);
            if (adjustment) {
                return { ...course, adjustment };
            }
            return course;
        });
    }

    // 添加临时调课
    addTempAdjustment(courseId, week, day, type, note) {
        const key = `${courseId}_${week}_${day}`;
        this.tempAdjustments[key] = { type, note, createdAt: Date.now() };
        this.saveData();
    }

    // 删除临时调课
    removeTempAdjustment(courseId, week, day) {
        const key = `${courseId}_${week}_${day}`;
        delete this.tempAdjustments[key];
        this.saveData();
    }

    // 获取临时调课
    getTempAdjustment(courseId, week, day) {
        const key = `${courseId}_${week}_${day}`;
        return this.tempAdjustments[key] || null;
    }

    // 切换周次
    setWeek(week) {
        this.currentWeek = Math.max(1, Math.min(week, SCHEDULE_CONFIG.SEMESTER_WEEKS));
    }

    // 导出为 CSV
    exportToCSV() {
        const headers = ['课程名称', '教师', '教室', '星期', '开始节次', '结束节次', '开始周', '结束周', '单双周', '颜色'];
        const rows = this.courses.map(c => [
            c.name, c.teacher, c.room, c.day, c.startPeriod, c.endPeriod,
            c.startWeek, c.endWeek, c.weekType, c.color
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        return csv;
    }

    // 从 CSV 导入
    importFromCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return { success: false, error: 'CSV 文件为空' };

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredFields = ['课程名称', '星期', '开始节次', '结束节次', '开始周', '结束周'];

        for (const field of requiredFields) {
            if (!headers.includes(field)) {
                return { success: false, error: `缺少必填字段: ${field}` };
            }
        }

        const newCourses = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const course = {};

            headers.forEach((h, idx) => {
                course[this.mapHeaderToField(h)] = values[idx];
            });

            // 数据转换和验证
            const parsed = this.parseCourseData(course);
            if (parsed.error) {
                errors.push(`第 ${i + 1} 行: ${parsed.error}`);
            } else {
                // 检查冲突
                const conflicts = this.checkConflict(parsed);
                if (conflicts.length > 0) {
                    errors.push(`第 ${i + 1} 行: 与现有课程 "${conflicts[0].name}" 时间冲突`);
                } else {
                    parsed.id = Date.now().toString() + '_' + i;
                    if (!parsed.color) parsed.color = this.assignColor();
                    newCourses.push(parsed);
                }
            }
        }

        // 添加成功的课程
        this.courses.push(...newCourses);
        this.saveData();

        return {
            success: errors.length === 0,
            added: newCourses.length,
            errors: errors
        };
    }

    // 表头字段映射
    mapHeaderToField(header) {
        const map = {
            '课程名称': 'name', '教师': 'teacher', '教室': 'room',
            '星期': 'day', '开始节次': 'startPeriod', '结束节次': 'endPeriod',
            '开始周': 'startWeek', '结束周': 'endWeek', '单双周': 'weekType', '颜色': 'color'
        };
        return map[header] || header;
    }

    // 解析课程数据
    parseCourseData(course) {
        const result = { ...course };

        // 必填字段检查
        if (!result.name) return { error: '课程名称不能为空' };

        // 数字字段转换
        result.day = parseInt(result.day);
        result.startPeriod = parseInt(result.startPeriod);
        result.endPeriod = parseInt(result.endPeriod);
        result.startWeek = parseInt(result.startWeek);
        result.endWeek = parseInt(result.endWeek);
        result.weekType = parseInt(result.weekType || 0);

        // 验证
        if (isNaN(result.day) || result.day < 1 || result.day > 7) {
            return { error: '星期必须是 1-7 的数字' };
        }
        if (isNaN(result.startPeriod) || result.startPeriod < 1 || result.startPeriod > 12) {
            return { error: '开始节次必须是 1-12 的数字' };
        }
        if (isNaN(result.endPeriod) || result.endPeriod < 1 || result.endPeriod > 12) {
            return { error: '结束节次必须是 1-12 的数字' };
        }
        if (result.startPeriod > result.endPeriod) {
            return { error: '开始节次不能大于结束节次' };
        }
        if (isNaN(result.startWeek) || result.startWeek < 1) {
            return { error: '开始周必须是正整数' };
        }
        if (isNaN(result.endWeek) || result.endWeek < 1) {
            return { error: '结束周必须是正整数' };
        }
        if (result.startWeek > result.endWeek) {
            return { error: '开始周不能大于结束周' };
        }

        return result;
    }
}

// ==================== 课表 UI 渲染器 ====================
class ScheduleRenderer {
    constructor(manager) {
        this.manager = manager;
        this.countdownInterval = null;
    }

    // 渲染课表视图
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="schedule-container">
                ${this.renderHeader()}
                ${this.renderCountdown()}
                ${this.renderWeekNavigator()}
                ${this.renderScheduleGrid()}
                ${this.renderToolbar()}
            </div>
        `;

        this.bindEvents();
        this.startCountdown();
    }

    // 渲染头部
    renderHeader() {
        return `
            <div class="schedule-header">
                <h2 class="schedule-title">📅 我的课表</h2>
                <button class="btn btn-secondary" onclick="scheduleApp.switchToNotes()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    返回笔记
                </button>
            </div>
        `;
    }

    // 渲染倒计时
    renderCountdown() {
        return `<div class="schedule-countdown" id="scheduleCountdown">加载中...</div>`;
    }

    // 渲染周次导航
    renderWeekNavigator() {
        const currentWeek = this.manager.getCurrentWeek();
        const viewingWeek = this.manager.currentWeek;
        const isCurrentWeek = currentWeek === viewingWeek;

        return `
            <div class="week-navigator">
                <button class="week-nav-btn" onclick="scheduleApp.prevWeek()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <div class="week-info">
                    <span class="week-number ${isCurrentWeek ? 'current' : ''}">第 ${viewingWeek} 周</span>
                    ${isCurrentWeek ? '<span class="week-badge">本周</span>' : ''}
                </div>
                <button class="week-nav-btn" onclick="scheduleApp.nextWeek()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
                <button class="week-today-btn" onclick="scheduleApp.goToCurrentWeek()">回到本周</button>
            </div>
        `;
    }

    // 渲染课表网格
    renderScheduleGrid() {
        const today = this.manager.getTodayDay();
        const currentPeriod = this.manager.getCurrentPeriod();
        const isCurrentWeek = this.manager.getCurrentWeek() === this.manager.currentWeek;

        let html = '<div class="schedule-grid-wrapper"><div class="schedule-grid">';

        // 左上角空白
        html += '<div class="grid-header corner">节次</div>';

        // 星期标题
        SCHEDULE_CONFIG.DAYS.forEach((day, idx) => {
            const dayNum = idx + 1;
            const isToday = isCurrentWeek && dayNum === today;
            html += `<div class="grid-header day-header ${isToday ? 'today' : ''}">${day}</div>`;
        });

        // 节次和课程
        for (let period = 1; period <= SCHEDULE_CONFIG.MAX_PERIODS; period++) {
            // 节次数
            const isCurrentPeriod = isCurrentWeek && period === currentPeriod;
            html += `<div class="grid-header period-header ${isCurrentPeriod ? 'current' : ''}">${period}</div>`;

            // 每天的课程
            for (let day = 1; day <= 7; day++) {
                const courses = this.manager.getCoursesForDay(day, this.manager.currentWeek)
                    .filter(c => c.startPeriod <= period && c.endPeriod >= period);

                const isToday = isCurrentWeek && day === today;
                const isCurrentSlot = isCurrentPeriod && isToday;

                if (courses.length > 0) {
                    const course = courses[0];
                    const isStart = course.startPeriod === period;

                    if (isStart) {
                        const adjustmentClass = course.adjustment ? `adjustment-${course.adjustment.type}` : '';
                        const height = (course.endPeriod - course.startPeriod + 1);
                        html += `
                            <div class="course-cell ${adjustmentClass}"
                                 style="background-color: ${course.color}; grid-row: span ${height};"
                                 onclick="scheduleApp.editCourse('${course.id}')">
                                <div class="course-name">${course.name}</div>
                                <div class="course-info">${course.room || ''}</div>
                                ${course.adjustment ? `<div class="adjustment-badge">${course.adjustment.type === 'cancel' ? '停' : '调'}</div>` : ''}
                            </div>
                        `;
                    }
                } else {
                    html += `<div class="grid-cell ${isToday ? 'today' : ''} ${isCurrentSlot ? 'current-slot' : ''}"
                             onclick="scheduleApp.addCourseAt(${day}, ${period})"></div>`;
                }
            }
        }

        html += '</div></div>';
        return html;
    }

    // 渲染工具栏
    renderToolbar() {
        return `
            <div class="schedule-toolbar">
                <button class="btn btn-primary" onclick="scheduleApp.showAddCourseModal()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    添加课程
                </button>
                <div class="dropdown" id="scheduleExportDropdown">
                    <button class="btn btn-secondary" onclick="scheduleApp.toggleDropdown('scheduleExportDropdown')">
                        导入/导出
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div class="dropdown-menu">
                        <div class="dropdown-item" onclick="scheduleApp.importCSV()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            导入 CSV
                        </div>
                        <div class="dropdown-item" onclick="scheduleApp.exportCSV()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            导出 CSV
                        </div>
                        <div class="dropdown-item" onclick="scheduleApp.exportImage()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            导出图片
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 绑定事件
    bindEvents() {
        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
            }
        });
    }

    // 开始倒计时刷新
    startCountdown() {
        this.updateCountdown();
        this.countdownInterval = setInterval(() => this.updateCountdown(), 60000); // 每分钟更新
    }

    // 停止倒计时
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    // 更新倒计时显示
    updateCountdown() {
        const countdownEl = document.getElementById('scheduleCountdown');
        if (!countdownEl) return;

        const countdown = this.manager.getCountdown();
        countdownEl.textContent = countdown.text;
        countdownEl.className = 'schedule-countdown' + (countdown.hasNext ? '' : ' no-course');
    }

    // 刷新视图
    refresh() {
        const container = document.getElementById('scheduleView');
        if (container) {
            this.render('scheduleView');
        }
    }
}

// ==================== 课表应用类 ====================
class ScheduleApp {
    constructor() {
        this.manager = new ScheduleManager();
        this.renderer = new ScheduleRenderer(this.manager);
        this.currentModal = null;
    }

    // 初始化
    init() {
        // 创建课表视图容器
        this.createScheduleContainer();
    }

    // 创建课表容器
    createScheduleContainer() {
        // 检查是否已存在
        if (document.getElementById('scheduleView')) return;

        const container = document.createElement('div');
        container.id = 'scheduleView';
        container.className = 'schedule-view';
        container.style.display = 'none';

        // 插入到 main-content 中
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(container);
        }
    }

    // 显示课表视图
    showSchedule() {
        // 隐藏笔记相关元素
        document.getElementById('toolbar').style.display = 'none';
        document.getElementById('editorContainer').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';

        // 显示课表
        const scheduleView = document.getElementById('scheduleView');
        if (scheduleView) {
            scheduleView.style.display = 'block';
            this.renderer.render('scheduleView');
        }

        // 更新移动端导航状态
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
        const navSchedule = document.getElementById('navSchedule');
        if (navSchedule) navSchedule.classList.add('active');
    }

    // 切换回笔记视图
    switchToNotes() {
        // 停止倒计时
        this.renderer.stopCountdown();

        // 隐藏课表
        const scheduleView = document.getElementById('scheduleView');
        if (scheduleView) scheduleView.style.display = 'none';

        // 显示笔记界面
        if (app.currentNoteId) {
            document.getElementById('toolbar').style.display = 'flex';
            document.getElementById('editorContainer').style.display = 'flex';
            document.getElementById('emptyState').style.display = 'none';
        } else {
            document.getElementById('emptyState').style.display = 'flex';
        }

        // 更新导航
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
        const navNotes = document.getElementById('navNotes');
        if (navNotes) navNotes.classList.add('active');
    }

    // 上一周
    prevWeek() {
        this.manager.setWeek(this.manager.currentWeek - 1);
        this.renderer.refresh();
    }

    // 下一周
    nextWeek() {
        this.manager.setWeek(this.manager.currentWeek + 1);
        this.renderer.refresh();
    }

    // 回到本周
    goToCurrentWeek() {
        this.manager.setWeek(this.manager.getCurrentWeek());
        this.renderer.refresh();
    }

    // 在指定位置添加课程
    addCourseAt(day, period) {
        this.showAddCourseModal({ day, startPeriod: period, endPeriod: period });
    }

    // 显示添加课程模态框
    showAddCourseModal(defaults = {}) {
        const colors = SCHEDULE_CONFIG.COLORS;
        const colorOptions = colors.map((c, i) =>
            `<div class="color-option ${i === 0 ? 'selected' : ''}" style="background-color: ${c}" data-color="${c}"></div>`
        ).join('');

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'courseModal';
        modal.innerHTML = `
            <div class="modal-content course-modal">
                <div class="modal-title">${defaults.id ? '编辑课程' : '添加课程'}</div>
                <form id="courseForm">
                    <div class="form-group">
                        <label>课程名称 *</label>
                        <input type="text" class="modal-input" name="name" required value="${defaults.name || ''}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>教师</label>
                            <input type="text" class="modal-input" name="teacher" value="${defaults.teacher || ''}">
                        </div>
                        <div class="form-group">
                            <label>教室</label>
                            <input type="text" class="modal-input" name="room" value="${defaults.room || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>星期 *</label>
                            <select class="modal-input" name="day" required>
                                ${SCHEDULE_CONFIG.DAYS.map((d, i) =>
                                    `<option value="${i + 1}" ${(defaults.day || 1) === i + 1 ? 'selected' : ''}>${d}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>单双周</label>
                            <select class="modal-input" name="weekType">
                                <option value="0" ${(defaults.weekType || 0) === 0 ? 'selected' : ''}>每周</option>
                                <option value="1" ${(defaults.weekType || 0) === 1 ? 'selected' : ''}>单周</option>
                                <option value="2" ${(defaults.weekType || 0) === 2 ? 'selected' : ''}>双周</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>开始节次 *</label>
                            <select class="modal-input" name="startPeriod" required>
                                ${Array.from({length: 12}, (_, i) =>
                                    `<option value="${i + 1}" ${(defaults.startPeriod || 1) === i + 1 ? 'selected' : ''}>第 ${i + 1} 节</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>结束节次 *</label>
                            <select class="modal-input" name="endPeriod" required>
                                ${Array.from({length: 12}, (_, i) =>
                                    `<option value="${i + 1}" ${(defaults.endPeriod || 1) === i + 1 ? 'selected' : ''}>第 ${i + 1} 节</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>开始周 *</label>
                            <input type="number" class="modal-input" name="startWeek" min="1" max="20" value="${defaults.startWeek || 1}" required>
                        </div>
                        <div class="form-group">
                            <label>结束周 *</label>
                            <input type="number" class="modal-input" name="endWeek" min="1" max="20" value="${defaults.endWeek || 16}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>课程颜色</label>
                        <div class="color-picker">${colorOptions}</div>
                        <input type="hidden" name="color" id="selectedColor" value="${colors[0]}">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="scheduleApp.closeModal()">取消</button>
                        ${defaults.id ? `<button type="button" class="btn btn-danger" onclick="scheduleApp.deleteCourse('${defaults.id}')">删除</button>` : ''}
                        <button type="submit" class="btn btn-primary">保存</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // 绑定颜色选择
        modal.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                modal.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                document.getElementById('selectedColor').value = opt.dataset.color;
            });
        });

        // 绑定表单提交
        modal.querySelector('#courseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCourse(defaults.id);
        });
    }

    // 保存课程
    saveCourse(courseId = null) {
        const form = document.getElementById('courseForm');
        const formData = new FormData(form);

        const course = {
            name: formData.get('name'),
            teacher: formData.get('teacher'),
            room: formData.get('room'),
            day: parseInt(formData.get('day')),
            startPeriod: parseInt(formData.get('startPeriod')),
            endPeriod: parseInt(formData.get('endPeriod')),
            startWeek: parseInt(formData.get('startWeek')),
            endWeek: parseInt(formData.get('endWeek')),
            weekType: parseInt(formData.get('weekType')),
            color: document.getElementById('selectedColor').value
        };

        let result;
        if (courseId) {
            result = this.manager.updateCourse(courseId, course);
        } else {
            result = this.manager.addCourse(course);
        }

        if (result.success) {
            this.closeModal();
            this.renderer.refresh();
        } else {
            const conflictNames = result.conflicts.map(c => c.name).join(', ');
            alert(`时间冲突！与以下课程重叠：${conflictNames}`);
        }
    }

    // 编辑课程
    editCourse(courseId) {
        const course = this.manager.courses.find(c => c.id === courseId);
        if (!course) return;

        this.showAddCourseModal(course);
    }

    // 删除课程
    deleteCourse(courseId) {
        if (!confirm('确定要删除这门课程吗？')) return;

        this.manager.deleteCourse(courseId);
        this.closeModal();
        this.renderer.refresh();
    }

    // 关闭模态框
    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    // 切换下拉菜单
    toggleDropdown(id) {
        const dropdown = document.getElementById(id);
        dropdown.classList.toggle('active');
    }

    // 导入 CSV
    importCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const result = this.manager.importFromCSV(event.target.result);
                if (result.success) {
                    alert(`成功导入 ${result.added} 门课程`);
                    this.renderer.refresh();
                } else {
                    alert(`导入完成，但有错误：\n${result.errors.join('\n')}`);
                    if (result.added > 0) this.renderer.refresh();
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // 导出 CSV
    exportCSV() {
        const csv = this.manager.exportToCSV();
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `课表_${new Date().toLocaleDateString()}.csv`;
        link.click();
    }

    // 导出图片
    async exportImage() {
        const grid = document.querySelector('.schedule-grid');
        if (!grid) return;

        if (typeof html2canvas === 'undefined') {
            alert('图片导出库未加载，请检查网络');
            return;
        }

        try {
            const canvas = await html2canvas(grid, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `课表_第${this.manager.currentWeek}周_${new Date().toLocaleDateString()}.png`;
            link.click();
        } catch (err) {
            console.error('导出图片失败:', err);
            alert('导出图片失败');
        }
    }
}

// 创建全局实例
let scheduleApp;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    scheduleApp = new ScheduleApp();
    scheduleApp.init();
});
