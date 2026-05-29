import { useState, useCallback } from 'react'
import { InfoIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSettingsStore } from '@/stores/settings-store'
import { Button } from '../ui/button'

export function SearchDefaultsSection(): React.JSX.Element {
  const { topK, fusionWeight, setTopK, setFusionWeight } = useSettingsStore()
  const [topKValue, setTopKValue] = useState(topK)
  const [weightValue, setWeightValue] = useState(fusionWeight)

  const handleTopKChange = useCallback(
    (value: number[]) => {
      const newValue = value[0]
      setTopKValue(newValue)
      setTopK(newValue)
    },
    [setTopK]
  )

  const handleWeightChange = useCallback(
    (value: number[]) => {
      const newValue = value[0]
      setWeightValue(newValue)
      setFusionWeight(newValue)
    },
    [setFusionWeight]
  )

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex gap-2 items-center text-base">
          <MagnifyingGlassIcon className="text-muted-foreground" size={24} /> Search Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pb-4">
        <TooltipProvider>
          {/* Top-K Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-sm font-medium text-muted-foreground">
                  Max Results (Top-K)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" type="button" size="icon">
                      <InfoIcon size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60">
                    Maximum number of results to return in a search.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs text-muted-foreground">{topKValue}</span>
            </div>
            <Slider value={[topKValue]} onValueChange={handleTopKChange} max={200} />
          </div>

          {/* Fusion Weight Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-sm font-medium text-muted-foreground">
                  Image + Text Fusion Weight
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" type="button" size="icon">
                      <InfoIcon size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60">
                    Blends text and image embeddings when both are provided. 100% = pure text, 0% =
                    pure image, 50% = equal blend.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs text-muted-foreground">{weightValue}%</span>
            </div>
            <Slider value={[weightValue]} onValueChange={handleWeightChange} />
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
