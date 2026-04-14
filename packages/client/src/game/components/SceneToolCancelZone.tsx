import { Html } from "@react-three/drei";

interface SceneToolCancelZoneProps {
  active?: boolean;
  visible: boolean;
}

// Touch dragging uses a dedicated bottom cancel band so mobile players can abort pointer tools.
export function SceneToolCancelZone({ active = false, visible }: SceneToolCancelZoneProps) {
  if (!visible) {
    return null;
  }

  return (
    <Html fullscreen>
      <div className={`scene-tool-cancel-zone${active ? " active" : ""}`} aria-hidden="true">
        <div className="scene-tool-cancel-zone__band" />
        <div className="scene-tool-cancel-zone__label">拖到这里取消</div>
      </div>
    </Html>
  );
}
