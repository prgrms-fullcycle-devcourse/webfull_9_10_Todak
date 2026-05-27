import BottomInfoContainer from '../_components/BottomInfoContainer';
import PixiCanvas from './PixiCanvas';

export default async function Renderer() {
  return (
    <div className="renderer-container h-full w-full flex flex-col">
      {/* 2D 가상 공간 */}
      <div className="renderer-stage-container flex-1 flex items-center justify-center p-4 relative">
        {/* 테두리와 배경 그림자, 그리고 투명 캔버스 뒤에 깔릴 가상 그리드 배경 주입 */}
        <div className="relative border-4 border-slate-300 rounded-2xl overflow-hidden shadow-2xl bg-surface todak-grid-bg">
          <PixiCanvas />
        </div>
      </div>
      <BottomInfoContainer />
    </div>
  );
}
