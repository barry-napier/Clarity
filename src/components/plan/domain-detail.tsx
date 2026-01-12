import type { LifeDomain } from '@/lib/memory-parser';

interface DomainDetailProps {
  domain: LifeDomain;
}

export function DomainDetail({ domain }: DomainDetailProps) {
  // Empty domain
  if (!domain.rawContent) {
    return (
      <div className="py-2">
        <p className="text-sm text-muted-foreground italic">
          No details recorded yet. Complete some check-ins and Clarity will
          learn about your {domain.name.toLowerCase()} domain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {domain.role && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Role
          </span>
          <p className="text-sm text-foreground mt-0.5">{domain.role}</p>
        </div>
      )}

      {domain.currentState && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Current State
          </span>
          <p className="text-sm text-foreground mt-0.5">{domain.currentState}</p>
        </div>
      )}

      {domain.target && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Target
          </span>
          <p className="text-sm text-foreground mt-0.5">{domain.target}</p>
        </div>
      )}

      {domain.goingWell && domain.goingWell.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Going Well
          </span>
          <ul className="mt-1 space-y-0.5">
            {domain.goingWell.map((item, i) => (
              <li key={i} className="text-sm text-foreground flex items-start">
                <span className="text-accent mr-2">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {domain.energyDrains && domain.energyDrains.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Energy Drains
          </span>
          <ul className="mt-1 space-y-0.5">
            {domain.energyDrains.map((item, i) => (
              <li key={i} className="text-sm text-foreground flex items-start">
                <span className="text-destructive mr-2">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show raw content if no structured fields were parsed */}
      {!domain.role &&
        !domain.currentState &&
        !domain.target &&
        !domain.goingWell?.length &&
        !domain.energyDrains?.length &&
        domain.rawContent && (
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {domain.rawContent}
          </div>
        )}
    </div>
  );
}
