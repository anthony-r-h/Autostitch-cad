# Connected stitch paths: adapter proposal

The adapter implementation is in `source/autostitch-cad.lsp`; the geometry and palette integrations are present. Root's native run passed the existing 56 adapter checks, 27 connected-path checks, and 11 missing-source recovery checks. Save/reopen qualification is in progress.

## User operation

Select a path, then **Connect stitch lines**, and select the other path. One new intersection connects directly. When the merged set needs more than one intersection, the palette reports the count and offers **Connect all** or Cancel. This declares all crossings within the selected active ranges together so an intermediate partial connection cannot become an editing dead end. Nearby unselected drawing geometry has no effect. **Add gap** remains a separate operation for a nominal gap centred on one path.

The selected source remains editable with normal CAD tools. Selecting any source in the connected set or its output reopens the saved work. Generate recomputes the complete connected set, including paths the user did not most recently select. A failure keeps its last complete output. An unrelated source does not change.

## Smallest practical ownership

Use **one output block reference for a connected set**. There is one physical cut list and one generation revision, so a shared hole has no arbitrary owner among competing output blocks. Do not create a general dependency graph or per-opening CAD entities with their own persistent ownership records.

Keep the current original entities as canonical sources. Each source retains its own settings, landmarks, range attachments, and last successful analytic snapshot. Selecting a member therefore still shows that member's range and gaps in the existing palette.

The first selected source is the primary source for a connected set. Extend the versioned Xrecord format:

| Native field | Meaning |
| --- | --- |
| Source `331` | Its output, shared by the connected set. |
| Primary source repeated `332` | All source members, starting with the primary, in a stable stored order. |
| Repeated `90` | Member slot preceding each `332`, preserving indexes when an erased reference disappears during save/reopen. |
| Every member source `333` | Primary source, including its own backlink. |
| Output `331` | Primary source. |
| Exact `40` fields | Existing double serialization, unchanged. |

The output also backs up member pointers and compact connection topology. It does not duplicate source geometry: backup incidences restore their analytic snapshots from the surviving sources' last generated records. This permits repair after the primary source is deleted. The saved output identity helps recognize partial copies, while actual membership authority remains reciprocal native references.

The primary source stores explicit connection records referencing member indexes and analytic primitive correspondence. Object identities must be native DWG reference fields; never serialize entity names or handles as authority. Existing schema-1 single-source work remains supported. A connected-set schema/rule identifies the changed semantics; unknown versions remain read-only.

A connection follows the intersection of the same two source primitives after an edit, subject to demonstrable correspondence. It is not a fixed distance marker. Multiple roots need an explicit branch choice with correspondence evidence; an ambiguous changed branch or a lost finite crossing requires re-picking. Never substitute the nearest unrelated intersection. Geometry work must settle the precise root attachment representation.

## Reading and regeneration

`ast:cad-read` keeps the selected member's `guide`, `route`, `settings`, and `landmarks` contract. Add primary/member context and report the shared output stale if any member's source, inputs, attachment validity, or generated signature changed.

Generation proceeds as follows:

1. Resolve all reciprocal source memberships and their one shared output. Validate every source exists, lies in the same owner space, uses the same physical unit conversion, and has compatible shared-opening process dimensions.
2. Read every current analytic source. Resolve each member's range/gap attachments and the declared connections. Apply palette drafts only to the selected member; restore saved values for all others.
3. Solve the entire set in memory. Shared openings are emitted once by geometric identity under an explicit connection. Validate all distinct cuts across every member, including cuts from paths without a direct pairwise connection.
4. Verify all source and output layers, placement, schema and Undo preconditions before writing.
5. Reuse the existing one-Undo transaction and new-definition writer. Write one combined output, then update every member's generated snapshot and the reciprocal links. Any failure rolls back the whole group.

This is a finite list of paths and explicit connections, not reactor-driven live regeneration. It retains the original atomic writer and avoids a cross-output shared-hole ownership scheme.

## Connecting existing output

Connect should calculate the candidate and commit the connection plus its generated result in one transaction. Before that transaction, existing independent outputs remain authoritative. Within a successful commit, retain one output reference, point it to the combined definition, write all memberships, and retire the other superseded output references. Failure, including failure while removing superseded output, restores every old reference and metadata record.

Connecting two existing sets takes the union of their explicitly saved members and connections. It must not discover membership by proximity. Reject selecting an already connected pair as a duplicate unless this operation deliberately adds a different chosen crossing.

## Copies, edits, and repair

Membership checks must be reciprocal. A copied member still pointing at an original primary is not part of that original set because the primary does not list the copy. It starts independent work or asks the user to select the complete set; it cannot regenerate original output. A copied output is static unless the copied primary and every copied member form a complete reciprocal set.

Copying the complete set with output preserves editability only after all native references remap consistently. On first successful generation, assign the copy a new identity. A partial copied set cannot retain links to uncopied originals, even if its primary happens to be copied. A provable incomplete copy opens as an independent source and can be reconnected explicitly; an original set with a missing member fails with a repair message.

A common rigid move is accepted only if the same transform accounts for every member and its saved attachments. Moving one source marks the set stale. Moving only output requires explicit Restore or Detach. A deleted member or lost intersection retains prior output and identifies the missing path/connection; no silent member removal.

**Disconnect line** removes the selected path's incidences, keeps connections among remaining paths, computes the resulting components with a small list walk, and solves each component before atomically replacing all outputs. Reconnect the path to repair a mistaken or invalid attachment.

When a source is missing, selecting a surviving source or the output still opens the work. Generate is blocked, and the same explicit action becomes **Remove missing lines**. Repair drops only the deleted sources' incidences, retains surviving connections, and solves every remaining component before writing. If the primary source was deleted, the output's compact backup identifies surviving members and allows a new primary. A failed repair retains the previous complete cuts and does not undo the user's earlier source deletion. Read/selection never prunes members.

Raw source guides must not overlap for a positive length, even when their active Start/End ranges are adjacent. Trim such overlapping source geometry before connecting it. Supporting those overlapping raw sources would require explicit clipped-occurrence attachment correspondence in both picking and regeneration; the present solver does not silently approximate that mapping.

## Qualification evidence required

- Two separate LINE entities meeting at an L corner: one shared hole and the same cut geometry as an equivalent polyline under the accepted rule.
- A T pocket-panel junction: all three arms remain coherent after changing the through-path length.
- Two independent crossing paths: one shared hole, global clearance validation, and no duplicate output after repeated Generate.
- Two possible curved intersections: pick one, edit, and verify branch preservation or explicit repair.
- Select either source and the shared output; show the right saved inputs and regenerate the full set.
- Change one member's pitch/range/gap: validate all members; a conflicting set retains old output.
- Inject failures during source writes, output association, and retired-output removal: exact geometry/metadata restoration and one Undo/Redo step.
- Copy one member, output alone, complete set, and incomplete set; none can modify original work.
- Move complete set, move one source, delete one source, save/reopen, then inspect and regenerate.
- An unrelated edge intersecting the same location remains unrelated and its output is untouched.

Native host execution belongs to the root agent. No host calls were made while producing this proposal.
