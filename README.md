# 皇帝的贴身史官 · 拆分版

这是从单文件 `original.html` 拆出来的原生前端目录，目标是把“数据层 / 功能模块 / 页面壳子”分离，方便继续维护。

创意来自小红书用户

## 目录

- `index.html`：页面壳子，保留原有 DOM 结构
- `assets/styles/app.css`：原来的内联样式
- `src/core/`
  - `app-context.js`：全局应用上下文与常量
  - `utils.js`：日期、转义等工具
  - `storage.js`：appData 读写与跨标签同步
- `src/modules/`
  - `focus.js`：专注计时、多标签页接管、待结算
  - `layout.js`：拖拽排序、宽度切换、布局持久化
  - `routine.js`：四段式作息打卡
  - `tasks.js`：任务、标签、子任务、Markdown 备注
  - `habits.js`：圣躬日课与归档
  - `ideas-mood-etc.js`：闪念、心情、头像、导入导出
  - `calendar-stats.js`：热力日历与统计
- `original.html`：原始文件备份
