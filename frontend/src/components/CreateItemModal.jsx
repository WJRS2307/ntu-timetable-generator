import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, useMantineColorScheme } from '@mantine/core';

export default function CreateItemModal({ opened, onClose, onSubmit, title, placeholder, existingItems }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (opened) {
      setValue('');
      setError('');
    }
  }, [opened]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }
    if (existingItems && existingItems.includes(trimmed)) {
      setError('This name already exists');
      return;
    }
    onSubmit(trimmed);
    setValue('');
    setError('');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      styles={{
        content: { backgroundColor: isDark ? '#1a1a1a' : '#fff', border: isDark ? '1px solid #333' : '1px solid #e5e7eb' },
        header: { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
        title: { color: isDark ? '#fff' : '#000', fontWeight: 600 }
      }}
    >
      <TextInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => { setValue(e.currentTarget.value); setError(''); }}
        error={error}
        data-autofocus
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        mb="md"
        styles={{
          input: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000' }
        }}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose} style={{ backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000' }}>Cancel</Button>
        <Button onClick={handleSubmit} style={{ backgroundColor: '#fa5252' }}>Create</Button>
      </Group>
    </Modal>
  );
}
