# trans

Twitter 内容分析工具的整理目录。

结构说明：

- `trans/backend/` 后端相关模块的汇总与复出口，指向现有 `api/` 下实现
- `trans/frontend/pages/` 前端分析相关页面的复出口，指向现有 `src/pages/`
- `trans/docs/` 产品与技术文档副本，便于集中查看
- `trans/supabase/` 迁移与表结构入口，指向现有 `supabase/migrations`

此目录仅做聚合与索引，不改变现有代码运行路径；所有实际实现仍在原目录。

