import {
  Combobox,
  ComboboxDropdown,
  ComboboxDropdownTarget,
  ComboboxEmpty,
  ComboboxEventsTarget,
  ComboboxFooter,
  ComboboxOption,
  ComboboxOptions,
  type MantineSize,
  Pill,
  PillGroup,
  PillsInput,
  PillsInputField,
  useCombobox,
} from '@mantine/core';
import clsx from 'clsx';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useDataTableFiltersContext } from './DataTableFilters.context';
import { type DataTableResolvedFilter, getDefaultDatePresets, mergeOptions } from './filters/config';
import { formatFilterCondition } from './filters/format';
import {
  conditionToText,
  foldText,
  getFilterSearchTerm,
  isLiteralCommaPosition,
  parseFilterInput,
} from './filters/syntax';
import { useStableCallback } from './hooks';
import { IconCheck } from './icons/IconCheck';
import { IconLock } from './icons/IconLock';
import type { DataTableFilterCondition, DataTableFilterOperator, DataTableFilterOption } from './types';

type Suggestion = {
  id: string;
  label: string;
  hint?: string;
  conditions: DataTableFilterCondition[];
  toggle?: boolean;
  checked?: boolean;
};

const SHOW_ALL = '__show_all__';
const TEXT_VARIANTS: DataTableFilterOperator[] = ['contains', 'equals', 'startsWith', 'endsWith'];
const RANGE_VARIANTS: DataTableFilterOperator[] = ['equals', 'gt', 'gte', 'lt', 'lte'];

const sameCondition = (a: DataTableFilterCondition, b: DataTableFilterCondition) =>
  a.operator === b.operator && !!a.negate === !!b.negate && JSON.stringify(a.value) === JSON.stringify(b.value);

export type DataTableFilterInputApi = {
  setText: (text: string) => void;
};

export type DataTableFilterInputProps = {
  apiRef?: React.Ref<DataTableFilterInputApi>;
  filter: DataTableResolvedFilter;
  conditions: DataTableFilterCondition[];
  lockedConditions: DataTableFilterCondition[] | undefined;
  onChange: (conditions: DataTableFilterCondition[]) => void;
  size: MantineSize;
  variant: 'popover' | 'row';
  withinPortal: boolean;
  autoFocus?: boolean;
  openOnFocus?: boolean;
  onEscape?: () => void;
};

