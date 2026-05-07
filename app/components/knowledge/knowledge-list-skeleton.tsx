/** Table and list loading placeholders for knowledge pages — rectangular `.ds-skeleton` blocks only. */

export function KnowledgeFilesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-4 sm:px-6">
            <div className="ds-skeleton size-4" />
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="ds-skeleton size-5 shrink-0" />
              <div className="ds-skeleton h-4 w-[min(85%,16rem)]" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="ds-skeleton h-6 w-20" />
          </td>
          <td className="px-4 py-4">
            <div className="ds-skeleton h-4 w-14" />
          </td>
          <td className="px-4 py-4">
            <div className="ds-skeleton h-4 w-28" />
          </td>
          <td className="px-5 py-4 text-right sm:px-6">
            <div className="ds-skeleton ml-auto h-8 w-8" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function KnowledgeSnippetTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-4 sm:px-6">
            <div className="ds-skeleton size-4" />
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="ds-skeleton size-4 shrink-0" />
              <div className="ds-skeleton h-4 w-[min(90%,18rem)]" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="ds-skeleton h-4 w-12" />
          </td>
          <td className="px-4 py-4">
            <div className="ds-skeleton h-4 w-28" />
          </td>
          <td className="px-5 py-4 text-right sm:px-6">
            <div className="ds-skeleton ml-auto h-8 w-8" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function KnowledgeWebsiteSourceListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-ds-sidebar/70 px-4 py-4 sm:px-5">
          <div className="ds-skeleton h-4 w-[min(72%,20rem)]" />
          <div className="ds-skeleton mt-3 h-3 w-full max-w-xl" />
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="ds-skeleton h-8 w-24" />
            <div className="ds-skeleton h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KnowledgeExpandedBodySkeleton() {
  return (
    <div className="space-y-2 pl-4" aria-hidden>
      <div className="ds-skeleton h-3 w-24" />
      <div className="ds-skeleton h-3 w-full max-w-2xl" />
      <div className="ds-skeleton h-3 w-full max-w-xl" />
      <div className="ds-skeleton h-3 w-[88%] max-w-lg" />
    </div>
  );
}
