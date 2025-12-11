import React from 'react';
import { Text, RoundedBox } from '@react-three/drei';

interface SignboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  content: string[];
}

export const Signboard: React.FC<SignboardProps> = ({ position, rotation = [0, 0, 0], title, content }) => {
  // Use default font to avoid loading issues
  // const fontUrl = 'https://fonts.gstatic.com/s/notosanssc/v26/k3kXo84MPvpLmixcA63OEALhLOCT-xWtmwxH2l2Q.woff';

  return (
    <group position={position} rotation={rotation}>
      {/* 背景板 - 带圆角的半透明黑曜石板 */}
      <RoundedBox args={[3, 2, 0.1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} roughness={0.2} metalness={0.8} />
      </RoundedBox>

      {/* 边框 - 背后稍微大一圈的青色板 */}
      <RoundedBox args={[3.06, 2.06, 0.08]} radius={0.12} smoothness={4} position={[0, 0, -0.02]}>
        <meshBasicMaterial color="#00ffff" />
      </RoundedBox>

      {/* 标题 */}
      <Text
        position={[0, 0.6, 0.06]}
        fontSize={0.25}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005} // 轻微描边增加可读性
        outlineColor="#004444"
      >
        {title}
      </Text>

      {/* 内容文本 */}
      <Text
        position={[0, -0.15, 0.06]}
        fontSize={0.14}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.6}
        lineHeight={1.6}
        textAlign="left" // 内容左对齐看起来更像列表
      >
        {content.join('\n')}
      </Text>
    </group>
  );
};
