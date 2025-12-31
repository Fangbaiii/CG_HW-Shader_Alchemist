# Shader Alchemist

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![Tech](https://img.shields.io/badge/tech-Three.js%20%7C%20R3F%20%7C%20GLSL-green)
![Status](https://img.shields.io/badge/status-Refactored-orange)

**Shader Alchemist** 是一款基于 WebGL 的第一人称解谜游戏。在这个由极简几何体构成的实验室中，玩家不再是破坏者，而是物质的“炼金术师”。通过手中的 Shader 枪，你可以改变物体的材质属性，从而改变物理规则，跨越障碍，抵达终点。

本项目展示了如何在 React Three Fiber 中结合自定义 GLSL Shader 实现高性能、交互式的 3D 体验。

---

## 🎮 核心玩法 (Gameplay)

### 游戏目标
每一关的目标是从起点移动到终点的光圈。途中会有高墙、深渊、激光等障碍阻挡，你需要利用手中的元素枪改变环境来通过。

### 操作方式
- **WASD**: 移动角色
- **鼠标**: 控制视角
- **鼠标左键**: 射击/转化物体
- **数字键 1 / 2 / 3**: 切换 Shader 枪模式
- **R**: 重置当前关卡

---

## 🔫 三大元素枪 (The Shader Guns)

游戏的核心机制在于三种不同的 Shader 模式，每种模式对应一种解谜逻辑：

### 1. 🟢 弹力果冻 (The Jelly Shader) - [按键 1]
*   **视觉效果**: 物体变为半透明绿色，通过 Vertex Shader 制造波浪起伏。
*   **物理效果**: 赋予物体高弹力，可用于跳跃至高处。
*   **技术点**: 顶点位移 (Vertex Displacement), 菲涅尔高光 (Fresnel).

### 2. 👻 幽灵线框 (The Ghost Shader) - [按键 2]
*   **视觉效果**: 实体消失，只剩下发光的边缘线框或半透明幽灵状。
*   **物理效果**: 关闭物体的碰撞检测，允许玩家穿墙而过。
*   **技术点**: Fragment Shader 中的 `discard` 操作, Alpha 混合.

### 3. 🪞 镜面反射 (The Mirror Shader) - [按键 3]
*   **视觉效果**: 物体表面如镜子般光滑，实时反射周围环境。
*   **物理效果**: 能够反射激光束。
*   **技术点**: Cube Camera / Environment Mapping.

---

## 🗺️ 关卡设计 (Levels)

*   **Stage 1: 熔岩炼狱 (Volcano World)**
    *   展示了复杂的**程序化岩浆 Shader**，包含流动的纹理、热变形和顶点的动态起伏。
    *   练习果冻跳跃机制越过岩浆池。
*   **Stage 2: 幽灵回廊 (Ghost World)**
    *   封闭的密室，需要利用幽灵枪穿过墙壁寻找出口。
*   **Stage 3: 镜像迷宫 (Mirror World)**
    *   综合谜题关卡，利用镜面反射引导激光，开启终点大门。

---

## 🛠️ 技术架构与开发 (Architecture)

本项目采用了领域驱动的目录结构以支持可扩展性。

### 目录结构
```bash
/components
  /core       # 核心系统 (PostProcessing, Inputs)
  /entities   # 游戏对象 (Player, Bullets, LabObjects)
  /materials  # 视觉表现 (Custom Shaders)
  /scenes     # 关卡定义 (VolcanoWorld, etc.)
  /ui         # 界面层
/shaders      # 原始 GLSL 文件
```

详细的开发规范、命名约定和最佳实践，请参考项目根目录下的 **[开发规范指南](./PROJECT_GUIDELINES.md)**。

---

## 🚀 如何运行 (How to Run)

1.  安装依赖:
    ```bash
    npm install
    ```
2.  启动开发服务器:
    ```bash
    npm run dev
    ```
3.  打开浏览器访问显示的本地地址 (通常为 `http://localhost:5173`)。

