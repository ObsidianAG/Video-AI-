/**
 * Client-side wrapper that allows the home page (Server Component) to
 * render the interactive GenerateForm and JobList without marking the
 * entire page as 'use client'.
 */
'use client';

import { useState, useCallback } from 'react';
import { GenerateForm } from '@/components/GenerateForm';
import { JobList } from '@/components/JobComponents';

export function GeneratorSection() {
  const [latestJobId, setLatestJobId] = useState<string | undefined>();

  const handleJobCreated = useCallback((id: string) => {
    setLatestJobId(id);
  }, []);

  return (
    <div className="space-y-12">
      <GenerateForm onJobCreated={handleJobCreated} />

      {/* Recent videos */}
      <div>
        <h2 className="mb-6 text-xl font-semibold">Recent videos</h2>
        {latestJobId !== undefined ? (
          <JobList newJobId={latestJobId} />
        ) : (
          <JobList />
        )}
      </div>
    </div>
  );
}
