'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientOnly } from '@/components/shared/ClientOnly';
import type { VehicleProfile } from '@/types/bms';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Battery,
  Zap,
  Thermometer,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { useShallow } from 'zustand/react/shallow';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { DEFAULT_VEHICLE_PROFILE } from '@/constants/thresholds';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function VehiclePage() {
  const { liveData } = useBMSData();
  const vehicleProfile = useBMSStore((state) => state.vehicleProfile);
  const setVehicleProfile = useBMSStore((state) => state.setVehicleProfile);
  const history = useBMSStore((state) => state.history);

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(vehicleProfile);

  const isLoading = !liveData;

  // Calculate nominal energy
  const nominalEnergy = useMemo(() => {
    return vehicleProfile.nominalVoltage * vehicleProfile.capacityAh;
  }, [vehicleProfile]);

  // Estimated charge time
  const estimatedChargeTime = useMemo(() => {
    const chargeCurrent = vehicleProfile.capacityAh * 0.5;
    return vehicleProfile.capacityAh / chargeCurrent;
  }, [vehicleProfile]);

  // Lifetime statistics from history
  const lifetimeStats = useMemo(() => {
    if (history.length === 0) return null;

    const totalSessions = new Set(
      history.map((h) => Math.floor(h.recordedAt / 3600000))
    ).size;

    const totalWh = history.reduce((sum, h) => sum + h.Power / 3600, 0);

    const highestTemp = history.reduce((max, h) => h.Temperature > max ? h.Temperature : max, -Infinity);
    const lowestVoltage = history.reduce((min, h) => h.Voltage < min ? h.Voltage : min, Infinity);

    const durations: number[] = [];
    let sessionStart = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i].Current > 0.5 && sessionStart === 0) {
        sessionStart = history[i].recordedAt;
      } else if (history[i].Current <= 0.5 && sessionStart > 0) {
        durations.push(history[i].recordedAt - sessionStart);
        sessionStart = 0;
      }
    }
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000
      : 0;

    const efficiencies = history
      .map((h) => h.efficiency)
      .filter((e): e is number => typeof e === 'number' && e > 0);
    const bestEfficiency = efficiencies.length > 0
      ? Math.max(...efficiencies)
      : 0;

    return {
      totalSessions,
      totalWh,
      highestTemp,
      lowestVoltage,
      avgDuration,
      bestEfficiency,
    };
  }, [history]);

  const handleSave = () => {
    setVehicleProfile(formData);
    setEditMode(false);
    toast.success('Vehicle profile updated');
  };

  const handleCancel = () => {
    setFormData(vehicleProfile);
    setEditMode(false);
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AppHeader />

        <main className="flex-1 overflow-auto pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <ClientOnly fallback={<div className="flex flex-1 items-center justify-center p-12"><span className="animate-pulse text-muted-foreground">Loading vehicle profile...</span></div>}>
            <div className="container max-w-6xl mx-auto p-4 space-y-6">
              {/* Page Title */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Vehicle Profile</h1>
                  <p className="text-sm text-muted-foreground">
                    Battery specifications and lifetime statistics
                  </p>
                </div>
                {!editMode ? (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Vehicle Identity Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle Identity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <SkeletonCard variant="list" />
                  ) : editMode ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="make">Make</Label>
                        <Input
                          id="make"
                          value={formData.make}
                          onChange={(e) =>
                            setFormData({ ...formData, make: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) =>
                            setFormData({ ...formData, model: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="voltage">Nominal Voltage (V)</Label>
                        <Input
                          id="voltage"
                          type="number"
                          value={formData.nominalVoltage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nominalVoltage: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacity">Capacity (Ah)</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={formData.capacityAh}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              capacityAh: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batteryType">Battery Type</Label>
                        <Select
                          value={formData.batteryType}
                          onValueChange={(value: typeof formData.batteryType) =>
                            setFormData({ ...formData, batteryType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead-acid">Lead Acid</SelectItem>
                            <SelectItem value="lifepo4">LiFePO4</SelectItem>
                            <SelectItem value="li-ion">Li-Ion</SelectItem>
                            <SelectItem value="nimh">NiMH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fullCharge">Full Charge Voltage (V)</Label>
                        <Input
                          id="fullCharge"
                          type="number"
                          value={formData.fullChargeVoltage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fullChargeVoltage: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minSafe">Min Safe Voltage (V)</Label>
                        <Input
                          id="minSafe"
                          type="number"
                          value={formData.minSafeVoltage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              minSafeVoltage: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxSafeTemp">Max Safe Temp (°C)</Label>
                        <Input
                          id="maxSafeTemp"
                          type="number"
                          value={formData.maxSafeTemp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxSafeTemp: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Make / Model</p>
                        <p className="text-lg font-semibold">
                          {vehicleProfile.make} {vehicleProfile.model}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Battery Type</p>
                        <Badge variant="outline" className="text-sm">
                          {vehicleProfile.batteryType.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Nominal Voltage</p>
                        <p className="text-lg font-semibold">
                          {vehicleProfile.nominalVoltage}V
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Capacity</p>
                        <p className="text-lg font-semibold">
                          {vehicleProfile.capacityAh} Ah
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Full Charge Voltage</p>
                        <p className="text-lg font-semibold text-green-500">
                          {vehicleProfile.fullChargeVoltage}V
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Min Safe Voltage</p>
                        <p className="text-lg font-semibold text-amber-500">
                          {vehicleProfile.minSafeVoltage}V
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Max Safe Temperature</p>
                        <p className="text-lg font-semibold text-red-500">
                          {vehicleProfile.maxSafeTemp}°C
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Calculated Specs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Calculated Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Battery className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nominal Energy</p>
                        <p className="text-xl font-semibold">{nominalEnergy.toFixed(0)} Wh</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Clock className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Charge Time</p>
                        <p className="text-xl font-semibold">{estimatedChargeTime.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground">at 0.5C rate</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lifetime Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Lifetime Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!lifetimeStats ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No history data available yet
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Total Sessions</p>
                        <p className="text-2xl font-bold">{lifetimeStats.totalSessions}</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Total Energy Used</p>
                        <p className="text-2xl font-bold">
                          {lifetimeStats.totalWh.toFixed(0)}
                          <span className="text-sm font-normal"> Wh</span>
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Highest Temp</p>
                        <p className="text-2xl font-bold text-red-500">
                          {lifetimeStats.highestTemp.toFixed(1)}°C
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Lowest Voltage</p>
                        <p className="text-2xl font-bold text-amber-500">
                          {lifetimeStats.lowestVoltage.toFixed(2)}V
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Avg Session</p>
                        <p className="text-2xl font-bold">
                          {Math.floor(lifetimeStats.avgDuration / 60)}
                          <span className="text-sm font-normal"> min</span>
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Best Efficiency</p>
                        <p className="text-2xl font-bold text-green-500">
                          {(lifetimeStats.bestEfficiency * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ClientOnly>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
