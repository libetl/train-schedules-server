import { sncfMapsUpdate } from "./sncfMaps";

sncfMapsUpdate().then((data) => console.log(Object.entries(data).length));
