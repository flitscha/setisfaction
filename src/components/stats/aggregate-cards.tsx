import { Card } from "@/components/ui/card";

export function AggregateCards({ totalSets, totalTrainingDays }: { totalSets: number; totalTrainingDays: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <p className="text-2xl font-semibold">{totalSets}</p>
        <p className="text-sm text-muted">Sets total</p>
      </Card>
      <Card>
        <p className="text-2xl font-semibold">{totalTrainingDays}</p>
        <p className="text-sm text-muted">Training days</p>
      </Card>
    </div>
  );
}
