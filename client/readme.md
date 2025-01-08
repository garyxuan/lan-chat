# gh-pages 是一个 npm 包，主要用于将项目部署到 GitHub Pages。它的主要作用是：

- 自动创建和管理 gh-pages 分支
- GitHub Pages 会使用这个特殊的分支来托管静态网站
- 它只包含构建后的静态文件（比如您的 dist 目录内容）
- 自动化部署流程
- 将构建好的文件（dist 目录）推送到 gh-pages 分支
- 保持主分支（main）干净，只存放源代码

# 工作流程：
- 自动部署这个分支的内容

# 优点：
- 分离源代码和构建后的文件
- 自动化部署过程
- 不需要手动管理部署分支