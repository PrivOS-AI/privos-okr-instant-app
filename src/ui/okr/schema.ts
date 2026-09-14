/**
 * The three PrivOS Lists this app owns, and the field definitions it creates
 * them with on first use. Field `_id`s are pinned explicitly (rather than
 * left for the server to generate) so the rest of the app can address a field
 * by a stable, human-readable key instead of re-resolving it from
 * `list.fieldDefinitions` on every read.
 */

export const OBJECTIVES_LIST_KEY = 'okr_objectives';
export const KEY_RESULTS_LIST_KEY = 'okr_key_results';
export const CHECKINS_LIST_KEY = 'okr_checkins';

export interface FieldOption {
  _id: string;
  value: string;
}

export interface FieldDefinition {
  _id: string;
  name: string;
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SELECT';
  options?: FieldOption[];
}

export interface ListDefinition {
  key: string;
  name: string;
  description: string;
  fieldDefinitions: FieldDefinition[];
}

const STATUS_OPTIONS: FieldOption[] = [
  { _id: 'not_started', value: 'Not started' },
  { _id: 'in_progress', value: 'In progress' },
  { _id: 'at_risk', value: 'At risk' },
  { _id: 'off_track', value: 'Off track' },
  { _id: 'done', value: 'Done' },
];

const CONFIDENCE_OPTIONS: FieldOption[] = [
  { _id: 'on_track', value: 'On track' },
  { _id: 'at_risk', value: 'At risk' },
  { _id: 'off_track', value: 'Off track' },
];

export const OBJECTIVES_LIST_DEFINITION: ListDefinition = {
  key: OBJECTIVES_LIST_KEY,
  name: 'OKR Objectives',
  description: 'Objectives owned by this app for the OKR Goals Book room tab.',
  fieldDefinitions: [
    { _id: 'owner', name: 'Owner', type: 'TEXT' },
    { _id: 'period', name: 'Period', type: 'TEXT' },
    { _id: 'status', name: 'Status', type: 'SELECT', options: STATUS_OPTIONS },
  ],
};

export const KEY_RESULTS_LIST_DEFINITION: ListDefinition = {
  key: KEY_RESULTS_LIST_KEY,
  name: 'OKR Key Results',
  description: 'Key results owned by this app, linked to an objective by objectiveId.',
  fieldDefinitions: [
    { _id: 'objectiveId', name: 'Objective', type: 'TEXT' },
    {
      _id: 'kind',
      name: 'Kind',
      type: 'SELECT',
      options: [
        { _id: 'metric', value: 'Metric' },
        { _id: 'milestone', value: 'Milestone' },
      ],
    },
    { _id: 'unit', name: 'Unit', type: 'TEXT' },
    { _id: 'startValue', name: 'Start value', type: 'NUMBER' },
    { _id: 'targetValue', name: 'Target value', type: 'NUMBER' },
    { _id: 'currentValue', name: 'Current value', type: 'NUMBER' },
    { _id: 'confidence', name: 'Confidence', type: 'SELECT', options: CONFIDENCE_OPTIONS },
  ],
};

export const CHECKINS_LIST_DEFINITION: ListDefinition = {
  key: CHECKINS_LIST_KEY,
  name: 'OKR Check-ins',
  description: 'Check-in history owned by this app, linked to a key result by keyResultId.',
  fieldDefinitions: [
    { _id: 'keyResultId', name: 'Key result', type: 'TEXT' },
    { _id: 'value', name: 'Recorded value', type: 'NUMBER' },
    { _id: 'confidence', name: 'Confidence', type: 'SELECT', options: CONFIDENCE_OPTIONS },
    { _id: 'author', name: 'Author', type: 'TEXT' },
  ],
};

export const OKR_LIST_DEFINITIONS = [
  OBJECTIVES_LIST_DEFINITION,
  KEY_RESULTS_LIST_DEFINITION,
  CHECKINS_LIST_DEFINITION,
] as const;
