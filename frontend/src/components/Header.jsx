import React from 'react';
import { Group, Text, Flex, Box, Button, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconSparkles, IconSun, IconMoon, IconPlus } from '@tabler/icons-react';

const Header = ({ onHomeClick, onTimetableClick }) => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'var(--bg-color)',
        borderBottom: '1px solid var(--header-border)',
        transition: 'background-color 0.2s, border-color 0.2s'
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        px="xl"
        py="sm"
        style={{ width: '100%', margin: '0 auto' }}
      >
        <Group gap="xl">
          <Group gap="xs" style={{ cursor: 'pointer' }} onClick={onHomeClick}>
            <IconSparkles size={24} color="#60a5fa" />
            <Text size="xl" fw={900} variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 45 }}>
              AutoSTARS
            </Text>
          </Group>
        </Group>

        <Group>
          <ActionIcon
            variant="subtle"
            color={dark ? "gray" : "dark"}
            size="lg"
            radius="md"
            onClick={() => toggleColorScheme()}
            style={{ transition: 'background 0.2s' }}
          >
            {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
          <Button
            variant={dark ? "white" : "filled"}
            color="dark"
            radius="md"
            style={{ fontWeight: 600 }}
            onClick={onTimetableClick}
          >
            Timetable
          </Button>
        </Group>
      </Flex>
    </Box>
  );
};

export default Header;
