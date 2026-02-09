# Journal Supabase

基于 Vue 3 + Vite + Tailwind 的前端，后端使用 Supabase（包含 GitHub OAuth）。

## 前置条件

- Bun 1.x
- Supabase 项目（启用 Auth 与数据库）

## 环境变量

1. 复制环境变量模板：
   - 参考 .env.example
2. 填写以下变量：
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

## 开发

1. 安装依赖：
   - bun install
2. 启动开发服务器：
   - bun run dev

## 最小运行清单

1. 在 Supabase SQL Editor 中依次执行：
   - supabase/bootstrap.sql
2. 确认 PostgREST schema cache 已刷新（若控制台提示可手动刷新）。
3. 确认 .env 已配置 Supabase URL 与匿名密钥。

## 首个管理员创建（手工赋权）

1. 先完成一次邮箱注册或 GitHub 登录，确保用户记录被写入 users 表。
2. 在 Supabase 控制台为该用户将 role 设为 admin，并按需开启权限字段（如 can_submit、can_review、can_comment）。
3. 重新登录后进入“个人中心”，即可看到管理员权限面板。

## 认证配置要点

- 邮箱注册默认需要完成邮箱验证后才能登录。
- GitHub OAuth 需在 Supabase Auth 中配置回调地址与站点 URL。

## 结构说明

- supabase/：数据库迁移与 RLS 策略
- src/lib/supabaseClient.ts：Supabase 客户端初始化
- src/pages/：仓库风格页面

## 本地脚本

- bun run dev: 启动开发服务器
- bun run build: 类型检查 + 构建
- bun run test: 测试
- bun run lint: ESLint
- bun run format: Prettier

## 测试与格式化

- bun run test
- bun run lint
- bun run format

## 发布流程

- 参考 RELEASE.md
