import { defineComponent, Types } from "../bitecs.js";

export const Input = defineComponent({
  keys: Types.ui8,
  angle: Types.f32,
});
