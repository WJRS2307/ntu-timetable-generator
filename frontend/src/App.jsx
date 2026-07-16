import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { MultiSelect, TextInput, Button, Title, Text, Container, useMantineColorScheme, Group, Switch, Modal } from '@mantine/core';
import { IconDownload, IconCalendarDown } from '@tabler/icons-react';
import { generateICS } from './exportUtils';
import TimetableGrid from './components/TimetableGrid';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import ConfigPanel from './components/ConfigPanel';
import TimetableList from './components/TimetableList';
import './index.css';

const getCurrentSemesterString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const shortYear = year % 100;
  const nextShortYear = shortYear + 1;

  const isBeforeAug10 = now.getMonth() < 7 || (now.getMonth() === 7 && now.getDate() < 10);
  const semester = isBeforeAug10 ? '1' : '2';

  return `AY${shortYear}/${nextShortYear} Semester ${semester}`;
};

const generateId = () => Math.random().toString(36).substring(2, 10);

function PlannerScreen({ courseData, setCourseData, selectedIndexes, setSelectedIndexes, planName, setPlanName }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLectures, setShowLectures] = useState(true);

  const [icsModalOpened, setIcsModalOpened] = useState(false);

  const [icsStartDate, setIcsStartDate] = useState('2026-08-10');
  const [icsRecessWeek, setIcsRecessWeek] = useState('7');

  useEffect(() => {
    const saved = localStorage.getItem(id);
    if (!saved) {
      console.warn("Timetable ID not found in localStorage. Redirecting to setup.");
      navigate('/setup');
      return;
    }

    try {
      const data = JSON.parse(saved);
      setPlanName(data.name || 'My Timetable');
      setSelectedIndexes(data.indexes || []);

      if (courseData.length === 0 && data.subjects && data.subjects.length > 0) {
        const fetchPromises = data.subjects.map(sub => fetch(`/data/${sub.file}`).then(res => res.json()));
        Promise.all(fetchPromises)
          .then(results => {
            const combined = results.flat();
            const uniqueCourses = Array.from(new Map(combined.map(c => [c.course_code, c])).values());
            setCourseData(uniqueCourses);
            setIsInitializing(false);
          })
          .catch(err => {
            console.error("Failed to load course chunks on refresh", err);
            setIsInitializing(false);
          });
      } else {
        setIsInitializing(false);
      }
    } catch (err) {
      console.error("Failed to parse local storage data", err);
      navigate('/setup');
    }
  }, [id, courseData.length, navigate]);

  useEffect(() => {
    if (isInitializing) return;

    const saved = localStorage.getItem(id);
    if (saved) {
      const data = JSON.parse(saved);
      data.indexes = selectedIndexes;
      data.name = planName;
      localStorage.setItem(id, JSON.stringify(data));
    }
  }, [selectedIndexes, planName, id, isInitializing]);

  const handleSelectIndex = (courseCode, indexNumber) => {
    setSelectedIndexes(prev => {
      const idx = prev.findIndex(i => i.courseCode === courseCode);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { courseCode, indexNumber };
        return next;
      }
      return [...prev, { courseCode, indexNumber }];
    });
  };

  const handleRemoveCourse = (courseCode) => {
    setSelectedIndexes(selectedIndexes.filter(i => i.courseCode !== courseCode));
  };

  if (isInitializing) {
    return <div style={{ color: 'var(--text-color)', padding: '100px', textAlign: 'center' }}>Loading Timetable...</div>;
  }

  const populatedTimetable = selectedIndexes.map(sel => {
    const course = courseData.find(c => c.course_code === sel.courseCode);
    const indexData = course?.indexes.find(i => i.index_number === sel.indexNumber);
    if (!course || !indexData) return null;
    return { ...course, selectedIndexData: indexData };
  }).filter(Boolean);

  const currentSemStr = getCurrentSemesterString();

  const handleExportText = () => {
    const lines = selectedIndexes.map(item => {
      const course = courseData.find(c => c.course_code === item.courseCode);
      const title = course ? course.title : "Unknown Course";
      return `${item.courseCode} ${title} ${item.indexNumber}`;
    });
    const textContent = lines.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${planName || 'Timetable'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportICS = () => {
    if (!populatedTimetable || populatedTimetable.length === 0) return;

    const icsContent = generateICS(populatedTimetable, icsStartDate, icsRecessWeek);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${planName || 'Timetable'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setIcsModalOpened(false);
  };

  return (
    <div className="planner-layout">

      <div className="calendar-toolbar" style={{ gridColumn: '1', gridRow: '1', marginBottom: 0 }}>
        <div>
          <Text size="sm" c="dimmed">{currentSemStr}</Text>
          <Title order={1} style={{ color: 'var(--text-color)', fontSize: '2rem', marginTop: '0.25rem' }}>
            {planName}
          </Title>
        </div>
        <Group>
          <Switch
            label="Show Lectures"
            checked={showLectures}
            onChange={(event) => setShowLectures(event.currentTarget.checked)}
            color="blue"
            size="md"
          />
          <Button
            variant="default"
            leftSection={<IconCalendarDown size={16} />}
            onClick={() => setIcsModalOpened(true)}
          >
            Export ICS
          </Button>
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={handleExportText}
          >
            Export Text
          </Button>
        </Group>
      </div>

      <div className="planner-left-col" style={{ gridColumn: '1', gridRow: '2' }}>

        <TimetableGrid
          populatedTimetable={populatedTimetable}
          courseData={courseData}
          selectedIndexes={selectedIndexes}
          handleSelectIndex={handleSelectIndex}
          showLectures={showLectures}
        />
      </div>

      <div className="planner-right-col" style={{ gridColumn: '2', gridRow: '2' }}>
        <ConfigPanel
          id={id}
          courseData={courseData}
          selectedIndexes={selectedIndexes}
          setSelectedIndexes={setSelectedIndexes}
          handleSelectIndex={handleSelectIndex}
          handleRemoveCourse={handleRemoveCourse}
        />
      </div>

      <Modal
        opened={icsModalOpened}
        onClose={() => setIcsModalOpened(false)}
        title={<Title order={3}>Export as .ics</Title>}
        centered
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        <Text size="sm" c="dimmed" mb="md">
          To generate an accurate calendar file, we need a start date. Pick the Monday of Week 1 for your semester.
        </Text>
        <TextInput
          label="Semester Start Date (Monday of Week 1)"
          type="date"
          value={icsStartDate}
          onChange={(e) => setIcsStartDate(e.currentTarget.value)}
          mb="md"
        />
        <TextInput
          label="Recess Week Number"
          type="number"
          description="If your semester has a recess week (usually Week 7), we will skip it when generating dates. Clear this if you don't have one."
          value={icsRecessWeek}
          onChange={(e) => setIcsRecessWeek(e.currentTarget.value)}
          mb="xl"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setIcsModalOpened(false)}>Cancel</Button>
          <Button color="blue" onClick={handleExportICS}>Download .ics</Button>
        </Group>
      </Modal>

    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  const currentSemStr = getCurrentSemesterString();

  const [subjectCatalog, setSubjectCatalog] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [planName, setPlanName] = useState(`My ${currentSemStr} Timetable`);
  const [isLoading, setIsLoading] = useState(false);

  const [courseData, setCourseData] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState([]);

  useEffect(() => {
    fetch('/data/subjects.json')
      .then(res => res.json())
      .then(data => setSubjectCatalog(data))
      .catch(err => console.error("Could not load subjects catalog:", err));
  }, []);

  const handleLoadPlanner = async () => {
    if (selectedSubjects.length === 0) return;

    setIsLoading(true);

    try {

      const fetchPromises = selectedSubjects.map(filename => {
        return fetch(`/data/${filename}`).then(res => res.json());
      });
      const results = await Promise.all(fetchPromises);
      const combined = results.flat();
      const uniqueCourses = Array.from(new Map(combined.map(c => [c.course_code, c])).values());
      setCourseData(uniqueCourses);

      const id = generateId();

      const fullSubjectsData = selectedSubjects.map(filename => {
         const catalogItem = subjectCatalog.find(s => s.file === filename);
         return catalogItem || { file: filename, name: filename };
      });

      const payload = {
        name: planName,
        subjects: fullSubjectsData,
        indexes: []
      };

      localStorage.setItem(id, JSON.stringify(payload));

      setSelectedIndexes([]);

      navigate(`/timetable/${id}`);
    } catch (err) {
      console.error("Failed to load chunks", err);
    } finally {
      setIsLoading(false);
    }
  };

  const subjectOptions = subjectCatalog.map(subject => ({
    value: subject.file,
    label: subject.name
  }));

  return (
    <>
      <Header onHomeClick={() => navigate('/')} onTimetableClick={() => navigate('/timetables')} />

      <Routes>
        <Route path="/" element={<LandingPage onGetStarted={() => navigate('/setup')} />} />
        <Route path="/timetables" element={<TimetableList />} />

        <Route path="/setup" element={
          <Container size="md" style={{ paddingTop: '100px' }}>
            <Title order={1} mb="xl" style={{ color: 'var(--text-color)', fontSize: '1.75rem' }}>
              Create Timetable - {currentSemStr}
            </Title>

            <MultiSelect
              label={
                <Group justify="space-between" mb="xs">
                  <Text fw={600} size="md" style={{ color: 'var(--text-color)' }}>
                    What programs are you in this semester? (i.e. Major, Minor, Scholar program)
                  </Text>
                  <Text size="sm" fw={600} style={{ color: selectedSubjects.length === 5 ? 'var(--danger-color)' : 'var(--text-color)', opacity: 0.8 }}>
                    {selectedSubjects.length}/5
                  </Text>
                </Group>
              }
              placeholder="No Program Specified"
              data={subjectOptions}
              value={selectedSubjects}
              onChange={setSelectedSubjects}
              maxValues={5}
              searchable
              clearable
              size="lg"
              radius="md"
              mb="xl"
              description="Some course indexes are reserved for programs. This helps us filter down what indexes are available to you."
              styles={{
                input: {
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-color)',
                  transition: 'border-color 0.2s',
                  '&:focus, &:focusWithin, &[dataFocused]': {
                    borderColor: 'var(--input-border) !important',
                    boxShadow: 'none !important',
                    outline: 'none !important'
                  }
                },
                dropdown: {
                  backgroundColor: 'var(--panel-bg)',
                  borderColor: 'var(--header-border)',
                },
                pill: {
                  backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--header-border)'
                }
              }}
            />

            <TextInput
              label={
                <Text fw={600} size="md" mb="xs" style={{ color: 'var(--text-color)' }}>
                  Timetable Name
                </Text>
              }
              value={planName}
              onChange={(e) => setPlanName(e.currentTarget.value)}
              size="lg"
              radius="md"
              mb="xl"
              styles={{
                input: {
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-color)',
                  transition: 'border-color 0.2s',
                  '&:focus, &:focusWithin, &[dataFocused]': {
                    borderColor: 'var(--input-border) !important',
                    boxShadow: 'none !important',
                    outline: 'none !important'
                  }
                }
              }}
            />

            <Button
              size="md"
              radius="md"
              variant={dark ? "white" : "filled"}
              color="dark"
              onClick={handleLoadPlanner}
              disabled={selectedSubjects.length === 0 || isLoading}
              loading={isLoading}
              style={{ fontWeight: 600, marginTop: '0.5rem' }}
            >
              Create
            </Button>
          </Container>
        } />

        <Route path="/timetable/:id" element={
          <PlannerScreen
            courseData={courseData}
            setCourseData={setCourseData}
            selectedIndexes={selectedIndexes}
            setSelectedIndexes={setSelectedIndexes}
            planName={planName}
            setPlanName={setPlanName}
          />
        } />
      </Routes>
    </>
  );
}

export default App;
