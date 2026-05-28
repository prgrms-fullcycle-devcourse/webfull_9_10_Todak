import ProjectHub from './_components/ProjectHub';

interface TeamSelectionPageProps {
  params: Promise<{
    user_id: string;
  }>;
}

export default async function TeamSelectionPage({
  params,
}: TeamSelectionPageProps) {
  const { user_id: userID } = await params;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <ProjectHub userID={userID} />
    </main>
  );
}
