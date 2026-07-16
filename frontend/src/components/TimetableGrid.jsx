import React, { useState } from 'react';
import { getClashingCourses } from '../utils';

function TimetableGrid({ populatedTimetable, courseData, selectedIndexes, handleSelectIndex, showLectures = true }) {
  const [previewCourseCode, setPreviewCourseCode] = useState(null);

  const baseDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hasSun = populatedTimetable?.some(c => c.selectedIndexData.lessons.some(l => l.day === 'SUN'));
  const hasSat = populatedTimetable?.some(c => c.selectedIndexData.lessons.some(l => l.day === 'SAT'));
  
  const activeDays = [...baseDays];
  if (hasSun) activeDays.unshift('Sun');
  if (hasSat) activeDays.push('Sat');
  const days = activeDays;

  const hours = [];
  for (let h = 8; h <= 23; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }

  const timeToOffset = (timeStr) => {
    if (!timeStr) return 0;
    const h = parseInt(timeStr.substring(0, 2));
    const m = parseInt(timeStr.substring(2, 4));

    const startHour = 8.0;
    const timeInHours = h + (m / 60);
    const diff = timeInHours - startHour;

    return diff * 60;
  };

  const getDurationHeight = (start, end) => {
    const startOffset = timeToOffset(start);
    const endOffset = timeToOffset(end);
    return endOffset - startOffset;
  };

  const dataDaysMap = {
    'Sun': 'SUN',
    'Mon': 'MON',
    'Tue': 'TUE',
    'Wed': 'WED',
    'Thu': 'THU',
    'Fri': 'FRI',
    'Sat': 'SAT'
  };

  let otherSelectedLessons = [];
  let previewCourse = null;
  let currentSelectedIndexForPreview = null;

  if (previewCourseCode && courseData && selectedIndexes) {
    previewCourse = courseData.find(c => c.course_code === previewCourseCode);
    const sel = selectedIndexes.find(s => s.courseCode === previewCourseCode);
    if (sel) currentSelectedIndexForPreview = sel.indexNumber;

    otherSelectedLessons = selectedIndexes
      .filter(s => s.courseCode !== previewCourseCode)
      .flatMap(s => {
         const cData = courseData.find(cd => cd.course_code === s.courseCode);
         if (!cData) return [];
         const idx = cData.indexes.find(i => i.index_number === s.indexNumber);
         if (!idx) return [];
         return idx.lessons.map(l => ({ ...l, courseCode: s.courseCode }));
      });
  }

  const calendarData = days.map(day => {
    let rawDayLessons = [];

    if (previewCourseCode && previewCourse) {
       const seenLectures = new Set();

       const sortedIndexes = [...previewCourse.indexes].sort((a, _b) =>
         a.index_number === currentSelectedIndexForPreview ? -1 : 1
       );

       sortedIndexes.forEach(idx => {
         const isCurrent = idx.index_number === currentSelectedIndexForPreview;
         const clashingCourses = getClashingCourses(idx.lessons, otherSelectedLessons);

         idx.lessons.forEach(lesson => {
           if (lesson.day === dataDaysMap[day]) {

             if (lesson.type.startsWith('LEC')) {
               const lecKey = `${lesson.time}-${lesson.venue}`;
               if (seenLectures.has(lecKey)) return;
               seenLectures.add(lecKey);
             }

             rawDayLessons.push({
               ...lesson,
               course_code: previewCourse.course_code,
               index_number: idx.index_number,
               isPreview: true,
               isCurrent,
               clashingCourses
             });
           }
         });
       });

       populatedTimetable?.forEach(course => {
         if (course.course_code === previewCourseCode) return;
         course.selectedIndexData.lessons.forEach(lesson => {
           if (lesson.day === dataDaysMap[day]) {
             if (!showLectures && lesson.type && lesson.type.startsWith('LEC')) return;
             rawDayLessons.push({
               course_code: course.course_code,
               isOther: true,
               ...lesson
             });
           }
         });
       });
    } else {
       populatedTimetable?.forEach(course => {
         course.selectedIndexData.lessons.forEach(lesson => {
           if (lesson.day === dataDaysMap[day]) {
             if (!showLectures && lesson.type && lesson.type.startsWith('LEC')) return;
             rawDayLessons.push({
               course_code: course.course_code,
               ...lesson
             });
           }
         });
       });
    }

    const timeToMins = (tStr) => {
      const parts = tStr.split('-');
      const s = parseInt(parts[0]);
      return Math.floor(s / 100) * 60 + (s % 100);
    };

    rawDayLessons.sort((a, b) => {
       const startA = parseInt(a.time.split('-')[0]);
       const startB = parseInt(b.time.split('-')[0]);
       return startA - startB;
    });

    const columns = [];
    rawDayLessons.forEach(lesson => {
       const start = timeToMins(lesson.time);

       let placed = false;
       for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastLesson = col[col.length - 1];
          const lastEnd = timeToMins(lastLesson.time.split('-')[1]);
          if (start >= lastEnd) {
             col.push(lesson);
             lesson.colIndex = i;
             placed = true;
             break;
          }
       }
       if (!placed) {
          lesson.colIndex = columns.length;
          columns.push([lesson]);
       }
    });

    const localMax = Math.max(1, columns.length);
    const dayLessons = rawDayLessons.map(lesson => ({
       ...lesson,
       layoutWidth: localMax > 1 ? `calc(100% / ${localMax} - 4px)` : 'calc(100% - 4px)',
       layoutLeft: localMax > 1 ? `calc((100% / ${localMax}) * ${lesson.colIndex} + 2px)` : '2px',
    }));

    return { day, dayLessons, maxOverlap: localMax };
  });

  const columnsStr = calendarData.map(d => {
    const minWidth = d.maxOverlap > 1 ? d.maxOverlap * 65 : 0;
    return minWidth > 0 ? `minmax(${minWidth}px, 1fr)` : 'minmax(0, 1fr)';
  }).join(' ');

  const gridStyle = {
    gridTemplateColumns: `60px ${columnsStr}`
  };

  return (
    <div className={`calendar-container ${previewCourseCode ? 'preview-mode-active' : ''}`} style={{ overflowX: 'auto' }}>

      <div className="calendar-header-row" style={gridStyle}>
        <div className="calendar-header-cell" style={{ borderRight: '1px solid var(--header-border)' }}>

        </div>
        {days.map(day => (
          <div key={day} className="calendar-header-cell">
            {day}
            {previewCourseCode && <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal', marginTop: '2px' }}>Previewing {previewCourseCode}</div>}
          </div>
        ))}
      </div>

      <div className="calendar-body" style={gridStyle}>

        <div className="calendar-time-col">
          {hours.slice(0, -1).map((hour) => (
            <div key={hour} style={{ height: '60px', position: 'relative' }}>
              <span className="time-label">{hour}</span>
            </div>
          ))}
        </div>

        {calendarData.map(({ day, dayLessons }) => {
          return (
            <div key={day} className="calendar-day-col">

              {hours.slice(0, -1).map((hour, i) => (
                <React.Fragment key={`lines-${i}`}>
                  <div className="grid-line-hour" style={{ top: `${i * 60}px` }} />
                  <div className="grid-line-half" style={{ top: `${(i * 60) + 30}px` }} />
                </React.Fragment>
              ))}

              {dayLessons.map((lesson, idx) => {
                const top = timeToOffset(lesson.time.split('-')[0]);
                const height = getDurationHeight(lesson.time.split('-')[0], lesson.time.split('-')[1]);

                if (lesson.isPreview) {
                   let className = "class-block class-block-preview";
                   if (lesson.isCurrent) className += " current";
                   else if (lesson.clashingCourses) className += " clashing";
                   else className += " available";

                   return (
                     <div
                       key={`preview-${lesson.course_code}-${lesson.index_number}-${idx}`}
                       className={className}
                       style={{
                         top: `${top}px`,
                         '--box-height': `${Math.max(0, height - 2)}px`,
                         width: lesson.layoutWidth,
                         left: lesson.layoutLeft,
                         right: 'auto'
                       }}
                       onClick={(e) => {
                          e.stopPropagation();
                          if (lesson.clashingCourses) return;
                          if (lesson.type.startsWith('LEC')) return;

                          if (!lesson.isCurrent) {
                            handleSelectIndex?.(lesson.course_code, lesson.index_number);
                          }

                          setPreviewCourseCode(null);
                       }}
                     >
                         <div className="class-code" style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.1 }}>{lesson.course_code}</div>
                         <div className="class-index" style={{ fontSize: '0.75rem', opacity: 0.9, lineHeight: 1.1 }}>{lesson.index_number}</div>
                         <div className="class-type" style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '1px', lineHeight: 1.05 }}>{lesson.type} | {lesson.venue}</div>
                         {lesson.remark && <div className="class-remark" style={{ fontSize: '0.65rem', opacity: 0.85, marginTop: '1px', lineHeight: 1.05 }}>{lesson.remark.replace(/,(?!\s)/g, ', ')}</div>}
                         {lesson.clashingCourses && <div className="class-clash" style={{ fontSize: '0.65rem', color: '#ffc9c9', marginTop: '2px', fontWeight: 700 }}>Clashes with {lesson.clashingCourses}</div>}
                     </div>
                   );
                } else {
                   return (
                     <div
                       key={`${lesson.course_code}-${idx}`}
                       className={`class-block ${lesson.isOther ? 'other-course' : ''}`}
                       style={{
                         top: `${top}px`,
                         '--box-height': `${Math.max(0, height - 2)}px`,
                         width: lesson.layoutWidth,
                         left: lesson.layoutLeft,
                         right: 'auto'
                       }}
                       onClick={(e) => {
                          e.stopPropagation();

                          if (previewCourseCode) return;

                          if (lesson.type.startsWith('LEC')) return;
                          setPreviewCourseCode(lesson.course_code);
                       }}
                     >
                       <div className="class-code" style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.1 }}>{lesson.course_code}</div>
                       {lesson.index_number && <div className="class-index" style={{ fontSize: '0.75rem', opacity: 0.9, lineHeight: 1.1 }}>{lesson.index_number}</div>}
                       <div className="class-type" style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '1px', lineHeight: 1.05 }}>{lesson.type} | {lesson.venue}</div>
                       {lesson.remark && <div className="class-remark" style={{ fontSize: '0.65rem', opacity: 0.85, marginTop: '1px', lineHeight: 1.05 }}>{lesson.remark.replace(/,(?!\s)/g, ', ')}</div>}
                     </div>
                   );
                }
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TimetableGrid;
