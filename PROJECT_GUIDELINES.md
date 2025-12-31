# 项目开发规范指南

本文档概述了 **Shader Alchemist** 项目的架构标准和开发工作流。遵循这些准则可确保代码的可维护性、一致性和高性能。

## 1. 目录结构

项目在 `components/` 目录下遵循 **领域驱动 (Domain-Driven)** 的结构。所有新文件必须放置在相应的分类目录中。

```
/
├── components/          # React 组件
│   ├── core/            # 核心基础设施、系统管理器 (如 PostProcessing, ErrorBoundary)
│   ├── entities/        # 交互式游戏实体 (玩家, 敌人, 子弹, 道具)
│   ├── materials/       # 视觉与着色器逻辑 (ShaderMaterials, 材质动画管理器)
│   ├── scenes/          # 关卡定义和世界组合 (GameScene, VolcanoWorld)
│   └── ui/              # 2D DOM 界面 (HUD, 准星, 菜单)
├── types/               # TypeScript 类型定义
├── shaders/             # 原始 GLSL 文件 (.vert, .frag)
└── App.tsx              # 应用程序入口
```

### 分类规则
- **Core (核心)**: 不直接渲染游戏对象，而是管理逻辑的系统（如音频、输入、物理辅助）。
- **Entities (实体)**: 存在于世界*内部*的对象，通常具有位置/旋转，并进行交互（碰撞、物理）。
- **Scenes (场景)**: 组装实体环境的高层容器，对应具体的关卡。
- **UI**: HTML/CSS 覆盖层（Canvas 的兄弟节点）。
- **Materials (材质)**: 专用于视觉外观逻辑。`MaterialAnimation` 逻辑放于此处。

## 2. 命名规范

- **文件与组件**: `PascalCase`（大驼峰，例如 `JellyBullet.tsx`, `GameScene.tsx`）。
- **目录**: `lowercase`（小写，例如 `components/entities/`）。
- **Hooks**: `camelCase` 并以 `use` 开头（例如 `useAnimatedMaterial`）。
- **Shader 文件**: `camelCase` 并带扩展名（例如 `lavaFlow.vert.glsl`）。

## 3. 引用路径规范

**严格规则**: 内部引用 **必须** 使用 `@/` 路径别名，以避免相对路径混乱（如 `../../../`）。

- ✅ **正确**: `import { GunType } from '@/types';`
- ✅ **正确**: `import { Player } from '@/components/entities/Player';`
- ❌ **错误**: `import { GunType } from '../../types';`
- ❌ **错误**: `import { Player } from '../entities/Player';`

## 4. 组件开发工作流

### 创建新实体 (Entity)
1. 在 `components/entities/` 中创建文件。
2. 定义其 Props 接口（如果父组件需要，请导出它）。
3. 如果需要自定义视觉效果，请先在 `components/materials/` 中创建材质。

### 创建新材质 (Material)
1. **Shaders**: 将 `.vert.glsl` 和 `.frag.glsl` 放入 `shaders/materials/`。
2. **Component**: 在 `components/materials/` 中创建 `MyMaterial.tsx`。
3. **Implementation**:
   - 使用 `@react-three/drei` 的 `shaderMaterial`。
   - 如果需要 `uTime` 更新，请实现并使用 `useAnimatedMaterial` hook。
   - 使用具名导出 (Named Export)。
4. **Registration**: 在 `components/materials/index.ts` 中重新导出。

### 状态管理
- **Local State**: UI 仅有的状态使用 `useState`。
- **Refs**: 高频游戏循环数据（玩家位置、速度）必须使用 `useRef`，避免 React 重渲染。
- **Performance**: **严禁** 在 `useFrame` 循环中设置 `useState`。

## 5. 性能优化指南

- **向量缓存 (Vector Caching)**: **严禁** 在 `useFrame` 中实例化 `new THREE.Vector3()`。请在循环外部创建常量或 ref。
- **材质复用**: 材质应实例化一次并复用（如果作为组件 `<MyMaterial />` 使用，React Three Fiber 会自动处理）。
- **Context 使用**: 使用 `MaterialAnimationProvider` 处理共享 uniform（如 `uTime`），以防止每帧进行 N 次场景图遍历。

