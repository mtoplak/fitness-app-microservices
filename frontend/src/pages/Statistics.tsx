import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Activity, TrendingUp } from "lucide-react";

interface EndpointStat {
  count: number;
  endpoint: string;
}

interface MostFrequentResponse {
  endpoint: string;
  count: number;
}

interface LastCalledResponse {
  endpoint: string;
  timestamp: string;
}

export default function Statistics() {
  const [callsPerEndpoint, setCallsPerEndpoint] = useState<EndpointStat[]>([]);
  const [mostFrequent, setMostFrequent] = useState<MostFrequentResponse | null>(null);
  const [lastCalled, setLastCalled] = useState<LastCalledResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const STATS_API_BASE = "https://stats.vuk-papic.com";

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all statistics in parallel
      const [callsResponse, frequentResponse, lastResponse] = await Promise.all([
        fetch(`${STATS_API_BASE}/stats/calls-per-endpoint`),
        fetch(`${STATS_API_BASE}/stats/most-frequent`),
        fetch(`${STATS_API_BASE}/stats/last-called`)
      ]);

      if (!callsResponse.ok) {
        throw new Error("Failed to fetch endpoint statistics");
      }

      const callsData = await callsResponse.json();
      setCallsPerEndpoint(callsData);

      if (frequentResponse.ok) {
        const frequentData = await frequentResponse.json();
        setMostFrequent(frequentData);
      }

      if (lastResponse.ok) {
        const lastData = await lastResponse.json();
        setLastCalled(lastData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTotalCalls = () => {
    return callsPerEndpoint.reduce((sum, stat) => sum + stat.count, 0);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading statistics: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">API Statistics</h1>
          <p className="text-muted-foreground mt-2">
            Real-time analytics for API endpoint usage
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalCalls().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {callsPerEndpoint.length} endpoints
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mostFrequent ? mostFrequent.count.toLocaleString() : "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {mostFrequent ? mostFrequent.endpoint : "No data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Called</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {lastCalled ? lastCalled.endpoint : "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastCalled ? formatTimestamp(lastCalled.timestamp) : "No data"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Call Statistics</CardTitle>
            <CardDescription>
              Number of calls per endpoint, sorted by popularity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callsPerEndpoint.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No statistics available
                    </TableCell>
                  </TableRow>
                ) : (
                  callsPerEndpoint.map((stat, index) => {
                    const percentage = ((stat.count / getTotalCalls()) * 100).toFixed(1);
                    return (
                      <TableRow key={stat.endpoint}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {stat.endpoint}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{stat.count.toLocaleString()}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {percentage}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
