import React, { useState, useEffect, useRef } from 'react';
import { Card, Title, Group, Button, Select, MultiSelect, ActionIcon, Text, Accordion, Stack, Badge, useMantineColorScheme, Combobox, useCombobox, TextInput, Modal } from '@mantine/core';
import { IconSearch, IconTrash, IconCertificate, IconCalendarEvent, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import CreateItemModal from './CreateItemModal';
import { getClashingCourses } from '../utils';

import { PreferenceSelect } from './PreferenceSelect';
import { CustomDropdown } from './CustomDropdown';

function ConfigPanel({ id, courseData, selectedIndexes, setSelectedIndexes, handleSelectIndex, handleRemoveCourse }) {
  const [planModalOpened, setPlanModalOpened] = useState(false);
  const [generatorModalOpened, setGeneratorModalOpened] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customAlert, setCustomAlert] = useState({ opened: false, title: '', message: '', type: 'info' });
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const showAlert = (title, message, type = 'info') => {
    setCustomAlert({ opened: true, title, message, type });
  };

  const initialPlans = (() => {
    const saved = localStorage.getItem(`${id}_plan_list`);
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter(p => p !== 'Default Generator' && p !== 'GEN1');
      if (filtered.length !== parsed.length) {
        localStorage.setItem(`${id}_plan_list`, JSON.stringify(filtered));
      }
      if (filtered.length > 0) return filtered;
    }
    return ['Plan 1'];
  })();

  const [plans, setPlans] = useState(initialPlans);
  const [selectedPlan, setSelectedPlan] = useState(initialPlans[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const [generators, setGenerators] = useState(() => {
    const saved = localStorage.getItem(`${id}_generator_list`);
    return saved ? JSON.parse(saved) : ['Default Generator'];
  });
  const [selectedGenerator, setSelectedGenerator] = useState('Default Generator');
  const [generatorSearchQuery, setGeneratorSearchQuery] = useState('');
  const [generatorConfig, setGeneratorConfig] = useState({});

  useEffect(() => {
    if (selectedGenerator) {
      const saved = localStorage.getItem(`${id}_generator_${selectedGenerator}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setGeneratorConfig({});
          } else {
            setGeneratorConfig(parsed);
          }
        } catch(_e) {
          setGeneratorConfig({});
        }
      } else {
        setGeneratorConfig({});
      }
    }
  }, [selectedGenerator, id]);

  const handleConfigChange = (key, value) => {
    const updated = { ...generatorConfig, [key]: value };
    setGeneratorConfig(updated);
    if (selectedGenerator) {
      localStorage.setItem(`${id}_generator_${selectedGenerator}`, JSON.stringify(updated));
    }
  };

  const handleConfigMatrixChange = (category, bucket, value) => {
    const updatedCategory = { ...(generatorConfig[category] || {}), [bucket]: value };
    const updated = { ...generatorConfig, [category]: updatedCategory };
    setGeneratorConfig(updated);
    if (selectedGenerator) {
      localStorage.setItem(`${id}_generator_${selectedGenerator}`, JSON.stringify(updated));
    }
  };

  const generatorCombobox = useCombobox({
    onDropdownClose: () => {
      generatorCombobox.resetSelectedOption();
      setGeneratorSearchQuery('');
    },
  });

  const isLoadingPlan = React.useRef(true);
  const activePlanRef = React.useRef(selectedPlan);

  useEffect(() => {
    activePlanRef.current = selectedPlan;
  }, [selectedPlan]);

  useEffect(() => {
    const saved = localStorage.getItem(`${id}_plan_${selectedPlan}`);
    if (saved) {
      setSelectedIndexes(JSON.parse(saved));
    }
    setTimeout(() => { isLoadingPlan.current = false; }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoadingPlan.current) {
      localStorage.setItem(`${id}_plan_${activePlanRef.current}`, JSON.stringify(selectedIndexes));
    }
  }, [selectedIndexes, id]);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearchQuery('');
    },
  });

  const handleSelectPlan = (planName) => {
    isLoadingPlan.current = true;
    setSelectedPlan(planName);
    setSearchQuery('');
    const saved = localStorage.getItem(`${id}_plan_${planName}`);
    if (saved) {
      setSelectedIndexes(JSON.parse(saved));
    } else {
      setSelectedIndexes([]);
    }
    setTimeout(() => { isLoadingPlan.current = false; }, 0);
  };

  const handleAddPlan = (newName) => {
    if (newName && !plans.includes(newName)) {
      const updated = [...plans, newName];
      setPlans(updated);
      localStorage.setItem(`${id}_plan_list`, JSON.stringify(updated));
      localStorage.setItem(`${id}_plan_${newName}`, JSON.stringify([]));
      handleSelectPlan(newName);
    }
  };

  const handleAddGenerator = (newName) => {
    if (newName && !generators.includes(newName)) {
      const updated = [...generators, newName];
      setGenerators(updated);
      setSelectedGenerator(newName);
      localStorage.setItem(`${id}_generator_list`, JSON.stringify(updated));
      localStorage.setItem(`${id}_generator_${newName}`, JSON.stringify({}));
    }
  };
  const handleDeletePlan = (e, planName) => {
    e.stopPropagation();
    if (plans.length <= 1) return;
    const updated = plans.filter(p => p !== planName);
    setPlans(updated);
    localStorage.setItem(`${id}_plan_list`, JSON.stringify(updated));
    localStorage.removeItem(`${id}_plan_${planName}`);
    if (selectedPlan === planName) {
      if (updated.length > 0) {
        handleSelectPlan(updated[0]);
      } else {
        setSelectedPlan('');
        setSelectedIndexes([]);
      }
    }
  };

  const handleDeleteGenerator = (e, generatorName) => {
    e.stopPropagation();
    if (generators.length <= 1) return;
    const updated = generators.filter(g => g !== generatorName);
    setGenerators(updated);
    localStorage.setItem(`${id}_generator_list`, JSON.stringify(updated));
    localStorage.removeItem(`${id}_generator_${generatorName}`);
    if (selectedGenerator === generatorName) {
      if (updated.length > 0) {
        setSelectedGenerator(updated[0]);
      } else {
        setSelectedGenerator('');
      }
    }
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    const selectedCourseCodes = [...new Set(selectedIndexes.map(s => s.courseCode))];
    if (selectedCourseCodes.length === 0) {
      showAlert("Missing Requirements", "Please select at least one course.", "error");
      return;
    }

    setIsGenerating(true);

    const worker = new Worker(new URL('../generator.worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      setIsGenerating(false);
      const result = event.data;

      if (!result || !result.success) {
        showAlert("Generation Failed", result?.reason || "No valid timetables could be generated with the current constraints.", "error");
        worker.terminate();
        return;
      }

      const generatedPlans = result.plans;
      if (!generatedPlans || generatedPlans.length === 0) {
        showAlert("Generation Failed", "No valid timetables could be generated with the current constraints.", "error");
        worker.terminate();
        return;
      }

      const bestPlan = generatedPlans[0];
      const newSelectedIndexes = Object.entries(bestPlan.selectedIndexes).map(([courseCode, indexNumber]) => ({
        courseCode,
        indexNumber
      }));

      setSelectedIndexes(newSelectedIndexes);

      if (selectedPlan) {
        localStorage.setItem(`${id}_plan_${selectedPlan}`, JSON.stringify(newSelectedIndexes));
        showAlert("Timetable Generated", `Successfully generated the best timetable!\n\nYour current plan '${selectedPlan}' has been updated with the new indexes.`, "success");
      } else {
        showAlert("Timetable Generated", `Successfully generated the best timetable!\n\nYour course indexes have been filled in automatically. You can save this as a new plan!`, "success");
      }

      worker.terminate();
    };

    worker.onerror = (error) => {
      setIsGenerating(false);
      showAlert("Generator Error", "An error occurred in the generator worker: " + error.message, "error");
      worker.terminate();
    };

    worker.postMessage({ courseData, selectedCourseCodes, generatorConfig });
  };

  const planOptions = plans
    .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option value={item} key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {item}
        {plans.length > 1 && (
          <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => handleDeletePlan(e, item)}>
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Combobox.Option>
    ));

  const generatorOptions = generators
    .filter((item) => item.toLowerCase().includes(generatorSearchQuery.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option value={item} key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {item}
        {generators.length > 1 && (
          <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => handleDeleteGenerator(e, item)}>
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Combobox.Option>
    ));



  return (
    <Stack gap="lg">

      <Card radius="md" style={{ backgroundColor: isDark ? '#111' : '#fff', border: isDark ? '1px solid #333' : '1px solid #e5e7eb' }}>
        <Title order={4} mb="md" style={{ color: isDark ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ backgroundColor: '#fa5252', color: 'white', width: '24px', height: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</div>
          Active Plan
        </Title>
        <CustomDropdown
          store={combobox}
          onOptionSubmit={(val) => {
            if (val === '$create') setPlanModalOpened(true);
            else handleSelectPlan(val);
          }}
          selectedValue={selectedPlan}
          placeholder="Select plan"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search plan..."
          options={planOptions}
          createLabel="New Plan"
          isDark={isDark}
        />
      </Card>

      <Card radius="md" style={{ backgroundColor: isDark ? '#111' : '#fff', border: isDark ? '1px solid #333' : '1px solid #e5e7eb' }}>
        <Group justify="space-between" mb="md">
          <Title order={4} style={{ color: isDark ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#fa5252', color: 'white', width: '24px', height: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>2</div>
            Select Courses
            <Badge color={selectedIndexes.length >= 10 ? "red" : "gray"} variant="light" ml="sm" size="sm">
              {selectedIndexes.length}/10
            </Badge>
          </Title>

        </Group>

        <div style={{ marginBottom: '1.5rem' }}>
          <MultiSelect
            placeholder={selectedIndexes.length >= 10 ? "Maximum 10 courses reached" : "Search course..."}
            maxValues={10}
            searchable
            clearable={false}
            hidePickedOptions={false}
            leftSection={<IconSearch size={16} />}
            data={courseData.map(c => {
              const hasExam = c.exam !== null;
              const cleanTitle = c.title.replace(/[*~]+$/, '').trim();
              return {
                value: c.course_code,
                label: `${c.course_code} ${cleanTitle}`,
                hasExam
              };
            })}
            renderOption={({ option, checked }) => (
              <div style={{
                display: 'grid',
                gridTemplateColumns: option.hasExam ? '1fr auto' : '1fr',
                width: '100%',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: checked ? (isDark ? '#444' : '#e9ecef') : 'transparent',
                padding: '4px 8px',
                borderRadius: '4px',
                margin: '-4px -8px'
              }}>
                <Text size="sm" fw={400} style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isDark ? '#fff' : '#000'
                }}>
                  {option.label}
                </Text>
                {option.hasExam && (
                  <div>
                    <Badge color="red" size="xs" variant="filled">
                      Exam
                    </Badge>
                  </div>
                )}
              </div>
            )}
            value={selectedIndexes.map(s => s.courseCode)}
            onChange={(newValues) => {
              const currentValues = selectedIndexes.map(s => s.courseCode);

              const added = newValues.filter(v => !currentValues.includes(v));

              const removed = currentValues.filter(v => !newValues.includes(v));

              added.forEach(courseCode => {
                handleSelectIndex(courseCode, null);
              });

              removed.forEach(courseCode => {
                handleRemoveCourse(courseCode);
              });
            }}
            styles={{
              input: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000' },
              dropdown: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb' },
              pill: { display: 'none' }
            }}
          />
        </div>

        {selectedIndexes.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" py="xl">
            No courses added. Search and select a course above to add one.
          </Text>
        )}

        {selectedIndexes.length > 0 && (
          <Stack gap="sm">
            {selectedIndexes.map(sel => {
              const course = courseData.find(c => c.course_code === sel.courseCode);
              if (!course) return null;

              const otherSelectedLessons = selectedIndexes
                .filter(s => s.courseCode !== course.course_code)
                .flatMap(s => {
                   const cData = courseData.find(cd => cd.course_code === s.courseCode);
                   if (!cData) return [];
                   const idx = cData.indexes.find(i => i.index_number === s.indexNumber);
                   if (!idx) return [];

                   return idx.lessons.map(l => ({ ...l, courseCode: s.courseCode }));
                });

              const indexOptions = course.indexes.map(idx => {
                const clashingCourses = getClashingCourses(idx.lessons, otherSelectedLessons);

                return {
                  value: idx.index_number,
                  label: clashingCourses ? `${idx.index_number} [Clashes ${clashingCourses}]` : idx.index_number,
                  disabled: !!clashingCourses
                };
              });

              const formatExam = (exam) => {
                if (!exam) return null;
                const parts = exam.date.split(' ');
                const shortDate = parts.length === 3 ? `${parts[0]} ${parts[1].substring(0,3)}` : exam.date;
                return `${shortDate}, ${exam.time}`;
              };

              return (
                <Group key={course.course_code} wrap="nowrap" justify="space-between" align="center" style={{
                  background: isDark ? 'linear-gradient(145deg, #1a1a1a 0%, #111 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                  border: isDark ? '1px solid #333' : '1px solid #e5e7eb',
                  boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.03)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  gap: '0.75rem',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}>
                  <Stack gap={6} style={{ flex: 1, overflow: 'hidden' }}>
                    <Group wrap="nowrap" gap="sm">
                      <div style={{ width: '4px', height: '16px', backgroundColor: '#ff8787', borderRadius: '4px', flexShrink: 0 }} />
                      <Text size="sm" fw={700} style={{ color: isDark ? '#fff' : '#000', flexShrink: 0, letterSpacing: '0.5px' }}>
                        {course.course_code}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {course.title.replace(/[*~]+$/, '').trim()}
                      </Text>
                    </Group>

                    <Group wrap="wrap" gap="xs" pl="md">
                      <Group gap={4} wrap="nowrap" style={{
                        backgroundColor: isDark ? 'rgba(34, 139, 230, 0.15)' : '#e7f5ff',
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        <IconCertificate size={12} color={isDark ? '#4dabf7' : '#228be6'} />
                        <Text size="10px" fw={700} c={isDark ? '#4dabf7' : '#228be6'} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {course.academic_units}
                        </Text>
                      </Group>

                      {course.exam ? (
                        <Group gap={4} wrap="nowrap" style={{
                          backgroundColor: isDark ? 'rgba(250, 82, 82, 0.15)' : '#ffe3e3',
                          border: isDark ? '1px solid rgba(250, 82, 82, 0.2)' : '1px solid #ffc9c9',
                          padding: '1px 8px',
                          borderRadius: '12px'
                        }}>
                          <IconCalendarEvent size={12} color={isDark ? '#ff8787' : '#fa5252'} />
                          <Text size="10px" fw={700} c={isDark ? '#ff8787' : '#fa5252'} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {formatExam(course.exam)}
                          </Text>
                        </Group>
                      ) : (
                        <Group gap={4} wrap="nowrap" style={{
                          backgroundColor: isDark ? '#25262b' : '#f8f9fa',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: isDark ? '1px solid #373a40' : '1px solid #e9ecef'
                        }}>
                          <Text size="10px" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            No Exam
                          </Text>
                        </Group>
                      )}
                    </Group>
                  </Stack>

                  <Group wrap="nowrap" gap="xs" style={{ flexShrink: 0 }}>
                    <Select
                      placeholder="Not Selected"
                      searchable
                      data={indexOptions}
                      value={sel.indexNumber}
                      onChange={(val) => handleSelectIndex(course.course_code, val)}
                      style={{ width: '190px' }}
                      styles={{
                        input: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000', fontSize: '0.8rem', minHeight: '30px', height: '30px', fontWeight: 600 },
                        dropdown: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb' },
                        option: { fontSize: '0.8rem' }
                      }}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemoveCourse(course.course_code)}
                      style={{ transition: 'background-color 0.2s' }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        )}
      </Card>

      <Card radius="md" style={{ backgroundColor: isDark ? '#111' : '#fff', border: isDark ? '1px solid #333' : '1px solid #e5e7eb' }}>
        <Title order={4} mb="md" style={{ color: isDark ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ backgroundColor: '#fa5252', color: 'white', width: '24px', height: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>3</div>
          Configure and Generate
        </Title>

        <CustomDropdown
          store={generatorCombobox}
          onOptionSubmit={(val) => {
            if (val === '$create') setGeneratorModalOpened(true);
            else {
              setSelectedGenerator(val);
              setGeneratorSearchQuery('');
            }
          }}
          selectedValue={selectedGenerator}
          placeholder="Select generator"
          searchQuery={generatorSearchQuery}
          setSearchQuery={setGeneratorSearchQuery}
          searchPlaceholder="Search generator..."
          options={generatorOptions}
          createLabel="New Generator"
          isDark={isDark}
        />

        <Accordion
          variant="separated"
          mb="xl"
          className="config-accordion"
          styles={{
            item: { backgroundColor: 'transparent', border: 'none', borderBottom: isDark ? '1px solid #222' : '1px solid #e5e7eb' },
            control: { padding: '1rem 0' },
            label: { color: isDark ? '#ccc' : '#444', fontSize: '0.9rem', fontWeight: 600 }
          }}
        >
          <Accordion.Item value="day-duration">
            <Accordion.Control>Day Duration</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {['<2h', '2-4h', '4-6h', '6-8h', '>8h'].map(bucket => (
                  <Group key={bucket} justify="space-between" align="center">
                    <Text size="sm">{bucket}</Text>
                    <PreferenceSelect
                      value={generatorConfig.dayDuration?.[bucket]}
                      onChange={(val) => handleConfigMatrixChange('dayDuration', bucket, val)}
                      disabledValues={Object.values(generatorConfig.dayDuration || {})}
                    />
                  </Group>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="consecutive">
            <Accordion.Control>Consecutive Classes Duration</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {['<2h', '2-4h', '4-6h', '6-8h', '>8h'].map(bucket => (
                  <Group key={bucket} justify="space-between" align="center">
                    <Text size="sm">{bucket}</Text>
                    <PreferenceSelect
                      value={generatorConfig.consecutiveClasses?.[bucket]}
                      onChange={(val) => handleConfigMatrixChange('consecutiveClasses', bucket, val)}
                      disabledValues={Object.values(generatorConfig.consecutiveClasses || {})}
                    />
                  </Group>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="gaps">
            <Accordion.Control>Gaps Between Classes Duration</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {['<1h', '1-2h', '2-3h', '3-4h', '>4h'].map(bucket => (
                  <Group key={bucket} justify="space-between" align="center">
                    <Text size="sm">{bucket}</Text>
                    <PreferenceSelect
                      value={generatorConfig.gaps?.[bucket]}
                      onChange={(val) => handleConfigMatrixChange('gaps', bucket, val)}
                      disabledValues={Object.values(generatorConfig.gaps || {})}
                    />
                  </Group>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="times">
            <Accordion.Control>Day Start and End Time</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">Start after</Text>
                  <TextInput
                    type="time"
                    value={generatorConfig.startAfter || '08:00'}
                    onChange={(e) => handleConfigChange('startAfter', e.currentTarget.value)}
                    styles={{
                      input: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000', fontWeight: 600, width: '110px', textAlign: 'center' }
                    }}
                  />
                </Group>
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">End before</Text>
                  <TextInput
                    type="time"
                    value={generatorConfig.endBefore || '17:00'}
                    onChange={(e) => handleConfigChange('endBefore', e.currentTarget.value)}
                    styles={{
                      input: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000', fontWeight: 600, width: '110px', textAlign: 'center' }
                    }}
                  />
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

        </Accordion>

        <Button
          fullWidth
          size="md"
          mb="xl"
          onClick={handleGenerate}
          disabled={selectedIndexes.length === 0 || isGenerating}
          loading={isGenerating}
          variant="filled"
          color="blue"
        >
          {isGenerating ? "Generating..." : "Generate Timetable"}
        </Button>
      </Card>

      <CreateItemModal
        opened={planModalOpened}
        onClose={() => setPlanModalOpened(false)}
        onSubmit={handleAddPlan}
        title="Create New Plan"
        placeholder="Enter name for new plan..."
        existingItems={plans}
      />

      <CreateItemModal
        opened={generatorModalOpened}
        onClose={() => setGeneratorModalOpened(false)}
        onSubmit={handleAddGenerator}
        title="Create New Generator"
        placeholder="Enter name for new generator..."
        existingItems={generators}
      />

      <Modal
        opened={customAlert.opened}
        onClose={() => setCustomAlert({ ...customAlert, opened: false })}
        title={
          <Group gap="xs">
            {customAlert.type === 'error' ? (
              <IconAlertCircle size={24} color="#fa5252" />
            ) : customAlert.type === 'success' ? (
              <IconCheck size={24} color="#40c057" />
            ) : null}
            <Text fw={700} size="lg">{customAlert.title}</Text>
          </Group>
        }
        centered
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        <Text style={{ whiteSpace: 'pre-wrap' }}>{customAlert.message}</Text>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setCustomAlert({ ...customAlert, opened: false })}>
            OK
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}

export default ConfigPanel;
