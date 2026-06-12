import RouteFallbackView from '@/app/_components/RouteFallbackView';

export default function RoomNotFound() {
  return (
    <RouteFallbackView
      description="룸이 삭제되었거나 더 이상 접근할 수 없는 룸입니다."
      eyebrow="ROOM NOT FOUND"
      title="룸을 찾을 수 없습니다."
    />
  );
}
