import ViewSelection from './_components/ViewSelection';
import RecentMeetingLogs from './_components/RecentMeetingLogs';
import UserInformation from './_components/UserInformation';
import AIGuide from './_components/AIGuide';

export default async function Sidebar() {
  return (
    <>
      <UserInformation />
      <ViewSelection />
      <RecentMeetingLogs />
      <AIGuide />
    </>
  );
}
