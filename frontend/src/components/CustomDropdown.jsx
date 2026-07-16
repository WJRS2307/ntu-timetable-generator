import React from 'react';
import { Combobox, InputBase } from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';

export function CustomDropdown({
  store,
  onOptionSubmit,
  selectedValue,
  placeholder,
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  options,
  createLabel,
  isDark
}) {
  return (
    <Combobox
      store={store}
      onOptionSubmit={(val) => {
        onOptionSubmit(val);
        store.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => store.toggleDropdown()}
          rightSectionPointerEvents="none"
          mb="lg"
          styles={{ input: { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb', color: isDark ? '#fff' : '#000', fontWeight: 600 } }}
        >
          {selectedValue || <InputBase.Placeholder>{placeholder}</InputBase.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown style={{ backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#e5e7eb' }}>
        <Combobox.Search
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          styles={{ input: { backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa', borderColor: isDark ? '#333' : '#e5e7eb', color: isDark ? '#fff' : '#000' } }}
        />
        <Combobox.Options>
          {options.length > 0 ? options : <Combobox.Empty>Nothing found</Combobox.Empty>}

          <div style={{ borderTop: isDark ? '1px solid #333' : '1px solid #e5e7eb', marginTop: '4px', paddingTop: '4px' }}>
            <Combobox.Option value="$create" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <IconPlus size={16} />
              {createLabel}
            </Combobox.Option>
          </div>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
