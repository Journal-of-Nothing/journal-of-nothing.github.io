# Journal Supabase

一个面向实验性学术协作的期刊平台：记录投稿、审稿、回复与修订的完整过程。

项目采用 Vue 3 + Vite + Tailwind 构建前端，Supabase 提供认证、数据库与权限控制能力（包含 GitHub OAuth）。

## 项目简介

Journal Supabase 关注“可追踪、可讨论、可复盘”的学术写作流程。平台将投稿与评审放在同一协作空间中，让讨论与修改过程可见、可引用、可延续。

## 期刊特点

- 双重身份社区：每位成员既可能是作者，也可能是审稿人
- 流程透明：在审与已接收内容可公开浏览
- 线程协作：围绕审稿意见进行持续回复与迭代
- 轻量治理：管理员可在站内管理公告与用户权限
- 公测导向：先保证流程闭环，再持续打磨体验

## 核心功能

- 投稿系统：标题、摘要、正文（Markdown）、关键词、作者信息
- 审稿系统：审稿意见、决策建议（accept/minor/major/reject）
- 互动讨论：投稿评论与审稿回复
- 个人中心：查看个人投稿与审稿记录
- 管理后台能力：用户角色/权限管理、公告 CRUD

## 技术栈

- 前端：Vue 3、Vite、Tailwind CSS、Vue Router、Vue I18n
- 后端：Supabase（Auth + Postgres + RLS）
- 编辑渲染：Markdown Editor + DOMPurify

## 前置条件

- Bun 1.x
- Supabase 项目（启用 Auth 与数据库）

## 环境变量

1. 复制环境变量模板：
   - 参考 `.env.example`
2. 填写以下变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 开发

1. 安装依赖：
   - `bun install`
2. 启动开发服务器：
   - `bun run dev`

## 最小运行清单

1. 在 Supabase SQL Editor 中依次执行：
   - `supabase/bootstrap.sql`
2. 确认 PostgREST schema cache 已刷新（若控制台提示可手动刷新）。
3. 确认 `.env` 已配置 Supabase URL 与匿名密钥。

## 首个管理员创建（手工赋权）

1. 先完成一次邮箱注册或 GitHub 登录，确保用户记录被写入 `users` 表。
2. 在 Supabase 控制台为该用户将 `role` 设为 `admin`，并按需开启权限字段（如 `can_submit`、`can_review`、`can_comment`）。
3. 重新登录后进入“个人中心”，即可看到管理员权限面板。

## 认证配置要点

- 邮箱注册默认需要完成邮箱验证后才能登录。
- GitHub OAuth 需在 Supabase Auth 中配置回调地址与站点 URL。

## 结构说明

- `supabase/`：数据库迁移与 RLS 策略
- `src/lib/supabaseClient.ts`：Supabase 客户端初始化
- `src/pages/`：核心页面
- `src/services/supabaseApi.ts`：业务接口封装
- `src/content/`：站点内容页（about/guidelines）

## 本地脚本

- `bun run dev`：启动开发服务器
- `bun run build`：类型检查 + 构建
- `bun run test`：运行测试
- `bun run lint`：ESLint 检查
- `bun run format`：Prettier 格式化

## 测试与格式化

- `bun run test`
- `bun run lint`
- `bun run format`

## 发布流程

- 参考 `RELEASE.md`

## 贡献规范

- 所有代码贡献请基于 `dev-ai-coding` 分支进行。
- 请勿直接在其他分支提交公测相关改动。
- 建议流程：先同步最新 `dev-ai-coding`，完成开发与自测后再发起 PR。

## AI Coding 声明

- 本项目允许并鼓励使用 AI 工具进行辅助编码、重构、文档撰写与测试生成。
- 所有 AI 生成内容必须由贡献者本人复核，并对正确性、安全性与可维护性负责。
- 涉及权限、认证、数据读写与安全相关逻辑时，必须进行人工验证与必要测试后再提交。
- PR 描述中建议注明是否使用 AI 辅助，以及关键改动的人工校验结果。
