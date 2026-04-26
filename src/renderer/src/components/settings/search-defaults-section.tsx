'use client'

import { useState, useCallback } from 'react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useSettingsStore } from '@/stores/settings-store'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
}

const CustomSlider = ({ value, onValueChange }: SliderProps) => (
  <div className="flex items-center gap-3 py-1">
    <span className="text-xs text-muted-foreground w-8">0</span>
    <div className="flex-1">
      <Slider value={value} onValueChange={onValueChange} max={100} step={1} className="w-full" />
    </div>
    <span className="text-xs text-muted-foreground w-8 text-right">100</span>
  </div>
)

export function SearchDefaultsSection(): React.JSX.Element {
  const { fusionWeight, sortOrder, setFusionWeight, setSortOrder } = useSettingsStore()
  const [weightValue, setWeightValue] = useState(fusionWeight)

  const handleWeightChange = useCallback(
    (value: number[]) => {
      const newValue = value[0]
      setWeightValue(newValue)
      setFusionWeight(newValue)
    },
    [setFusionWeight]
  )

  return (
    <Card className="rounded-none border-b-0 border-x-0 bg-card shadow-none">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm">Search Defaults</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pb-4">
        {/* Fusion Weight Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Image + Text Fusion Weight</Label>
            <span className="text-xs text-muted-foreground">{weightValue}%</span>
          </div>
          <CustomSlider value={[weightValue]} onValueChange={handleWeightChange} />
        </div>

        {/* Sort Order Dropdown */}
        <div className="space-y-2">
          <Label className="text-sm">Default Result Sort Order</Label>
          <Select
            value={sortOrder}
            onValueChange={(v: 'similarity' | 'newest' | 'oldest') => setSortOrder(v)}
          >
            <SelectTrigger className="h-8 w-full rounded-none border bg-background text-xs">
              <SelectValue placeholder="Select sort order" />
            </SelectTrigger>
            <SelectContent className="rounded-none border bg-popover">
              <SelectItem value="similarity" className="text-xs">
                Most Similar
              </SelectItem>
              <SelectItem value="newest" className="text-xs">
                Newest
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Oldest
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
