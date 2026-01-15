import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, MousePointerClick, TrendingUp, Loader2, Save, Copy, Check, 
  Info, Code2, Sparkles, RefreshCw, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'https://trust-flow-app.vercel.app';

// --- KPI Card Component ---
const KPICard = ({ title, value, icon: Icon, color, loading, subtitle }) => {
  const colorStyles = {
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl border ${colorStyles[color] || colorStyles.violet}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Chart Tooltip ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 min-w-[140px]">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Component ---
const CTADashboardTab = ({ spaceId }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  const [copied, setCopied] = useState(false);
  
  // Analytics Data
  const [analytics, setAnalytics] = useState({
    impressions: 0,
    conversions: 0,
    ctr: 0
  });
  const [chartData, setChartData] = useState([]);
  
  // CTA Config
  const [ctaSelector, setCtaSelector] = useState('');
  const [configTab, setConfigTab] = useState('easy');

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/analytics/${spaceId}?range=${dateRange}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setAnalytics(data.summary);
        setChartData(data.chart_data || []);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics', {
        description: 'Please try again later.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [spaceId, dateRange]);

  // Fetch CTA Selector
  const fetchCTASelector = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/spaces/${spaceId}/cta`);
      const data = await response.json();
      
      if (data.status === 'success' && data.cta_selector) {
        setCtaSelector(data.cta_selector);
      }
    } catch (error) {
      console.error('Error fetching CTA selector:', error);
    }
  }, [spaceId]);

  // Save CTA Selector
  const saveCTASelector = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/spaces/${spaceId}/cta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cta_selector: ctaSelector || null })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        toast.success('CTA selector saved!', {
          description: 'Conversion tracking will now use this selector.'
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving CTA selector:', error);
      toast.error('Failed to save CTA selector');
    } finally {
      setSaving(false);
    }
  };

  // Copy to Clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Effects
  useEffect(() => {
    fetchAnalytics();
    fetchCTASelector();
  }, [fetchAnalytics, fetchCTASelector]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, fetchAnalytics]);

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Transform chart data for display
  const formattedChartData = chartData.map(item => ({
    ...item,
    date: formatDate(item.date)
  }));

  return (
    <div className="space-y-6">
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            ROI Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track widget performance and conversion metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Total Views"
          value={analytics.impressions.toLocaleString()}
          icon={Eye}
          color="violet"
          loading={loading}
          subtitle="Widget Impressions"
        />
        <KPICard
          title="Total Clicks"
          value={analytics.conversions.toLocaleString()}
          icon={MousePointerClick}
          color="emerald"
          loading={loading}
          subtitle="CTA Conversions"
        />
        <KPICard
          title="Click-Through Rate"
          value={`${analytics.ctr}%`}
          icon={TrendingUp}
          color="amber"
          loading={loading}
          subtitle="CTR"
        />
      </div>

      {/* --- Chart Section --- */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Performance Over Time</CardTitle>
          <CardDescription>
            Daily breakdown of views and conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : formattedChartData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground">No data available yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analytics will appear once your widget receives traffic
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  name="Views"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorImpressions)"
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  name="Clicks"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorConversions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* --- CTA Configuration Section --- */}
      <Card className="bg-white border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Conversion Tracking Setup
          </CardTitle>
          <CardDescription>
            Configure which button clicks to track as conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={configTab} onValueChange={setConfigTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="easy" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Easy Method
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            {/* Easy Method Tab */}
            <TabsContent value="easy" className="space-y-4">
              <Alert className="bg-violet-50 border-violet-200">
                <Info className="h-4 w-4 text-violet-600" />
                <AlertDescription className="text-violet-800">
                  Simply add this attribute to any button or link you want to track. No CSS knowledge required!
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Add this attribute to your CTA button:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm border">
                    data-tf-conversion="true"
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard('data-tf-conversion="true"')}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm font-medium mb-2">Example:</p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-sm overflow-x-auto">
{`<button data-tf-conversion="true" class="your-cta-btn">
  Get Started Free
</button>`}
                </pre>
              </div>
            </TabsContent>

            {/* Advanced Method Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Use a custom CSS selector to track specific elements. This overrides the easy method.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="cta-selector" className="text-sm font-medium">
                  Custom CSS Selector
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cta-selector"
                    placeholder="#signup-btn, .buy-now, [data-action='purchase']"
                    value={ctaSelector}
                    onChange={(e) => setCtaSelector(e.target.value)}
                    className="flex-1 bg-white"
                  />
                  <Button
                    onClick={saveCTASelector}
                    disabled={saving}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Examples: <code className="bg-gray-100 px-1 rounded">#signup-btn</code>, 
                  <code className="bg-gray-100 px-1 rounded ml-1">.cta-button</code>, 
                  <code className="bg-gray-100 px-1 rounded ml-1">button.primary</code>
                </p>
              </div>

              {ctaSelector && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      Active selector: <code className="bg-green-100 px-1 rounded">{ctaSelector}</code>
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* --- How It Works Section --- */}
      <Card className="bg-gradient-to-br from-violet-50 to-white border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">How Tracking Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-violet-600">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">Widget Loads</p>
                <p className="text-xs text-muted-foreground">
                  An "impression" is recorded when your widget appears on the page.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-emerald-600">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">User Clicks CTA</p>
                <p className="text-xs text-muted-foreground">
                  When a user clicks your tracked button, a "conversion" is logged.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-amber-600">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">Measure ROI</p>
                <p className="text-xs text-muted-foreground">
                  CTR shows how effective your testimonials are at driving action.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CTADashboardTab;
