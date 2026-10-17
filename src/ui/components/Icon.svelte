<script lang="ts">
  /**
   * ui/components/Icon.svelte
   * -------------------------------------------------------------------
   * P2.16 — Khung <svg> DÙNG CHUNG cho mọi icon trong ui/icons.ts: mọi
   * icon chắc chắn cùng viewBox/độ dày nét/bo góc — chỉ khác phần path
   * bên trong. `stroke="currentColor"` (không fill) là điểm mấu chốt để
   * đổi màu tự động theo nút cha (xám lúc thường, xanh khi active, đỏ
   * khi danger, trắng khi ở trên nút primary xanh đặc) — thay cho emoji
   * trước đây có màu CỐ ĐỊNH không thể chỉnh qua CSS.
   * `{@html markup}` an toàn ở đây vì nội dung 100% do chính dự án viết
   * trong icons.ts (không phải dữ liệu người dùng nhập vào).
   * -------------------------------------------------------------------
   */
  import { ICONS } from "../icons";
  export let name: string;
  export let size = 16;

  $: markup = ICONS[name] ?? "";
</script>

<svg
  class="tbar-icon-svg"
  width={size}
  height={size}
  viewBox="0 0 20 20"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>{@html markup}</svg>
