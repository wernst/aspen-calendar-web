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
  addMinutes,
} from "date-fns";
import { useEffect, useState } from "react";
import { RRule, RRuleSet, rrulestr } from "rrule";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDateUtc: string;
  endDateUtc: string;
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
            isAfter(new Date(a.startDateUtc), new Date(b.startDateUtc)) ? 1 : -1
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
              {event.title} -{" "}
              {format(new Date(event.startDateUtc), "hh:mm aaa")}
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
          return isEqual(
            startOfDay(new Date(event.startDateUtc)),
            startOfDay(date)
          );
        });
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringRate, setRecurringRate] = useState("DAILY");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  function resetInputs() {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setIsRecurring(false);
    setRecurringRate("DAILY");
  }

  function getEndDate(
    startDate: Date,
    duration: number,
    isRecurring: boolean,
    recurrenceEndDate: Date | undefined
  ) {
    if (isRecurring) {
      console.log(recurrenceEndDate);
      return recurrenceEndDate ?? new Date(Date.UTC(2999, 12, 31));
    }
    return addMinutes(startDate, duration);
  }

  function generateRecurrencePattern(
    recurringRate: string,
    startDateUtc: string,
    endDateUtc: string
  ) {
    const freq =
      recurringRate === "DAILY"
        ? RRule.DAILY
        : recurringRate === "WEEKLY"
        ? RRule.WEEKLY
        : recurringRate === "MONTHLY"
        ? RRule.MONTHLY
        : recurringRate === "ANNUALLY"
        ? RRule.YEARLY
        : undefined;

    if (!freq) return;

    const rule = new RRule({
      freq,
      interval: 1,
      dtstart: new Date(startDateUtc),
      until: new Date(endDateUtc),
    });

    return rule.toString();
  }

  return (
    <div style={{ margin: "15px 75px" }}>
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
      <label>Is recurring?</label>
      <input
        type="checkbox"
        checked={isRecurring}
        onChange={(e) => setIsRecurring(e.target.checked)}
      />
      {isRecurring ? (
        <>
          <label>Recurring:</label>
          <select
            value={recurringRate}
            onChange={(e) => setRecurringRate(e.target.value)}
          >
            <option value={"DAILY"}>Daily</option>
            <option value={"WEEKLY"}>Weekly</option>
            <option value={"MONTHLY"}>Monthly</option>
            <option value={"ANNUALLY"}>Annually</option>
          </select>
          <label>Ending:</label>
          <input
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => setRecurrenceEndDate(e.target.value)}
          />
        </>
      ) : (
        <></>
      )}
      <button
        onClick={async () => {
          if (!date || !time) {
            console.error("NO DATE!");
            return;
          }
          const duration = 30;
          const [year, month, day] = date.split("-").map((n) => Number(n));
          const [hours, minutes] = time.split(":").map((n) => Number(n));
          const startDateObj = new Date(year, month - 1, day, hours, minutes);
          const recurrenceEndDateObj = recurrenceEndDate
            ? (() => {
                const [rYear, rMonth, rDay] = recurrenceEndDate
                  .split("-")
                  .map((n) => Number(n));
                return addMinutes(
                  new Date(rYear, rMonth, rDay, hours, minutes),
                  duration
                );
              })()
            : undefined;
          const endDateObj = getEndDate(
            startDateObj,
            duration,
            isRecurring,
            recurrenceEndDateObj
          );
          const startDateString = startDateObj.toISOString();
          const endDateString = endDateObj.toISOString();

          const recurrencePattern = isRecurring
            ? generateRecurrencePattern(
                recurringRate,
                startDateString,
                endDateString
              )
            : undefined;

          await agent.runAction("setEvent", {
            title,
            description,
            startDateUtc: startDateString,
            endDateUtc: endDateString,
            duration,
            isRecurring,
            recurrencePattern,
          });
          resetInputs();
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
