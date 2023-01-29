import { Position } from "./Position.js";
import { Velocity } from "./Velocity.js";
import { Sprite } from "./Sprite.js";
import { Player } from "./Player.js";
import { Me } from "./Me.js";
import { Input } from "./Input.js";

// necessary for serialization and deserialization
export const serializationConfig = [Me, Input, Position, Sprite, Velocity, Player];

