"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type UploadResponse = {
  doc_id: number;
  filename: string;
  text: string;
};

type AnalysisResult = {
  type: "contract" | "invoice" | "report";
  confidence: number;
  missing_fields: { name: string; status: "missing" | "partial"; details?: string }[];
  recommendations: { text: string; priority: "critical" | "optional"; related_field?: string }[];
};

type HistoryItem = { id: number; filename: string; created_at: number };
type Stats = { documents: number; analyses: number };

export default function DocumentAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doc, setDoc] = useState<UploadResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleUpload = async () => {
    setError(null);
    setAnalysis(null);
    if (!file) {
      setError("Please choose a PDF to upload.");
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: UploadResponse = await res.json();
      setDoc(data);
      // refresh lists after successful upload
      void Promise.all([fetchHistory(), fetchStats()]);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!doc) return;
    setError(null);
    try {
      setAnalyzing(true);
      const res = await fetch(`${API_BASE}/analyze/${doc.doc_id}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
      // refresh stats after analysis
      void fetchStats();
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const missingCount = useMemo(() => analysis?.missing_fields?.length ?? 0, [analysis]);

  const authHeader = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/documents`, { headers: { ...authHeader() } });
      if (!res.ok) throw new Error("Failed to load history");
      const data: { items: HistoryItem[] } = await res.json();
      setHistory(data.items || []);
    } catch (e) {
      // no toast framework used here; keep silent to avoid noise
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`/api/stats`, { headers: { ...authHeader() } });
      if (!res.ok) throw new Error("Failed to load stats");
      const data: Stats = await res.json();
      setStats(data);
    } catch (e) {
      // silent fail
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    void Promise.all([fetchHistory(), fetchStats()]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">LLM Document Analyzer</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload a PDF, extract text, classify, and get missing fields with recommendations.</p>
          </div>
          <div className="hidden md:block">
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop" alt="desk" className="h-14 w-24 rounded-md object-cover shadow" />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Select a PDF to analyze</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button variant="secondary" onClick={() => { setFile(null); setDoc(null); setAnalysis(null); setError(null); }}>
                  Reset
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {doc && (
                <div className="text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">File:</span> {doc.filename}</p>
                  <p className="mt-1"><span className="font-medium text-foreground">Doc ID:</span> {doc.doc_id}</p>
                </div>
              )}
              <Button onClick={handleAnalyze} disabled={!doc || analyzing} className="w-full">
                {analyzing ? "Analyzing..." : "Analyze Document"}
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Extracted Text</CardTitle>
              <CardDescription>Preview of the text extracted from your PDF</CardDescription>
            </CardHeader>
            <CardContent>
              {doc ? (
                <ScrollArea className="h-[360px] rounded-md border p-3 bg-card/50">
                  <Textarea readOnly value={doc.text} className="min-h-[320px] resize-none bg-transparent" />
                </ScrollArea>
              ) : (
                <div className="h-[360px] rounded-md border grid place-items-center text-muted-foreground">
                  <p>No document uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Classification</CardTitle>
              <CardDescription>Type & confidence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase">{analysis.type}</Badge>
                    <span className="text-sm text-muted-foreground">confidence</span>
                    <span className="text-sm font-medium">{(analysis.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Missing fields detected: {missingCount}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Run analysis to see classification.</p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Missing Fields</CardTitle>
              <CardDescription>Detected missing or partial fields</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis && analysis.missing_fields && analysis.missing_fields.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.missing_fields.map((f, idx) => (
                        <TableRow key={`${f.name}-${idx}`}>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell>
                            <Badge variant={f.status === "missing" ? "destructive" : "secondary"}>{f.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{f.details || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{analysis ? "No missing fields detected." : "Run analysis to view results."}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Actionable improvements prioritized</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis && analysis.recommendations && analysis.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {analysis.recommendations.map((r, idx) => (
                  <li key={`rec-${idx}`} className="flex items-start gap-3 rounded-md border p-3 bg-card/50">
                    <div>
                      <Badge className={r.priority === "critical" ? "bg-destructive text-destructive-foreground" : ""}>
                        {r.priority}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm leading-6">{r.text}</p>
                      {r.related_field && (
                        <p className="text-xs text-muted-foreground">Field: {r.related_field}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{analysis ? "No recommendations." : "Run analysis to view recommendations."}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>Latest uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">ID</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead className="w-56">Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">Loading...</TableCell>
                      </TableRow>
                    ) : history.length > 0 ? (
                      history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-sm font-medium">{h.id}</TableCell>
                          <TableCell className="truncate text-sm">{h.filename}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(h.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">No documents yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Stats</CardTitle>
              <CardDescription>App-wide totals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingStats && <p className="text-sm text-muted-foreground">Loading...</p>}
              {stats && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-medium">{stats.documents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Analyses</span>
                    <span className="font-medium">{stats.analyses}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}