export const getClashingCourses = (lessons1, lessons2) => {
  if (!lessons1 || !lessons2) return null;
  const clashes = new Set();
  for (const l1 of lessons1) {
    for (const l2 of lessons2) {
      if (l1.day === l2.day && l1.time && l2.time) {
        const start1 = parseInt(l1.time.split('-')[0]);
        const end1 = parseInt(l1.time.split('-')[1]);
        const start2 = parseInt(l2.time.split('-')[0]);
        const end2 = parseInt(l2.time.split('-')[1]);
        if (start1 < end2 && end1 > start2) {
          clashes.add(l2.courseCode);
        }
      }
    }
  }
  return clashes.size > 0 ? Array.from(clashes).join(', ') : null;
};
