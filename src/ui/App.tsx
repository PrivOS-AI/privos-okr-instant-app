import { useState } from 'react';
import { PrivosAppProvider, usePrivosContext } from '@privos_ai/app-react';

import { ObjectiveDetail } from './okr/ObjectiveDetail';
import { OverviewBoard } from './okr/OverviewBoard';
import { useOkrData } from './okr/use-okr-data';

function Dashboard() {
  const ctx = usePrivosContext();
  const data = useOkrData(ctx.roomId);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);

  if (!ctx.roomId) {
    return (
      <div className="okr-app">
        <p className="okr-empty">Open this app from inside a PrivOS room to load its OKR board.</p>
      </div>
    );
  }

  if (data.loading) {
    return (
      <div className="okr-app">
        <p role="status">Loading OKR board…</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="okr-app">
        <p role="alert" className="okr-error">
          Could not load this room's OKR board: {data.error.message}
        </p>
        <button type="button" onClick={data.refetch}>
          Retry
        </button>
      </div>
    );
  }

  const selectedObjective = selectedObjectiveId ? data.objectives.find((o) => o._id === selectedObjectiveId) : undefined;

  return (
    <div className="okr-app">
      <h1>OKR Goals Book</h1>
      {!data.canWrite && (
        <p className="okr-readonly-note" role="status">
          Read-only mode: this installation does not have permission to create or edit records.
        </p>
      )}
      {selectedObjective ? (
        <ObjectiveDetail
          objective={selectedObjective}
          keyResults={data.keyResults.filter((kr) => kr.objectiveId === selectedObjective._id)}
          checkIns={data.checkIns}
          canWrite={data.canWrite}
          onBack={() => setSelectedObjectiveId(null)}
          onUpdateObjective={(values) => data.updateObjective(selectedObjective._id, values)}
          onCreateKeyResult={(values) => data.createKeyResult({ ...values, objectiveId: selectedObjective._id })}
          onRecordCheckIn={(keyResultId, values) =>
            data.recordCheckIn({ keyResultId, note: values.note, value: values.value, confidence: values.confidence, author: ctx.username || ctx.userId })
          }
        />
      ) : (
        <OverviewBoard
          objectives={data.objectives}
          keyResults={data.keyResults}
          canWrite={data.canWrite}
          onSelectObjective={setSelectedObjectiveId}
          onCreateObjective={data.createObjective}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <PrivosAppProvider>
      <Dashboard />
    </PrivosAppProvider>
  );
}
