const dayOffsetMap = {
  'MON': 0,
  'TUE': 1,
  'WED': 2,
  'THU': 3,
  'FRI': 4,
  'SAT': 5,
  'SUN': 6
};

function parseWeeks(remark) {
  if (!remark || !remark.includes('Wk')) {

    return Array.from({length: 13}, (_, i) => i + 1);
  }
  const match = remark.match(/Wk([\d,\-\s]+)/);
  if (!match) return Array.from({length: 13}, (_, i) => i + 1);

  const parts = match[1].split(',');
  const weeks = new Set();
  parts.forEach(p => {
    p = p.trim();
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number);
      for(let i = start; i <= end; i++) weeks.add(i);
    } else if (p) {
      weeks.add(Number(p));
    }
  });
  return Array.from(weeks).sort((a,b) => a-b);
}

function formatICSDate(date, timeString) {

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = timeString.substring(0, 2);
  const MM = timeString.substring(2, 4);

  return `${yyyy}${mm}${dd}T${HH}${MM}00`;
}

export const generateICS = (timetable, startDateStr, recessWeek) => {

  const startParts = startDateStr.split('-');
  const baseDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NTU Planner//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Singapore',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:+08',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  timetable.forEach(course => {
    const courseCode = course.course_code;
    const courseTitle = course.title || courseCode;
    const indexNumber = course.selectedIndex;
    if (!course.selectedIndexData || !course.selectedIndexData.lessons) return;

    course.selectedIndexData.lessons.forEach(lesson => {
      const dayOffset = dayOffsetMap[lesson.day];
      if (dayOffset === undefined) return;

      const weeks = parseWeeks(lesson.remark);
      const times = lesson.time.split('-');
      if (times.length !== 2) return;

      weeks.forEach(wk => {

        let extraWeeks = 0;
        if (recessWeek && wk > parseInt(recessWeek)) {
          extraWeeks = 1;
        }

        const daysToAdd = ((wk - 1 + extraWeeks) * 7) + dayOffset;

        const lessonDate = new Date(baseDate.getTime());
        lessonDate.setDate(lessonDate.getDate() + daysToAdd);

        const dtStart = formatICSDate(lessonDate, times[0]);
        const dtEnd = formatICSDate(lessonDate, times[1]);

        const uid = `${courseCode}-${indexNumber}-${lesson.type}-${wk}-${dtStart}@ntuplanner`;

        const summary = `${courseCode} ${lesson.type}`;
        const description = `${courseTitle}\\nIndex: ${indexNumber}\\nRemark: ${lesson.remark || 'N/A'}`;

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${formatICSDate(new Date(), "0000")}`,
          `DTSTART;TZID=Asia/Singapore:${dtStart}`,
          `DTEND;TZID=Asia/Singapore:${dtEnd}`,
          `SUMMARY:${summary}`,
          `LOCATION:${lesson.venue}`,
          `DESCRIPTION:${description}`,
          'END:VEVENT'
        );
      });
    });
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\\r\\n');
};
