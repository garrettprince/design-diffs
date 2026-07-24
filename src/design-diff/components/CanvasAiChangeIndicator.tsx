import Konva from 'konva'
import { useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Circle, Group, Rect } from 'react-konva'

type CanvasAiChangeIndicatorProps = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zoom: number
  showActivity?: boolean
}

const seededValue = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

const COLUMN_COUNT = 12
const DOT_RADIUS = 2.5
const DOT_COLUMN_GAP = 7.5
const DOT_ROW_GAP = 7.5
const DOT_GRID_INSET_X = 4
const DOT_GRID_OFFSET_Y = -19
const DOT_GRID_WIDTH = (COLUMN_COUNT - 1) * DOT_COLUMN_GAP + DOT_RADIUS * 2
const activityDots = Array.from({ length: COLUMN_COUNT * 2 }, (_, index) => ({
  x: -DOT_GRID_WIDTH + DOT_RADIUS + index % COLUMN_COUNT * DOT_COLUMN_GAP,
  y: DOT_GRID_OFFSET_Y + Math.floor(index / COLUMN_COUNT) * DOT_ROW_GAP,
  opacity: 0.82 + seededValue(index + 201) * 0.18,
}))
const DROP_START_INTERVAL_MS = 120
const DROP_TRAVEL_MS = 520
const ACTIVITY_FADE_SECONDS = 0.22
const SELECTOR_LIGHT_BLUE = [91, 164, 255] as const
const SELECTOR_DARK_BLUE = [7, 88, 210] as const
const SELECTOR_MIN_STROKE_WIDTH = 1
const SELECTOR_MAX_STROKE_WIDTH = 2
const SELECTOR_PULSE_PERIOD_MS = 1800
const dropColumnsCache = new Map<number, readonly [number, number]>()

const interpolateChannel = (start: number, end: number, progress: number) => Math.round(start + (end - start) * progress)

const smoothStep = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

const getRowIntensity = (row: number, progress: number) => {
  const startsAt = row === 0 ? 0 : 0.25
  const fillsAt = startsAt + 0.1
  const fadesAt = row === 0 ? 0.42 : 0.68
  const endsAt = row === 0 ? 0.74 : 1

  if (progress < startsAt || progress > endsAt) return 0
  if (progress < fillsAt) return smoothStep((progress - startsAt) / (fillsAt - startsAt))
  if (progress <= fadesAt) return 1
  return 1 - smoothStep((progress - fadesAt) / (endsAt - fadesAt))
}

const getDropColumns = (eventIndex: number) => {
  const cached = dropColumnsCache.get(eventIndex)
  if (cached) return cached
  const block = Math.floor(eventIndex / COLUMN_COUNT)
  const position = ((eventIndex % COLUMN_COUNT) + COLUMN_COUNT) % COLUMN_COUNT
  const orderedColumns = Array.from({ length: COLUMN_COUNT }, (_, column) => ({
    column,
    order: seededValue((block + 1) * 97 + (column + 1) * 53),
  })).sort((a, b) => a.order - b.order)
  const secondaryOffset = 4 + Math.floor(seededValue((eventIndex + 1) * 89) * (COLUMN_COUNT - 7))
  const columns = [orderedColumns[position].column, orderedColumns[(position + secondaryOffset) % COLUMN_COUNT].column] as const
  dropColumnsCache.set(eventIndex, columns)
  const oldestEvent = dropColumnsCache.keys().next().value
  if (dropColumnsCache.size > 128 && oldestEvent !== undefined) dropColumnsCache.delete(oldestEvent)
  return columns
}

