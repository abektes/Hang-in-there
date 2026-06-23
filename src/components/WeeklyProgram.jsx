export default function WeeklyProgram({ days }) {
  return (
    <div className="program-list">
      {days.map((day) => (
        <article key={day.day} className="program-day">
          <header className="program-day-header">
            <div>
              <p className="program-day-name">{day.day}</p>
              <p className="program-day-date">{day.date}</p>
            </div>
            <p className="program-day-focus">{day.focus}</p>
          </header>
          <ul className="program-sessions">
            {day.sessions.map((session) => (
              <li key={`${day.day}-${session.time}-${session.title}`} className="program-session">
                <time className="program-time">{session.time}</time>
                <div className="program-session-body">
                  <p className="program-session-title">{session.title}</p>
                  <p className="program-session-lead">{session.lead}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
