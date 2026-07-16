import React, { useState, useEffect } from 'react';
import { Container, Title, Grid, Card, Text, Button, Group, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconTrash, IconCalendarEvent, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const TimetableList = () => {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState([]);
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  useEffect(() => {
    const loadedTimetables = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const itemStr = localStorage.getItem(key);
        const item = JSON.parse(itemStr);

        if (item && item.name && (item.subjects !== undefined || item.indexes !== undefined)) {
          loadedTimetables.push({
            id: key,
            name: item.name,
            courseCount: item.indexes ? item.indexes.length : 0,
            subjectCount: item.subjects ? item.subjects.length : 0
          });
        }
      } catch (_e) {

      }
    }
    setTimetables(loadedTimetables);
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();

    localStorage.removeItem(id);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(id + '_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    setTimetables(timetables.filter(t => t.id !== id));
  };

  return (
    <Container size="md" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
      <Group justify="space-between" mb="xl">
        <Title order={1} style={{ color: 'var(--text-color)', fontSize: '2rem' }}>
          Your Timetables
        </Title>
        <Button
          variant={dark ? "white" : "filled"}
          color="dark"
          onClick={() => navigate('/setup')}
        >
          Create New
        </Button>
      </Group>

      {timetables.length === 0 ? (
        <Text c="dimmed" style={{ textAlign: 'center', marginTop: '50px' }}>
          You don't have any saved timetables yet.
        </Text>
      ) : (
        <Grid>
          {timetables.map((t) => (
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={t.id}>
              <Card
                h="100%"
                shadow="md"
                padding="xl"
                radius="lg"
                withBorder
                onClick={() => navigate(`/timetable/${t.id}`)}
                style={{
                  cursor: 'pointer',
                  background: dark ? 'linear-gradient(145deg, #1f2127 0%, #141517 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                  borderColor: dark ? '#2c2e33' : '#e5e7eb',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = dark ? '0 12px 30px rgba(0, 0, 0, 0.4)' : '0 12px 30px rgba(51, 154, 240, 0.15)';
                  e.currentTarget.style.borderColor = dark ? '#4dabf7' : '#339af0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = dark ? '#2c2e33' : '#e5e7eb';
                }}
              >

                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #339af0 0%, #b197fc 100%)'
                }} />

                <Group wrap="nowrap" align="flex-start" gap="md" mb="xl" mt="xs">
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: dark ? 'rgba(51, 154, 240, 0.15)' : 'rgba(51, 154, 240, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconCalendarEvent size={28} color={dark ? '#74c0fc' : '#228be6'} stroke={1.5} />
                  </div>

                  <div style={{ flex: 1, marginTop: '2px' }}>
                    <Text fw={800} size="xl" style={{ color: dark ? '#fff' : '#111', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                      {t.name}
                    </Text>
                  </div>
                </Group>

                <Group gap="xl" mb="xl">
                  <div>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" ls={1}>Courses</Text>
                    <Text size="xl" fw={800} style={{ color: dark ? '#e9ecef' : '#343a40' }}>{t.courseCount}</Text>
                  </div>
                  <div>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" ls={1}>Programs</Text>
                    <Text size="xl" fw={800} style={{ color: dark ? '#e9ecef' : '#343a40' }}>{t.subjectCount}</Text>
                  </div>
                </Group>

                <Group justify="space-between" align="center" mt="auto">
                  <Button
                    variant="filled"
                    color="blue"
                    size="sm"
                    radius="md"
                    rightSection={<IconArrowRight size={16} />}
                    style={{ fontWeight: 600 }}
                  >
                    Open Timetable
                  </Button>
                  <ActionIcon
                    variant="light"
                    color="red"
                    size="lg"
                    radius="md"
                    onClick={(e) => handleDelete(t.id, e)}
                    title="Delete Timetable"
                  >
                    <IconTrash size={20} />
                  </ActionIcon>
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default TimetableList;
