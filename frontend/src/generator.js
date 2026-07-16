export const generateTimetables = (courseData, selectedCourseCodes, config) => {
  if (!selectedCourseCodes || selectedCourseCodes.length === 0) return { success: false, reason: "No courses selected." };

  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const hrs = parseInt(timeStr.substring(0, 2), 10);
    const mins = parseInt(timeStr.substring(2, 4), 10);
    return hrs + (mins / 60);
  };

  const parseToBitmask = (timeStr) => {
    if (!timeStr) return 0;
    const [start, end] = timeStr.split('-');
    const getSlot = (t) => {
      const hrs = parseInt(t.substring(0, 2), 10);
      const mins = parseInt(t.substring(2, 4), 10);
      return (hrs - 8) * 2 + (mins === 30 ? 1 : 0);
    };
    const startSlot = getSlot(start);
    const endSlot = getSlot(end);
    let mask = 0;
    for (let i = startSlot; i < endSlot; i++) {
      if (i >= 0 && i < 32) mask |= (1 << i);
    }
    return mask;
  };

  const dayMap = { 'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5, 'SUN': 6 };

  const minStart = config.startAfter ? parseInt(config.startAfter.split(':')[0]) + parseInt(config.startAfter.split(':')[1])/60 : 0;
  const maxEnd = config.endBefore ? parseInt(config.endBefore.split(':')[0]) + parseInt(config.endBefore.split(':')[1])/60 : 24;

  const checkBounds = (lessons) => {
    if (!config.startAfter && !config.endBefore) return true;
    for (const l of lessons) {
      if (!l.time) continue;
      if (l.type && l.type.startsWith('LEC')) continue;
      const [start, end] = l.time.split('-').map(parseTime);
      if (start < minStart || end > maxEnd) return false;
    }
    return true;
  };

  const coursesToGenerate = selectedCourseCodes.map(code => {
    const orig = courseData.find(c => (c.courseCode || c.course_code) === code);
    if (!orig) return null;
    const c = JSON.parse(JSON.stringify(orig));
    c.indexes = c.indexes.filter(idx => checkBounds(idx.lessons));

    for (const index of c.indexes) {
      index.masks = [0, 0, 0, 0, 0, 0, 0];
      for (const lesson of index.lessons) {
        if (!lesson.time) continue;
        const d = dayMap[lesson.day];
        if (d !== undefined) index.masks[d] |= parseToBitmask(lesson.time);
      }
    }
    return c;
  }).filter(Boolean);

  if (coursesToGenerate.length === 0) return { success: false, reason: "Course data not found." };

  for (const course of coursesToGenerate) {
    if (course.indexes.length === 0) {
      return { success: false, reason: `Could not generate timetable. The course ${course.courseCode || course.course_code} has no valid classes that fit within your specified Day Start/End time bounds.` };
    }
  }

  coursesToGenerate.sort((a, b) => a.indexes.length - b.indexes.length);

  let validSchedules = [];
  let iterations = 0;
  const MAX_ITERATIONS = 5000000;
  let aborted = false;

  const dfs = (courseIdx, currentMasks, currentSchedule) => {
    if (aborted) return;
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      aborted = true;
      return;
    }

    if (courseIdx === coursesToGenerate.length) {
      validSchedules.push([...currentSchedule]);
      if (validSchedules.length > 10000) aborted = true;
      return;
    }

    const course = coursesToGenerate[courseIdx];
    for (const index of course.indexes) {
      if (aborted) break;

      let clash = false;
      for (let d = 0; d < 7; d++) {
        if ((currentMasks[d] & index.masks[d]) !== 0) {
          clash = true;
          break;
        }
      }
      if (clash) continue;

      const newMasks = [
        currentMasks[0] | index.masks[0], currentMasks[1] | index.masks[1],
        currentMasks[2] | index.masks[2], currentMasks[3] | index.masks[3],
        currentMasks[4] | index.masks[4], currentMasks[5] | index.masks[5],
        currentMasks[6] | index.masks[6],
      ];

      currentSchedule.push({ courseCode: course.courseCode || course.course_code, index });
      dfs(courseIdx + 1, newMasks, currentSchedule);
      currentSchedule.pop();
    }
  };

  dfs(0, [0, 0, 0, 0, 0, 0, 0], []);

  if (aborted && validSchedules.length === 0) {
    return { success: false, reason: "The generator timed out while searching because there are too many complex combinations. Please try removing a course or restricting your time bounds further." };
  }

  if (validSchedules.length === 0) {
    return { success: false, reason: "Could not generate timetable. The selected courses have unavoidable clashes with each other. Try removing a course or relaxing your time bounds to free up more slots." };
  }

  const uniqueSchedules = new Map();
  for (const schedule of validSchedules) {

    let timeBlocks = [];
    for (const item of schedule) {
      for (const l of item.index.lessons) {
        timeBlocks.push(`${l.day}-${l.time}`);
      }
    }
    timeBlocks.sort();
    const hash = timeBlocks.join('|');

    if (!uniqueSchedules.has(hash)) {
      uniqueSchedules.set(hash, {
        hash,
        combinations: [schedule],
        representative: schedule
      });
    } else {
      uniqueSchedules.get(hash).combinations.push(schedule);
    }
  }

  let finalSchedules = Array.from(uniqueSchedules.values());

  const getWeightScore = (configObj, key) => {
    if (!configObj || typeof configObj !== 'object' || !configObj[key]) return 0;
    switch (configObj[key]) {
      case 'strongly_preferred': return 20;
      case 'preferred': return 10;
      case 'neutral': return 0;
      case 'not_preferred': return -10;
      case 'strongly_avoid': return -50;
      default: return 0;
    }
  };

  const calculateMetrics = (schedule) => {
    const days = { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [] };
    for (const item of schedule) {
      for (const l of item.index.lessons) {
        if (l.type && l.type.startsWith('LEC')) continue;
        if (days[l.day]) {
          const [start, end] = l.time.split('-').map(parseTime);
          days[l.day].push({ start, end });
        }
      }
    }

    let totalGaps = 0, gapCount = 0, maxDayDuration = 0, maxConsecutive = 0;

    Object.keys(days).forEach(day => {
      const lessons = days[day].sort((a, b) => a.start - b.start);
      if (lessons.length === 0) return;

      maxDayDuration = Math.max(maxDayDuration, lessons[lessons.length - 1].end - lessons[0].start);
      let consecutiveBlock = lessons[0].end - lessons[0].start;
      maxConsecutive = Math.max(maxConsecutive, consecutiveBlock);

      for (let i = 1; i < lessons.length; i++) {
        const gap = lessons[i].start - lessons[i - 1].end;
        if (gap > 0) {
          totalGaps += gap;
          gapCount++;
          consecutiveBlock = lessons[i].end - lessons[i].start;
        } else {
          consecutiveBlock += (lessons[i].end - lessons[i].start);
        }
        maxConsecutive = Math.max(maxConsecutive, consecutiveBlock);
      }
    });

    return { avgGap: gapCount > 0 ? totalGaps / gapCount : 0, maxDayDuration, maxConsecutive };
  };

  const scoreGaps = (avgGap) => {
    if (!config.gaps || typeof config.gaps !== 'object') return 0;
    if (avgGap < 1) return getWeightScore(config.gaps, '<1h');
    if (avgGap <= 2) return getWeightScore(config.gaps, '1-2h');
    if (avgGap <= 3) return getWeightScore(config.gaps, '2-3h');
    if (avgGap <= 4) return getWeightScore(config.gaps, '3-4h');
    return getWeightScore(config.gaps, '>4h');
  };

  const scoreDayDuration = (maxDayDuration) => {
    if (!config.dayDuration || typeof config.dayDuration !== 'object') return 0;
    if (maxDayDuration < 2) return getWeightScore(config.dayDuration, '<2h');
    if (maxDayDuration <= 4) return getWeightScore(config.dayDuration, '2-4h');
    if (maxDayDuration <= 6) return getWeightScore(config.dayDuration, '4-6h');
    if (maxDayDuration <= 8) return getWeightScore(config.dayDuration, '6-8h');
    return getWeightScore(config.dayDuration, '>8h');
  };

  const scoreConsecutive = (maxConsecutive) => {
    if (!config.consecutiveClasses || typeof config.consecutiveClasses !== 'object') return 0;
    if (maxConsecutive < 2) return getWeightScore(config.consecutiveClasses, '<2h');
    if (maxConsecutive <= 4) return getWeightScore(config.consecutiveClasses, '2-4h');
    if (maxConsecutive <= 6) return getWeightScore(config.consecutiveClasses, '4-6h');
    if (maxConsecutive <= 8) return getWeightScore(config.consecutiveClasses, '6-8h');
    return getWeightScore(config.consecutiveClasses, '>8h');
  };

  const scoreSchedule = (scheduleObj) => {
    const metrics = calculateMetrics(scheduleObj.representative);
    const score = scoreGaps(metrics.avgGap) + scoreDayDuration(metrics.maxDayDuration) + scoreConsecutive(metrics.maxConsecutive);
    scheduleObj.score = score;
    return score;
  };

  for (const s of finalSchedules) {
    scoreSchedule(s);
  }

  finalSchedules.sort((a, b) => b.score - a.score);

  if (finalSchedules.length === 0) {
    return { success: false, reason: "Could not generate any valid schedules after deduplication." };
  }

  const maxScore = finalSchedules[0].score;
  const topTier = finalSchedules.filter(s => s.score >= maxScore * 0.8);

  for (let i = topTier.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topTier[i], topTier[j]] = [topTier[j], topTier[i]];
  }

  finalSchedules.splice(0, topTier.length, ...topTier);

  const plans = finalSchedules.slice(0, 1).map(s => {
    const mapped = {};
    for (const item of s.representative) {
      mapped[item.courseCode] = item.index.index_number;
    }
    return {
      combinations: s.combinations,
      selectedIndexes: mapped,
      score: s.score
    };
  });

  return { success: true, plans };
};
