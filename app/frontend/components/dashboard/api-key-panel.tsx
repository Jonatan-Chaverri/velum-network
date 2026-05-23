import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiKeys } from "@/lib/data/mock";

export function ApiKeyPanel() {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>API credentials</CardTitle>
            <p className="mt-2 text-sm text-slate-400">
              API keys provide confidential payment execution capabilities.
            </p>
          </div>
          <Button>Create API Key</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Store runtime credentials in a secure secret manager and scope permissions per agent.
        </div>
        {apiKeys.map((key) => (
          <div
            key={key.name}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-medium text-white">{key.name}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span>Last used: {key.lastUsed}</span>
                  <span>Expiration: {key.expiration}</span>
                </div>
                <div className="mt-3">
                  <Badge>{key.permissions}</Badge>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rotate
                </Button>
                <Button variant="secondary" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
