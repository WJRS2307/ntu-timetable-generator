import { generateTimetables } from './generator.js';

self.onmessage = (event) => {
  const { courseData, selectedCourseCodes, generatorConfig } = event.data;

  try {
    const result = generateTimetables(courseData, selectedCourseCodes, generatorConfig);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      success: false,
      reason: "An unexpected error occurred during timetable generation: " + error.message
    });
  }
};
