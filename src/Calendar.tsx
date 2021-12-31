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
  addMonths,
  getYear,
  eachDayOfInterval,
} from "date-fns";
import { useEffect, useRef, useState } from "react";
import { RRule, RRuleSet, rrulestr } from "rrule";
import { usePopper } from "react-popper";
import { CalendarEvent } from "./types";
import { useNavigate } from "react-router-dom";
import { Edit, X } from "react-feather";

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

function EventDetail({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "5px",
        boxShadow:
          "0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12),0px 11px 15px -7px rgba(0,0,0,0.2)",
        padding: "5px",
      }}
    >
      <div style={{ float: "right" }}>
        <button onClick={() => navigate(`/edit/${event.id}`)}>
          <Edit />
        </button>
        <button onClick={() => onClose()}>
          <X />
        </button>
      </div>

      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <p>
        {format(new Date(event.startDateUtc), "eee, MMM dd h:mm aaa")} for{" "}
        {event.duration} minutes
      </p>
    </div>
  );
}

function MonthCalendarEvent({ event }: { event: CalendarEvent }) {
  const eventDetailRef = useRef(null);

  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(
    null
  );
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);
  const { styles, attributes, update, forceUpdate, state } = usePopper(
    referenceElement,
    popperElement,
    {
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 10],
          },
        },
      ],
      placement: "right",
    }
  );
  //@ts-ignore
  console.log(eventDetailRef.current?.getBoundingClientRect());
  // console.log(x, y, reference, floating, strategy);
  const [isEventDetailVisible, setIsEventDetailVisible] = useState(false);
  return (
    <>
      <div
        style={{
          margin: "2px 5px",
          padding: "5px",
          backgroundColor: "darkviolet",
          color: "white",
          borderRadius: "5px",
          display: "flex",
          fontSize: "0.75em",
        }}
        ref={setReferenceElement}
        onClick={() => setIsEventDetailVisible((v) => !v)}
      >
        <div
          style={{
            flexGrow: 1,
          }}
        >
          {event.title}
        </div>
        <div>{format(new Date(event.startDateUtc), "hh:mm aaa")}</div>
      </div>
      {isEventDetailVisible && (
        <div
          ref={setPopperElement}
          style={{
            ...styles.popper,
            // display:  ? "initial" : "none",
          }}
          {...attributes.popper}
        >
          <div ref={eventDetailRef}>
            <EventDetail
              event={event}
              onClose={() => setIsEventDetailVisible(false)}
            />
          </div>

          <div ref={setArrowElement} style={styles.arrow} />
        </div>
      )}
    </>
  );
}

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
          .map((event) => (
            <MonthCalendarEvent event={event} key={event.id} />
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
                  new Date(rYear, rMonth - 1, rDay, hours, minutes),
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

function MonthView({
  date,
  onDateChange,
}: {
  date: Date;
  onDateChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const start = startOfWeek(monthStart);
  const monthEnd = endOfMonth(date);
  const end = endOfWeek(monthEnd);

  const dates = eachDayOfInterval({ start, end });
  const dateMatrix = dates.reduce<Date[][]>((weeks, day, i) => {
    i % 7 === 0 ? weeks.push([day]) : weeks[weeks.length - 1].push(day);
    return weeks;
  }, []);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refreshEvents = async (date: Date) => {
    const resp = await agent.getView("eventsForMonth", {
      year: date.getFullYear().toString(),
      month: date.getMonth().toString(),
    });
    console.log(resp);
    setEvents(resp);
  };
  useEffect(() => {
    refreshEvents(date);
  }, [date]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: "2em", fontWeight: "bold" }}>
          {MONTHS[getMonth(date)]} {getYear(date)}
        </div>
        <div>
          <button onClick={() => onDateChange(addMonths(date, -1))}>
            &lt;
          </button>
          <button onClick={() => onDateChange(new Date())}>Today</button>
          <button onClick={() => onDateChange(addMonths(date, 1))}>&gt;</button>
        </div>
      </div>
      <div style={{ flexGrow: 1 }}>
        <CalendarCellMatrix dateMatrix={dateMatrix} events={events} />
      </div>
      <AddEventForm />
    </div>
  );
}

export default function Calendar() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<string>("MONTH");
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        padding: "15px",
        boxSizing: "border-box",
        backgroundColor: "floralwhite",
      }}
    >
      <select value={view} onChange={(e) => setView(e.target.value)}>
        <option value={"MONTH"}>Month</option>
        <option value={"WEEK"}>Week</option>
        <option value={"DAY"}>Day</option>
      </select>
      <div style={{ flexGrow: 1 }}>
        {view === "MONTH" ? (
          <MonthView date={date} onDateChange={(d) => setDate(d)} />
        ) : view === "WEEK" ? (
          <></>
        ) : view === "DAY" ? (
          <></>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
