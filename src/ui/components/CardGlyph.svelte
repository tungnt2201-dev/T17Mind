<script lang="ts">
  /**
   * ui/components/CardGlyph.svelte
   * -------------------------------------------------------------------
   * Biểu tượng loại nội dung card (văn bản / bảng / ảnh / biểu đồ) dạng
   * SVG — cùng kiểu nét với hình vẽ trên canvas (CanvasRenderer.ts#
   * drawContentGlyph) để người dùng nhận ra cùng một biểu tượng ở mọi chỗ.
   * -------------------------------------------------------------------
   */
  export let kind: "text" | "table" | "image" | "chart";
  export let size = 14;
</script>

<svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if kind === "text"}
    <path d="M1 2.5h10M1 6h10M1 9.5h6.5" />
  {:else if kind === "table"}
    <rect x="0.6" y="1" width="10.8" height="10" rx="1" /><path d="M0.6 4.5h10.8M0.6 7.8h10.8M4.5 1v10" />
  {:else if kind === "image"}
    <rect x="0.6" y="1" width="10.8" height="10" rx="1" /><path d="M1.5 10l3.3-4 2.2 2.2 1.6-1.4 2.2 3.2" />
    <circle cx="8.3" cy="3.9" r="1.1" fill="currentColor" stroke="none" />
  {:else}
    <path d="M2 11V6.5M6 11V2M10 11V4.5" />
  {/if}
</svg>
