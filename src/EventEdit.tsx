import { CalendarEvent } from "./types";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Agent as AgentClient } from "@aspen.cloud/client";

const agent = new AgentClient("@will/calendar-agent");

export default function EventEdit() {
  let params = useParams();
  const [event, setEvent] = useState<CalendarEvent | undefined>();
  useEffect(() => {
    (async () => {
      const resp = await agent.getView("eventById", {
        eventId: params.eventId,
      });
      console.log(resp);
      setEvent(resp);
    })();
  }, []);
  return event ? <EventEditForm event={event} /> : <></>;
}

function EventEditForm({ event }: { event: CalendarEvent }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const onSubmit = (data: any) => console.log(data);
  return (
    <>
      <h3>Edit Event (WIP)</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register("title", { required: true, value: event.title })} />
        <input
          type="date"
          {...register("startDateUtc", {
            required: true,
            value: event.description,
          })}
        />
        <input
          type="number"
          {...register("duration", { required: true, value: event.duration })}
        />

        <input
          type="checkbox"
          {...register("isRecurring", { value: event.isRecurring })}
        />

        {errors.title && <span>This field is required</span>}

        <input type="submit" />
      </form>
    </>
  );
}
