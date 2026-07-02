"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface AuditEntry {
  id: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit").then((res) => { setLogs(res.data); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Track system activity and changes</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{log.action} · {log.entityType}</p>
                  <p className="text-muted-foreground">{log.userName} {log.details && `· ${log.details}`}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
