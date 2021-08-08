export const distance = (
  [long1, lat1]: [number, number],
  [long2, lat2]: [number, number]
) => Math.sqrt(Math.pow(long2 - long1, 2) + Math.pow(lat2 - lat1, 2));