export function DataTableFilterInput({
  apiRef,
  filter,
  conditions,
  lockedConditions,
  onChange,
  size,
  variant,
  withinPortal,
  autoFocus,
  openOnFocus = true,
  onEscape,
}: DataTableFilterInputProps) {
  const { texts, locale, knownOptions, rememberOptions } = useDataTableFiltersContext();
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState<DataTableFilterOption[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setShowAll(false);
    },
  });

  const select = filter.type === 'select' ? filter : undefined;
  const loadOptions = useStableCallback(select?.loadOptions);
  const hasLoader = !!select?.loadOptions;
  const optionsLimit = select?.optionsLimit ?? 100;
  const options = select ? mergeOptions(select.options, knownOptions[filter.key], loaded) : undefined;
  const context = { texts, locale, options };
  const query = search.trim();
  const searchTerm = getFilterSearchTerm(query);
  const optionQuery = searchTerm.term.trim();
  const dropdownOpened = combobox.dropdownOpened;

  useEffect(() => {
    if (!hasLoader || !dropdownOpened) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(
      () => {
        loadOptions(optionQuery, controller.signal).then(
          (result) => {
            if (controller.signal.aborted) return;
            setLoaded(result);
            setLoading(false);
            rememberOptions(filter.key, result);
          },
          () => {
            if (!controller.signal.aborted) setLoading(false);
          }
        );
      },
      optionQuery ? 250 : 0
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hasLoader, dropdownOpened, optionQuery, loadOptions, rememberOptions, filter.key]);

  const editing = editingIndex !== null && editingIndex < conditions.length ? editingIndex : null;
  const others = editing === null ? conditions : conditions.filter((_, i) => i !== editing);
  const isActive = (candidate: DataTableFilterCondition) => others.some((c) => sameCondition(c, candidate));
  const describe = (condition: DataTableFilterCondition) => formatFilterCondition(condition, filter, context);
  const allowed = (operator: DataTableFilterOperator) => filter.operators.includes(operator);
  const matchesOption = (condition: DataTableFilterCondition) =>
    !!options &&
    ((condition.operator === 'equals' && options.some((option) => option.value === condition.value)) ||
      (condition.operator === 'empty' && options.some((option) => option.value === null)));

  const parsed = query ? parseFilterInput(query, filter, context) : undefined;
  const suggestions: Suggestion[] = [];
  let hiddenCount = 0;

  const addToggle = (id: string, label: string, condition: DataTableFilterCondition, hint?: string) =>
    suggestions.push({ id, label, hint, conditions: [condition], toggle: true, checked: isActive(condition) });

  const addOptions = (list: DataTableFilterOption[]) => {
    const visible = showAll ? list : list.slice(0, optionsLimit);
    hiddenCount = list.length - visible.length;
    visible.forEach((option, i) => {
      const condition: DataTableFilterCondition =
        option.value === null ? { operator: 'empty' } : { operator: 'equals', value: option.value };
      addToggle(
        `o${i}`,
        option.label ?? String(option.value),
        condition,
        option.count === undefined ? undefined : String(option.count)
      );
    });
  };

  if (!query) {
    if (options) addOptions(options);
    if (filter.type === 'boolean') {
      addToggle('true', texts.yes, { operator: 'equals', value: true });
      addToggle('false', texts.no, { operator: 'equals', value: false });
    }
    if (filter.type === 'date' && filter.presets !== false) {
      (filter.presets ?? getDefaultDatePresets(texts)).forEach((preset, i) => {
        const description = describe(preset.condition);
        addToggle(
          `p${i}`,
          preset.label,
          preset.condition,
          foldText(description) === foldText(preset.label) ? undefined : description
        );
      });
    }
    if (allowed('empty') && !options?.some((option) => option.value === null)) {
      addToggle('empty', texts.empty, { operator: 'empty' });
      addToggle('not-empty', texts.notEmpty, { operator: 'empty', negate: true });
    }
  } else if (parsed) {
    // Options only apply plain text; with a negation or operator, the typed condition is suggested instead.
    if (options && searchTerm.plain) {
      const folded = foldText(optionQuery);
      addOptions(options.filter((option) => foldText(option.label ?? String(option.value)).includes(folded)));
    }
    if (!parsed.error && parsed.conditions.length > 1) {
      suggestions.push({
        id: 'all',
        label: texts.addConditions(parsed.conditions.length),
        hint: parsed.conditions.map(describe).join(', '),
        conditions: parsed.conditions,
      });
    } else if (!parsed.error && parsed.conditions.length === 1) {
      const [condition] = parsed.conditions;
      const plain =
        !condition.negate &&
        condition.operator === filter.defaultOperator &&
        !/^[!=<>≥≤≠]/.test(query) &&
        !/[*?"]/.test(query);
      const variants =
        filter.type === 'number' || filter.type === 'duration' || filter.type === 'date'
          ? RANGE_VARIANTS
          : TEXT_VARIANTS;
      const candidates: DataTableFilterCondition[] = [condition];
      if (plain && condition.operator !== 'empty' && condition.operator !== 'between') {
        for (const operator of variants) {
          if (operator !== condition.operator && allowed(operator)) {
            candidates.push({ operator, value: condition.value });
          }
        }
        candidates.push({ ...condition, negate: true });
      }
      if (!matchesOption(condition)) {
        candidates.forEach((candidate, i) => {
          suggestions.push({ id: `c${i}`, label: describe(candidate), conditions: [candidate] });
        });
      }
    }
  }

  const error = parsed?.error && !suggestions.length ? parsed.error : undefined;
  const firstSuggestion = suggestions[0];

  // Keep the first suggestion selected while typing so Enter applies it. The store object changes identity
  // on every render, so depending on it would undo arrow-key navigation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (query && dropdownOpened) combobox.selectFirstOption();
  }, [query, dropdownOpened]);

  const stopEditing = () => {
    setEditingIndex(null);
    setSearch('');
  };

  const commit = (suggestion: Suggestion | undefined) => {
    if (!suggestion) return;
    const added = suggestion.conditions.filter((s) => !isActive(s));
    if (editing !== null) {
      onChange([...conditions.slice(0, editing), ...added, ...conditions.slice(editing + 1)]);
    } else if (suggestion.toggle && suggestion.checked) {
      onChange(conditions.filter((c) => !suggestion.conditions.some((s) => sameCondition(c, s))));
    } else if (added.length) {
      onChange([...conditions, ...added]);
    }
    stopEditing();
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
    if (editing !== null && index < editing) setEditingIndex(editing - 1);
  };

  const handleOptionSubmit = (value: string) => {
    if (value === SHOW_ALL) {
      setShowAll(true);
      return;
    }
    commit(suggestions.find((suggestion) => suggestion.id === value));
    combobox.resetSelectedOption();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && query && (!dropdownOpened || combobox.getSelectedOptionIndex() === -1)) {
      event.preventDefault();
      commit(firstSuggestion);
    } else if (event.key === ',' && query && !isLiteralCommaPosition(search)) {
      event.preventDefault();
      if (dropdownOpened && combobox.getSelectedOptionIndex() !== -1) combobox.clickSelectedOption();
      else commit(firstSuggestion);
    } else if (event.key === 'Backspace' && !search && editing !== null) {
      removeCondition(editing);
      setEditingIndex(null);
    } else if (event.key === 'Backspace' && !search && conditions.length) {
      removeCondition(conditions.length - 1);
    } else if (event.key === 'Escape') {
      if (dropdownOpened) {
        event.preventDefault();
        combobox.closeDropdown();
      } else {
        stopEditing();
        onEscape?.();
      }
    }
  };

  const handleBlur = () => {
    combobox.closeDropdown();
    const typed = parsed && !parsed.error ? parsed.conditions : [];
    // A select keeps partial text that still matches options, as committing it would add a custom value;
    // a value no option matches is committed like on Enter.
    const offersOptions = suggestions.some((suggestion) => suggestion.toggle);
    if (typed.length && (!select || !offersOptions || typed.every(matchesOption))) {
      commit({ id: 'typed', label: '', conditions: typed });
    } else if (editing !== null) {
      stopEditing();
    }
  };

  useImperativeHandle(apiRef, () => ({
    setText: (text: string) => {
      setEditingIndex(null);
      setSearch(text);
      inputRef.current?.focus();
      combobox.openDropdown();
    },
  }));

  const editCondition = (index: number) => {
    setEditingIndex(index);
    setSearch(conditionToText(conditions[index], filter, options));
    inputRef.current?.focus();
    combobox.openDropdown();
  };

  const placeholder =
    conditions.length || lockedConditions?.length ? undefined : (filter.placeholder ?? texts.placeholder);
  const showDropdown = !!(error || suggestions.length || loading || hiddenCount);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSubmit}
      withinPortal={withinPortal}
      size={size}
      position="bottom-start"
      classNames={{ dropdown: 'mantine-datatable-filter-dropdown' }}
    >
      <ComboboxDropdownTarget>
        <PillsInput
          size={size}
          className={clsx('mantine-datatable-filter-input', {
            'mantine-datatable-filter-input-row': variant === 'row',
          })}
          error={error ? true : undefined}
          onClick={() => combobox.openDropdown()}
        >
          <PillGroup className="mantine-datatable-filter-input-pills">
            {lockedConditions?.map((condition, i) => (
              <Pill
                key={`locked-${i}`}
                size={size}
                className="mantine-datatable-filter-pill"
                data-locked
                title={`${describe(condition)} · ${texts.locked}`}
              >
                <IconLock /> {describe(condition)}
              </Pill>
            ))}
            {conditions.map((condition, i) => {
              if (i === editing) return null;
              const label = describe(condition);
              return (
                <Pill
                  key={`${i}-${label}`}
                  size={size}
                  className="mantine-datatable-filter-pill"
                  data-negate={condition.negate || undefined}
                  title={label}
                  withRemoveButton
                  onRemove={() => removeCondition(i)}
                  removeButtonProps={{ 'aria-label': texts.removeCondition(label) }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!(event.target as HTMLElement).closest('button')) editCondition(i);
                  }}
                >
                  {label}
                </Pill>
              );
            })}
            <ComboboxEventsTarget>
              <PillsInputField
                ref={inputRef}
                value={search}
                placeholder={placeholder}
                aria-label={texts.editFilter(filter.label)}
                data-autofocus={autoFocus || undefined}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  combobox.openDropdown();
                }}
                onFocus={openOnFocus ? () => combobox.openDropdown() : undefined}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            </ComboboxEventsTarget>
          </PillGroup>
        </PillsInput>
      </ComboboxDropdownTarget>

      <ComboboxDropdown hidden={!showDropdown}>
        <ComboboxOptions className="mantine-datatable-filter-options">
          {error ? (
            <ComboboxEmpty className="mantine-datatable-filter-error">{error}</ComboboxEmpty>
          ) : (
            suggestions.map((suggestion) => (
              <ComboboxOption
                key={suggestion.id}
                value={suggestion.id}
                active={suggestion.checked}
                className="mantine-datatable-filter-option"
              >
                <span className="mantine-datatable-filter-option-check">
                  {suggestion.checked ? <IconCheck /> : null}
                </span>
                <span className="mantine-datatable-filter-option-label">{suggestion.label}</span>
                {suggestion.hint ? (
                  <span className="mantine-datatable-filter-option-hint">{suggestion.hint}</span>
                ) : null}
              </ComboboxOption>
            ))
          )}
          {hiddenCount > 0 && !error ? (
            <ComboboxOption value={SHOW_ALL} className="mantine-datatable-filter-option-show-all">
              {texts.showAll(hiddenCount + optionsLimit)}
            </ComboboxOption>
          ) : null}
          {loading && !error ? <ComboboxEmpty>{texts.loading}</ComboboxEmpty> : null}
          {!loading && !error && !suggestions.length && select ? (
            <ComboboxEmpty>{texts.noOptions}</ComboboxEmpty>
          ) : null}
        </ComboboxOptions>
        {query && !error ? (
          <ComboboxFooter className="mantine-datatable-filter-hint">{texts.hint}</ComboboxFooter>
        ) : null}
      </ComboboxDropdown>
    </Combobox>
  );
}
