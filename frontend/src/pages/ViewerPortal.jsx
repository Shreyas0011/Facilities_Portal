import React from 'react';
import CalendarView from '../components/CalendarView';

export default function ViewerPortal() {
  return (
    <div id="calendarViewPortal" style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <CalendarView />
    </div>
  );
}
