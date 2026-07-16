import React from 'react';
import { Container, Title, Text, Button, Center, Stack, Box, Group, Badge } from '@mantine/core';
import { IconArrowRight, IconWand } from '@tabler/icons-react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <Container size="lg" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Center style={{ flex: 1, marginTop: '120px', marginBottom: '60px' }}>
          <Stack align="center" gap="lg" style={{ textAlign: 'center', maxWidth: '850px' }}>

            <Badge
              variant="light"
              color="blue"
              size="lg"
              radius="xl"
              mb="sm"
              leftSection={<IconWand size={14} />}
            >
              AutoSTARS — Instant timetable generation.
            </Badge>

            <Title
              order={1}
              style={{
                fontSize: '4.8rem',
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: '-2px',
                color: 'var(--text-color)',
                position: 'relative',
                zIndex: 1
              }}
            >
              Skip the STARS stress. <br/>
              Build your timetable in <Text span variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 45 }} style={{ textShadow: '0 0 40px rgba(6, 182, 212, 0.4)' }} inherit>
                seconds.
              </Text>
            </Title>

            <Text c="dimmed" size="xl" mt="md" mb="xl" style={{ maxWidth: '600px', lineHeight: 1.6 }}>
              Your F5 key deserves a break. Making STARS feel less like a boss fight. AutoSTARS intelligently generates the perfect, conflict-free schedule instantly.
            </Text>

            <Group mt="xl">
              <Button
                size="xl"
                radius="xl"
                onClick={onGetStarted}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
                rightSection={<IconArrowRight size={20} />}
                style={{ transition: 'transform 0.2s' }}
              >
                Generate Timetable
              </Button>
            </Group>
          </Stack>
        </Center>

        <Box style={{ paddingBottom: '2rem', textAlign: 'center' }}>
          <Text size="md" fw={500} style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
            "Less clicking. More studying."
          </Text>
          <Text c="dimmed" size="xs">
            Built for NTU Students. Not affiliated with Nanyang Technological University.
          </Text>
        </Box>
      </Container>
    </>
  );
};

export default LandingPage;
