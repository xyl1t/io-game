import { defineComponent, Types } from "../bitecs.js";

export const Player = defineComponent({
  hp: Types.f32,
  viewDistanceWidth: Types.i32,
  viewDistanceHeight: Types.i32,
});
