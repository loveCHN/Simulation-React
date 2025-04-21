# Simulation-React

## 项目介绍

Simulation-React是一个从零开始实现的React框架核心功能的项目。该项目旨在深入理解React的工作原理，包括虚拟DOM、Fiber架构、Hooks机制、并发渲染等核心概念和实现细节。

## 项目目标

- 实现React核心运行时（React Core）
- 实现React DOM渲染器（React DOM）
- 实现常用的Hooks（useState, useEffect等）
- 实现协调算法（Reconciliation）
- 实现Fiber架构
- 支持并发渲染（Concurrent Mode）
- 实现JSX转换

## 技术栈

- TypeScript
- Rollup (打包工具)
- Jest (测试框架)
- ESLint & Prettier (代码规范)

## 项目结构

该项目采用Monorepo结构，使用pnpm workspace管理多个包：

```
packages/
  ├── react/           # React核心库
  ├── react-dom/       # 浏览器DOM渲染器
  ├── react-reconciler/ # 协调器实现
  ├── shared/          # 共享工具函数和常量
  └── jsx-runtime/     # JSX运行时
```

## 开发指南

### 环境准备

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 代码格式化
pnpm format
```

### 开发流程

1. 实现虚拟DOM和基础渲染逻辑
2. 实现Fiber架构和工作循环
3. 实现常用Hooks
4. 实现协调算法和Diff优化
5. 实现并发特性

## 学习资源

- [React官方文档](https://reactjs.org/docs/design-principles.html)
- [React源码解析](https://github.com/reactjs/react)
- [React Fiber架构](https://github.com/acdlite/react-fiber-architecture)

## 贡献指南

欢迎对该项目提出改进建议和贡献代码。请遵循以下步骤：

1. Fork该项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

该项目采用MIT许可证 - 详情请查看LICENSE文件。
