import { Agent as AgentClient } from "@aspen.cloud/client";
import {
  endOfWeek,
  getMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  getDate,
  startOfDay,
  isEqual,
  format,
  isAfter,
} from "date-fns";
import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  duration: number; // minutes
  // allDay: boolean,
  // participants: User[]
}

// TODO: need some kind of check that an agent is declared as a dependendcy (or show error in UI somewhere)
const agent = new AgentClient("@will/calendar-agent");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function CalendarCell({
  date,
  events,
}: {
  date: Date;
  events: CalendarEvent[];
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid black",
      }}
    >
      <div style={{ textAlign: "center" }}>{getDate(date)}</div>
      <div>
        {events
          .sort((a, b) =>
            isAfter(new Date(a.date), new Date(b.date)) ? 1 : -1
          )
          .map((event, i) => (
            <div
              key={i}
              style={{
                margin: "2px 5px",
                padding: "5px",
                backgroundColor: "blue",
                color: "white",
                borderRadius: "5px",
              }}
              onClick={() => console.log("GO TO EVENT PAGE")}
            >
              {event.title} - {format(new Date(event.date), "hh:mm aaa")}
            </div>
          ))}
      </div>
    </div>
  );
}

function CalendarCellRow({
  dates,
  events,
}: {
  dates: Date[];
  events: CalendarEvent[];
}) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {dates.map((date, i) => {
        const eventsForDate = events.filter((event) => {
          // console.log(
          //   startOfDay(new Date(event.date)),
          //   startOfDay(date),
          //   isEqual(startOfDay(new Date(event.date)), startOfDay(date))
          // );
          return isEqual(startOfDay(new Date(event.date)), startOfDay(date));
        });
        // console.log(date, events, eventsForDate);
        return (
          <div style={{ flex: "1 1 0" }}>
            <CalendarCell date={date} key={i} events={eventsForDate} />
          </div>
        );
      })}
    </div>
  );
}

function CalendarCellMatrix({
  dateMatrix,
  events,
}: {
  dateMatrix: Date[][];
  events: CalendarEvent[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "800px" }}>
      {dateMatrix.map((week, i) => (
        <CalendarCellRow dates={week} key={i} events={events} />
      ))}
    </div>
  );
}

function AddEventForm() {
  const [title, setTitle] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();

  return (
    <div>
      <input
        placeholder="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button
        onClick={async () => {
          console.log(date, time);
          const dateString = `${date}T${time}:00-05:00`;
          await agent.runAction("setEvent", {
            title,
            description,
            date: dateString,
            duration: 30,
          });
        }}
      >
        Add Event
      </button>
    </div>
  );
}

function MonthView({ date }: { date: Date }) {
  const monthStart = startOfMonth(date);
  const start = startOfWeek(monthStart);
  const dateMatrix: Date[][] = [];
  for (let i = 0; i < 5; i++) {
    const week: Date[] = [];
    for (let j = 0; j < 7; j++) {
      week.push(addDays(start, i * 7 + j));
    }
    dateMatrix.push(week);
  }
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refreshEvents = async () => {
    const resp = await agent.getView("eventsForMonth", {
      year: date.getFullYear().toString(),
      month: date.getMonth().toString(),
    });
    console.log(resp);
    setEvents(resp);
  };
  useEffect(() => {
    refreshEvents();
  }, []);
  return <CalendarCellMatrix dateMatrix={dateMatrix} events={events} />;
}

export default function Calendar() {
  const date = new Date();
  const [view, setView] = useState<string>("MONTH");
  return (
    <>
      <select value={view} onChange={(e) => setView(e.target.value)}>
        <option value={"MONTH"}>Month</option>
        <option value={"WEEK"}>Week</option>
        <option value={"DAY"}>Day</option>
      </select>
      <div style={{ textAlign: "center" }}>{MONTHS[getMonth(date)]}</div>
      {view === "MONTH" ? (
        <MonthView date={date} />
      ) : view === "Week" ? (
        <></>
      ) : view === "DAY" ? (
        <></>
      ) : (
        <></>
      )}
      <AddEventForm />
    </>
  );
}
