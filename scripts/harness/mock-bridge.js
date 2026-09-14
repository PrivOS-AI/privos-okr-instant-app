/**
 * Mocked PrivOS Hub bridge for the screenshot harness. Runs in the PARENT
 * page and answers the real app-react `McpApp` transport running inside the
 * `#app` iframe: `mcpapp.context.get`, the `privos.lists.*` tool calls
 * `useOkrData` makes, and the initial `HOST_CONTEXT_CHANGED` push. Canned
 * data is pre-seeded (three lists already "created") so the screenshot
 * shows a populated board without exercising the first-run list-creation
 * path — that path has its own coverage via `ensureList`'s unit-testable
 * mapping helpers.
 */
(function () {
  var iframe = document.getElementById('app');

  var CONTEXT = {
    userId: 'user_demo',
    username: 'demo.user',
    theme: 'light',
    roomId: 'room_demo',
    roomName: 'Product Team',
    userRoles: ['member'],
  };

  var LISTS = [
    { _id: 'list_obj', key: 'okr_objectives', name: 'OKR Objectives', createdAt: '2026-06-01T00:00:00.000Z' },
    { _id: 'list_kr', key: 'okr_key_results', name: 'OKR Key Results', createdAt: '2026-06-01T00:00:00.000Z' },
    { _id: 'list_chk', key: 'okr_checkins', name: 'OKR Check-ins', createdAt: '2026-06-01T00:00:00.000Z' },
  ];

  var ITEMS_BY_LIST = {
    list_obj: [
      {
        _id: 'obj_1',
        name: 'Grow revenue 20%',
        description: 'Grow ARR from new and existing customers.',
        createdAt: '2026-07-01T00:00:00.000Z',
        customFields: [
          { fieldId: 'owner', value: 'Alice' },
          { fieldId: 'period', value: '2026-Q3' },
          { fieldId: 'status', value: 'in_progress' },
        ],
      },
      {
        _id: 'obj_2',
        name: 'Ship the v2 platform',
        description: 'Public beta launch of the rebuilt platform.',
        createdAt: '2026-07-02T00:00:00.000Z',
        customFields: [
          { fieldId: 'owner', value: 'Bob' },
          { fieldId: 'period', value: '2026-Q3' },
          { fieldId: 'status', value: 'at_risk' },
        ],
      },
      {
        _id: 'obj_3',
        name: 'Reduce churn',
        description: 'Keep monthly churn under 3%.',
        createdAt: '2026-04-01T00:00:00.000Z',
        customFields: [
          { fieldId: 'owner', value: 'Carol' },
          { fieldId: 'period', value: '2026-Q2' },
          { fieldId: 'status', value: 'done' },
        ],
      },
    ],
    list_kr: [
      {
        _id: 'kr_1',
        name: 'Close $500k in new ARR',
        createdAt: '2026-07-01T00:00:00.000Z',
        customFields: [
          { fieldId: 'objectiveId', value: 'obj_1' },
          { fieldId: 'kind', value: 'metric' },
          { fieldId: 'unit', value: '$k' },
          { fieldId: 'startValue', value: 0 },
          { fieldId: 'targetValue', value: 500 },
          { fieldId: 'currentValue', value: 300 },
          { fieldId: 'confidence', value: 'on_track' },
        ],
      },
      {
        _id: 'kr_2',
        name: 'Close 10 upsell deals',
        createdAt: '2026-07-01T00:00:01.000Z',
        customFields: [
          { fieldId: 'objectiveId', value: 'obj_1' },
          { fieldId: 'kind', value: 'metric' },
          { fieldId: 'unit', value: 'deals' },
          { fieldId: 'startValue', value: 0 },
          { fieldId: 'targetValue', value: 10 },
          { fieldId: 'currentValue', value: 4 },
          { fieldId: 'confidence', value: 'at_risk' },
        ],
      },
      {
        _id: 'kr_3',
        name: 'Launch public beta',
        createdAt: '2026-07-02T00:00:00.000Z',
        customFields: [
          { fieldId: 'objectiveId', value: 'obj_2' },
          { fieldId: 'kind', value: 'milestone' },
          { fieldId: 'unit', value: '' },
          { fieldId: 'startValue', value: 0 },
          { fieldId: 'targetValue', value: 1 },
          { fieldId: 'currentValue', value: 0 },
          { fieldId: 'confidence', value: 'off_track' },
        ],
      },
      {
        _id: 'kr_4',
        name: 'Cut churn to 3%',
        createdAt: '2026-04-01T00:00:00.000Z',
        customFields: [
          { fieldId: 'objectiveId', value: 'obj_3' },
          { fieldId: 'kind', value: 'metric' },
          { fieldId: 'unit', value: '%' },
          { fieldId: 'startValue', value: 8 },
          { fieldId: 'targetValue', value: 3 },
          { fieldId: 'currentValue', value: 3 },
          { fieldId: 'confidence', value: 'on_track' },
        ],
      },
    ],
    list_chk: [
      {
        _id: 'chk_1',
        description: 'Two new enterprise deals closed this week.',
        createdAt: '2026-07-10T00:00:00.000Z',
        customFields: [
          { fieldId: 'keyResultId', value: 'kr_1' },
          { fieldId: 'value', value: 300 },
          { fieldId: 'confidence', value: 'on_track' },
          { fieldId: 'author', value: 'alice' },
        ],
      },
    ],
  };

  function respond(target, id, result) {
    target.postMessage({ jsonrpc: '2.0', id: id, result: result }, '*');
  }

  window.addEventListener('message', function (event) {
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.jsonrpc !== '2.0' || data.id === undefined) return;
    if (data.method !== 'tools/call') return;

    var name = data.params && data.params.name;
    var args = (data.params && data.params.arguments) || {};

    if (name === 'mcpapp.context.get') {
      return respond(event.source, data.id, CONTEXT);
    }
    if (name === 'privos.lists.getAll') {
      return respond(event.source, data.id, LISTS);
    }
    if (name === 'privos.lists.getItems') {
      return respond(event.source, data.id, { items: ITEMS_BY_LIST[args.listId] || [], count: 0, offset: 0, total: 0 });
    }
    // Mutations are not exercised by the static screenshot pass; answer
    // benignly so a stray click during manual inspection does not hang.
    respond(event.source, data.id, { ok: true });
  });

  iframe.addEventListener('load', function () {
    // The Hub's first push after `ui/initialize` — carries `theme`/`username`,
    // neither of which `mcpapp.context.get` returns.
    iframe.contentWindow.postMessage({ jsonrpc: '2.0', method: 'HOST_CONTEXT_CHANGED', params: CONTEXT }, '*');
  });
})();
