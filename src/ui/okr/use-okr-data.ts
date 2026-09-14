import { useCallback, useEffect, useState } from 'react';
import { parseToolResult, usePrivosApp } from '@privos_ai/app-react';
import type { McpApp } from '@privos_ai/app-react';

import { toCheckIn, toKeyResult, toObjective, objectiveCustomFields, keyResultCustomFields, checkInCustomFields } from './list-mapping';
import type { RawListItem } from './list-mapping';
import { OKR_LIST_DEFINITIONS } from './schema';
import type { ListDefinition } from './schema';
import type { CheckIn, Confidence, KeyResult, KeyResultKind, Objective, ObjectiveStatus } from './types';

interface RawList {
  _id: string;
  key?: string;
  name: string;
  createdAt?: string;
}

async function callTool<T>(app: McpApp, name: string, args: Record<string, unknown>): Promise<T> {
  const result = await app.callServerTool({ name, arguments: args });
  return parseToolResult(result) as T;
}

/**
 * Finds this app's list by its stable `key`, creating it on first use if the
 * room does not have it yet.
 *
 * ponytail: two tabs opening a brand-new room at the same instant can both
 * miss the list and both create one — a benign race (the older list wins,
 * see `pickCanonical` below), not a data-loss bug. Upgrade path: a
 * server-side idempotent "create if absent" list tool, if this is ever hit
 * in practice.
 */
async function ensureList(app: McpApp, roomId: string, existingLists: readonly RawList[], def: ListDefinition): Promise<string> {
  const matches = existingLists.filter((list) => list.key === def.key);
  if (matches.length > 0) return pickCanonical(matches)._id;
  const created = await callTool<{ list: { _id: string } }>(app, 'privos.lists.create', {
    roomId,
    name: def.name,
    key: def.key,
    description: def.description,
    fieldDefinitions: def.fieldDefinitions,
  });
  return created.list._id;
}

/** The oldest list wins a create race, so every tab converges on the same id. */
function pickCanonical(lists: readonly RawList[]): RawList {
  return [...lists].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))[0]!;
}

interface ListIds {
  objectives: string;
  keyResults: string;
  checkins: string;
}

const ITEMS_PAGE_SIZE = 100;

async function fetchAllItems(app: McpApp, listId: string): Promise<RawListItem[]> {
  const response = await callTool<{ items: RawListItem[] }>(app, 'privos.lists.getItems', {
    listId,
    count: ITEMS_PAGE_SIZE,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  return response.items ?? [];
}

export interface OkrData {
  loading: boolean;
  error: Error | null;
  /** False once `lists:write` is confirmed unavailable — hides mutation UI instead of letting every call fail. */
  canWrite: boolean;
  objectives: Objective[];
  keyResults: KeyResult[];
  checkIns: CheckIn[];
  refetch: () => void;
  createObjective: (input: { title: string; description: string; owner: string; period: string; status: ObjectiveStatus }) => Promise<void>;
  updateObjective: (id: string, input: { title: string; description: string; owner: string; period: string; status: ObjectiveStatus }) => Promise<void>;
  createKeyResult: (input: {
    objectiveId: string;
    title: string;
    kind: KeyResultKind;
    unit: string;
    startValue: number;
    targetValue: number;
    currentValue: number;
  }) => Promise<void>;
  recordCheckIn: (input: { keyResultId: string; note: string; value: number; confidence: Confidence; author: string }) => Promise<void>;
}

/**
 * Owns this app's three PrivOS Lists end to end: finds-or-creates them on
 * first use in this room, loads their items, maps them into typed records,
 * and exposes the mutations the UI needs. Every mutation refetches rather
 * than patching state optimistically — simplest correct behavior for lists
 * this small; add optimistic updates if a room's OKR book ever grows large
 * enough for the refetch round-trip to be felt.
 */
export function useOkrData(roomId: string): OkrData {
  const app = usePrivosApp();
  const [listIds, setListIds] = useState<ListIds | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [canWrite, setCanWrite] = useState(true);
  const [generation, setGeneration] = useState(0);

  const refetch = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const allLists = await callTool<RawList[]>(app, 'privos.lists.getAll', { roomId });
        const ids: ListIds = {
          objectives: await ensureList(app, roomId, allLists, OKR_LIST_DEFINITIONS[0]),
          keyResults: await ensureList(app, roomId, allLists, OKR_LIST_DEFINITIONS[1]),
          checkins: await ensureList(app, roomId, allLists, OKR_LIST_DEFINITIONS[2]),
        };
        if (cancelled) return;
        setListIds(ids);

        const [objectiveItems, keyResultItems, checkInItems] = await Promise.all([
          fetchAllItems(app, ids.objectives),
          fetchAllItems(app, ids.keyResults),
          fetchAllItems(app, ids.checkins),
        ]);
        if (cancelled) return;
        setObjectives(objectiveItems.map(toObjective));
        setKeyResults(keyResultItems.map(toKeyResult));
        setCheckIns(checkInItems.map(toCheckIn));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, roomId, generation]);

  const requireListIds = useCallback((): ListIds => {
    if (!listIds) throw new Error('OKR lists are not loaded yet');
    return listIds;
  }, [listIds]);

  const guardedWrite = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
        refetch();
      } catch (err) {
        // A permission-shaped failure (the optional lists:write grant was
        // declined) degrades the board to read-only instead of surfacing a
        // dead-end error on every click.
        const message = err instanceof Error ? err.message : String(err);
        if (/permission|scope|forbidden|denied/i.test(message)) setCanWrite(false);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [refetch],
  );

  const createObjective: OkrData['createObjective'] = useCallback(
    (input) =>
      guardedWrite(async () => {
        const ids = requireListIds();
        await callTool(app, 'privos.lists.createItem', {
          listId: ids.objectives,
          title: input.title,
          description: input.description,
          customFields: objectiveCustomFields(input),
        });
      }),
    [app, guardedWrite, requireListIds],
  );

  const updateObjective: OkrData['updateObjective'] = useCallback(
    (id, input) =>
      guardedWrite(async () => {
        await callTool(app, 'privos.lists.updateItem', {
          itemId: id,
          title: input.title,
          description: input.description,
          customFields: objectiveCustomFields(input),
        });
      }),
    [app, guardedWrite],
  );

  const createKeyResult: OkrData['createKeyResult'] = useCallback(
    (input) =>
      guardedWrite(async () => {
        const ids = requireListIds();
        await callTool(app, 'privos.lists.createItem', {
          listId: ids.keyResults,
          title: input.title,
          customFields: keyResultCustomFields({ ...input, confidence: 'on_track' }),
        });
      }),
    [app, guardedWrite, requireListIds],
  );

  const recordCheckIn: OkrData['recordCheckIn'] = useCallback(
    (input) =>
      guardedWrite(async () => {
        const ids = requireListIds();
        await callTool(app, 'privos.lists.createItem', {
          listId: ids.checkins,
          title: `Check-in — ${new Date(Date.now()).toISOString().slice(0, 10)}`,
          description: input.note,
          customFields: checkInCustomFields(input),
        });
        await callTool(app, 'privos.lists.updateItem', {
          itemId: input.keyResultId,
          customFields: [
            { fieldId: 'currentValue', value: input.value },
            { fieldId: 'confidence', value: input.confidence },
          ],
        });
      }),
    [app, guardedWrite, requireListIds],
  );

  return { loading, error, canWrite, objectives, keyResults, checkIns, refetch, createObjective, updateObjective, createKeyResult, recordCheckIn };
}
