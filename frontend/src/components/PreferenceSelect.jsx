import React from 'react';
import { Select, Group } from '@mantine/core';

export const PreferenceSelect = ({ value, onChange, disabledValues = [] }) => {
  const data = [
    { value: 'strongly_preferred', label: 'Rank 1 (Best)', disabled: disabledValues.includes('strongly_preferred') && value !== 'strongly_preferred' },
    { value: 'preferred', label: 'Rank 2', disabled: disabledValues.includes('preferred') && value !== 'preferred' },
    { value: 'neutral', label: 'Rank 3', disabled: disabledValues.includes('neutral') && value !== 'neutral' },
    { value: 'not_preferred', label: 'Rank 4', disabled: disabledValues.includes('not_preferred') && value !== 'not_preferred' },
    { value: 'strongly_avoid', label: 'Rank 5 (Worst)', disabled: disabledValues.includes('strongly_avoid') && value !== 'strongly_avoid' },
  ];

  const getColor = (val) => {
    if (val === 'strongly_preferred') return '#51cf66';
    if (val === 'preferred') return '#fcc419';
    if (val === 'neutral') return '#adb5bd';
    if (val === 'not_preferred') return '#ff8787';
    if (val === 'strongly_avoid') return '#fa5252';
    return 'transparent';
  };

  return (
    <Select
      placeholder="Select preference"
      data={data}
      value={value || null}
      onChange={onChange}
      clearable
      styles={{
        root: { width: '180px' },
        input: { backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-color)', fontWeight: 500, fontSize: '0.85rem' },
        dropdown: { backgroundColor: 'var(--panel-bg)', borderColor: 'var(--header-border)' },
        option: { fontSize: '0.85rem' }
      }}
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getColor(option.value) }} />
          <span>{option.label}</span>
        </Group>
      )}
      leftSection={
        value ? <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getColor(value), marginLeft: 10 }} /> : null
      }
    />
  );
};
