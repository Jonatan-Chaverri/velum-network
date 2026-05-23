import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activity } from "@/lib/data/mock";

export function ActivityTable() {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-4 font-medium">Sender</th>
              <th className="pb-4 font-medium">Receiver</th>
              <th className="pb-4 font-medium">Encrypted amount</th>
              <th className="pb-4 font-medium">Status</th>
              <th className="pb-4 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {activity.map((item) => (
              <tr key={`${item.sender}-${item.timestamp}`}>
                <td className="py-4 text-white">{item.sender}</td>
                <td className="py-4 text-slate-300">{item.receiver}</td>
                <td className="py-4 text-slate-300">{item.amount}</td>
                <td className="py-4">
                  <Badge>{item.status}</Badge>
                </td>
                <td className="py-4 text-slate-500">{item.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
