import { serializationConfig } from "/components/SerializationConfig.js";
import { createWorld, defineSerializer, defineDeserializer } from "/bitecs.js"

// TODO: I think we will need two world, one represents the client state and
// the other is the world we got from the server, but it's ok as it is for now
export const world = createWorld();
export const serialize = defineSerializer(serializationConfig); // to serialize client state and send to server (eg. player input)
export const deserialize = defineDeserializer(serializationConfig); // to deserialize server state
