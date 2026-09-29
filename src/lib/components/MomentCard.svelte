<script lang="ts">
  import { formatDuration, formatTimecode } from '$lib/core/timecode';
  import type { Moment } from '$lib/core/types';

  interface Props {
    moment: Moment;
    selected?: boolean;
    improved?: boolean;
    onselect?: (id: string) => void;
    onstar?: (id: string) => void;
  }

  let { moment, selected = false, improved = false, onselect, onstar }: Props = $props();

  // Hover-scrub: cursor x across the card maps to [inSeconds, outSeconds]. In mock mode
  // the poster frame is procedural, so scrubbing shifts hue and brightness instead of
  // swapping filmstrip tiles. The interaction — and its timing — is the real thing.
  let scrubbing = $state(false);
  let progress = $state(0);

  const duration = $derived(moment.outSeconds - moment.inSeconds);
  const scrubSeconds = $derived(moment.inSeconds + progress * duration);
  const scrubFrame = $derived(Math.round(moment.startFrame + scrubSeconds * moment.fps));

  function onPointerMove(event: PointerEvent) {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    progress = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    scrubbing = true;
  }
</script>

<button
  class="card"
  class:selected
  class:improved
  style:--hue={moment.hue}
  style:--shift={scrubbing ? progress : 0}
  style:aspect-ratio={moment.aspect}
  onpointermove={onPointerMove}
  onpointerleave={() => {
    scrubbing = false;
    progress = 0;
  }}
  onclick={() => onselect?.(moment.id)}
  ondblclick={() => onstar?.(moment.id)}
  aria-label={`Moment, ${formatDuration(duration)}, timecode ${formatTimecode(moment.startFrame, moment.fps)}, ${moment.codec}`}
  aria-pressed={selected}
>
  <span class="poster"></span>

  {#if moment.codec === 'R3D' || moment.codec === 'BRAW' || moment.codec === 'ProRes'}
    <span class="badge codec">{moment.codec}</span>
  {/if}

  {#if moment.hasDialogue}
    <span class="badge dialogue" title="Matched in dialogue">◗</span>
  {/if}

  {#if moment.starred}
    <span class="badge star">★</span>
  {/if}

  <span class="meta">
    <span class="chip tabular">{formatDuration(duration)}</span>
    <span class="chip tabular tc">{formatTimecode(scrubFrame, moment.fps)}</span>
  </span>

  {#if scrubbing}
    <span class="track"><span class="head" style:left={`${progress * 100}%`}></span></span>
  {/if}
</button>

<style>
  .card {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    overflow: hidden;
    border-radius: var(--radius-lg);
    background: var(--color-sunken);
    box-shadow: var(--shadow-e2);
    transition:
      box-shadow var(--duration-snappy) var(--ease-snappy),
      transform var(--duration-snappy) var(--ease-snappy);
  }

  .card:hover {
    box-shadow: var(--shadow-e3);
    transform: translateY(-2px);
  }

  .card.selected {
    box-shadow:
      var(--shadow-e3),
      inset 0 0 0 2px var(--color-accent);
  }

  .card.improved {
    animation: pulse 600ms var(--ease-out-micro);
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow: var(--shadow-e2);
    }
    35% {
      box-shadow:
        var(--shadow-e2),
        inset 0 0 0 2px var(--color-accent);
    }
  }

  .poster {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      160deg,
      hsl(calc(var(--hue) + var(--shift) * 40) 42% 62%),
      hsl(calc(var(--hue) + 40 + var(--shift) * 40) 38% 38%)
    );
    transition: background var(--duration-micro) linear;
  }

  .badge {
    position: absolute;
    top: 6px;
    padding: 1px 5px;
    border-radius: var(--radius-xs);
    font-size: var(--text-micro);
    line-height: 1.3;
    color: white;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(6px);
  }

  .codec {
    left: 6px;
    letter-spacing: 0.02em;
  }
  .dialogue {
    right: 6px;
  }
  .star {
    right: 6px;
    top: 26px;
    color: #ffd479;
  }

  .meta {
    position: absolute;
    inset: auto 6px 6px;
    display: flex;
    justify-content: space-between;
    gap: 6px;
    opacity: 0;
    transition: opacity var(--duration-micro) var(--ease-out-micro);
  }

  .card:hover .meta {
    opacity: 1;
  }

  .chip {
    padding: 1px 5px;
    border-radius: var(--radius-xs);
    font-family: var(--font-mono);
    font-size: var(--text-micro);
    color: white;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(6px);
  }

  .tc {
    opacity: 0.85;
  }

  .track {
    position: absolute;
    inset: auto 0 0;
    height: 2px;
    background: rgb(255 255 255 / 0.25);
  }

  .head {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 6px;
    background: white;
  }
</style>
