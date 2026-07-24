import { CanvasStage } from './canvas/components/CanvasStage'
import { DesignDiffReviewer } from './design-diff/components/DesignDiffReviewer'
import { useEditorShortcuts } from './editor/hooks/use-editor-shortcuts'
import { RightInspector } from './inspector/components/RightInspector'
import { LeftSidebar } from './layers/components/LeftSidebar'

function App() {
  useEditorShortcuts()

  return (
    <main className="relative h-screen min-h-[620px] w-screen overflow-hidden bg-[#f2f2f2] font-sans text-[12px] leading-4 text-black/80 antialiased [font-synthesis:none] [text-rendering:geometricPrecision]">
      <LeftSidebar />
      <section className="absolute inset-y-0 right-[281px] left-[282px] overflow-hidden bg-[#f2f2f2] max-[960px]:right-0 max-[680px]:left-[42px]" aria-label="Design canvas">
        <CanvasStage />
      </section>
      <RightInspector />
      <DesignDiffReviewer />
    </main>
  )
}

export default App
