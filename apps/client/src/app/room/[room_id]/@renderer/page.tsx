import BottomInfoContainer from '../_components/BottomInfoContainer';
import PullRequestNotifications from '../_components/PullRequestNotifications';
import RendererView from './_components/RendererView';

export default async function Renderer() {
  return (
    <div className="renderer-container h-full w-full flex flex-col">
      <PullRequestNotifications />
      <RendererView />
      <BottomInfoContainer />
    </div>
  );
}
