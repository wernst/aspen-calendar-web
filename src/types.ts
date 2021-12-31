export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDateUtc: string;
  endDateUtc: string;
  duration: number; // minutes
  isRecurring: boolean;
  recurrencePattern: string;
  // allDay: boolean,
  // participants: User[]
}
