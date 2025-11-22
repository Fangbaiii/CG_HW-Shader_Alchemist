# Shader Alchemist 

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Tech](https://img.shields.io/badge/tech-Three.js%20%7C%20React%20%7C%20GLSL-green)

**Shader Alchemist** 是一款第一人称解谜游戏。在这个由极简几何体构成的实验室中，玩家不再是破坏者，而是物质的“炼金术师”。通过手中的 Shader 枪，你可以改变物体的材质属性，从而改变物理规则，跨越障碍，抵达终点。

---

## 🎮 核心玩法 (Gameplay)

### 游戏目标
每一关的目标是从起点移动到终点的光圈。途中会有高墙、深渊、激光等障碍阻挡。

### 操作方式
- **WASD**: 移动角色
- **鼠标**: 控制视角
- **鼠标左键**: 射击/转化物体
- **数字键 1 / 2 / 3**: 切换 Shader 枪模式

---

## 🔫 三大元素枪 (The Shader Guns)

游戏的核心机制在于三种不同的 Shader 模式，每种模式对应一种解谜逻辑：

### 1. 🟢 弹力果冻 (The Jelly Shader) - 按键 [1]
*   **视觉效果**: 物体变为半透明绿色/粉色，表面像果冻一样通过顶点起伏不停蠕动。
*   **物理效果**: 赋予物体高弹力。
*   **解谜应用**: 射击地面方块使其变弹，跳上去可被弹飞越过高墙；或使巨石瘫软以消除障碍。
*   **技术实现**:
    *   **Vertex Shader**: 使用 `sin(Time)` 动态修改顶点 Position 制造波浪。
    *   **光照**: 添加高光 (Specular) 模拟湿润感。

### 2. 👻 幽灵线框 (The Ghost Shader) - 按键 [2]
*   **视觉效果**: 实体消失，只剩下发光的边缘线框或半透明幽灵状。
*   **物理效果**: 关闭物体的碰撞检测 (No Collision)。
*   **解谜应用**: 面对挡路的墙壁，将其转化为“幽灵”状态，直接穿墙而过。
*   **技术实现**:
    *   **Fragment Shader**: 使用 `discard` 丢弃非边缘像素，或进行 Alpha 混合。

### 3. 🪞 镜面反射 (The Mirror Shader) - 按键 [3]
*   **视觉效果**: 物体表面如镜子般光滑，反射周围环境。
*   **物理效果**: 能够反射光线/激光。
*   **解谜应用**: 将普通柱子转化为镜面，反射激光束击中死角处的感应器以打开大门。
*   **技术实现**:
    *   **Environment Mapping**: 使用 Cube Map 采样。
    *   **Fresnel Effect**: 边缘反光增强效果。

---

## 🗺️ 关卡设计 (Level Design)

*   **Level 1 (教学关)**: 学习“果冻”机制。利用弹力方块跳过高墙。
*   **Level 2 (穿墙关)**: 学习“幽灵”机制。在封闭房间内将墙壁虚化逃生。
*   **Level 3 (综合谜题)**: 结合“果冻”跳跃至高处，利用“镜面”反射激光开启终点大门。

---

## 🛠️ 开发计划 (To-Do List)

### 基础架构
- [x] **基础漫游**: 实现 WASD 移动和鼠标视角控制 (First Person Controls)。
- [x] **枪械外观**: 实现第一人称枪械外观.
- [ ] **场景加载**: 搭建基础关卡几何体 (Cube, Wall, Sphere)。
- [ ] **天空盒 (Skybox)**: 实现环境背景，为镜面反射提供素材。

### 核心交互
- [ ] **射线检测 (Raycasting)**: 实现点击鼠标时判断射中物体的逻辑。
- [ ] **状态管理**: 为物体添加 `type` 标记 (0=普通, 1=果冻, 2=幽灵, 3=镜面)。
- [ ] **简单物理**:
    - [ ] 果冻模式：给予玩家垂直向上的速度。
    - [ ] 幽灵模式：动态开启/关闭碰撞体。

### 图形与 Shader
- [ ] **Uniform 传递**: 将 JS 中的 `time` 等变量传入 Shader。
- [ ] **光照系统**: 实现基础 Phong 光照。
- [ ] **Shader 编写**:
    - [ ] Jelly Shader (Vertex Displacement)
    - [ ] Wireframe/Ghost Shader (Discard/Alpha)
    - [ ] Mirror Shader (CubeMap Reflection)

### 视觉特效 (Bonus)
- [ ] **UI**: 屏幕准星。
- [ ] **粒子特效**: 开枪时的枪口火焰或击中反馈。

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
3.  打开浏览器访问 `http://localhost:3000