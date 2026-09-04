export function AggregateCards({
  totalSets,
  totalTrainingDays,
  mostTrainedExercises,
}: {
  totalSets: number;
  totalTrainingDays: number;
  mostTrainedExercises: { exerciseId: string; name: string; setCount: number }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="border rounded p-3">
          <p className="text-2xl font-semibold">{totalSets}</p>
          <p className="text-sm text-gray-500">Sets total</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-2xl font-semibold">{totalTrainingDays}</p>
          <p className="text-sm text-gray-500">Training days</p>
        </div>
      </div>

      {mostTrainedExercises.length > 0 && (
        <div className="border rounded p-3">
          <p className="text-sm font-medium mb-2">Most trained</p>
          <div className="flex flex-col gap-1">
            {mostTrainedExercises.map((exercise) => (
              <div key={exercise.exerciseId} className="flex justify-between text-sm">
                <span>{exercise.name}</span>
                <span className="text-gray-500">{exercise.setCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
