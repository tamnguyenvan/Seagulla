<script lang="ts">
  import { formatDuration, formatTimecode } from '$lib/core/timecode';
  import type { Moment } from '$lib/core/types';

  interface Props {
    moment?: Moment;
  }

  let { moment }: Props = $props();
</script>

<aside class="inspector">
  {#if !moment}
    <p class="placeholder">Select a moment</p>
  {:else}
    {@const duration = moment.outSeconds - moment.inSeconds}
    <div class="preview" style:--hue={moment.hue} style:aspect-ratio={moment.aspect}></div>

    <section>
      <h2>Moment</h2>
      <dl>
        <dt>Duration</dt>
        <dd class="tabular">{formatDuration(duration)}</dd>
        <dt>Timecode</dt>
        <dd class="tabular mono">{formatTimecode(moment.startFrame, moment.fps)}</dd>
        <dt>Rate</dt>
        <dd class="tabular">{moment.fps} fps</dd>
        <dt>Codec</dt>
        <dd>{moment.codec}</dd>
      </dl>
    </section>

    {#if moment.evidence?.length}
      <section>
        <h2>Matched because</h2>
        <ul class="evidence">
          {#each moment.evidence as item (item.kind + item.detail)}
            <li>
              <span class="kind" data-kind={item.kind}>{item.kind}</span>
              <span class="detail" data-selectable>{item.detail}</span>
              <span class="bar"><span style:width={`${item.confidence * 100}%`}></span></span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section>
      <h2>Source</h2>
      <p class="path" data-selectable>{moment.assetId} · {moment.volumeId}</p>
    </section>
  {/if}
</aside>

<style>
  .inspector {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: var(--inspector-width);
    height: 100%;
    padding: 16px;
    overflow-y: auto;
    border-left: 1px solid var(--color-border-subtle);
    background: var(--color-canvas);
  }

  .placeholder {
    margin: auto;
    color: var(--color-text-tertiary);
    font-size: var(--text-body);
  }

  .preview {
    width: 100%;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-e2);
    background: linear-gradient(
      160deg,
      hsl(var(--hue) 42% 62%),
      hsl(calc(var(--hue) + 40) 38% 38%)
    );
  }

  h2 {
    margin: 0 0 6px;
    font-size: var(--text-caption);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    font-weight: 600;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;
    font-size: var(--text-body);
  }

  dt {
    color: var(--color-text-secondary);
  }

  dd {
    margin: 0;
    text-align: right;
    color: var(--color-text-primary);
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
  }

  .evidence {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-body);
  }

  .kind {
    display: inline-block;
    margin-right: 6px;
    padding: 0 5px;
    border-radius: var(--radius-xs);
    background: var(--color-sunken);
    color: var(--color-text-secondary);
    font-size: var(--text-micro);
    text-transform: uppercase;
  }

  .detail {
    color: var(--color-text-primary);
  }

  .bar {
    display: block;
    height: 3px;
    margin-top: 4px;
    border-radius: 999px;
    background: var(--color-sunken);
  }

  .bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--color-accent);
  }

  .path {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    word-break: break-all;
  }
</style>