export function CanvasAiChangeIndicator({ x, y, width, height, rotation, zoom, showActivity = false }: CanvasAiChangeIndicatorProps) {
  const inverseZoom = 1 / Math.max(zoom, 0.2)
  const activityGroupRef = useRef<Konva.Group>(null)
  const outlineRef = useRef<Konva.Rect>(null)
  const dotRefs = useRef<Array<Konva.Circle | null>>([])
  const [activityMounted, setActivityMounted] = useState(showActivity)
  const activityHasEnteredRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (showActivity) setActivityMounted(true)
  }, [showActivity])

  useLayoutEffect(() => {
    if (!activityMounted) return
    const activityGroup = activityGroupRef.current
    if (!activityGroup) return

    if (shouldReduceMotion) {
      activityGroup.opacity(showActivity ? 1 : 0)
      activityHasEnteredRef.current = showActivity
      if (!showActivity) setActivityMounted(false)
      return
    }

    if (showActivity && !activityHasEnteredRef.current) activityGroup.opacity(0)
    const fade = new Konva.Tween({
      node: activityGroup,
      duration: ACTIVITY_FADE_SECONDS,
      easing: Konva.Easings.EaseInOut,
      opacity: showActivity ? 1 : 0,
      onFinish: () => {
        activityHasEnteredRef.current = showActivity
        if (!showActivity) setActivityMounted(false)
      },
    })
    fade.play()
    return () => fade.destroy()
  }, [activityMounted, shouldReduceMotion, showActivity])

  useEffect(() => {
    if (!activityMounted || !showActivity || shouldReduceMotion) return
    const layer = activityGroupRef.current?.getLayer()
    if (!layer) return

    const animation = new Konva.Animation((frame) => {
      const elapsed = frame?.time ?? 0
      const pulseProgress = (Math.sin(elapsed / SELECTOR_PULSE_PERIOD_MS * Math.PI * 2 - Math.PI / 2) + 1) / 2
      const red = interpolateChannel(SELECTOR_LIGHT_BLUE[0], SELECTOR_DARK_BLUE[0], pulseProgress)
      const green = interpolateChannel(SELECTOR_LIGHT_BLUE[1], SELECTOR_DARK_BLUE[1], pulseProgress)
      const blue = interpolateChannel(SELECTOR_LIGHT_BLUE[2], SELECTOR_DARK_BLUE[2], pulseProgress)
      const outline = outlineRef.current
      if (outline) {
        outline.stroke(`rgb(${red}, ${green}, ${blue})`)
        outline.strokeWidth(
          SELECTOR_MIN_STROKE_WIDTH + (SELECTOR_MAX_STROKE_WIDTH - SELECTOR_MIN_STROKE_WIDTH) * pulseProgress,
        )
        outline.shadowBlur(6 + pulseProgress * 5)
        outline.shadowOpacity(0.28 + pulseProgress * 0.22)
      }

      const currentEvent = Math.floor(elapsed / DROP_START_INTERVAL_MS)
      const activeDrops = [currentEvent, currentEvent - 1, currentEvent - 2, currentEvent - 3, currentEvent - 4]
        .flatMap((eventIndex) => getDropColumns(eventIndex).map((column, lane) => ({
          column,
          progress: (elapsed - eventIndex * DROP_START_INTERVAL_MS) / DROP_TRAVEL_MS,
          strength: 0.82 + seededValue((eventIndex + 1) * 71 + lane * 29) * 0.18,
        })))
        .filter((drop) => drop.progress >= 0 && drop.progress <= 1)

      dotRefs.current.forEach((dot, index) => {
        if (!dot) return
        const config = activityDots[index]
        const column = index % COLUMN_COUNT
        const row = Math.floor(index / COLUMN_COUNT)
        const intensity = activeDrops.reduce((brightest, drop) => {
          if (drop.column !== column) return brightest
          return Math.max(brightest, getRowIntensity(row, drop.progress) * drop.strength)
        }, 0)
        dot.opacity(intensity * config.opacity)
      })
    }, layer)

    animation.start()
    return () => {
      animation.stop()
      layer.batchDraw()
    }
  }, [activityMounted, shouldReduceMotion, showActivity])

  return (
    <Group x={x} y={y} rotation={rotation} listening={false}>
      {activityMounted && (
        <Group ref={activityGroupRef}>
          <Rect
            ref={outlineRef}
            width={width}
            height={height}
            stroke="#1677FF"
            strokeWidth={SELECTOR_MIN_STROKE_WIDTH}
            strokeScaleEnabled={false}
            shadowColor="#1677FF"
            shadowBlur={6}
            shadowOpacity={0.28}
            shadowForStrokeEnabled
            perfectDrawEnabled={false}
          />
          <Group x={width - DOT_GRID_INSET_X * inverseZoom} scaleX={inverseZoom} scaleY={inverseZoom}>
            {activityDots.map((dot, index) => (
              <Circle ref={(node) => { dotRefs.current[index] = node }} key={index} x={dot.x} y={dot.y} radius={DOT_RADIUS} fill="#1677FF" opacity={dot.opacity} />
            ))}
          </Group>
        </Group>
      )}
    </Group>
  )
}
