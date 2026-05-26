import BottomInfoContainer from '../_components/BottomInfoContainer';

export default async function Renderer() {
  return (
    <div className="renderer-container">
      <div className="renderer-stage-container">랜더러 영역</div>
      <BottomInfoContainer />
    </div>
  );
}
