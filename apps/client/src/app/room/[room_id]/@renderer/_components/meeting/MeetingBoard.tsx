import IssueHub from './IssueHub';
import MeetingMinutes from './MeetingMinutes';

export default function MeetingBoard() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <MeetingMinutes />
      <IssueHub />
    </div>
  );
}
