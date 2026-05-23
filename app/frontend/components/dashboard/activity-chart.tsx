import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { volumeSeries } from "@/lib/data/mock";

export function ActivityChart({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-slate-400">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid h-64 grid-cols-7 items-end gap-3">
          {volumeSeries.map((point) => (
            <div key={point.label} className="flex flex-col items-center gap-3">
              <div className="flex h-52 w-full items-end gap-1">
                <div
                  className="w-1/2 rounded-t-full bg-gradient-to-t from-sky-500 to-sky-300"
                  style={{ height: `${point.payments}%` }}
                />
                <div
                  className="w-1/2 rounded-t-full bg-gradient-to-t from-fuchsia-500 to-violet-300"
                  style={{ height: `${point.volume}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">{point.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
