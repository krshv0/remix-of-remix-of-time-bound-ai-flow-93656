/**
 * Video Generation Page
 * HunyuanVideo generation with session management
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut, Moon, Sun, ChevronLeft, ChevronRight, Clock,
  Video, Play, Download, RefreshCw, Loader2, AlertCircle,
  Sparkles, Film
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useTheme } from "@/components/chat-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VideoGeneration {
  id: string;
  prompt: string;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  resolution: string | null;
  model_used: string | null;
  generation_time_seconds: number | null;
  retry_count: number;
  error_message: string | null;
  num_frames: number;
  fps: number;
  created_at: string;
  completed_at: string | null;
}

export default function VideoGenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsSidebarOpen, setStatsSidebarOpen] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Generation state
  const [prompt, setPrompt] = useState("");
  const [numFrames, setNumFrames] = useState("49");
  const [fps, setFps] = useState("8");
  const [generating, setGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState("generate");

  // Videos
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
  const [galleryFilter, setGalleryFilter] = useState("all");

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load session
  const loadSession = useCallback(async (sessionId?: string) => {
    if (!user) return;
    try {
      let query = (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('session_type', 'video');

      if (sessionId) {
        query = query.eq('id', sessionId).single();
      } else {
        query = query.order('created_at', { ascending: false }).limit(1).single();
      }

      const { data, error } = await query;
      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        toast({ title: "No Active Video Session", description: "Purchase a video session from the dashboard.", variant: "destructive" });
        navigate('/dashboard');
        return;
      }

      setActiveSession(data);
    } catch (error: any) {
      console.error('Error loading session:', error);
      navigate('/dashboard');
    }
  }, [user, toast, navigate]);

  useEffect(() => {
    if (user) loadSession(location.state?.sessionId);
  }, [user, location.state?.sessionId, loadSession]);

  // Load videos
  const loadVideos = useCallback(async () => {
    if (!user || !activeSession) return;
    const { data } = await (supabase as any)
      .from('video_generations')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', activeSession.id)
      .order('created_at', { ascending: false });
    if (data) setVideos(data);
  }, [user, activeSession]);

  useEffect(() => {
    if (activeSession) loadVideos();
  }, [activeSession, loadVideos]);

  // Timer
  useEffect(() => {
    if (!activeSession || activeSession.status === 'expired') return;
    const updateTimer = () => {
      const diff = new Date(activeSession.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining("Expired");
        (supabase as any).from('user_sessions').update({ status: 'expired' }).eq('id', activeSession.id);
        toast({ title: "Session Expired", variant: "destructive" });
        navigate('/dashboard');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${h}h ${m}m ${s}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession, toast, navigate]);

  // Generate video
  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10 || prompt.length > 500) {
      toast({ title: "Invalid Prompt", description: "Prompt must be 10-500 characters.", variant: "destructive" });
      return;
    }

    if (!activeSession || (activeSession.videos_remaining || 0) <= 0) {
      toast({ title: "No Videos Remaining", description: "Purchase more videos to continue.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    toast({ title: "Video generation started!", description: "This may take up to 2 minutes." });

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: prompt.trim(),
          sessionId: activeSession.id,
          numFrames: parseInt(numFrames),
          fps: parseInt(fps),
        },
      });

      if (error) throw error;

      if (data?.status === 'completed') {
        toast({ title: "Video Generated!", description: "Your video is ready to view." });
        setPrompt("");
        setCurrentTab("gallery");
      } else if (data?.status === 'processing') {
        toast({ title: "Processing", description: data.message || "Video is being generated..." });
      } else if (data?.status === 'failed') {
        toast({ title: "Generation Failed", description: data.error || "Please try again.", variant: "destructive" });
      }

      // Refresh session and videos
      await loadSession(activeSession.id);
      await loadVideos();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ title: "Error", description: error.message || "Failed to generate video", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Retry
  const handleRetry = async (videoId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { action: 'retry', videoId },
      });
      if (error) throw error;
      toast({ title: "Retrying...", description: "Video generation has been restarted." });
      await loadVideos();
    } catch (error: any) {
      toast({ title: "Retry Failed", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Download
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Download Failed", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || !activeSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const videosRemaining = activeSession.videos_remaining || 0;
  const videosGenerated = activeSession.videos_generated || 0;
  const filteredVideos = galleryFilter === 'all' ? videos : videos.filter(v => v.status === galleryFilter);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0" onClick={() => navigate('/dashboard')} type="button">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-medium tracking-tight hidden sm:inline">AI Video Studio</span>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="h-8 px-3 text-muted-foreground hover:text-foreground">Dashboard</Button>
              <Button variant="ghost" size="sm" className="h-8 px-3 bg-primary/10 text-foreground">Video Studio</Button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5">
              <Video className="w-3 h-3" />
              {videosRemaining} videos left
            </Badge>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <span className="text-xs text-muted-foreground hidden lg:inline px-2 py-1 bg-muted rounded-md">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-3">
              <LogOut className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={cn("flex-1 flex flex-col transition-all duration-300", statsSidebarOpen ? "mr-80" : "mr-0")}>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="generate" className="gap-2"><Sparkles className="w-4 h-4" /> Generate</TabsTrigger>
                <TabsTrigger value="gallery" className="gap-2"><Film className="w-4 h-4" /> My Videos ({videos.length})</TabsTrigger>
              </TabsList>
            </div>

            {/* Generate Tab */}
            <TabsContent value="generate" className="flex-1 flex items-center justify-center p-6 mt-0">
              <div className="w-full max-w-2xl space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold">Generate AI Video</h2>
                  <p className="text-muted-foreground text-sm">Describe your video and let HunyuanVideo bring it to life</p>
                </div>

                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe your video in detail... (e.g., 'A serene sunset over calm ocean waves with seagulls flying')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                    disabled={generating}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{prompt.length}/500 characters</span>
                    {prompt.length > 0 && prompt.length < 10 && <span className="text-destructive">Minimum 10 characters</span>}
                  </div>

                  {/* Advanced Options */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Frames</label>
                      <Select value={numFrames} onValueChange={setNumFrames}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="49">49 frames (~2s)</SelectItem>
                          <SelectItem value="81">81 frames (~3s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">FPS</label>
                      <Select value={fps} onValueChange={setFps}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8 fps (smooth)</SelectItem>
                          <SelectItem value="24">24 fps (cinematic)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim() || prompt.length < 10 || videosRemaining <= 0}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Video... (~45 seconds)
                      </>
                    ) : videosRemaining <= 0 ? (
                      'No Videos Remaining'
                    ) : (
                      <>
                        <Video className="w-5 h-5 mr-2" />
                        Generate Video
                      </>
                    )}
                  </Button>

                  {videosRemaining <= 2 && videosRemaining > 0 && (
                    <p className="text-center text-sm text-warning">
                      Only {videosRemaining} video{videosRemaining > 1 ? 's' : ''} remaining!{' '}
                      <button className="underline text-foreground" onClick={() => navigate('/dashboard')}>Buy more</button>
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="flex-1 flex flex-col mt-0 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <span className="text-sm font-medium">Filter:</span>
                {['all', 'completed', 'failed', 'processing'].map(f => (
                  <Button
                    key={f}
                    variant={galleryFilter === f ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs capitalize"
                    onClick={() => setGalleryFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>

              <ScrollArea className="flex-1">
                {filteredVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Film className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No videos yet</p>
                    <Button variant="link" onClick={() => setCurrentTab('generate')}>Generate your first video</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredVideos.map((video) => (
                      <Card key={video.id} className="overflow-hidden group cursor-pointer hover:border-foreground/30 transition-colors" onClick={() => setSelectedVideo(video)}>
                        <div className="aspect-video bg-muted relative flex items-center justify-center">
                          {video.status === 'completed' && video.video_url ? (
                            <video src={video.video_url} className="w-full h-full object-cover" muted preload="metadata" />
                          ) : video.status === 'processing' || video.status === 'pending' ? (
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          ) : (
                            <AlertCircle className="w-8 h-8 text-destructive" />
                          )}
                          <Badge className={cn("absolute top-2 right-2 text-xs", 
                            video.status === 'completed' ? 'bg-green-500/80' : 
                            video.status === 'failed' ? 'bg-destructive/80' : 'bg-warning/80'
                          )}>
                            {video.status}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm truncate font-medium">{video.prompt}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(video.created_at), 'MMM d, h:mm a')}
                            {video.generation_time_seconds && ` • ${video.generation_time_seconds}s`}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Selected Video Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
            <div className="bg-background rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {selectedVideo.status === 'completed' && selectedVideo.video_url ? (
                <video src={selectedVideo.video_url} controls autoPlay className="w-full rounded-t-xl" />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-muted rounded-t-xl">
                  {selectedVideo.status === 'failed' ? (
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive">{selectedVideo.error_message || 'Generation failed'}</p>
                    </div>
                  ) : (
                    <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="p-4 space-y-3">
                <p className="font-medium">{selectedVideo.prompt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(selectedVideo.created_at), 'MMM d, yyyy h:mm a')}</span>
                  {selectedVideo.generation_time_seconds && <span>• Generated in {selectedVideo.generation_time_seconds}s</span>}
                  {selectedVideo.resolution && <span>• {selectedVideo.resolution}</span>}
                </div>
                <div className="flex gap-2">
                  {selectedVideo.status === 'completed' && selectedVideo.video_url && (
                    <Button size="sm" onClick={() => handleDownload(selectedVideo.video_url!, `video-${selectedVideo.id}.mp4`)}>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  )}
                  {selectedVideo.status === 'failed' && selectedVideo.retry_count < 3 && (
                    <Button size="sm" variant="outline" onClick={() => { handleRetry(selectedVideo.id); setSelectedVideo(null); }} disabled={generating}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Retry ({3 - selectedVideo.retry_count} left)
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedVideo(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Sidebar */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 w-80 border-l bg-background transition-transform duration-300",
          statsSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="h-full flex flex-col p-4 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Session Stats
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium text-sm">HunyuanVideo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium text-sm capitalize">{activeSession.plan_id?.replace('video-', '')}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Time Remaining</p>
                  <p className="font-medium text-sm">{timeRemaining}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">Videos Used</span>
                  <span className="font-medium text-xs">{videosGenerated} / {videosGenerated + videosRemaining}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((videosGenerated / Math.max(videosGenerated + videosRemaining, 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{videosRemaining} videos remaining</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium">Quick Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Be descriptive about motion and scene</li>
                  <li>• 49 frames ≈ 2s, 81 frames ≈ 3s</li>
                  <li>• Failed videos can be retried 3 times</li>
                </ul>
              </div>
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Toggle */}
        <Button
          variant="outline" size="icon"
          className={cn("absolute top-4 z-10 h-8 w-8 rounded-full shadow-lg transition-all duration-300", statsSidebarOpen ? "right-[21rem]" : "right-4")}
          onClick={() => setStatsSidebarOpen(!statsSidebarOpen)}
        >
          {statsSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
