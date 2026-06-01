import BottomTodoTabs from './BottomTodoTabs';
import RollingNotificationBanner from './RollingNotificationBanner';

export default function BottomInfoContainer() {
  return (
    <section className="renderer-bottom-container">
      <div className="renderer-todo-container">
        <BottomTodoTabs />
      </div>

      <div className="renderer-news-container">
        <RollingNotificationBanner />
      </div>
    </section>
  );
}
