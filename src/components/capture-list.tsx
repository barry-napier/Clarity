import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaptureItem } from './capture-item';

export function CaptureList() {
  const newCaptures = useLiveQuery(
    () => db.captures.where('status').equals('new').reverse().sortBy('createdAt'),
    []
  );

  const doneCaptures = useLiveQuery(
    () => db.captures.where('status').equals('done').reverse().sortBy('createdAt'),
    []
  );

  const newCount = newCaptures?.length ?? 0;
  const doneCount = doneCaptures?.length ?? 0;

  return (
    <Tabs defaultValue="new" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="new" className="flex-1 gap-1.5">
          New
          {newCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {newCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="done" className="flex-1 gap-1.5">
          Done
          {doneCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {doneCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="new">
        {newCaptures === undefined ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : newCaptures.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No captures yet. Add one above!
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {newCaptures.map((capture) => (
              <CaptureItem key={capture.id} capture={capture} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="done">
        {doneCaptures === undefined ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : doneCaptures.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No completed captures yet.
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {doneCaptures.map((capture) => (
              <CaptureItem key={capture.id} capture={capture} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
