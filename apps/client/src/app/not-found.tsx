import RouteFallbackView from './_components/RouteFallbackView';

export default function NotFound() {
  return (
    <RouteFallbackView
      description="주소가 잘못되었거나 페이지가 이동 또는 삭제되었을 수 있습니다."
      eyebrow="404 NOT FOUND"
      title="페이지를 찾을 수 없습니다."
    />
  );
}
